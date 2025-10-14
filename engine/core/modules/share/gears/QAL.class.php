<?php
/**
 * Query Abstraction Layer (улучшенная версия).
 * Совместима с имеющимся кодом, новые методы — опциональны.
 *
 * Основные задачи:
 * - унифицированный SQL-API поверх PDO;
 * - централизованная сборка условий WHERE/ORDER/LIMIT;
 * - вспомогательные методы для массовых операций и безопасного чтения.
 *
 * Структура:
 * - базовые методы совместимости (`select`, `modify`, `buildSQL`, `getScalar`, `getColumn`);
 * - генераторы условий (`buildWhereCondition`, `buildOrderCondition`, `buildLimitStatement`, `buildOrderSafe`);
 * - высокоуровневые выборки (`selectRow`, `selectOne`, `selectPairs`, `exists`, `count`, `paginate`);
 * - массовые операции (`upsert`, `insertMany`, `updateMany`);
 * - управление транзакциями (`transaction`) и логирование (`maybeLogQuery`).
 *
 * Поведение:
 * - все запросы выполняются через подготовленные выражения;
 * - автоматически логирует медленные запросы через Monolog (порог `database.slow_ms`);
 * - контролирует размер IN-условий, разбивая массивы на батчи по `$maxInChunk`.
 *
 * Минимальный пример:
 * $db = new QAL(...);
 * $users = $db->select('users', ['id', 'email'], ['status' => 'active'], ['id' => QAL::ASC]);
 * if ($db->exists('orders', ['user_id' => $users[0]['id']])) {
 *     $db->transaction(function(QAL $tx) use ($users) {
 *         $tx->insertMany('audit', [['user_id' => $users[0]['id'], 'created_at' => date('Y-m-d H:i:s')]]);
 *     });
 * }
 */
final class QAL extends DBA {
    // Режимы
    const INSERT         = 'INSERT';
    const INSERT_IGNORE  = 'INSERT IGNORE';
    const UPDATE         = 'UPDATE';
    const DELETE         = 'DELETE';
    const REPLACE        = 'REPLACE';
    const SELECT         = 'SELECT';

    // Сортировка
    const ASC  = 'ASC';
    const DESC = 'DESC';

    // Пустая строка в ваших правилах
    const EMPTY_STRING = null;

    // Сообщения
    const ERR_BAD_QUERY_FORMAT = 'Bad query format.';

    // --- НАСТРОЙКИ НИЖЕ ---
    /** Максимальный размер IN-чека */
    private int $maxInChunk = 1000;

    /** Порог “медленного запроса” (мс). Берётся из конфигурации, либо fallback. */
    private int $slowMs;

    public function __construct($dsn, $username, $password, array $driverOptions, $charset = 'utf8mb4') {
        parent::__construct($dsn, $username, $password, $driverOptions, $charset);

        $cfg = (array) $this->getConfigValue('database', []);

        $this->slowMs = (int)($cfg['slow_ms'] ?? 200);
        // фиксируем отсутствие эмуляции prepared (надёжнее типизация)
        if (defined('PDO::ATTR_EMULATE_PREPARES')) {
            $this->pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
        }
    }

    // ---------------------------------------------------------------------
    // СТАРЫЕ ПУБЛИЧНЫЕ МЕТОДЫ (оставлены без изменений сигнатур)
    // ---------------------------------------------------------------------

    /**
     * Универсальный SELECT, совместимый с прежним API.
     * Принимает готовый SQL или параметры для buildSQL.
     *
     * @param mixed ...$args
     * @return array|true
     */
    public function select() {
        $args = func_get_args();
        if (empty($args)) {
            throw new SystemException('ERR_NO_QUERY', SystemException::ERR_DEVELOPER);
        }
        if (!strpos($args[0], ' ')) {
            $args = $this->buildSQL($args);
        }
        $t0 = microtime(true);
        $res = call_user_func_array([$this, 'selectRequest'], $args);
        $this->maybeLogQuery($this->getLastRequest(), [], $t0, is_array($res) ? count($res) : 0, true);
        return $res;
    }

