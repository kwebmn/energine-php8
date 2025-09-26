<?php
declare(strict_types=1);

/**
 * Class that shows the data from database.
 */
class DBDataSet extends DataSet
{
    private ?string $translationTableName = null;
    private ?string $pk = null;

    /** @var array<string, mixed> */
    private array $filter = [];

    /** @var array<string, string>|false|null */
    private array|false|null $order = null;

    private ?array $limit = null;
    private ?string $previousState = null;

    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);
        $this->setType(self::COMPONENT_TYPE_LIST);
    }

    protected function defineParams() : array
    {
        return array_merge(
            parent::defineParams(),
            [
                'tableName'       => false,
                'onlyCurrentLang' => false,
                'editable'        => false,
            ]
        );
    }

    /**
     * @return array|false|null
     * @throws SystemException
     */
    protected function loadDataDescription(): array|false|null
    {
        $result = $this->dbh->getColumnsInfo($this->getTableName());

        if ($this->getTranslationTableName()) {
            $transColumnsDescription = $this->dbh->getColumnsInfo($this->getTranslationTableName());

            foreach (array_keys($transColumnsDescription) as $fieldName) {
                if (!in_array($fieldName, [$this->getPK(), 'lang_id'], true)) {
                    $transColumnsDescription[$fieldName]['isMultilanguage'] = true;
                } elseif ($fieldName === 'lang_id' && $this->getPK() !== 'lang_id') {
                    $transColumnsDescription[$fieldName]['languageID'] = true;
                }
            }

            $result += $transColumnsDescription;

            if (isset($result['lang_id'])) {
                $result['lang_id']['key'] = false;
            } else {
                throw new SystemException('ERR_DEV_NO_LANG_ID', SystemException::ERR_DEVELOPER);
            }
        }

        return $result;
    }

    /**
     * @return array|false|null
     */
    protected function loadData(): array|false|null
    {
        if ($this->pager) {
            $this->setLimit($this->pager->getLimit());
        }

        $raw = (!$this->getTranslationTableName())
            ? $this->commonLoadData()
            : $this->multiLoadData();    // FIX: гарантирует array|false
        
        $data = $this->modify($raw);
        
        return $data;
    }

    protected function getDataLanguage(): int|string|false
    {
        $result = false;
        if ($this->getParam('onlyCurrentLang')) {
            $result = E()->getLanguage()->getCurrent();
        }
        return $result;
    }

    /**
     * @param array<array<string,mixed>>|false $data
     * @return array<array<string,mixed>>|false
     */
    private function modify(array|false $data): array|false
    {
        if (!is_array($data)) {
            return $data;
        }

        // MULTI (m2m)
        $multiFields = $this->getDataDescription()->getFieldDescriptionsByType(FieldDescription::FIELD_TYPE_MULTI);

        if (!empty($multiFields)) {
            $m2mData = [];
            $primaryKeyName = $this->getPK();
            $pks = simplifyDBResult($data, $primaryKeyName);

            foreach ($multiFields as $mfd) {
                $relInfo = $mfd->getPropertyValue('key');
                if (is_array($relInfo) && $this->dbh->tableExists($relInfo['tableName'])) {
                    $res = $this->dbh->select($relInfo['tableName'], true, [$primaryKeyName => $pks]);

                    if (is_array($res)) {
                        foreach ($res as $row) {
                            $pk = $row[$relInfo['fieldName']];
                            unset($row[$relInfo['fieldName']]);
                            $m2mData[$mfd->getName()][$pk][] = current($row);
                        }
                    }
                }
            }

            foreach ($data as $key => $row) {
                foreach ($m2mData as $fieldName => $m2mValues) {
                    if (array_key_exists($fieldName, $row)) {
                        foreach ($m2mValues as $pk => $values) {
                            if ($row[$primaryKeyName] == $pk) {
                                $data[$key][$fieldName] = $values;
                            }
                        }
                    }
                }
            }
        }

        // VALUE
        $valueFields = $this->getDataDescription()->getFieldDescriptionsByType(FieldDescription::FIELD_TYPE_VALUE);
        if (!empty($valueFields)) {
            $relations = [];
            $values    = [];

            foreach ($valueFields as $valueFieldName => $valueField) {
                $relInfo = $valueField->getPropertyValue('key');
                if (is_array($relInfo)) {
                    $langTable = $this->dbh->getTranslationTablename($relInfo['tableName']);
                    $relations[$valueFieldName] = [
                        'table'      => (!$langTable) ? $relInfo['tableName'] : $langTable,
                        'field'      => $relInfo['fieldName'],
                        'lang'       => ($langTable) ? E()->getLanguage()->getCurrent() : false,
                        'valueField' => substr($relInfo['fieldName'], 0, (int)strrpos($relInfo['fieldName'], '_')) . '_name',
                    ];

                    $cond = [
                        $relations[$valueFieldName]['field'] =>
                            simplifyDBResult($data, $relations[$valueFieldName]['field']),
                    ];

                    if ($relations[$valueFieldName]['lang']) {
                        $cond['lang_id'] = $relations[$valueFieldName]['lang'];
                    }

                    $sel = $this->dbh->select(
                        $relations[$valueFieldName]['table'],
                        [$relations[$valueFieldName]['field'], $relations[$valueFieldName]['valueField']],
                        $cond
                    );

                    $values[$valueFieldName] = convertDBResult(
                        is_array($sel) ? $sel : [],
                        $relations[$valueFieldName]['field'],
                        true
                    );
                }
            }

            foreach ($data as $key => $row) {
                foreach ($row as $name => $value) {
                    if (isset($relations[$name]) && array_key_exists($value, $values[$name])) {
                        $data[$key][$name] = [
                            'id'    => $value,
                            'value' => $values[$name][$value][$relations[$name]['valueField']] ?? null,
                        ];
                    }
                }
            }
        }

        return $data;
    }

    /**
     * @return array<array<string,mixed>>|false
     */
    private function commonLoadData(): array|false
    {
        $dbFields = [];
        $data     = false;

        foreach ($this->getDataDescription() as $fieldName => $field) {
            if (is_null($field->getPropertyValue('customField')) && ($field->getType() != FieldDescription::FIELD_TYPE_TAB)) {
                if ($field->getPropertyValue('origType') && ($field->getType() == FieldDescription::FIELD_TYPE_BOOL)) {
                    $fieldName = ' IF((' . $fieldName . ' IS NOT NULL) AND (' . $fieldName . ' <> ""), 1, 0) AS ' . $fieldName;
                }
                $dbFields[] = $fieldName;
            }
        }

        if (!empty($dbFields)) {            
            if ($this->getType() == self::COMPONENT_TYPE_FORM_ADD) {
                $dbFields = array_flip($dbFields);
                foreach ($dbFields as $key => $value) {
                    $dbFields[$key] = '';
                }
                $res = [$dbFields];
            } else {
                $filter = $this->getFilter();
                if (isset($filter[0]) and is_string($filter[0]))
                {
                    $filter = $filter[0];
                }
                $res = $this->dbh->select(
                    $this->getTableName(),
                    (($this->pager) ? ' SQL_CALC_FOUND_ROWS ' : '') . implode(',', $dbFields),
                    $filter,
                    $this->getOrder(),
                    $this->getLimit()
                );
            }

            if (is_array($res)) {
                $data = $res;

                if ($this->pager) {
                    $recordsCount = simplifyDBResult(
                        $this->dbh->selectRequest('SELECT FOUND_ROWS() as c'),
                        'c',
                        true
                    ) ?: 0;
                    $this->pager->setRecordsCount($recordsCount);
                }
            }
        }

        return $data;
    }

    /**
     * Load multilingual data.
     *
     * @return array<array<string,mixed>>|false
     */
    private function multiLoadData(): array|false
    {
        $data  = false;  // FIX: по умолчанию false, а не []
        $lang  = E()->getLanguage()->getLanguages();
        $dbFields = [];
        $filter = $order = $limit = '';

        foreach ($this->getDataDescription() as $fieldName => $field) {
            if (!$field->getPropertyValue('languageID') && $field->getPropertyValue('key') !== true) {
                if (is_null($field->getPropertyValue('customField'))) {
                    if (!($field->getPropertyValue('origType') && ($field->getType() == FieldDescription::FIELD_TYPE_BOOL))) {
                        $dbFields[$field->getPropertyValue('tableName')][$fieldName] =
                            $field->getPropertyValue('tableName') . '.' . $fieldName;
                    } else {
                        $dbFields[$field->getPropertyValue('tableName')][$fieldName] =
                            ' IF((' . $field->getPropertyValue('tableName') . '.' . $fieldName . ' IS NOT NULL) AND (' . $field->getPropertyValue('tableName') . '.' . $fieldName . ' <> ""), 1, 0) AS ' . $fieldName;
                    }
                }
            }
        }

        $filterCondition = $this->getFilter();
        
        // if (!empty($filterCondition) and isset($filterCondition[0]) and is_string($filterCondition[0])) 
        if (!empty($filterCondition) and isset($filterCondition[0]) and is_string($filterCondition[0])) 
        {
        
            $filter = $this->dbh->buildWhereCondition($filterCondition[0])
                . ($this->getParam('onlyCurrentLang') ? ' AND lang_id = ' . $this->getDataLanguage() : '');
                
        } 
        elseif ($this->getDataLanguage() && $this->getParam('onlyCurrentLang')) {            
            $filter = ' WHERE lang_id = ' . $this->getDataLanguage();
        }
        else
        {
            $filter = $this->dbh->buildWhereCondition($filterCondition)
                . ($this->getParam('onlyCurrentLang') ? ' AND lang_id = ' . $this->getDataLanguage() : '');
        }

    
        
        if ($this->getOrder()) {
            $order = $this->dbh->buildOrderCondition($this->getOrder());
        }

        if (!is_null($this->getLimit())) {
            $limit = $this->dbh->buildLimitStatement($this->getLimit());
        }
        

        if ($this->getType() != self::COMPONENT_TYPE_FORM_ADD) {
            $request = sprintf(
                'SELECT ' . (($this->pager) ? ' SQL_CALC_FOUND_ROWS ' : '') .
                ' %s.%s, %s.lang_id, %s %s
                 FROM %1$s
                 LEFT JOIN %3$s ON %3$s.%2$s = %1$s.%2$s
                 %s %s %s',
                $this->getTableName(),
                $this->getPK(),
                $this->getTranslationTableName(),
                (isset($dbFields[$this->getTableName()])) ? implode(',', $dbFields[$this->getTableName()]) : '',
                isset($dbFields[$this->getTranslationTableName()])
                    ? ((isset($dbFields[$this->getTableName()])) ? ',' : '') . implode(',', $dbFields[$this->getTranslationTableName()])
                    : '',
                $filter,
                $order,
                $limit
            );
            
            $sel = $this->dbh->selectRequest($request);
            $data = is_array($sel) ? $sel : false;   // FIX: нормализуем — только массив или false

            if ($this->pager) {
                $recordsCount = simplifyDBResult(
                    $this->dbh->selectRequest('SELECT FOUND_ROWS() as c'),
                    'c',
                    true
                ) ?: 0;
                $this->pager->setRecordsCount($recordsCount);
            }

            if (
                is_array($data)
                && (
                    !$this->getDataLanguage()
                    || ($this->getDataLanguage() && !$this->getParam('onlyCurrentLang')
                        && isset($dbFields[$this->getTranslationTableName()]))
                )
            ) {
                $matrix = [];
                foreach ($data as $row) {
                    $matrix[$row[$this->getPK()]][$row['lang_id']] = $row;
                }

                $translationColumns = [];
                foreach (array_keys($dbFields[$this->getTranslationTableName()] ?? []) as $fieldName) {
                    $translationColumns[] = 'NULL as ' . $fieldName;
                }

                $request = sprintf(
                    'SELECT %s, %s %s
                     FROM %s
                     WHERE %s IN(%s)',
                    $this->getPK(),
                    (isset($dbFields[$this->getTableName()]))
                        ? implode(',', $dbFields[$this->getTableName()]) . ','
                        : '',
                    implode(',', $translationColumns),
                    $this->getTableName(),
                    $this->getPK(),
                    implode(',', array_keys($matrix))
                );
                $res = $this->dbh->selectRequest($request);

                $template = [];
                foreach ((is_array($res) ? $res : []) as $row) {
                    $template[$row[$this->getPK()]] = $row;
                }

                $data = [];

                if ($this->getDataLanguage() && !$this->getParam('onlyCurrentLang')) {
                    $lang = [$this->getDataLanguage() => $lang[$this->getDataLanguage()]];
                }

                foreach ($matrix as $ltagID => $langVersions) {
                    foreach (array_keys($lang) as $langID) {
                        if (isset($langVersions[$langID])) {
                            $data[] = $langVersions[$langID];
                        } elseif (isset($template[$ltagID])) {
                            $copy = $template[$ltagID];
                            $copy['lang_id'] = $langID;
                            $data[] = $copy;
                        }
                    }
                }
            }
        } else {
            // add-mode: по одной пустой записи на язык
            $i = 0;
            $dbFields = array_merge(
                (isset($dbFields[$this->getTableName()])) ? array_keys($dbFields[$this->getTableName()]) : [],
                array_keys($dbFields[$this->getTranslationTableName()] ?? [])
            );
            $dbFields = array_flip($dbFields);
            foreach ($dbFields as $key => $value) {
                $dbFields[$key] = '';
            }
            $data = [];
            foreach (array_keys($lang) as $langID) {
                $data[$i][$this->getPK()] = null;
                $data[$i]['lang_id']     = $langID;
                $data[$i]                = array_merge($data[$i], $dbFields);
                $i++;
            }
        }

        return $data;
    }

    protected function setTableName(string $tableName): void
    {
        $this->setParam('tableName', $tableName);
    }

    protected function setParam($name, $value): void
    {
        if ($name === 'tableName') {
            //$this->translationTableName = $this->dbh->getTranslationTablename((string)$value);
            $ttn = $this->dbh->getTranslationTablename((string)$value);
            if ($ttn)
            {
                $this->translationTableName = $ttn;
            }
            else
            {
                $this->translationTableName = null;
            }
        }
        parent::setParam($name, $value);
    }

    final public function getTableName(): string
    {
        if (!$this->getParam('tableName')) {
            throw new SystemException('ERR_DEV_NO_TABLENAME', SystemException::ERR_DEVELOPER);
        }
        return (string)$this->getParam('tableName');
    }

    /** @return array<string, mixed> */
    final public function getFilter(): array
    {
        return $this->filter;
    }

    /** @param array<string,mixed>|string|int $filter */
    final protected function setFilter(array|string|int $filter): void
    {
        $this->clearFilter();
        if (!empty($filter)) {
            $this->addFilterCondition($filter);
        }
    }

    /** @param array<string,mixed>|string|int $filter */
    public function addFilterCondition(array|string|int $filter): void
    {
        if (is_numeric($filter)) {
            $filter = [$this->getTableName() . '.' . $this->getPK() => $filter];
        } elseif (is_string($filter)) {
            $filter = [$filter];
        }
        $this->filter = array_merge($this->filter, $filter);
    }

    final protected function clearFilter(): void
    {
        $this->filter = [];
    }

    /**
     * @return array<string,string>|false
     */
    final protected function getOrder(): array|false
    {
        if ($this->order === null) {
            $this->order = false;
            $columns = $this->dbh->getColumnsInfo($this->getTableName());
            foreach (array_keys($columns) as $columnName) {
                // FIX: корректная проверка подстроки
                if (is_string($columnName) && str_contains($columnName, '_order_num')) {
                    $this->setOrder([$columnName => QAL::ASC]);
                    break;
                }
            }
        }

        return $this->order;
    }

    /** @param array<string,string> $order */
    final protected function setOrder(array $order): void
    {
        $this->order = $order;
    }

    final protected function getLimit(): ?array
    {
        return $this->limit;
    }

    final protected function setLimit(array $limit): void
    {
        $this->limit = $limit;
    }

    /**
     * @throws SystemException
     */
    final public function getPK(): string
    {
        if (!$this->pk) {
            $res = $this->dbh->getColumnsInfo($this->getTableName());
            if (is_array($res)) {
                foreach ($res as $fieldName => $fieldInfo) {
                    if (($fieldInfo['key'] ?? null) === true) {
                        $this->pk = $fieldName;
                    }
                }
                if (!isset($this->pk)) {
                    throw new SystemException('ERR_DEV_NO_PK', SystemException::ERR_DEVELOPER);
                }
            } else {
                throw new SystemException('ERR_DEV_NO_PK', SystemException::ERR_DEVELOPER);
            }
        }

        return $this->pk;
    }

    final protected function setPK(string $primaryColumnName): void
    {
        $this->pk = $primaryColumnName;
    }

    protected function createBuilder(): AbstractBuilder
    {
        if (!$this->getTranslationTableName()) {
            return parent::createBuilder();
        }
        return new MultiLanguageBuilder();
    }

    protected function createDataDescription(): DataDescription
    {
        $result = parent::createDataDescription();

        foreach ($result as $fieldMetaData) {
            $keyInfo = $fieldMetaData->getPropertyValue('key');
            $values  = false;

            if (is_array($keyInfo)) {
                if ($fieldMetaData->getType() == FieldDescription::FIELD_TYPE_SELECT) {
                    $fkTableName = $keyInfo['tableName'];
                    $fkKeyName   = $keyInfo['fieldName'];
                    $values      = $this->getFKData($fkTableName, $fkKeyName);
                } elseif ($fieldMetaData->getType() == FieldDescription::FIELD_TYPE_MULTI) {
                    $m2mTableName = $keyInfo['tableName'];
                    $m2mPKName    = $keyInfo['fieldName'];

                    if ($this->dbh->tableExists($m2mTableName)) {
                        $tableInfo = $this->dbh->getColumnsInfo($m2mTableName);
                        unset($tableInfo[$m2mPKName]);
                        $m2mValueFieldInfo = current($tableInfo);
                        if (isset($m2mValueFieldInfo['key']) && is_array($m2mValueFieldInfo)) {
                            $values = $this->getFKData(
                                $m2mValueFieldInfo['key']['tableName'],
                                $m2mValueFieldInfo['key']['fieldName']
                            );
                        }
                    }
                }

                if (!empty($values)) {
                    call_user_func_array([$fieldMetaData, 'loadAvailableValues'], $values);
                }
            }
        }

        return $result;
    }

    /**
     * @return array{0: array<int|string,string>, 1: array<int|string,string>}
     */
    protected function getFKData(string $fkTableName, string $fkKeyName): array
    {
        return $this->dbh->getForeignKeyData($fkTableName, $fkKeyName, E()->getLanguage()->getCurrent());
    }

    protected function getTranslationTableName(): ?string
    {
        return $this->translationTableName;
    }

    /**
     * @throws SystemException
     */
    protected function view(): void
    {
        $this->setType(self::COMPONENT_TYPE_FORM);

        $id = $this->getStateParams();
        [$id] = $id;

        if (!$this->recordExists($id)) {
            throw new SystemException('ERR_404', SystemException::ERR_404);
        }

        $this->addFilterCondition([$this->getTableName() . '.' . $this->getPK() => $id]);

        $this->prepare();
        foreach ($this->getDataDescription() as $fieldDescription) {
            $fieldDescription->setMode(FieldDescription::FIELD_MODE_READ);
        }
    }

    protected function recordExists($id, $fieldName = false): bool
    {
        if (!$fieldName) {
            $fieldName = $this->getPK();
        }

        $res = $this->dbh->select($this->getTableName(), [$fieldName], [$fieldName => $id]);
        return is_array($res);
    }

    protected function buildJS(): ?\DOMNode
    {
        $result = parent::buildJS();

        if ((($this->getState() == 'view') && $this->document->isEditable() && $this->getParam('editable')) ||
            in_array($this->getState(), ['add', 'edit'], true)
        ) {
            if ($this->document->isEditable()) {
                $this->setProperty('editable', 'editable');
            }

            $this->addWYSIWYGTranslations();

            if ($config = E()->getConfigValue('wysiwyg.styles')) {
                if (!$result) {
                    $result = $this->doc->createElement('javascript');
                }
                $JSObjectXML = $this->doc->createElement('variable');
                $JSObjectXML->setAttribute('name', 'wysiwyg_styles');
                $JSObjectXML->setAttribute('type', 'json');

                foreach ($config as $key => $value) {
                    if (isset($value['caption'])) {
                        $config[$key]['caption'] = $this->translate($value['caption']);
                    }
                }

                $JSObjectXML->appendChild(new \DomText(json_encode($config, JSON_UNESCAPED_UNICODE)));
                $result->appendChild($JSObjectXML);
            }
        }

        return $result;
    }

    /**
     * @throws SystemException
     */
    final protected function getPreviousState(): string
    {
        if (!$this->previousState) {
            if (!isset($_POST['componentAction'])) {
                throw new SystemException('ERR_NO_COMPONENT_ACTION', SystemException::ERR_CRITICAL);
            }
            $this->previousState = (string)$_POST['componentAction'];
        }

        return $this->previousState;
    }

    protected function saveText(): void
    {
        $result = '';
        if ($this->getParam('editable') && isset($_POST['ID'], $_POST['num'], $_POST['data'])) {
            $result   = DataSet::cleanupHTML((string)$_POST['data']);
            $langID   = E()->getLanguage()->getCurrent();
            $entityId = (int)$_POST['ID'];
            $field    = (string)$_POST['num'];

            $this->dbh->modify(
                QAL::UPDATE,
                $this->getTranslationTableName(),
                [$field => $result],
                ['lang_id' => $langID, $this->getPK() => $entityId]
            );
        }

        $this->response->setHeader('Content-Type', 'application/xml; charset=utf-8');
        $this->response->write($result);
        $this->response->commit();
    }
}
