<?php

declare(strict_types=1);

if (!class_exists('\\Energine\\Core\\ExtraManager\\ExtraManagerInterface', false))
{
    $extraDir = dirname(__DIR__) . '/extra';
    $interfaceFile = $extraDir . '/ExtraManagerInterface.php';

    if (is_file($interfaceFile))
    {
        require_once $interfaceFile;
    }
}

use Energine\Core\ExtraManager\ExtraManagerInterface;

/**
 * Automates working with file attachments for dataset rows.
 */
class AttachmentManager extends DBWorker implements ExtraManagerInterface
{
    /** Suffix for per-entity attachment tables (e.g., `news_uploads`). */
    public const ATTACH_TABLE_SUFFIX = '_uploads';

    /** Global uploads table name. */
    public const ATTACH_TABLENAME = 'share_uploads';

    /** Dataset data (columns/rows) to enrich with attachments. */
    private ?Data $data = null;

    /**
     * Whether manager is active (true if `<table>_uploads` exists).
     * If not active, createFieldDescription/createField are no-ops.
     */
    private bool $isActive = false;

    /** Name of the `<table>_uploads` table when active. */
    private ?string $tableName = null;

    /** Base table name for current ExtraManager invocation. */
    private ?string $currentBaseTable = null;

    /** Data description of the owning dataset. */
    private ?DataDescription $dataDescription = null;

    /** Primary key FieldDescription of the owning dataset. */
    private ?FieldDescription $pk = null;

    /** If true, will add OG tags for images (logic kept commented for BC). */
    private bool $addOG = false;

    /** Context from factory (state, translator callback, etc.). */
    private array $context = [];

    /**
     * @param DataDescription $dataDescription  Data description to extend.
     * @param Data            $data             Data rows to map attachments onto.
     * @param string          $tableName        Base table name (without suffix).
     * @param bool            $addToOG          Whether to add OG images (BC; logic commented).
     */
    public function __construct(?DataDescription $dataDescription = null, ?Data $data = null, ?string $tableName = null, bool $addToOG = false)
    {
        parent::__construct();
        if ($dataDescription && $data && $tableName)
        {
            $this->initialiseLegacy($dataDescription, $data, $tableName, $addToOG);
        }
    }