    /**
     * Выполнить INSERT/UPDATE/DELETE или произвольную MODIFY-операцию.
     * При использовании констант QAL собирает SQL автоматически.
     *
     * @param string $mode
     * @param string|null $tableName
     * @param array|null $data
     * @param array|string|null $condition
     * @return int|bool
     */
    public function modify($mode, $tableName = null, $data = null, $condition = null) {
        if (!in_array($mode, [self::INSERT, self::INSERT_IGNORE, self::REPLACE, self::DELETE, self::UPDATE], true)) {
            $t0 = microtime(true);
            $r = call_user_func_array([$this, 'modifyRequest'], func_get_args());
            $this->maybeLogQuery($this->getLastRequest(), [], $t0, (int)$r, true);
            return $r;
        }

        if (empty($mode) || empty($tableName)) {
            throw new SystemException(self::ERR_BAD_QUERY_FORMAT, SystemException::ERR_DB);
        }
        $tableName = DBA::getFQTableName($tableName);
        $args = [];

        $buildQueryBody = function ($data, &$args) {
            if (!empty($data)) {
                foreach ($data as $fieldValue) {
                    $args[] =
                        (is_int($fieldValue) && $fieldValue === 0) ? 0 :
                            (($fieldValue === self::EMPTY_STRING) ? '' :
                                ($fieldValue === '' ? null : $fieldValue));
                }
            }
        };

        switch ($mode) {
            case self::INSERT:
            case self::INSERT_IGNORE:
            case self::REPLACE:
                if (!empty($data)) {
                    $buildQueryBody($data, $args);
                    $sqlQuery = $mode.' INTO '.$tableName
                        .' ('.implode(', ', array_keys($data)).')'
                        .' VALUES ('.implode(', ', array_fill(0, sizeof($data), '%s')).')';
                } else {
                    $sqlQuery = 'INSERT INTO '.$tableName.' VALUES ()';
                }
                break;

            case self::UPDATE:
                if (!empty($data)) {
                    $buildQueryBody($data, $args);
                    $sqlQuery = 'UPDATE '.$tableName.' SET '
                        .implode(', ', array_map(fn($f) => $f.'= %s', array_keys($data)));
                } else {
                    throw new SystemException(self::ERR_BAD_QUERY_FORMAT, SystemException::ERR_DB);
                }
                break;

            case self::DELETE:
                $sqlQuery = 'DELETE FROM '.$tableName;
                break;

            default:
                throw new SystemException(self::ERR_BAD_QUERY_FORMAT, SystemException::ERR_DB);
        }

        if (isset($condition) && $mode !== self::INSERT) {
            $sqlQuery .= $this->buildWhereCondition($condition, $args);
        }

        array_unshift($args, $sqlQuery);
        $t0 = microtime(true);
        $r = call_user_func_array([$this, 'modifyRequest'], $args);
        $this->maybeLogQuery($this->getLastRequest(), $args, $t0, (int)$r, true);
        return $r;
    }

