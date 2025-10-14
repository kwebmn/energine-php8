<?php
declare(strict_types=1);

/**
 * Database Abstraction Layer (совместимо с legacy-кодом).
 *
 * - PDO в режиме исключений
 * - Кодировка по умолчанию utf8mb4
 * - Все запросы выполняются через подготовленные выражения
 * - Возвращаемые значения те же:
 *     * selectRequest(): array|true
 *     * modifyRequest(): int|true
 */

abstract class DBA extends BaseObject
{
    /** @var \PDO */
    protected PDO $pdo;

    /** Последний SQL (готовая строка или PDO::queryString при prepared) */
    protected string $lastQuery = '';

    /** Кэш структуры БД */
    private DBStructureInfo $dbCache;

    // Типы столбцов (оставлены для совместимости)
    public const COLTYPE_INTEGER   = 'INT';
    public const COLTYPE_FLOAT     = 'FLOAT';
    public const COLTYPE_DATE      = 'DATE';
    public const COLTYPE_TIME      = 'TIME';
    public const COLTYPE_TIMESTAMP = 'TIMESTAMP';
    public const COLTYPE_DATETIME  = 'DATETIME';
    public const COLTYPE_STRING    = 'VARCHAR';
    public const COLTYPE_TEXT      = 'TEXT';
    public const COLTYPE_BLOB      = 'BLOB';

    // Ошибка
    public const ERR_BAD_REQUEST   = 'ERR_DATABASE_ERROR';

    // Индексы
    public const PRIMARY_INDEX = 'PRI';
    public const UNIQUE_INDEX  = 'UNI';
    public const INDEX         = 'MUL';

    /**
     * @param string $dsn
     * @param string $username
     * @param string $password
     * @param array  $driverOptions
     * @param string $charset
     *
     * @throws SystemException
     */
    public function __construct(
        string $dsn,
        string $username,
        string $password,
        array  $driverOptions,
        string $charset = 'utf8mb4'
    ) {
        try {
            // Современные значения по умолчанию
            $driverOptions[PDO::ATTR_ERRMODE]            = PDO::ERRMODE_EXCEPTION;
            $driverOptions[PDO::ATTR_DEFAULT_FETCH_MODE] = PDO::FETCH_ASSOC;

            // Создание соединения
            $this->pdo = new PDO($dsn, $username, $password, $driverOptions);

            // Явно задаём кодировку (универсально для старых DSN)
            $charset = $charset ?: 'utf8mb4';
            $this->pdo->exec('SET NAMES ' . $charset);
            $this->pdo->exec('SET CHARSET ' . $charset);

            // Кэш структуры БД
            $this->dbCache = new DBStructureInfo($this->pdo);
        } catch (PDOException $e) {
            // Сообщение оставляем совместимым
            throw new SystemException(
                'Unable to connect. The site is temporarily unavailable.',
                SystemException::ERR_DB,
                'The site is temporarily unavailable'
            );
        }
    }

    /**
     * Доступ к сырому PDO (для низкоуровневых случаев)
     */
    public function getPDO(): PDO
    {
        return $this->pdo;
    }

    /**
     * Выполнить SELECT.
     *
     * Возвращает:
     *  - array (результат)
     *  - true  (если строк нет)
     *
     * @throws SystemException
     */
    public function selectRequest(string $query /* , ...args */): array|bool
    {
        $stmt = $this->fulfill(...func_get_args());

        if (!($stmt instanceof PDOStatement)) {
            $errorInfo = $this->pdo->errorInfo();
            throw new SystemException($errorInfo[2] ?? 'DB error', SystemException::ERR_DB, [$this->getLastRequest()]);
        }

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return empty($rows) ? true : $rows;
    }

    /**
     * INSERT / UPDATE / DELETE.
     *
     * Возвращает:
     *  - int  lastInsertId, если есть
     *  - true если lastInsertId == 0
     *
     * @throws SystemException
     */
    public function modifyRequest(string $query /* , ...args */): int|bool
    {
        $stmt = $this->fulfill(...func_get_args());

        if (!($stmt instanceof PDOStatement)) {
            $errorInfo = $this->pdo->errorInfo();
            throw new SystemException($errorInfo[2] ?? 'DB error', SystemException::ERR_DB, [$this->getLastRequest()]);
        }

        $id = (int) $this->pdo->lastInsertId();
        return $id === 0 ? true : $id;
    }

