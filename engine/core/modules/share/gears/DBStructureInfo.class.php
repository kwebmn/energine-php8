<?php

declare(strict_types=1);

/**
 * DBStructureInfo — сбор и кеширование метаданных БД.
 *
 * Совместим с прежним форматом:
 * [
 *   'col' => [
 *      'nullable' => bool,
 *      'length'   => int,
 *      'default'  => mixed,
 *      'key'      => bool|array{tableName:string,fieldName:string,constraint?:string},
 *      'type'     => DBA::COLTYPE_*,
 *      'index'    => 'PRI'|'UNI'|'MUL'|false,
 *      'tableName'=> string
 *   ],
 *   ...
 * ]
 */
class DBStructureInfo extends BaseObject
{
    /** @var array<string, array>|array<string,false> */
    private array $structure = [];

    private PDO $pdo;

    /** Необязательный PSR-16 кеш */
    private ?\Psr\SimpleCache\CacheInterface $psrCache = null;

    /** Легаси-кеш (совместим с вашим Cache) */
    private $legacyCache = null;

    /** Отмеченные таблицы с уже дополненными данными о внешних ключах. */
    private array $fkAugmented = [];

    public function __construct(PDO $pdo, $cache = null)
    {
        $this->pdo = $pdo;

        // 1) Явно переданный кеш
        if ($cache instanceof \Psr\SimpleCache\CacheInterface)
        {
            $this->psrCache = $cache;
        }
        elseif (is_object($cache))
        {
            $this->legacyCache = $cache;
        }
        else
        {
            // 2) Попробуем достать из реестра
            try
            {
                if (function_exists('E'))
                {
                    $reg = E();
                    if (isset($reg->psrCache) && $reg->psrCache instanceof \Psr\SimpleCache\CacheInterface)
                    {
                        $this->psrCache = $reg->psrCache;
                    }
                    elseif (method_exists($reg, 'getCache'))
                    {
                        $lc = $reg->getCache();
                        if (is_object($lc))
                        {
                            $this->legacyCache = $lc;
                        }
                    }
                }
            }
            catch (\Throwable)
            {
                // тихо
            }
        }

        // 3) Попробуем загрузить из кеша (если доступен)
        $loaded = null;
        if ($this->psrCache)
        {
            $loaded = $this->psrCache->get(Cache::DB_STRUCTURE_KEY);
        }
        elseif ($this->legacyCache && method_exists($this->legacyCache, 'isEnabled') && $this->legacyCache->isEnabled())
        {
            $loaded = $this->legacyCache->retrieve(Cache::DB_STRUCTURE_KEY);
        }

        if (is_array($loaded))
        {
            $this->structure = $loaded;
        }
    }

    /**
     * Есть ли таблица.
     */
    public function tableExists(string $tableName): bool
    {
        // кэш уже что-то знает?
        if (array_key_exists($tableName, $this->structure))
        {
            return is_array($this->structure[$tableName]);
        }

        // разложим имя на БД и таблицу; если БД не указана — берём текущую
        [$db, $tbl] = array_pad(DBA::getFQTableName($tableName, true), 2, null);
        if (!$tbl) // пришло только имя таблицы
        {
            $tbl = $db; // сдвигаем
            $db  = null;
        }
        if (!$db)
        {
            $db = (string)$this->pdo->query('SELECT DATABASE()')->fetchColumn();
        }

        // information_schema понимает плейсхолдеры
        $sql  = 'SELECT COUNT(*) 
                 FROM information_schema.TABLES 
                 WHERE TABLE_SCHEMA = :db AND TABLE_NAME = :tbl';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':db' => $db, ':tbl' => $tbl]);
        $exists = (bool)$stmt->fetchColumn();

        // сохраняем в локальный кэш структуры (true: позже дособерём метаданные)
        $this->structure[$tableName] = $exists ? [] : false;

        $this->persistCache();

        return $exists;
    }