    /**
     * Построить WHERE-условие из массива/строки с поддержкой вложенных групп,
     * операторов сравнения и подготовленных выражений.
     *
     * @param array|string|null $condition
     * @param array<int,mixed>|null $args
     * @return string
     */
    public function buildWhereCondition($condition, ?array &$args = null) {
        // Если вызывающий передал массив аргументов — используем плейсхолдеры
        $prepared = $args !== null;

        $build = function($cond) use (&$build, $prepared, &$args) {
            if (empty($cond)) return '';
            
            if (is_string($cond)) {
                return ' WHERE '.$cond;
            }

            // массив условий c поддержкой OR/AND, LIKE, BETWEEN, IN, операторы >, <, >=, <=, !=
            $parts = [];

            foreach ($cond as $key => $val) {
                $upper = strtoupper((string)$key);

                // Группы: OR / AND => массив подусловий
                if ($upper === 'OR' || $upper === 'AND') {
                    $sub = [];
                    foreach ((array)$val as $item) {
                        $frag = trim($build($item));
                        if ($frag !== '') {
                            // убрать префикс WHERE у вложенных
                            $frag = preg_replace('/^\s*WHERE\s+/i', '', $frag);
                            $sub[] = '('.$frag.')';
                        }
                    }
                    if ($sub) {
                        $parts[] = '('.implode(" {$upper} ", $sub).')';
                    }
                    continue;
                }

                // Пары FIELD [OP]
                // поддержка: =, !=, <>, >, <, >=, <=, LIKE, NOT LIKE, IN, NOT IN, BETWEEN
                $field = $key;
                $op    = '=';

                if (preg_match('~^(.+?)\s+(=|!=|<>|>|<|>=|<=|LIKE|NOT LIKE|IN|NOT IN|BETWEEN)$~i', $key, $m)) {
                    $field = $m[1];
                    $op    = strtoupper($m[2]);
                }

                $identField = $field; // ожидаем, что приходит валидное имя
                $chunk = '';

                // NULL со специальной семантикой
                if ($val === null && ($op === '=' || $op === '!=' || $op === '<>')) {
                    $chunk = $identField.' '.($op === '=' ? 'IS NULL' : 'IS NOT NULL');
                    $parts[] = $chunk;
                    continue;
                }

                // IN / NOT IN
                if ($op === 'IN' || $op === 'NOT IN') {
                    $arr = array_values((array)$val);
                    if (!$arr) { // пустой IN
                        $parts[] = ($op === 'IN') ? ' FALSE ' : ' TRUE ';
                        continue;
                    }

                    // chunking
                    $subGroups = array_chunk($arr, $this->maxInChunk);
                    $subExpr = [];
                    foreach ($subGroups as $group) {
                        if ($prepared) {
                            $placeholders = [];
                            foreach ($group as $v) {
                                $args[] = $v;
                                $placeholders[] = '%s';
                            }
                            $subExpr[] = $identField.' '.$op.' ('.implode(',', $placeholders).')';
                        } else {
                            $q = implode(',', array_map(fn($v) => $this->quote($v), $group));
                            $subExpr[] = $identField.' '.$op.' ('.$q.')';
                        }
                    }
                    $parts[] = '('.implode(' OR ', $subExpr).')';
                    continue;
                }

                // BETWEEN
                if ($op === 'BETWEEN') {
                    $a = (array)$val;
                    if (count($a) !== 2) continue;
                    if ($prepared) {
                        $args[] = $a[0];
                        $args[] = $a[1];
                        $chunk = $identField.' BETWEEN %s AND %s';
                    } else {
                        $chunk = $identField.' BETWEEN '.$this->quote($a[0]).' AND '.$this->quote($a[1]);
                    }
                    $parts[] = $chunk;
                    continue;
                }

                // LIKE / NOT LIKE
                if ($op === 'LIKE' || $op === 'NOT LIKE') {
                    if ($prepared) {
                        $args[] = $val;
                        $chunk = $identField.' '.$op.' %s';
                    } else {
                        $chunk = $identField.' '.$op.' '.$this->quote($val);
                    }
                    $parts[] = $chunk;
                    continue;
                }

                // Скалярные сравнения
                if (is_array($val)) {
                    // старое поведение: массив трактуем как IN
                    $arr = array_filter($val, fn($x) => $x !== null && $x !== '');
                    if (!$arr) { $parts[] = ' FALSE '; continue; }
                    if ($prepared) {
                        $placeholders = [];
                        foreach ($arr as $v) { $args[] = $v; $placeholders[] = '%s'; }
                        $parts[] = $identField.' IN ('.implode(',', $placeholders).')';
                    } else {
                        $q = implode(',', array_map(fn($v) => $this->quote($v), $arr));
                        $parts[] = $identField.' IN ('.$q.')';
                    }
                } else {
                    if ($prepared) {
                        $args[] = $val;
                        $parts[] = $identField.' '.$op.' %s';
                    } else {
                        $parts[] = $identField.' '.$op.' '.$this->quote($val);
                    }
                }
            }

            if (!$parts) return '';
            return ' WHERE '.implode(' AND ', $parts);
        };

        return $build($condition);
    }