    /**
     * Вызов процедуры.
     *
     * @param string   $name
     * @param array|null $args   — параметры по ссылке (оставлено как раньше)
     * @param bool     $answer  — нужно ли читать ответ
     * @return array|bool
     */
    public function call(string $name, ?array &$args = null, bool $answer = true): array|bool
    {
        if (!$args) {
            $stmt = $this->pdo->query("CALL {$name}()");
            return $answer ? ($stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : false) : (bool)$stmt;
        }

        $placeholders = implode(',', array_fill(0, count($args), '?'));
        $stmt = $this->pdo->prepare("CALL {$name}({$placeholders})");

        foreach ($args as $i => &$v) {
            // биндим «как есть»; при желании можно добавить типизацию
            $stmt->bindParam($i + 1, $v);
        }

        $ok = $stmt->execute();
        return $answer ? ($ok ? $stmt->fetchAll(PDO::FETCH_ASSOC) : false) : $ok;
    }

    /**
     * Получить PDOStatement для ручной итерации.
     */
    public function get(string $query /* , ...args */): bool|PDOStatement
    {
        $stmt = $this->fulfill(...func_get_args());
        return ($stmt instanceof PDOStatement) ? $stmt : false;
    }

    /**
     * Унифицированный запуск SQL.
     * Всегда использует подготовленные выражения.
     *
     * @return bool|PDOStatement
     */
    protected function fulfill(string $request /* , ...args */): bool|PDOStatement
    {
        $args = func_get_args();
        if (empty($args) || !is_string($request) || $request === '') {
            return false;
        }

        $stmt = $this->runQuery($args);
        if ($stmt instanceof PDOStatement) {
            $this->lastQuery = $this->interpolateQuery($request, array_slice($args, 1));
        }

        return $stmt;
    }

    /**
     * Экранировать строку (как раньше).
     */
    public function quote(string $string): string|false
    {
        return $this->pdo->quote($string);
    }

    /**
     * Последний SQL.
     */
    public function getLastRequest(): string
    {
        return $this->lastQuery;
    }

    /**
     * Последняя ошибка PDO::errorInfo().
     */
    public function getLastError(): array
    {
        return $this->pdo->errorInfo();
    }

    public function beginTransaction(): bool
    {
        return $this->pdo->beginTransaction();
    }

    public function commit(): bool
    {
        return $this->pdo->commit();
    }

    public function rollback(): bool
    {
        return $this->pdo->rollBack();
    }

    /**
     * Метаданные столбцов таблицы (кэшируются DBStructureInfo).
     */
    public function getColumnsInfo(string $tableName): array
    {
        return $this->dbCache->getTableMeta($tableName);
    }

    /**
     * Таблица переводов для указанной (если существует).
     */
    public function getTranslationTablename(string $tableName): string|bool
    {
        return $this->tableExists($tableName . '_translation');
    }

    /**
     * Проверка существования таблицы.
     */
    public function tableExists(string $tableName): string|bool
    {
        return $this->dbCache->tableExists($tableName) ? $tableName : false;
    }

    /**
     * Существует ли процедура.
     */
    public function procExists(string $procName): bool
    {
        return (bool)$this->getScalar(
            'SELECT ROUTINE_NAME
               FROM information_schema.ROUTINES
              WHERE ROUTINE_TYPE="PROCEDURE"
                AND ROUTINE_SCHEMA=%s
                AND ROUTINE_NAME=%s',
            E()->getConfigValue('database.db'),
            $procName
        );
    }

    /**
     * Существует ли функция.
     */
    public function funcExists(string $funcName): bool
    {
        return (bool)$this->getScalar(
            'SELECT ROUTINE_NAME
               FROM information_schema.ROUTINES
              WHERE ROUTINE_TYPE="FUNCTION"
                AND ROUTINE_SCHEMA=%s
                AND ROUTINE_NAME=%s',
            E()->getConfigValue('database.db'),
            $funcName
        );
    }

