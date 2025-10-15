<?php

declare(strict_types=1);

use Energine\Core\ExtraManager\ExtraManagerInterface;

/**
 * @file
 * TagManager (safe transactions + typed props + small perf tweaks)
 */

class TagManager extends DBWorker implements ExtraManagerInterface
{
    /** Таблица тегов */
    public const TAG_TABLENAME = 'share_tags';
    /** Суффикс m2m-таблицы тегов */
    public const TAGS_TABLE_SUFFIX = '_tags';
    /** Таблица переводов тегов */
    public const TAG_TABLENAME_TRANSLATION = 'share_tags_translation';
    /** Разделитель тегов в строковом представлении */
    public const TAG_SEPARATOR = ',';

    /** @var DataDescription|null */
    private ?DataDescription $dataDescription = null;
    /** @var Data|null */
    private ?Data $data = null;
    /** @var string Имя m2m-таблицы (target_tags) */
    private string $tableName = '';
    /** @var bool Активен ли менеджер (есть ли m2m-таблица) */
    private bool $isActive = false;
    /** @var FieldDescription|null PK описания данных */
    private ?FieldDescription $pk = null;

    /** @var array<string,mixed> */
    private array $context = [];

    /** @var DataDescription|null активное описание данных для ExtraManager. */
    private ?DataDescription $currentDataDescription = null;

    /**
     * @param DataDescription|null $dataDescription
     * @param Data|null            $data
     * @param string|null          $tableName  Имя «главной» таблицы без суффикса (_tags будет добавлен автоматически)
     */
    public function __construct(?DataDescription $dataDescription = null, ?Data $data = null, ?string $tableName = null)
    {
        parent::__construct();

        if ($dataDescription && $data && $tableName)
        {
            $this->initialiseLegacy($dataDescription, $data, $tableName);
        }
    }

    private function initialiseLegacy(DataDescription $dataDescription, Data $data, string $tableName): void
    {
        $this->tableName = $tableName . self::TAGS_TABLE_SUFFIX;
        $this->isActive  = (bool)$this->dbh->tableExists($this->tableName);

        if ($this->isActive)
        {
            $this->dataDescription = $dataDescription;
            $this->data            = $data;

            foreach ($this->dataDescription as $fd)
            {
                if ($fd->getPropertyValue('key'))
                {
                    $this->pk = $fd;
                    break;
                }
            }
        }
    }

    public function setContext(array $context): void
    {
        $this->context = $context;
    }

    public function supports(string $tableName, DataDescription $dataDescription): bool
    {
        $this->tableName              = $tableName . self::TAGS_TABLE_SUFFIX;
        $this->currentDataDescription = $dataDescription;
        $this->isActive               = (bool)$this->dbh->tableExists($this->tableName);

        if ($this->isActive)
        {
            // Найдём PK для последующего pull()
            foreach ($dataDescription as $fd)
            {
                if ($fd->getPropertyValue('key'))
                {
                    $this->pk = $fd;
                    break;
                }
            }
        }

        return $this->isActive;
    }

    public function addFieldDescription(DataDescription $dataDescription): void
    {
        if (!$this->isActive)
        {
            return;
        }

        $fd = $dataDescription->getFieldDescriptionByName('tags');
        if (!$fd)
        {
            $fd = new FieldDescription('tags');
            $dataDescription->addFieldDescription($fd);
        }

        $fd->setType(FieldDescription::FIELD_TYPE_TEXTBOX_LIST)
            ->setProperty('url', 'tag-autocomplete')
            ->setProperty('separator', self::TAG_SEPARATOR);
    }

    public function addField(Data $data, string $tableName, ?string $recordId = null): void
    {
        if (!$this->isActive)
        {
            return;
        }

        $field = $data->getFieldByName('tags');
        if ($field === false)
        {
            $field = new Field('tags');
            $data->addField($field);
        }

        if ($recordId !== null)
        {
            $values = $this->pull((int)$recordId, $tableName . self::TAGS_TABLE_SUFFIX);
            $field->setData($values);
        }
    }

    public function build(\DOMDocument $document): void
    {
        // nothing to inject
    }

    /**
     * Гарантирует наличие FD для поля tags (textbox-list с автокомплитом).
     */
    public function createFieldDescription(): void
    {
        if (!$this->isActive || !$this->dataDescription)
        {
            return;
        }

        $fd = $this->dataDescription->getFieldDescriptionByName('tags');
        if (!$fd)
        {
            $fd = new FieldDescription('tags');
            $this->dataDescription->addFieldDescription($fd);
        }

        $fd->setType(FieldDescription::FIELD_TYPE_TEXTBOX_LIST)
            ->setProperty('url', 'tag-autocomplete')
            ->setProperty('separator', self::TAG_SEPARATOR);
    }