    /**
     * Построить ORDER BY для строкового или массивного описания сортировки.
     *
     * @param array|string|null $clause
     * @return string
     */
    public function buildOrderCondition($clause) {
        $orderClause = '';
        if (!empty($clause)) {
            $orderClause = ' ORDER BY ';
            if (is_array($clause)) {
                $cls = [];
                foreach ($clause as $fieldName => $direction) {
                    $direction = strtoupper($direction);
                    $cls[] = "$fieldName ".constant("self::$direction");
                }
                $orderClause .= implode(', ', $cls);
            } else {
                $orderClause .= $clause;
            }
        }
        return $orderClause;
    }

    /**
     * Построить LIMIT для массива вида [offset, limit] или одного числа.
     *
     * @param array|int|null $clause
     * @return string
     */
    public function buildLimitStatement($clause) {
        $limitClause = '';
        if (is_array($clause)) {
            $limitClause = " LIMIT {$clause[0]}";
            if (isset($clause[1])) {
                $limitClause .= ", {$clause[1]}";
            }
        }
        return $limitClause;
    }

    /**
     * Сконструировать SELECT-запрос из сокращённой сигнатуры (таблица, поля, условия).
     *
     * @param array<int,mixed> $args
     * @return array{0:string}
     */
    protected function buildSQL(array $args) {
        if (strpos($args[0], ' ')) {
            return $args;
        }
        $fields = true;
        $condition = $order = $limit = null;
        $tableName = $args[0];
        if (isset($args[1])) $fields = $args[1];
        if (isset($args[2])) $condition = $args[2];
        if (isset($args[3])) $order = $args[3];
        if (isset($args[4])) $limit = $args[4];

        if (is_array($fields) && !empty($fields)) {
            $fields = array_map('strtolower', $fields);
            $fields = implode(', ', $fields);
        } elseif (is_string($fields)) {
            $fields = strtolower($fields);
        } elseif ($fields === true) {
            $fields = '*';
        } else {
            throw new SystemException(self::ERR_BAD_QUERY_FORMAT, SystemException::ERR_DB, [$tableName, $fields, $condition, $order, $limit]);
        }

        $sqlQuery = "SELECT $fields FROM ".DBA::getFQTableName($tableName);
        if (isset($condition)) $sqlQuery .= $this->buildWhereCondition($condition);
        if (isset($order))     $sqlQuery .= $this->buildOrderCondition($order);
        if (isset($limit)) {
            $sqlQuery .= is_array($limit) ? (' LIMIT '.implode(', ', $limit)) : (" LIMIT $limit");
        }
        return [$sqlQuery];
    }

    /**
     * Получить первое значение первой строки результата.
     *
     * @param mixed ...$args
     * @return mixed|null
     */
    public function getScalar() {
        $t0 = microtime(true);
        $res = call_user_func_array([$this, 'fulfill'], $this->buildSQL(func_get_args()));
        $val = null;
        if ($res instanceof PDOStatement) {
            $val = $res->fetchColumn();
        }
        $this->maybeLogQuery($this->getLastRequest(), [], $t0, $val !== null ? 1 : 0, true);
        return $val;
    }