    /**
     * Полностью квалифицированное имя таблицы в кавычках MySQL.
     *
     * @return string|array
     */
    public static function getFQTableName(string $tableName, bool $returnAsArray = false): string|array
    {
        $result = [];
        $tableName = str_replace('`', '', $tableName);

        if ($pos = strpos($tableName, '.')) {
            $result[] = substr($tableName, 0, $pos);
            $tableName = substr($tableName, $pos + 1);
        }
        $result[] = $tableName;

        if ($returnAsArray) {
            return $result;
        }

        return implode('.', array_map(static fn($p) => '`' . $p . '`', $result));
    }

    /**
     * Построить строку SQL из аргументов (legacy-режим).
     *
     * @deprecated Используйте prepare / runQuery()
     */
    protected function constructQuery(array $args): string
    {
        if (count($args) > 1) {
            $query = array_shift($args);
            foreach ($args as &$arg) {
                $arg = is_null($arg) ? 'NULL' : $this->pdo->quote((string)$arg);
            }
            array_unshift($args, $query);
            /** @var string $query */
            $query = call_user_func_array('sprintf', $args);
            return $query;
        }

        return (string)$args[0];
    }

    /**
     * Выполнить запрос в prepared-режиме.
     *
     * Аргументы:
     *  - [0] => SQL (может быть с %s, %1$s и т.п. — будут заменены на ?)
     *  - [1..N] => значения
     *
     * @throws SystemException
     */
    protected function runQuery(array $args): PDOStatement
    {
        if (empty($args)) {
            throw new SystemException(self::ERR_BAD_REQUEST);
        }

        $query = array_shift($args);
        $query = str_replace('%%', '%', (string)$query);

        $data = [];
        // Поддержка sprintf-плейсхолдеров вида %s / %1$s
        if (!empty($args) && preg_match_all('~%(?:(\d+)\$)?s~', $query, $m)) {
            $query = preg_replace('~%(?:(\d+)\$)?s~', '?', $query);
            $argIndex = 0;
            foreach ($m[1] as $pos) {
                if ($pos = (int)$pos) {
                    $data[] = $args[$pos - 1] ?? null;
                } else {
                    $data[] = $args[$argIndex++] ?? null;
                }
            }
        } else {
            $data = $args;
        }

        $stmt = $this->pdo->prepare($query);
        if (!$stmt) {
            throw new SystemException('ERR_PREPARE_REQUEST', SystemException::ERR_DB, $query);
        }
        if (!$stmt->execute($data)) {
            throw new SystemException('ERR_EXECUTE_REQUEST', SystemException::ERR_DB, [$query, $data]);
        }

        return $stmt;
    }

    /**
     * Сформировать текст SQL с подставленными параметрами (для логирования).
     */
    private function interpolateQuery(string $query, array $params): string
    {
        if ($params === []) {
            return $query;
        }

        $quoted = array_map(function ($value) {
            if ($value === null) {
                return 'NULL';
            }
            return $this->pdo->quote((string)$value);
        }, $params);

        if (preg_match('~%(?:(\d+)\$)?s~', $query)) {
            return vsprintf($query, $quoted);
        }

        if (str_contains($query, '?')) {
            foreach ($quoted as $replacement) {
                $query = preg_replace('/\?/', $replacement, $query, 1);
            }
        }

        return $query;
    }

    /* ===== Удобняшки, используемые выше (оставьте как есть в вашем проекте) =====
     * Метод getScalar() обычно реализован в дочернем QAL/DBWorker (или можно добавить сюда).
     * Если у вас его нет — можно быстро эмулировать:
     *
     * protected function getScalar(string $sql, ...$args): mixed {
     *     $stmt = $this->fulfill($sql, ...$args);
     *     if (!($stmt instanceof PDOStatement)) return null;
     *     $row = $stmt->fetch(PDO::FETCH_NUM);
     *     return $row[0] ?? null;
     * }
     */
}