    /**
     * Создаёт поле данных tags и наполняет его текущими значениями для записи(ей).
     *
     * @param mixed $initialValue Если null — подтягивает из БД, иначе устанавливает переданное значение
     */
    public function createField($initialValue = null): void
    {
        if (!$this->isActive || !$this->data)
        {
            return;
        }

        $field = new Field('tags');

        if ($initialValue === null)
        {
            if (!$this->data->isEmpty() && $this->pk)
            {
                $currentData = $this->data->getFieldByName($this->pk->getName());
                if ($currentData)
                {
                    $pulled = $this->pull($currentData->getData(), $this->tableName);
                    $field->setData($pulled);
                }
            }
        }
        else
        {
            $rowCount = max(1, $this->data->getRowCount());
            for ($i = 0; $i < $rowCount; $i++)
            {
                $field->setRowData($i, is_array($initialValue) ? $initialValue : [$initialValue]);
            }
        }

        $this->data->addField($field);
    }

    /**
     * Сохранение связей «запись ↔ теги».
     * Back-compat: если $tags === null, пытается взять из $_POST['tags'].
     */
    public function save(int $id, ?string $tags = null): void
    {
        if (!$this->isActive)
        {
            return;
        }
        if ($tags === null && isset($_POST['tags']))
        {
            $tags = (string)$_POST['tags'];
        }
        if ($tags === null)
        {
            return;
        }

        $this->bind($tags, $id, $this->tableName);
    }

    /**
     * Привязать набор тегов к записи.
     * Транзакционно: очищает старые связи и пишет новые.
     * Бережное управление транзакцией: начинаем/коммитим только если начали сами.
     *
     * @param string|array $tags          Строка через запятую либо массив имён
     * @param int          $mapValue      ID целевой записи
     * @param string       $mapTableName  Имя m2m-таблицы
     *
     * @return string[] нормализованные (lowercase) имена тегов
     * @throws SystemException
     */
    public function bind($tags, int $mapValue, string $mapTableName): array
    {
        if (!$this->dbh->tableExists($mapTableName))
        {
            throw new SystemException('ERR_WRONG_TABLE_NAME', SystemException::ERR_DEVELOPER, $mapTableName);
        }

        // Нормализация входа
        $names = is_array($tags) ? $tags : explode(self::TAG_SEPARATOR, (string)$tags);
        $names = array_values(array_filter(array_map(
            static fn (string $t): string => mb_convert_case(trim($t), MB_CASE_LOWER, 'UTF-8'),
            $names
        )));
        $names = array_unique($names);

        // Имя поля связи в m2m-таблице (первое поле кроме tag_id)
        $columns      = array_keys($this->dbh->getColumnsInfo($mapTableName));
        $candidates   = array_values(array_diff($columns, ['tag_id']));
        $mapFieldName = $candidates[0] ?? null;
        if (!$mapFieldName)
        {
            throw new SystemException('ERR_WRONG_TABLE_NAME', SystemException::ERR_DEVELOPER, $mapTableName);
        }

        $pdo         = $this->dbh->getPDO();
        $startedHere = false;

        if (!$pdo->inTransaction())
        {
            $pdo->beginTransaction();
            $startedHere = true;
        }

        try
        {
            // Удаляем старые связи
            $this->dbh->modify(QAL::DELETE, $mapTableName, null, [$mapFieldName => $mapValue]);

            if (!empty($names))
            {
                // 1) Существующие tag_id по именам
                $existing = self::fetchTagIdsByNames($names); // ['name' => tag_id]

                // 2) Создаём отсутствующие
                $missing = array_values(array_diff($names, array_keys($existing)));
                if ($missing)
                {
                    $this->insertTagsBatch($missing);
                    // Добираем id для только что вставленных
                    $created  = self::fetchTagIdsByNames($missing);
                    $existing = $existing + $created;
                }

                // 3) Вставляем связи (INSERT IGNORE для идемпотентности)
                foreach ($names as $name)
                {
                    $tagId = (int)($existing[$name] ?? 0);
                    if ($tagId > 0)
                    {
                        $this->dbh->modify(
                            QAL::INSERT_IGNORE,
                            $mapTableName,
                            [$mapFieldName => $mapValue, 'tag_id' => $tagId]
                        );
                    }
                }
            }

            if ($startedHere)
            {
                $pdo->commit();
            }
        }
        catch (\Throwable $e)
        {
            if ($startedHere && $pdo->inTransaction())
            {
                $pdo->rollBack();
            }
            throw $e;
        }

        return $names;
    }