    /**
     * Получить первую колонку результата в виде одномерного массива.
     *
     * @param mixed ...$args
     * @return array<int,mixed>
     */
    public function getColumn() {
        $t0 = microtime(true);
        $res = call_user_func_array([$this, 'fulfill'], $this->buildSQL(func_get_args()));
        $result = [];
        if ($res instanceof PDOStatement) {
            while ($row = $res->fetch(PDO::FETCH_NUM)) {
                $result[] = $row[0];
            }
        }
        $this->maybeLogQuery($this->getLastRequest(), [], $t0, count($result), true);
        return $result;
    }

    // ---------------------------------------------------------------------
    // НОВЫЕ УДОБНЫЕ МЕТОДЫ
    // ---------------------------------------------------------------------

    /**
     * Безопасный ORDER BY с белым списком полей.
     * @param string[] $allowed  список разрешённых полей
     * @param mixed    $order    строка/массив как раньше
     */
    public function buildOrderSafe(array $allowed, $order): string {
        if (empty($order)) return '';
        $items = [];

        if (is_string($order)) {
            foreach (explode(',', $order) as $piece) {
                $p = trim($piece);
                if ($p === '') continue;
                if (!preg_match('~^([a-zA-Z0-9_\.]+)\s*(ASC|DESC)?$~i', $p, $m)) continue;
                $f = $m[1]; $dir = strtoupper($m[2] ?? 'ASC');
                if (!in_array($f, $allowed, true)) continue;
                $items[] = $f.' '.$dir;
            }
        } else {
            foreach ($order as $f => $dir) {
                if (!in_array($f, $allowed, true)) continue;
                $dir = strtoupper($dir);
                if ($dir !== 'ASC' && $dir !== 'DESC') $dir = 'ASC';
                $items[] = $f.' '.$dir;
            }
        }
        return $items ? (' ORDER BY '.implode(', ', $items)) : '';
    }

    /** Вернуть первую строку (или null). */
    public function selectRow(string $table, $fields = true, $cond = null, $order = null) {
        $rows = $this->select($table, $fields, $cond, $order, [0,1]);
        if ($rows === true) return null;
        return $rows[0] ?? null;
    }

    /** Вернуть скаляр из одной колонки (или null). */
    public function selectOne(string $table, string $field, $cond = null, $order = null) {
        $row = $this->selectRow($table, [$field], $cond, $order);
        return $row[$field] ?? null;
    }

    /** Вернуть пары key=>value. */
    public function selectPairs(string $table, string $keyField, string $valField, $cond = null, $order = null): array {
        $rows = $this->select($table, [$keyField, $valField], $cond, $order);
        if ($rows === true) return [];
        $res = [];
        foreach ($rows as $r) {
            $res[$r[$keyField]] = $r[$valField];
        }
        return $res;
    }

    /** Проверка наличия записей по условию. */
    public function exists(string $table, $cond = null): bool {
        $sql = 'SELECT 1 FROM '.DBA::getFQTableName($table);
        $args = [];
        if ($cond !== null) $sql .= $this->buildWhereCondition($cond, $args);
        $sql .= ' LIMIT 1';

        $res = call_user_func_array([$this,'selectRequest'], array_merge([$sql], $args));
        if ($res === true) return false;
        return !empty($res);
    }

    /** Подсчёт строк. */
    public function count(string $table, $cond = null): int {
        $sql = 'SELECT COUNT(*) AS c FROM '.DBA::getFQTableName($table);
        $args = [];
        if ($cond !== null) $sql .= $this->buildWhereCondition($cond, $args);

        $res = call_user_func_array([$this,'selectRequest'], array_merge([$sql], $args));
        if ($res === true) return 0;
        return (int)($res[0]['c'] ?? 0);
    }

    /**
     * Пагинация.
     * @return array{data:array, total:int, page:int, perPage:int, pages:int}
     */
    public function paginate(string $table, $fields = true, $cond = null, $order = null, int $page = 1, int $perPage = 20): array {
        $page = max(1, $page);
        $perPage = max(1, $perPage);

        $total = $this->count($table, $cond);
        $pages = (int)ceil($total / $perPage);
        $offset = ($page - 1) * $perPage;

        $rows = $this->select($table, $fields, $cond, $order, [$offset, $perPage]);
        if ($rows === true) $rows = [];

        return [
            'data'    => $rows,
            'total'   => $total,
            'page'    => $page,
            'perPage' => $perPage,
            'pages'   => $pages,
        ];
    }

