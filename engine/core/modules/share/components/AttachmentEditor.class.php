<?php
declare(strict_types=1);

/**
 * Attachment editor.
 *
 * Совместимая с Grid версия с типами и мелкими улучшениями стабильности.
 */
final class AttachmentEditor extends Grid
{
    /**
     * @copydoc Grid::__construct
     */
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);

        $linkedID = $this->getParam('linkedID');
        $pk       = $this->getParam('pk');

        // Не вмешиваемся в save, чтобы не испортить фильтры сейвера
        if ($this->getState() !== 'save') {
            if ($linkedID) {
                $this->addFilterCondition([$pk => $linkedID]);
            } else {
                $this->addFilterCondition([$pk => null, 'session_id' => session_id()]);
            }
        }

        // Параметры «быстрой» загрузки
        $quickUploadPath = (string) $this->getConfigValue('repositories.quick_upload_path', 'uploads/public');
        $quickUploadPid  = (int) $this->dbh->getScalar(
            'share_uploads',
            'upl_id',
            ['upl_path' => $quickUploadPath]
        );

        $quickUploadEnabled = $this->isQuickUploadEnabledForTable($this->getTableName());

        $this->setProperty('quickUploadPath', $quickUploadPath);
        $this->setProperty('quickUploadPid', $quickUploadPid ?: null);
        $this->setProperty('quickUploadEnabled', $quickUploadEnabled);
    }

    /**
     * @copydoc Grid::defineParams
     */
    protected function defineParams(): array
    {
        return array_merge(
            parent::defineParams(),
            [
                'linkedID'      => false,
                'pk'            => false,
                'origTableName' => false,
            ]
        );
    }

    /**
     * @copydoc Grid::prepare
     *
     * Делает поле upl_id типа INT в форме add/edit,
     * чтобы исключить подтягивание значений по FK.
     */
    protected function prepare(): void
    {
        parent::prepare();

        if (in_array($this->getState(), ['add', 'edit'], true)) {
            // upl_id как INT
            $fd = $this->getDataDescription()->getFieldDescriptionByName('upl_id');
            if ($fd instanceof FieldDescription) {
                $fd->setType(FieldDescription::FIELD_TYPE_INT);

                if ($this->getState() === 'edit') {
                    $uplField = $this->getData()->getFieldByName('upl_id');
                    if ($uplField instanceof Field) {
                        $uplId  = (int) $uplField->getRowData(0);
                        if ($uplId) {
                            $uplPath = (string) $this->dbh->getScalar(
                                'share_uploads',
                                'upl_path',
                                ['upl_id' => $uplId]
                            );
                            if ($uplPath !== '') {
                                $fd->setProperty('upl_path', $uplPath);
                            }
                        }
                    }
                }
            }

            // PK = linkedID
            $pkName  = (string) $this->getParam('pk');
            $pkField = $pkName ? $this->getData()->getFieldByName($pkName) : null;
            if ($pkField instanceof Field) {
                $pkField->setData($this->getParam('linkedID'), true);
            }

            // session_id
            $sessField = $this->getData()->getFieldByName('session_id');
            if ($sessField instanceof Field) {
                $sessField->setData(session_id(), true);
            }
        }
    }

    /**
     * @copydoc Grid::createDataDescription
     *
     * Дополняет DD полями из share_uploads и прячет PK/session_id.
     */
    protected function createDataDescription(): DataDescription
    {
        $dd = parent::createDataDescription();

        // Скрываем PK основной таблицы и session_id
        $pkName = (string) $this->getParam('pk');
        if ($pkName) {
            if ($fd = $dd->getFieldDescriptionByName($pkName)) {
                $fd->setType(FieldDescription::FIELD_TYPE_HIDDEN);
            }
        }
        if ($fd = $dd->getFieldDescriptionByName('session_id')) {
            $fd->setType(FieldDescription::FIELD_TYPE_HIDDEN);
        }

        if (in_array($this->getState(), ['getRawData', 'main'], true)) {
            if ($fd = $dd->getFieldDescriptionByName('upl_id')) {
                $fd->setType(FieldDescription::FIELD_TYPE_HIDDEN);
            }

            $field = new FieldDescription('upl_path');
            $field->setType(FieldDescription::FIELD_TYPE_FILE);
            $field->setProperty('title', 'FIELD_IMG_FILENAME_IMG');
            $field->setProperty('customField', true);
            $dd->addFieldDescription($field);

            $field = new FieldDescription('upl_name');
            $field->setType(FieldDescription::FIELD_TYPE_CUSTOM);
            $field->setProperty('title', 'FIELD_IMG_FILENAME');
            $field->setProperty('customField', true);
            $dd->addFieldDescription($field);
        }

        return $dd;
    }

    /**
     * @copydoc Grid::loadDataDescription
     *
     * Отключаем FK для upl_id и связки с основной таблицей.
     */
    protected function loadDataDescription(): array|false|null
    {
        $r = parent::loadDataDescription();
        if (is_array($r)) {
            if (isset($r['upl_id'])) {
                $r['upl_id']['key'] = false;
            }
            $pkName = (string) $this->getParam('pk');
            if ($pkName && isset($r[$pkName])) {
                $r[$pkName]['key'] = false;
            }
        }
        return $r;
    }

    /**
     * @copydoc Grid::loadData
     *
     * Дополняет набор данных полями upl_path/upl_name.
     */
    protected function loadData(): array|false|null
    {
        $data = parent::loadData();

        if ($this->getState() === 'getRawData' && is_array($data) && $data !== []) {
            $inverted = inverseDBResult($data);
            $uplIds   = array_map('intval', $inverted['upl_id'] ?? []);
            $uplIds   = array_values(array_filter($uplIds));

            if ($uplIds !== []) {
                $res = $this->dbh->select(
                    'share_uploads',
                    ['upl_id', 'upl_path', 'upl_title as upl_name', 'upl_duration'],
                    ['upl_id' => $uplIds]
                );

                if (is_array($res) && $res !== []) {
                    // Сопоставление upl_id => row
                    $byId = [];
                    foreach ($res as $row2) {
                        $byId[(int) $row2['upl_id']] = $row2;
                    }

                    foreach ($data as $i => $row) {
                        $uid = (int) ($row['upl_id'] ?? 0);
                        if ($uid && isset($byId[$uid])) {
                            $data[$i]['upl_path'] = $byId[$uid]['upl_path'] ?? null;
                            $data[$i]['upl_name'] = $byId[$uid]['upl_name'] ?? null;
                        }
                    }
                }
            }
        }

        return $data;
    }

    /**
     * Save quick upload.
     *
     * @throws \Exception
     * @throws SystemException
     */
    protected function savequickupload(): void
    {
        $inTx = $this->dbh->beginTransaction();
        try {
            $upl_id = isset($_POST['upl_id']) ? (int) $_POST['upl_id'] : 0;

            $orderFieldName = $this->detectOrderField($this->getTableName());

            $data = [
                (string) $this->getParam('pk') => $this->getParam('linkedID'),
                'session_id'                   => session_id(),
                'upl_id'                       => $upl_id,
            ];

            if ($orderFieldName) {
                // Часто порядок совпадает с upl_id
                $data[$orderFieldName] = $upl_id;
            }

            $result = $this->dbh->modify(
                QAL::INSERT,
                $this->getTableName(),
                $data
            );

            // Если есть языковая таблица — создаём пустые записи
            if ($result && ($langTable = $this->dbh->getTranslationTablename($this->getTableName()))) {
                $langColumns = $this->dbh->getColumnsInfo($langTable);

                $fields = [$this->getPK() => $result];
                if (is_array($langColumns)) {
                    foreach ($langColumns as $colName => $colProps) {
                        $isPrimary = !empty($colProps['index']) && $colProps['index'] === 'PRI';
                        if (!$isPrimary) {
                            $fields[(string) $colName] = '';
                        }
                    }
                }

                $langs = E()->getLanguage()->getLanguages();
                foreach (array_keys($langs) as $lang_id) {
                    $this->dbh->modify(
                        QAL::INSERT,
                        $langTable,
                        array_merge($fields, ['lang_id' => (int) $lang_id])
                    );
                }
            }

            $this->dbh->commit();

            $b = new JSONCustomBuilder();
            $b->setProperties([
                'data'   => is_int($result) ? $result : false,
                'result' => true,
                'mode'   => is_int($result) ? 'insert' : 'update',
            ]);
            $this->setBuilder($b);
        } catch (SystemException $e) {
            if ($inTx) {
                $this->dbh->rollback();
            }
            throw $e;
        } catch (\Exception $e) {
            if ($inTx) {
                $this->dbh->rollback();
            }
            throw $e;
        }
    }

    /**
     * @copydoc Grid::saveData
     *
     * Правильно сохраняет порядок в order_num полях.
     */
    protected function saveData()
    {
        $result = false;

        // Режим: alter или add
        if (
            isset($_POST[$this->getTableName()][$this->getPK()]) &&
            !empty($_POST[$this->getTableName()][$this->getPK()])
        ) {
            $mode = self::COMPONENT_TYPE_FORM_ALTER;
            $this->setFilter([$this->getPK() => $_POST[$this->getTableName()][$this->getPK()]]);
        } else {
            $mode = self::COMPONENT_TYPE_FORM_ADD;
        }

        // Описание данных из конфига
        $dataDescriptionObject = new DataDescription();

        if (!method_exists($this, $this->getPreviousState())) {
            throw new SystemException('ERR_NO_ACTION', SystemException::ERR_CRITICAL);
        }

        $configDataDescription = $this->getConfig()->getStateConfig($this->getPreviousState());
        if (isset($configDataDescription->fields)) {
            $dataDescriptionObject->loadXML($configDataDescription->fields);
        }

        // Описание данных из БД
        $DBDataDescription = new DataDescription();
        $DBDataDescription->load($this->loadDataDescription());
        $this->setDataDescription($dataDescriptionObject->intersect($DBDataDescription));

        // Поле порядка — убрать из DD
        if (($col = $this->getOrderColumn()) &&
            ($field = $this->getDataDescription()->getFieldDescriptionByName($col))
        ) {
            $this->getDataDescription()->removeFieldDescription($field);
        }

        // Данные
        $dataArray = $this->loadData();
        $dataObj   = new Data();
        $dataObj->load(is_array($dataArray) ? $dataArray : []);
        $this->setData($dataObj);

        // Saver
        $saver = $this->getSaver();
        $saver->setMode($mode);
        $saver->setDataDescription($this->getDataDescription());
        $saver->setData($this->getData());

        if ($saver->validate() === true) {
            $saver->setFilter($this->getFilter());
            $saver->save();
            $result = $saver->getResult();
        } else {
            throw new SystemException(
                'ERR_VALIDATE_FORM',
                SystemException::ERR_WARNING,
                $this->saver->getErrors()
            );
        }

        // Если только что вставили — выставим order_num
        if (($orderColumn = $this->getOrderColumn()) && ($mode === self::COMPONENT_TYPE_FORM_ADD)) {
            $linkedID = $this->getParam('linkedID');
            $pk       = (string) $this->getParam('pk');

            if ($linkedID) {
                $newOrderNum = $this->dbh->getScalar(
                    'SELECT max(' . $orderColumn . ') as max_order_num
                     FROM ' . $this->getTableName() . ' WHERE `' . $pk . '` = %s',
                    $linkedID
                );
            } else {
                $newOrderNum = $this->dbh->getScalar(
                    'SELECT max(' . $orderColumn . ') as max_order_num
                     FROM ' . $this->getTableName() . ' WHERE `' . $pk . '` IS NULL AND session_id = %s',
                    session_id()
                );
            }

            $newOrderNum = (!$newOrderNum) ? 1 : ((int) $newOrderNum + 1);

            $this->addFilterCondition([$this->getPK() . '=' . $result]);
            $request =
                'UPDATE ' . $this->getTableName() . ' SET ' . $orderColumn . ' = %s ' .
                $this->dbh->buildWhereCondition($this->getFilter());
            $this->dbh->modifyRequest($request, $newOrderNum);
        }

        return $result;
    }

    /* ===================== Helpers ===================== */

    /**
     * Можно ли включать «быструю» загрузку для таблицы с учётом языковой таблицы.
     */
    private function isQuickUploadEnabledForTable(string $table): bool
    {
        $enabled = $this->checkQuickUploadColumns($table);

        $langTable = $this->dbh->getTranslationTablename($table);
        if ($enabled && $langTable) {
            $enabled = $this->checkQuickUploadColumns($langTable);
        }
        return $enabled;
    }

    /**
     * Проверка столбцов: все НЕ-NULL поля (кроме PK/upl_id/*order_num*) должны отсутствовать,
     * иначе быстрая загрузка невозможна.
     */
    private function checkQuickUploadColumns(string $table): bool
    {
        $columns = $this->dbh->getColumnsInfo($table);
        if (!is_array($columns)) {
            return true; // по умолчанию не запрещаем
        }

        foreach ($columns as $colName => $colProps) {
            $isPrimary = !empty($colProps['index']) && $colProps['index'] === 'PRI';
            $nullable  = $colProps['nullable'] ?? true;

            if (!$isPrimary && $colName !== 'upl_id' && !str_contains((string) $colName, 'order_num') && !$nullable) {
                return false;
            }
        }
        return true;
    }

    /** Найти имя order_num колонки (если есть). */
    private function detectOrderField(string $table): ?string
    {
        $columns = $this->dbh->getColumnsInfo($table);
        if (!is_array($columns)) {
            return null;
        }
        foreach ($columns as $colName => $_) {
            if (str_contains((string) $colName, 'order_num')) {
                return (string) $colName;
            }
        }
        return null;
    }
}