    private function initialiseLegacy(DataDescription $dataDescription, Data $data, string $tableName, bool $addToOG): void
    {
        $uploadsTable     = $tableName . self::ATTACH_TABLE_SUFFIX;
        $this->isActive   = (bool)$this->dbh->tableExists($uploadsTable);
        $this->tableName  = $this->isActive ? $uploadsTable : null;

        if ($this->isActive)
        {
            $this->dataDescription = $dataDescription;
            $this->data            = $data;
            $this->addOG           = $addToOG;

            foreach ($this->dataDescription as $fd)
            {
                if ($fd instanceof FieldDescription && $fd->getPropertyValue('key'))
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

    public function translate(string $key, ?int $langID = null): string
    {
        $translator = $this->context['translate'] ?? null;
        if (is_callable($translator))
        {
            try
            {
                /** @var callable $translator */
                $result = $translator($key);

                if (is_string($result))
                {
                    return $result;
                }
            }
            catch (\Throwable)
            {
                // fallback below
            }
        }

        return parent::translate($key, $langID);
    }

    public function supports(string $tableName, DataDescription $dataDescription): bool
    {
        if (($this->context['state'] ?? null) === 'attachments')
        {
            return false;
        }

        $this->currentBaseTable = $tableName;
        $uploadsTable           = $tableName . self::ATTACH_TABLE_SUFFIX;
        $this->tableName        = $uploadsTable;
        $this->isActive         = (bool)$this->dbh->tableExists($uploadsTable);

        return $this->isActive;
    }

    public function addFieldDescription(DataDescription $dataDescription): void
    {
        if (!$this->isActive)
        {
            return;
        }

        $fd = $dataDescription->getFieldDescriptionByName('attached_files');
        if (!$fd)
        {
            $fd = new FieldDescription('attached_files');
            $dataDescription->addFieldDescription($fd);
        }

        $fd->setType(FieldDescription::FIELD_TYPE_TAB);
        $fd->setProperty('title', $this->translate('TAB_ATTACHED_FILES'));
        $fd->setProperty('tableName', $this->tableName);
    }

    public function addField(Data $data, string $tableName, ?string $recordId = null): void
    {
        if (!$this->isActive)
        {
            return;
        }

        $field = $data->getFieldByName('attached_files');
        if ($field === false)
        {
            $field = new Field('attached_files');
            $data->addField($field);
        }

        $prefix = ($recordId !== null && $recordId !== '') ? $recordId . '/' : '';
        $field->setData($prefix . 'attachments/', true);
    }

    public function build(\DOMDocument $document): void
    {
        // Attachments use separate component states, nothing to inject into DOM here.
    }

    /**
     * Add custom field description "attachments" (for list/form rendering).
     */
    public function createFieldDescription(): void
    {
        if (!$this->isActive || !$this->dataDescription)
        {
            return;
        }

        $fd = $this->dataDescription->getFieldDescriptionByName('attachments');
        if (!$fd)
        {
            $fd = new FieldDescription('attachments');
            $this->dataDescription->addFieldDescription($fd);
        }
        $fd->setType(FieldDescription::FIELD_TYPE_CUSTOM);
    }

    /**
     * Populate "attachments" field with attachment structures per row.
     *
     * @param string|false   $mapFieldName              Dataset field name to map by (defaults to PK).
     * @param bool           $returnOnlyFirstAttachment If true, only the first attachment is returned per row.
     * @param array|false    $mapValue                  Explicit mapping values, otherwise taken from $mapFieldName column.
     */
    public function createField(string|false $mapFieldName = false, bool $returnOnlyFirstAttachment = false, array|false $mapValue = false): void
    {
        if (!$this->isActive || !$this->data || $this->data->isEmpty() || !$this->tableName)
        {
            return;
        }

        // Determine mapping field & values
        if ($mapFieldName === false)
        {
            if (!$this->pk)
            {
                return;
            }
            $mapFieldName = $this->pk->getName();
        }

        if ($mapValue === false)
        {
            $mapField = $this->data->getFieldByName($mapFieldName);
            if (!$mapField)
            {
                return;
            }
            $mapValue = $mapField->getData();
        }

        // Ensure we have an "attachments" field in data to populate
        $attachmentsField = new Field('attachments');
        $this->data->addField($attachmentsField);

        // Normalize values to a flat numeric array
        if (!is_array($mapValue))
        {
            $mapValue = [$mapValue];
        }
        $mapValue = array_values(array_filter($mapValue, static fn ($v) => $v !== null && $v !== '' && $v !== false));
        if (!$mapValue)
        {
            return;
        }

        $mapTableName     = $this->tableName;
        $langMapTableName = $this->dbh->getTranslationTablename($mapTableName);
        $columns          = $this->dbh->getColumnsInfo($mapTableName);
        $prefix           = '';

        // Detect prefix from PK column (e.g., news_uploads.news_upl_id => 'news_upl')
        foreach ($columns as $cname => $col)
        {
            if (isset($col['index']) && $col['index'] === 'PRI')
            {
                $prefix = str_replace('_id', '', (string)$cname);
            }
        }

        $lang_pk = false;
        $lang_columns = [];
        if ($langMapTableName)
        {
            /** @var array<string, array> $lang_columns */
            $lang_columns = $this->dbh->getColumnsInfo($langMapTableName);
            foreach ($lang_columns as $cname => $col)
            {
                if (isset($col['index']) && $col['index'] === 'PRI' && $cname !== 'lang_id')
                {
                    $lang_pk = $cname;
                }
            }
        }

        // Build list of additional fields (both base and translation tables) without prefix
        // IMPORTANT: do NOT include the mapping key itself, so it remains available in $row.
        $additional_fields = [];
        foreach ($columns as $cname => $col)
        {
            if ($cname === $mapFieldName)
            {
                continue; // do not rename/remove the mapping key
            }
            $isPrimary = !empty($col['index']) && $col['index'] === 'PRI';
            $hasFK     = !empty($col['key']['tableName']);
            if ($cname !== 'session_id' && (!$isPrimary && !$hasFK))
            {
                $newName = str_replace($prefix . '_', '', (string)$cname);
                if ($newName !== 'order_num')
                {
                    $additional_fields[$cname] = $newName;
                }
            }
        }
        if ($langMapTableName)
        {
            foreach ($lang_columns as $cname => $col)
            {
                if ($cname === $mapFieldName)
                {
                    continue; // do not rename/remove the mapping key
                }
                $isPrimary = !empty($col['index']) && $col['index'] === 'PRI';
                if (!$isPrimary)
                {
                    $newName = str_replace($prefix . '_', '', (string)$cname);
                    if ($newName !== 'name')
                    {
                        $additional_fields[$cname] = $newName;
                    }
                }
            }
        }

        // Build SELECT with joins to uploads and optional translation table
        $select =
            'SELECT spu.' . $mapFieldName .
            ',spu.upl_id as id, spu.*, ' .
            'upl_path as file, upl_name as name, upl_title as title, upl_width as width, upl_height as height, ' .
            'TIME_FORMAT(upl_duration, "%i:%s") as duration, ' .
            'upl_internal_type as type, upl_mime_type as mime, upl_data as data, ' .
            'upl_is_mp4 as is_mp4, upl_is_webm as is_webm, upl_is_flv as is_flv ' .
            (($langMapTableName && $lang_pk) ? ', spt.* ' : '') .
            'FROM ' . self::ATTACH_TABLENAME . ' su ' .
            'LEFT JOIN `' . $mapTableName . '` spu ON spu.upl_id = su.upl_id ' .
            (($langMapTableName && $lang_pk)
                ? 'LEFT JOIN `' . $langMapTableName . '` spt ON spu.' . $lang_pk . ' = spt.' . $lang_pk .
                ' AND spt.lang_id = ' . (int)E()->getDocument()->getLang() . ' '
                : '') .
            'WHERE ' . $mapFieldName . ' IN (' . implode(',', array_map('intval', $mapValue)) . ') ' .
            'AND (su.upl_is_ready = 1) AND (su.upl_is_active = 1)';

        // If table has an *_order_num column, sort by it (legacy behavior)
        foreach ($columns as $colName => $colInfo)
        {
            if (strpos((string)$colName, '_order_num') !== false)
            {
                $select .= ' ORDER BY ' . $colName;
            }
        }

        $images = $this->dbh->select($select);
        if (!is_array($images) || !$images)
        {
            return;
        }

        // For fallback, compute stripped variant of the map key (e.g., smap_id -> smap_id or without prefix)
        $mapFieldStripped = ($prefix !== '')
            ? str_replace($prefix . '_', '', $mapFieldName)
            : $mapFieldName;

        // Group images by mapping value
        $imageData = [];
        foreach ($images as $row)
        {
            $repoPath      = E()->FileRepoInfo->getRepositoryRoot($row['file']);
            $row['secure'] = (bool)E()->getConfigValue('repositories.ftp.' . $repoPath . '.secure', 0);

            // Remap additional fields from full names to shortened names (do NOT touch the map key)
            if ($additional_fields)
            {
                foreach ($additional_fields as $old => $new)
                {
                    if ($old === $mapFieldName)
                    {
                        continue;
                    }
                    if (array_key_exists($old, $row))
                    {
                        $row[$new] = $row[$old];
                        unset($row[$old]);
                    }
                }
            }

            // Safe access to mapping key with fallback to stripped key
            $mapID = $row[$mapFieldName] ?? ($row[$mapFieldStripped] ?? null);
            if ($mapID === null)
            {
                continue; // no key — skip row (prevents "Undefined array key" warnings)
            }

            if ($returnOnlyFirstAttachment && isset($imageData[$mapID]))
            {
                continue;
            }

            $imageData[$mapID] ??= [];
            $imageData[$mapID][] = $row;
        }

        // Fill attachments per requested row index (preserving order of $mapValue)
        for ($i = 0, $n = count($mapValue); $i < $n; $i++)
        {
            $key = $mapValue[$i];
            if (!isset($imageData[$key]) || !is_array($imageData[$key]))
            {
                continue;
            }

            // // Optionally add OG tags (kept commented for BC)
            // if ($this->addOG) {
            //     foreach ($imageData[$key] as $r) {
            //         E()->getOGObject()->addImage($r['file']);
            //     }
            //     $attachment = $imageData[$key];
            //     if (isset($attachment[0]) && ($attachment[0]['type'] === 'video')) {
            //         E()->getOGObject()->setVideo(
            //             $attachment[0]['file'],
            //             $attachment[0]['duration'],
            //             $attachment[0]['mime'],
            //             $attachment[0]['width'],
            //             $attachment[0]['height']
            //         );
            //     }
            // }

            // Build nested dataset with attachment rows
            $localData = new Data();
            $localData->load($imageData[$key]);

            $dd = new DataDescription();

            // id
            $fd = new FieldDescription('id');
            $dd->addFieldDescription($fd);

            // file
            $fd = new FieldDescription('file');
            $fd->setType(FieldDescription::FIELD_TYPE_STRING);
            $dd->addFieldDescription($fd);

            // type
            $fd = new FieldDescription('type');
            $fd->setType(FieldDescription::FIELD_TYPE_STRING);
            $dd->addFieldDescription($fd);

            // duration
            $fd = new FieldDescription('duration');
            $fd->setType(FieldDescription::FIELD_TYPE_STRING);
            $dd->addFieldDescription($fd);

            // mime
            $fd = new FieldDescription('mime');
            $fd->setType(FieldDescription::FIELD_TYPE_STRING);
            $dd->addFieldDescription($fd);

            // data
            $fd = new FieldDescription('data');
            $fd->setType(FieldDescription::FIELD_TYPE_STRING);
            $dd->addFieldDescription($fd);

            // title
            $fd = new FieldDescription('title');
            $fd->setType(FieldDescription::FIELD_TYPE_STRING);
            $dd->addFieldDescription($fd);

            // name (keep default type)
            $fdName = new FieldDescription('name');
            $dd->addFieldDescription($fdName);

            // secure (hidden)
            $fd = new FieldDescription('secure');
            $fd->setType(FieldDescription::FIELD_TYPE_HIDDEN);
            $dd->addFieldDescription($fd);

            // Playlist (if multiple encodes exist)
            $playlist = [];
            $first    = $imageData[$key][0];
            $base     = pathinfo($first['file'], PATHINFO_DIRNAME) . '/' . pathinfo($first['file'], PATHINFO_FILENAME);
            foreach (['mp4', 'webm', 'flv'] as $ext)
            {
                if (!empty($first['is_' . $ext]) && (string)$first['is_' . $ext] === '1')
                {
                    $playlist[] = ['id' => $base . '.' . $ext, 'type' => $ext];
                }
            }
            if (count($playlist) > 1)
            {
                $fd = new FieldDescription('playlist');
                $fd->setType(FieldDescription::FIELD_TYPE_SELECT);
                $fd->loadAvailableValues($playlist, 'id', 'id');
                $dd->addFieldDescription($fd);
            }

            // Additional fields from *_uploads and *_uploads_translation (except 'name')
            foreach ($additional_fields as $new_name)
            {
                if ($new_name !== 'name')
                {
                    $fd = new FieldDescription($new_name);
                    $fd->setType(FieldDescription::FIELD_TYPE_STRING);
                    $dd->addFieldDescription($fd);
                }
            }

            $builder = new SimpleBuilder();
            $builder->setData($localData);
            $builder->setDataDescription($dd);
            $builder->build();

            $attachmentsField->setRowData($i, $builder->getResult());
        }
    }

    /**
     * Get upload ID by upload path.
     */
    protected function getUploadIdByUploadPath(string $path): ?string
    {
        /** @var string|null $id */
        $id = $this->dbh->getScalar(
            'SELECT upl_id FROM ' . self::ATTACH_TABLENAME . ' WHERE upl_path=%s LIMIT 1',
            $path
        );
        return $id ?: null;
    }
}