    /**
     * UPSERT: INSERT ... ON DUPLICATE KEY UPDATE ...
     * $updateOnDup: ['col'=>'VALUES(col)'] или ['col'=>$value] или [] (тогда все non-PK из $data)
     */
    public function upsert(string $table, array $data, array $updateOnDup = []): bool {
        if (!$data) return true;
        $t = DBA::getFQTableName($table);
        $cols = array_keys($data);

        $args = [];
        $placeholders = array_fill(0, count($cols), '%s');
        foreach ($data as $v) {
            $args[] = $v;
        }
        $values = '('.implode(',', $placeholders).')';

        if (!$updateOnDup) {
            // по умолчанию обновляем все поля из $data (кроме явных PK — определить трудно без схемы,
            // поэтому оставляем как есть; при необходимости можно передать $updateOnDup явно)
            foreach ($cols as $c) {
                $updateOnDup[$c] = 'VALUES('.$c.')';
            }
        }

        $setParts = [];
        foreach ($updateOnDup as $c => $v) {
            if (is_string($v) && preg_match('~^VALUES\(.+\)$~i', $v)) {
                $setParts[] = $c.' = '.$v;
            } else {
                $args[] = $v;
                $setParts[] = $c.' = %s';
            }
        }

        $sql = 'INSERT INTO '.$t.' ('.implode(',', $cols).') VALUES '.$values
            .' ON DUPLICATE KEY UPDATE '.implode(', ', $setParts);

        $r = call_user_func_array([$this,'modifyRequest'], array_merge([$sql], $args));
        return (bool)$r;
    }

    /**
     * Bulk INSERT (батчами).
     * @return int количество вставленных строк (по сумме батчей)
     */
    public function insertMany(string $table, array $rows, int $chunk = 1000): int {
        if (!$rows) return 0;
        $t = DBA::getFQTableName($table);
        $cols = array_keys(reset($rows));
        $inserted = 0;
        foreach (array_chunk($rows, $chunk) as $batch) {
            $args = [];
            $valuesSqlParts = [];
            foreach ($batch as $row) {
                $vals = [];
                foreach ($cols as $c) {
                    $args[] = $row[$c];
                    $vals[] = '%s';
                }
                $valuesSqlParts[] = '('.implode(',', $vals).')';
            }
            $sql = 'INSERT INTO '.$t.' ('.implode(',', $cols).') VALUES '.implode(',', $valuesSqlParts);
            $t0 = microtime(true);
            $execArgs = array_merge([$sql], $args);
            $r = call_user_func_array([$this,'modifyRequest'], $execArgs);
            $this->maybeLogQuery($this->getLastRequest(), $execArgs, $t0, (int)$r, true);
            $inserted += (int)$r;
        }
        return $inserted;
    }