    /**
     * Вытащить теги по target_id(ам).
     *
     * @param int|int[] $mapValue
     * @param string    $mapTableName
     * @param bool      $asString   вернуть строкой с разделителем
     *
     * @return array|string
     * @throws SystemException
     */
    public function pull($mapValue, string $mapTableName, bool $asString = false)
    {
        if (!$this->dbh->tableExists($mapTableName))
        {
            throw new SystemException('ERR_WRONG_TABLE_NAME', SystemException::ERR_DEVELOPER, $mapTableName);
        }

        $values = is_array($mapValue) ? array_values($mapValue) : [$mapValue];
        $values = array_map('intval', $values);

        $columns      = array_keys($this->dbh->getColumnsInfo($mapTableName));
        $candidates   = array_values(array_diff($columns, ['tag_id']));
        $mapFieldName = $candidates[0] ?? null;
        if (!$mapFieldName)
        {
            throw new SystemException('ERR_WRONG_TABLE_NAME', SystemException::ERR_DEVELOPER, $mapTableName);
        }

        if (empty($values))
        {
            return $asString ? '' : [];
        }

        $in  = implode(',', $values);
        $res = $this->dbh->select(
            "SELECT tag_id, {$mapFieldName} AS target_id
             FROM {$mapTableName}
             WHERE {$mapFieldName} IN ({$in})"
        );

        $byTarget = [];
        if (is_array($res))
        {
            foreach ($res as $row)
            {
                $byTarget[(int)$row['target_id']][] = (int)$row['tag_id'];
            }
        }

        $result = [];
        foreach ($values as $targetId)
        {
            $ids   = $byTarget[$targetId] ?? [];
            $names = self::getTags($ids, $asString);
            $result[] = $names;
        }

        return $result;
    }

    /* ==========================
       ВСПОМОГАТЕЛЬНЫЕ СТАТИКИ
       ========================== */

    /**
     * Карта tag_id => tag_name по имени(ям).
     *
     * @param string|string[] $tag
     * @return array<int,string>
     */
    public static function getID($tag): array
    {
        $names = is_array($tag) ? $tag : explode(self::TAG_SEPARATOR, (string)$tag);
        $names = array_values(array_filter(array_map('trim', $names)));
        if (!$names)
        {
            return [];
        }

        $q = [];
        foreach ($names as $t)
        {
            $q[] = E()->getDB()->quote($t);
        }

        $res = E()->getDB()->select(
            'SELECT t.tag_id, tr.tag_name
             FROM ' . self::TAG_TABLENAME . ' t
             JOIN ' . self::TAG_TABLENAME_TRANSLATION . ' tr
               ON t.tag_id = tr.tag_id AND tr.lang_id = %s
             WHERE tr.tag_name IN (' . implode(',', $q) . ')
             ORDER BY tr.tag_name ASC',
            E()->getLanguage()->getCurrent()
        );

        $out = [];
        if (is_array($res))
        {
            foreach ($res as $row)
            {
                $out[(int)$row['tag_id']] = (string)$row['tag_name'];
            }
        }
        return $out;
    }

    /**
     * Список имён по префиксу (для автокомплита).
     */
    public static function getTagStartedWith(string $str, $limit = false): array
    {
        $res = E()->getDB()->select(
            'SELECT tr.tag_name
             FROM ' . self::TAG_TABLENAME . ' t
             JOIN ' . self::TAG_TABLENAME_TRANSLATION . ' tr
               ON t.tag_id = tr.tag_id AND tr.lang_id = %s
             WHERE tr.tag_name LIKE ' . E()->getDB()->quote(trim($str) . '%%') . '
             ORDER BY tr.tag_name ASC ' .
            ($limit ? 'LIMIT ' . (int)$limit : ''),
            E()->getLanguage()->getCurrent()
        );

        return simplifyDBResult($res, 'tag_name');
    }

    /**
     * Имена по ID (массив или строка).
     *
     * @param int|int[] $tagID
     * @param bool      $asString
     * @return array|string
     */
    public static function getTags($tagID, bool $asString = false)
    {
        $ids = is_array($tagID) ? array_values($tagID) : [$tagID];
        $ids = array_map('intval', $ids);
        if (!$ids)
        {
            return $asString ? '' : [];
        }

        $in  = implode(',', $ids);
        $res = E()->getDB()->select(
            'SELECT t.tag_id, tr.tag_name
             FROM ' . self::TAG_TABLENAME . ' t
             JOIN ' . self::TAG_TABLENAME_TRANSLATION . ' tr
               ON t.tag_id = tr.tag_id AND tr.lang_id = %s
             WHERE tr.tag_id IN (' . $in . ')
             ORDER BY tr.tag_name ASC',
            E()->getLanguage()->getCurrent()
        );

        $out = [];
        if (is_array($res))
        {
            foreach ($res as $row)
            {
                $out[(int)$row['tag_id']] = (string)$row['tag_name'];
            }
        }

        return $asString ? implode(self::TAG_SEPARATOR, $out) : $out;
    }