    /**
     * Метаданные по таблице (или вью).
     * Возвращает массив колонок в «нашем» формате.
     */
    public function getTableMeta(string $tableName): array
    {
        // если уже есть заполненные метаданные — отдадим
        if (isset($this->structure[$tableName]) && is_array($this->structure[$tableName]) && $this->structure[$tableName] !== [])
        {
            $meta = $this->structure[$tableName];
            if (!($this->fkAugmented[$tableName] ?? false))
            {
                $meta = $this->ensureForeignKeyMetadata($tableName, $meta);
                $this->structure[$tableName] = $meta;
                $this->fkAugmented[$tableName] = true;
                $this->persistCache();
            }
            return $meta;
        }

        // попытаемся как «таблица»
        $meta = $this->analyzeTable($tableName);

        // если пусто — возможно это VIEW
        if (!$meta)
        {
            $meta = $this->analyzeView($tableName) ?: [];
        }

        // дополним tableName в каждой колонке (совместимость со старым кодом)
        foreach ($meta as &$col)
        {
            $col['tableName'] = $tableName;
        }

        // дополним сведениями о внешних ключах (и закешируем)
        $meta = $this->ensureForeignKeyMetadata($tableName, $meta);
        $this->structure[$tableName] = $meta;
        $this->fkAugmented[$tableName] = true;
        $this->persistCache();

        return $this->structure[$tableName];
    }

    /**
     * Собрать метаданные по всем таблицам (используется редко; может быть тяжёлым).
     */
    private function collectDBInfo(): array
    {
        $result = [];
        $stmt = $this->pdo->query('SHOW FULL TABLES');
        if ($stmt)
        {
            // в MySQL колонка называется вроде "Tables_in_db" + "Table_type"
            while ($row = $stmt->fetch(PDO::FETCH_NUM))
            {
                $name = (string)($row[0] ?? '');
                $type = strtolower((string)($row[1] ?? ''));
                if ($name === '')
                {
                    continue;
                }

                if ($type === 'view')
                {
                    $meta = $this->analyzeView($name) ?: [];
                }
                else
                {
                    $meta = $this->analyzeTable($name) ?: [];
                }
                foreach ($meta as &$col)
                {
                    $col['tableName'] = $name;
                }
                $result[$name] = $meta;
            }
        }
        return $result;
    }