    /**
     * Bulk UPDATE по ключу через CASE WHEN.
     * @param string $keyField имя PK/уникального столбца
     * @return int количество обработанных строк (оценочно)
     */
    public function updateMany(string $table, array $rows, string $keyField, int $chunk = 1000): int {
        if (!$rows) return 0;
        $t = DBA::getFQTableName($table);
        $count = 0;
        foreach (array_chunk($rows, $chunk) as $batch) {
            // собрать список обновляемых колонок
            $allCols = [];
            foreach ($batch as $r) { $allCols = array_unique(array_merge($allCols, array_keys($r))); }
            $cols = array_values(array_diff($allCols, [$keyField]));
            if (!$cols) continue;

            // строим CASE по каждой колонке
            $args = [];
            $sets = [];
            foreach ($cols as $col) {
                $cases = [];
                foreach ($batch as $r) {
                    if (!array_key_exists($col, $r) || !array_key_exists($keyField, $r)) continue;
                    $args[] = $r[$keyField];
                    $args[] = $r[$col];
                    $cases[] = 'WHEN %s THEN %s';
                }
                if ($cases) {
                    // UPDATE t SET col = CASE key WHEN k1 THEN v1 ... ELSE col END
                    $sets[] = $col.' = CASE '.$keyField.' '.implode(' ', $cases).' ELSE '.$col.' END';
                }
            }

            if (!$sets) continue;

            // WHERE key IN (...)
            $keys = array_column($batch, $keyField);
            $keys = array_values(array_filter($keys, fn($v) => $v !== null));
            if (!$keys) continue;

            $whereArgs = [];
            $where = $this->buildWhereCondition([$keyField.' IN' => $keys], $whereArgs);
            $sql = 'UPDATE '.$t.' SET '.implode(', ', $sets).$where;

            $t0 = microtime(true);
            $execArgs = array_merge([$sql], $args, $whereArgs);
            $r = call_user_func_array([$this,'modifyRequest'], $execArgs);
            $this->maybeLogQuery($this->getLastRequest(), $execArgs, $t0, (int)$r, true);
            $count += (int)$r;
        }
        return $count;
    }

    /**
     * Транзакция с опциональным ретраем дедлоков.
     * @param callable $fn function(QAL $db): mixed
     * @param int $retries сколько раз повторять при дедлоке
     * @param string|null $isolation 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE'
     */
    public function transaction(callable $fn, int $retries = 1, ?string $isolation = null) {
        if ($isolation) {
            $this->pdo->exec('SET SESSION TRANSACTION ISOLATION LEVEL '.$isolation);
        }
        $this->beginTransaction();
        try {
            $r = $fn($this);
            $this->commit();
            return $r;
        } catch (\PDOException $e) {
            $this->rollback();
            if ($this->isDeadlock($e) && $retries > 0) {
                return $this->transaction($fn, $retries - 1, $isolation);
            }
            throw $e;
        } catch (\Throwable $e) {
            $this->rollback();
            throw $e;
        }
    }

    // ---------------------------------------------------------------------
    // ВНУТРЕННИЕ ХЕЛПЕРЫ
    // ---------------------------------------------------------------------

    /** Определение дедлока по SQLSTATE/тексту. */
    private function isDeadlock(\PDOException $e): bool {
        $sqlState = $e->getCode(); // '40001' (InnoDB) или пусто
        return $sqlState === '40001'
            || str_contains($e->getMessage(), '1213') // Deadlock found
            || str_contains($e->getMessage(), '1205'); // Lock wait timeout
    }

    /**
     * Логирование “медленных” запросов (если Monolog есть в реестре).
     * @param string $sql
     * @param array $params
     * @param float $t0
     * @param int $rows
     * @param bool $ok
     */
    private function maybeLogQuery(string $sql, array $params, float $t0, int $rows, bool $ok): void {
        $logger = null;
        try { $logger = E()->logger ?? null; } catch (\Throwable $e) {}
        if (!$logger) return;

        $ms = (int)round((microtime(true) - $t0) * 1000);
        $context = [
            'duration_ms' => $ms,
            'rows'        => $rows,
            'sql'         => $sql,
        ];
        if ($params) $context['params'] = $params;

        if ($ms >= $this->slowMs) {
            $logger->warning('Slow query', $context);
        } else {
            //$logger->info('Query', $context);
        }
    }