    /**
     * Получить список target_id по тегам.
     * По умолчанию — OR (любой из тегов). Можно включить AND (все теги).
     *
     * @param string|array $tags
     * @param string       $mapTableName
     * @param bool         $matchAll  true => AND, false => OR
     *
     * @throws SystemException
     */
    public static function getFilter($tags, string $mapTableName, bool $matchAll = false): array
    {
        if (!E()->getDB()->tableExists($mapTableName))
        {
            throw new SystemException('ERR_WRONG_TABLE_NAME', SystemException::ERR_DEVELOPER, $mapTableName);
        }

        $idsByName = self::getID($tags); // id => name
        if (!$idsByName)
        {
            return [];
        }

        $columns      = array_keys(E()->getDB()->getColumnsInfo($mapTableName));
        $candidates   = array_values(array_diff($columns, ['tag_id']));
        $mapFieldName = $candidates[0] ?? null;
        if (!$mapFieldName)
        {
            throw new SystemException('ERR_WRONG_TABLE_NAME', SystemException::ERR_DEVELOPER, $mapTableName);
        }

        $tagIds = implode(',', array_map('intval', array_keys($idsByName)));

        if ($matchAll)
        {
            // AND: target_id, где найдено столько разных tag_id, сколько искали
            $res = E()->getDB()->select(
                "SELECT {$mapFieldName} AS target_id
                 FROM {$mapTableName}
                 WHERE tag_id IN ({$tagIds})
                 GROUP BY {$mapFieldName}
                 HAVING COUNT(DISTINCT tag_id) = " . count($idsByName)
            );
        }
        else
        {
            // OR: любой из тегов
            $res = E()->getDB()->select(
                "SELECT DISTINCT {$mapFieldName} AS target_id
                 FROM {$mapTableName}
                 WHERE tag_id IN ({$tagIds})"
            );
        }

        return simplifyDBResult($res, 'target_id');
    }

    /**
     * Вставляет тег и его переводы (все языки). Возвращает tag_id.
     * Если уже есть — гарантирует существование переводов и отдаёт имеющийся id.
     */
    public static function insert(string $tag)
    {
        $code = mb_convert_case(trim($tag), MB_CASE_LOWER, 'UTF-8');

        // Базовая запись (IGNORE для идемпотентности)
        E()->getDB()->modify(QAL::INSERT_IGNORE, self::TAG_TABLENAME, ['tag_code' => $code]);

        // id по tag_code
        $rowId = E()->getDB()->getScalar(self::TAG_TABLENAME, 'tag_id', ['tag_code' => $code]);
        if (!$rowId)
        {
            return false;
        }

        // Переводы для всех языков
        $langs = E()->getLanguage()->getLanguages();
        if ($langs)
        {
            foreach ($langs as $lang_id => $lang_info)
            {
                E()->getDB()->modify(
                    QAL::INSERT_IGNORE,
                    self::TAG_TABLENAME_TRANSLATION,
                    ['tag_id' => (int)$rowId, 'lang_id' => (int)$lang_id, 'tag_name' => $tag]
                );
            }
        }

        return (int)$rowId;
    }

    /* ==========================
       ВНУТРЕННИЕ ПОМОЩНИКИ
       ========================== */

    /**
     * Карта name(lower) => tag_id для набора имён.
     *
     * @param string[] $namesLower
     * @return array<string,int>
     */
    private static function fetchTagIdsByNames(array $namesLower): array
    {
        if (!$namesLower)
        {
            return [];
        }

        $q = [];
        foreach ($namesLower as $n)
        {
            $q[] = E()->getDB()->quote($n);
        }

        $res = E()->getDB()->select(
            'SELECT t.tag_id, LOWER(tr.tag_name) AS tag_name_lc
             FROM ' . self::TAG_TABLENAME . ' t
             JOIN ' . self::TAG_TABLENAME_TRANSLATION . ' tr
               ON t.tag_id = tr.tag_id AND tr.lang_id = %s
             WHERE LOWER(tr.tag_name) IN (' . implode(',', $q) . ')',
            E()->getLanguage()->getCurrent()
        );

        $out = [];
        if (is_array($res))
        {
            foreach ($res as $row)
            {
                $out[(string)$row['tag_name_lc']] = (int)$row['tag_id'];
            }
        }
        return $out;
    }

    /**
     * Массовая вставка отсутствующих тегов (base + translations).
     *
     * @param string[] $missingLowerCase
     */
    private function insertTagsBatch(array $missingLowerCase): void
    {
        foreach ($missingLowerCase as $nameLc)
        {
            // В отображаемое имя кладём то, что пришло (здесь уже lower),
            // код (tag_code) — тоже в нижнем регистре.
            self::insert($nameLc);
        }
    }
}