    /**
     * Анализ обычной таблицы.
     */
    private function analyzeTable(string $tableName): array
    {        
        // разбор db/table
        $parts = DBA::getFQTableName($tableName, true);
        
        // последний элемент — всегда имя таблицы
        $tbl = $parts[count($parts) - 1];
        // предпоследний — база (если есть)
        $db  = $parts[count($parts) - 2] ?? null;

        // если база не указана — берём текущую
        if (!$db)
        {
            $db = $this->pdo->query('SELECT DATABASE()')->fetchColumn();
        }

        $qualified = ($db ? "`{$db}`." : '') . "`{$tbl}`";

        $cols = [];
        $idxs = [];
        $fkMap = [];

        try
        {
            // основной путь — быстрый
            $colsStmt = $this->pdo->query("SHOW FULL COLUMNS FROM {$qualified}");
            $idxStmt  = $this->pdo->query("SHOW INDEX FROM {$qualified}");
            if ($colsStmt)
            {
                $cols = $colsStmt->fetchAll(PDO::FETCH_ASSOC);
            }
            if ($idxStmt)
            {
                $idxs = $idxStmt->fetchAll(PDO::FETCH_ASSOC);
            }
            
        }
        catch (\PDOException $e)
        {
            
            // если это не 1142 — пробрасываем дальше
            $errno = $e->errorInfo[1] ?? null;
            if ((int)$errno !== 1142)
            {
                throw $e;
            }
            // ---- Fallback через information_schema ----
            $cSql = 'SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION,
                            IS_NULLABLE, COLUMN_DEFAULT
                     FROM information_schema.COLUMNS
                     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?';
            $iSql = 'SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE
                     FROM information_schema.STATISTICS
                     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?';

            $st = $this->pdo->prepare($cSql);
            $st->execute([$db, $tbl]);
            $cols = $st->fetchAll(PDO::FETCH_ASSOC);

            $st = $this->pdo->prepare($iSql);
            $st->execute([$db, $tbl]);
            $idxs = $st->fetchAll(PDO::FETCH_ASSOC);
        }

        try
        {
            $fkSql = 'SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_SCHEMA
                      FROM information_schema.KEY_COLUMN_USAGE
                      WHERE TABLE_SCHEMA = :db AND TABLE_NAME = :tbl AND REFERENCED_TABLE_NAME IS NOT NULL';
            $fkStmt = $this->pdo->prepare($fkSql);
            $fkStmt->execute([':db' => $db, ':tbl' => $tbl]);
            while ($fkRow = $fkStmt->fetch(PDO::FETCH_ASSOC))
            {
                $column     = $fkRow['COLUMN_NAME']             ?? $fkRow['Column_name']            ?? null;
                $refTable   = $fkRow['REFERENCED_TABLE_NAME']   ?? $fkRow['Referenced_table_name']  ?? null;
                $refColumn  = $fkRow['REFERENCED_COLUMN_NAME']  ?? $fkRow['Referenced_column_name'] ?? null;
                $constraint = $fkRow['CONSTRAINT_NAME']         ?? $fkRow['Constraint_name']        ?? null;
                $refSchema  = $fkRow['REFERENCED_TABLE_SCHEMA'] ?? $fkRow['Referenced_table_schema'] ?? null;

                if (!$column || !$refTable || !$refColumn)
                {
                    continue;
                }

                $qualifiedRefTable = $refTable;
                if ($refSchema && strcasecmp($refSchema, (string)$db) !== 0)
                {
                    $qualifiedRefTable = "{$refSchema}.{$refTable}";
                }

                $fkMap[$column] = [
                    'tableName'  => $qualifiedRefTable,
                    'fieldName'  => $refColumn,
                    'constraint' => $constraint ?: null,
                ];
            }
        }
        catch (\Throwable)
        {
            // ignore details; FK metadata is optional
        }

        // разберём индексы
        $primary = [];
        $mul = [];
        foreach ($idxs as $r)
        {
            $col  = $r['Column_name'] ?? $r['COLUMN_NAME'] ?? null;
            $name = $r['Key_name']    ?? $r['INDEX_NAME']   ?? '';
            if (!$col)
            {
                continue;
            }
            if (strcasecmp($name, 'PRIMARY') === 0)
            {
                $primary[$col] = true;
            }
            else
            {
                $mul[$col] = true;
            }
        }

        // соберём метаданные по колонкам
        $meta = [];
        foreach ($cols as $r)
        {
            // поддержка обоих источников
            $field = $r['Field']         ?? $r['COLUMN_NAME'];
            $typeS = $r['Type']          ?? $r['DATA_TYPE'];
            $nullS = $r['Null']          ?? $r['IS_NULLABLE'] ?? 'NO';
            $deflt = array_key_exists('Default', $r) ? $r['Default'] : ($r['COLUMN_DEFAULT'] ?? null);

            // длина
            $len = 0;
            if (isset($r['Type']) && preg_match('/\(([^)]+)\)/', $r['Type'], $m))
            {
                $len = (int)$m[1];
            }
            else
            {
                $len = (int)($r['CHARACTER_MAXIMUM_LENGTH'] ?? $r['NUMERIC_PRECISION'] ?? 0);
            }

            $meta[$field] = [
                'nullable' => (strcasecmp((string)$nullS, 'YES') === 0),
                'length'   => $len,
                'default'  => $deflt,
                'key'      => $fkMap[$field] ?? (isset($primary[$field]) ? true : false),
                'type'     => self::convertType((string)$typeS),
                'index'    => isset($primary[$field]) ? 'PRI' : (isset($mul[$field]) ? 'MUL' : false),
            ];
        }

        return $meta;
    }