    /**
     * Вернуть данные для внешнего ключа (список опций для FK).
     *
     * Возвращает кортеж из трёх элементов:
     *  - [0] array|true  — результат SELECT (массив строк или true, если пусто)
     *  - [1] string      — имя ключевого поля ($fkKeyName)
     *  - [2] string      — имя поля-значения (обычно *_name)
     *
     * Логика:
     * 1) Пытается взять поле-значение как "<префикс>_name" от $fkKeyName.
     *    Если такого поля нет в основной таблице и есть *_translation —
     *    берёт значение из таблицы переводов (JOIN по lang_id).
     * 2) Если есть колонка вида *_order_num — сортирует по ней ASC.
     * 3) Параметр $filter можно передавать как массив условий (поддерживается
     *    твой buildWhereCondition) либо как строку WHERE-части.
     *
     * @param string     $fkTableName     Имя таблицы FK
     * @param string     $fkKeyName       Имя PK/ссылочного поля (например, country_id)
     * @param int        $currentLangID   Текущий lang_id
     * @param array|string|null $filter   Доп. фильтр (опц.)
     * @return array{0: array|true, 1: string, 2: string}
     */
    public function getForeignKeyData(string $fkTableName, string $fkKeyName, int $currentLangID, $filter = null): array
    {
        // Предполагаем *_name от *_id; если подчеркивания нет – используем то же поле
        $pos = strrpos($fkKeyName, '_');
        $fkValueName = ($pos !== false) ? substr($fkKeyName, 0, $pos) . '_name' : $fkKeyName;

        // Метаданные основной таблицы
        $columns = $this->getColumnsInfo($fkTableName);

        // Колонка для сортировки (первая *_order_num)
        $order = '';
        foreach (array_keys($columns) as $col) {
            if (strpos($col, '_order_num') !== false) {
                $order = $col . ' ' . self::ASC;
                break;
            }
        }

        // Есть ли таблица переводов
        $transTableName = $this->getTranslationTablename($fkTableName);

        // --- Вариант 1: берём значение из основной таблицы
        if (isset($columns[$fkValueName]) || !$transTableName) {
            // Не тянем TEXT-поля, чтобы не раздувать ответ
            $cols = array_keys(array_filter(
                $columns,
                fn($meta) => ($meta['type'] ?? null) !== self::COLTYPE_TEXT
            ));

            $sql  = 'SELECT ' . implode(', ', $cols) . ' FROM ' . DBA::getFQTableName($fkTableName);
            $args = [];

            if ($filter) {
                $sql .= $this->buildWhereCondition($filter, $args);
            }
            if ($order) {
                $sql .= ' ORDER BY ' . $order;
            }

            $res = call_user_func_array([$this, 'selectRequest'], array_merge([$sql], $args));
            return [$res, $fkKeyName, $fkValueName];
        }

        // --- Вариант 2: значение берём из таблицы переводов
        $transCols = $this->getColumnsInfo($transTableName);
        if (!isset($transCols[$fkValueName])) {
            // Если и в переводах поля нет — используем ключевое
            $fkValueName = $fkKeyName;
        }

        $tMain = DBA::getFQTableName($fkTableName);
        $tTr   = DBA::getFQTableName($transTableName);

        // Базовый запрос с JOIN по lang_id
        $sql  = sprintf(
            'SELECT %2$s.*, %3$s.%1$s 
         FROM %2$s 
         LEFT JOIN %3$s ON %3$s.%4$s = %2$s.%4$s 
         WHERE %3$s.lang_id = %%s',
            $fkValueName, $tMain, $tTr, $fkKeyName
        );
        $args = [$currentLangID];

        // Дополнительный фильтр
        if ($filter) {
            // buildWhereCondition вернёт " WHERE ...", нам нужно " AND ..."
            $argsExtra = [];
            $where = $this->buildWhereCondition($filter, $argsExtra);
            if ($where) {
                $sql  .= ' AND ' . ltrim(preg_replace('/^\s*WHERE\s+/i', '', $where));
                $args  = array_merge($args, $argsExtra);
            }
        }

        if ($order) {
            $sql .= ' ORDER BY ' . $order;
        }

        $res = call_user_func_array([$this, 'selectRequest'], array_merge([$sql], $args));
        return [$res, $fkKeyName, $fkValueName];
    }
}