    /**
     * Дополнить метаданные сведениями о внешних ключах, если они ещё не добавлены.
     *
     * @param array<string, array<string, mixed>> $meta
     * @return array<string, array<string, mixed>>
     */
    private function ensureForeignKeyMetadata(string $tableName, array $meta): array
    {
        foreach ($meta as $info)
        {
            if (isset($info['key']) && is_array($info['key']) && isset($info['key']['tableName']))
            {
                return $meta;
            }
        }

        $parts = DBA::getFQTableName($tableName, true);
        $tbl = $parts[count($parts) - 1] ?? null;
        $db  = $parts[count($parts) - 2] ?? null;

        if (!$tbl)
        {
            return $meta;
        }

        if (!$db)
        {
            try
            {
                $db = (string)$this->pdo->query('SELECT DATABASE()')->fetchColumn();
            }
            catch (\Throwable)
            {
                $db = null;
            }
        }

        if (!$db)
        {
            return $meta;
        }

        try
        {
            $fkSql = 'SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_SCHEMA
                      FROM information_schema.KEY_COLUMN_USAGE
                      WHERE TABLE_SCHEMA = :db AND TABLE_NAME = :tbl AND REFERENCED_TABLE_NAME IS NOT NULL';
            $fkStmt = $this->pdo->prepare($fkSql);
            $fkStmt->execute([':db' => $db, ':tbl' => $tbl]);

            while ($fkRow = $fkStmt->fetch(PDO::FETCH_ASSOC))
            {
                $column     = $fkRow['COLUMN_NAME']             ?? $fkRow['Column_name']            ?? null;
                $refTable   = $fkRow['REFERENCED_TABLE_NAME']   ?? $fkRow['Referenced_table_name']  ?? null;
                $refColumn  = $fkRow['REFERENCED_COLUMN_NAME']  ?? $fkRow['Referenced_column_name'] ?? null;
                $constraint = $fkRow['CONSTRAINT_NAME']         ?? $fkRow['Constraint_name']        ?? null;
                $refSchema  = $fkRow['REFERENCED_TABLE_SCHEMA'] ?? $fkRow['Referenced_table_schema'] ?? null;

                if (!$column || !$refTable || !$refColumn)
                {
                    continue;
                }
                if (!isset($meta[$column]) || !is_array($meta[$column]))
                {
                    continue;
                }

                $qualifiedRefTable = $refTable;
                if ($refSchema && strcasecmp($refSchema, (string)$db) !== 0)
                {
                    $qualifiedRefTable = "{$refSchema}.{$refTable}";
                }

                $meta[$column]['key'] = [
                    'tableName'  => $qualifiedRefTable,
                    'fieldName'  => $refColumn,
                    'constraint' => $constraint ?: null,
                ];
            }
        }
        catch (\Throwable)
        {
            // ignore failures; базовая мета уже пригодна
        }

        return $meta;
    }

    /**
     * Анализ VIEW — как в легаси: помечаем первый столбец как PRI.
     */
    private function analyzeView(string $viewName): array|false
    {
        $fq   = DBA::getFQTableName($viewName, true);
        $db   = $fq[0] ?? null;
        $tbl  = $fq[1] ?? ($fq[0] ?? null);
        if (!$tbl)
        {
            return false;
        }

        $qualified = $db ? ("`{$db}`.`{$tbl}`") : ("`{$tbl}`");

        $stmt = $this->pdo->query("SHOW COLUMNS FROM {$qualified}");
        if (!$stmt)
        {
            return false;
        }

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (!$rows)
        {
            return false;
        }

        $result = [];
        foreach ($rows as $i => $r)
        {
            $name    = (string)$r['Field'];
            $typeStr = strtolower((string)$r['Type']);
            $base    = $this->extractBaseType($typeStr);
            $length  = $this->extractLength($typeStr, $base);

            $type    = self::convertType($base);
            $isFirst = ($i === 0);

            $result[$name] = [
                'key'      => $isFirst ? true : false,
                'nullable' => (strtoupper((string)$r['Null']) === 'YES'),
                'type'     => $type,
                'length'   => $length ?: ($type === DBA::COLTYPE_STRING ? 100 : 10),
                'index'    => $isFirst ? 'PRI' : false,
                'default'  => array_key_exists('Default', $r) ? $r['Default'] : null,
            ];
        }

        return $result;
    }

    /**
     * Базовый тип из строки вида "varchar(255) unsigned".
     */
    private function extractBaseType(string $typeStr): string
    {
        if (preg_match('~^([a-z]+)~i', $typeStr, $m))
        {
            return strtolower($m[1]);
        }
        return strtolower($typeStr);
    }

    /**
     * Длина/precision из строки типа (для varchar(255), int(11), decimal(10,2)...)
     */
    private function extractLength(string $typeStr, string $base): int
    {
        if (preg_match('~\(([^)]+)\)~', $typeStr, $m))
        {
            $inside = $m[1]; // "255" или "10,2"
            if (str_contains($inside, ','))
            {
                [$p] = explode(',', $inside, 2);
                return (int)$p;
            }
            return (int)$inside;
        }
        return 0; // для TEXT/BLOB длина не задаётся
    }

    /**
     * Конвертация типов MySQL → типы Energine.
     * Принимает «сырые» типы из SHOW FULL COLUMNS (например, "INT(10) UNSIGNED", "TINYINT(1)", "CHAR(200)").
     * Нормализует до базового типа (INT, VARCHAR, TINYINT, …) и мапит на константы DBA::COLTYPE_*.
     */
    private static function convertType(string $mysqlRawType): string
    {
        // Нормализация: берём базовый тип до первой скобки/пробела (INT, VARCHAR, TINYINT, …)
        $t = strtoupper(trim($mysqlRawType));
        if (preg_match('/^([A-Z]+)/', $t, $m))
        {
            $t = $m[1];
        }

        return match ($t)
        {
            // целые
            'TINYINT', 'SMALLINT', 'MEDIUMINT', 'INT', 'INTEGER', 'BIGINT', 'YEAR'
            => DBA::COLTYPE_INTEGER,

            // числа с плавающей точкой/фикс. точностью
            'FLOAT', 'DOUBLE', 'REAL', 'DECIMAL', 'NUMERIC', 'DOUBLEPRECISION'
            => DBA::COLTYPE_FLOAT,

            // даты/время
            'DATE'      => DBA::COLTYPE_DATE,
            'TIME'      => DBA::COLTYPE_TIME,
            'TIMESTAMP' => DBA::COLTYPE_TIMESTAMP,
            'DATETIME'  => DBA::COLTYPE_DATETIME,

            // строки
            'CHAR', 'VARCHAR', 'NCHAR', 'NVARCHAR', 'ENUM', 'SET'
            => DBA::COLTYPE_STRING,

            // текстовые большие поля (+ JSON трактуем как текст)
            'TEXT', 'TINYTEXT', 'MEDIUMTEXT', 'LONGTEXT', 'JSON'
            => DBA::COLTYPE_TEXT,

            // бинарные
            'BLOB', 'TINYBLOB', 'MEDIUMBLOB', 'LONGBLOB', 'BINARY', 'VARBINARY', 'BIT'
            => DBA::COLTYPE_BLOB,

            // дефолт безопасный вариант
            default => DBA::COLTYPE_STRING,
        };
    }

    /**
     * Сохранить структуру в кеш (если он есть).
     */
    private function persistCache(): void
    {
        if ($this->psrCache)
        {
            try
            {
                $this->psrCache->set(Cache::DB_STRUCTURE_KEY, $this->structure);
            }
            catch (\Throwable)
            {
            }
        }
        elseif ($this->legacyCache && method_exists($this->legacyCache, 'isEnabled') && $this->legacyCache->isEnabled())
        {
            try
            {
                $this->legacyCache->store(Cache::DB_STRUCTURE_KEY, $this->structure);
            }
            catch (\Throwable)
            {
            }
        }
    }
}
