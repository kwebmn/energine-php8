<?php

declare(strict_types=1);

/**
 * @file
 * Grid
 *
 * Полностью переписанный файл для корректной работы под PHP 8.3
 * и стабильного вывода формы добавления (add).
 */

/**
 * Grid.
 */
class Grid extends DBDataSet
{
    /**
     * Direction: up.
     * @var string
     */
    public const DIR_UP = '<';

    /**
     * Direction: down.
     * @var string
     */
    public const DIR_DOWN = '>';

    /**
     * @var FiltersTreeEditor
     */
    protected $filtersTree;

    /**
     * @var AttachmentEditor
     */
    protected $attachmentEditor;

    /**
     * Tag editor.
     * @var TagEditor
     */
    protected $tagEditor;

    /**
     * Saver.
     * @var Saver
     */
    protected $saver;

    /**
     * Column name for user sorting.
     * @var string|null
     */
    private $orderColumn = null;

    /**
     * Filter.
     * @var Filter
     */
    protected $filter_control;

    /**
     * Grid for select fields
     * @var Grid|null
     */
    protected $fkCRUDEditor = null;

    /**
     * @copydoc DBDataSet::__construct
     */
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);

        $this->setProperty('exttype', 'grid');

        if (!$this->getParam('recordsPerPage'))
        {
            $this->setParam('recordsPerPage', DataSet::RECORD_PER_PAGE);
        }

        if (!$this->getTitle())
        {
            $this->setTitle($this->translate('TXT_' . strtoupper($this->getName())));
        }

        if ($this->getParam('order'))
        {
            $cols = $this->dbh->getColumnsInfo($this->getTableName());
            if (in_array($this->getParam('order'), array_keys($cols), true))
            {
                $this->orderColumn = $this->getParam('order');
            }
        }
    }

    /**
     * @copydoc DBDataSet::defineParams
     */
    protected function defineParams(): array
    {
        $params = [];

        if (!isset($this->params['config']))
        {
            $fileName = get_class($this) . '.component.xml';

            $fileConf = sprintf(
                SITE_DIR . ComponentConfig::SITE_CONFIG_DIR,
                E()->getSiteManager()->getCurrentSite()->folder
            ) . $fileName;

            $coreConf = sprintf(
                CORE_DIR . ComponentConfig::CORE_CONFIG_DIR,
                $this->module
            ) . $fileName;

            if (file_exists($fileConf))
            {
                $params['config'] = $fileConf;
            }
            elseif (file_exists($coreConf))
            {
                $params['config'] = $coreConf;
            }
            else
            {
                $params['config'] = sprintf(
                    CORE_DIR . ComponentConfig::CORE_CONFIG_DIR,
                    'share/'
                ) . 'Grid.component.xml';
            }
        }

        $params['active'] = true;
        $params['thumbnail'] = [
            $this->getConfigValue('thumbnail.width'),
            $this->getConfigValue('thumbnail.height')
        ];
        $params['order'] = false;

        return array_merge(parent::defineParams(), $params);
    }

    /**
     * @copydoc DBDataSet::getConfig
     */
    protected function getConfig(): ComponentConfig
    {
        if (!$this->config)
        {
            $this->config = new GridConfig(
                $this->getParam('config'),
                get_class($this),
                $this->module
            );
        }
        return $this->config;
    }

    /**
     * Show add form.
     * ВАЖНО: фиксируем стейт 'add' в конфиге до prepare(),
     * чтобы гарантировать загрузку нужного набора полей.
     */
    protected function add()
    {
        $this->setType(self::COMPONENT_TYPE_FORM_ADD);

        // Явно устанавливаем текущий стейт для GridConfig
        $this->getConfig()->setCurrentState('add');

        $this->prepare();
        $this->addToolbarTranslations();
        $this->linkExtraManagers($this->getTableName());

        // Проставляем default-значения
        foreach ($this->getDataDescription() as $fdName => $fieldDescription)
        {
            $default = $fieldDescription->getPropertyValue('default');
            if ($default || $default === '0')
            {
                if (!($f = $this->getData()->getFieldByName($fdName)))
                {
                    $f = new Field($fdName);
                    $this->getData()->addField($f);
                }
                $f->setData($default, true);
            }
        }
    }

    /**
     * Show edit form.
     *
     * @throws SystemException 'ERR_404'
     */
    protected function edit()
    {
        $this->setType(self::COMPONENT_TYPE_FORM_ALTER);

        $id = $this->getStateParams();
        list($id) = $id;

        if (!$this->recordExists($id))
        {
            throw new SystemException('ERR_404', SystemException::ERR_404);
        }

        $this->setFilter($id);

        // Явно фиксируем стейт, чтобы конфиг отдал правильные поля
        $this->getConfig()->setCurrentState('edit');

        $this->prepare();
        $this->addToolbarTranslations();
        $this->linkExtraManagers($this->getTableName());
    }

    /**
     * Delete.
     *
     * @return void
     * @throws SystemException 'ERR_404'
     */
    protected function delete()
    {
        $started = $this->dbh->beginTransaction();
        try
        {
            list($id) = $this->getStateParams();
            if (!$this->recordExists($id))
            {
                throw new SystemException('ERR_404', SystemException::ERR_404);
            }

            $this->deleteData($id);

            $b = new JSONCustomBuilder();
            $b->setProperty('result', true)->setProperty('mode', 'delete');
            $this->setBuilder($b);

            $this->dbh->commit();
        }
        catch (SystemException $e)
        {
            if ($started)
            {
                $this->dbh->rollback();
            }
            throw $e;
        }
    }

    /**
     * Delete record.
     *
     * @param int $id Record ID.
     */
    protected function deleteData(int|string $id): void
    {
        $ids = null;

        if ($orderColumn = $this->getOrderColumn())
        {
            $deletedOrderNum = simplifyDBResult(
                $this->dbh->select(
                    $this->getTableName(),
                    $this->getOrderColumn(),
                    [$this->getPK() => $id]
                ),
                $this->getOrderColumn(),
                true
            );

            $ids = simplifyDBResult(
                $this->dbh->select(
                    $this->getTableName(),
                    [$this->getPK()],
                    array_merge(
                        $this->getFilter(),
                        [$orderColumn . ' > ' . $deletedOrderNum]
                    ),
                    [$orderColumn => QAL::ASC]
                ),
                $this->getPK()
            );
        }

        $this->dbh->modify(QAL::DELETE, $this->getTableName(), null, [$this->getPK() => $id]);

        // Перестраиваем индекс сортировки, если нужно
        if ($orderColumn && $ids)
        {
            $this->addFilterCondition([$this->getPK() => $ids]);

            $request =
                'UPDATE ' . $this->getTableName() . ' SET ' . $orderColumn .
                ' = ' . $orderColumn . ' - 1 ' .
                $this->dbh->buildWhereCondition($this->getFilter());

            $this->dbh->modifyRequest($request);
        }
    }

    /**
     * @copydoc DBDataSet::getDataLanguage
     */
    protected function getDataLanguage(): int|string|false
    {
        if (isset($_POST['languageID']) && $this->getState() == 'getRawData')
        {
            $langID = $_POST['languageID'];
            if (!E()->getLanguage()->isValidLangID($langID))
            {
                throw new SystemException('ERR_BAD_LANG_ID', SystemException::ERR_WARNING);
            }
            $result = $langID;
        }
        else
        {
            $result = parent::getDataLanguage();
        }
        return $result;
    }

    /**
     * Show data in JSON format for AJAX
     */
    protected function getRawData()
    {
        $this->setParam('onlyCurrentLang', true);
        $this->getConfig()->setCurrentState(self::DEFAULT_STATE_NAME);
        $this->setBuilder(new JSONBuilder());

        $this->setDataDescription($this->createDataDescription());
        $this->createPager();

        $this->applyUserFilter();
        $this->applyUserSort();

        $data = $this->createData();
        if ($data instanceof Data)
        {
            $this->setData($data);
        }
        if ($this->pager)
        {
            $this->getBuilder()->setPager($this->pager);
        }
    }

    /**
     * Single mode state that show Grid for select field values
     */
    protected function fkEditor()
    {
        list($fkField, $className) = $this->getStateParams();
        $className = explode('\\', urldecode($className));

        if (count($className) > 1)
        {
            list($module, $class) = $className;
        }
        else
        {
            $module = $this->module;
            list($class) = $className;
        }
        unset($className);

        $params = [];

        if ($class == 'Grid')
        {
            $cols = $this->dbh->getColumnsInfo($this->getTableName());
            if (!in_array($fkField, array_keys($cols), true) && $this->getTranslationTableName())
            {
                $cols = $this->dbh->getColumnsInfo($this->getTranslationTableName());
                if (!in_array($fkField, array_keys($cols), true))
                {
                    throw new SystemException('ERR_NO_COLUMN', SystemException::ERR_DEVELOPER, $fkField);
                }
            }
            elseif (!$this->getTranslationTableName())
            {
                throw new SystemException('ERR_NO_COLUMN', SystemException::ERR_DEVELOPER, $fkField);
            }

            if (!is_array($cols[$fkField]['key']))
            {
                throw new SystemException('ERR_BAD_FK_COLUMN', SystemException::ERR_DEVELOPER, $fkField);
            }
            $params['tableName'] = $cols[$fkField]['key']['tableName'];
        }
        else
        {
            if (!class_exists($class))
            {
                throw new SystemException('ERR_BAD_CLASS', SystemException::ERR_DEVELOPER, $class);
            }
            if (!is_subclass_of($class, 'Grid'))
            {
                throw new SystemException('ERR_BAD_CLASS', SystemException::ERR_DEVELOPER, $class);
            }
        }

        // Search for modal component config
        if (!file_exists($config = CORE_REL_DIR . sprintf(ComponentConfig::CORE_CONFIG_DIR, $module) . $class . 'Modal.component.xml'))
        {
            if (!file_exists($config = CORE_REL_DIR . sprintf(ComponentConfig::CORE_CONFIG_DIR, $module) . $class . '.component.xml'))
            {
                $config = CORE_REL_DIR . sprintf(ComponentConfig::CORE_CONFIG_DIR, 'share') . 'GridModal.component.xml';
            }
        }
        $params['config'] = $config;

        $this->request->shiftPath(2);
        $this->fkCRUDEditor = $this->document->componentManager->createComponent('fkEditor', $module, $class, $params);
        $this->fkCRUDEditor->run();
    }

    /**
     * Single mode state for getting latest values from FK table
     */
    protected function fkValues()
    {
        list($fkField) = $this->getStateParams();
        $cols = $this->dbh->getColumnsInfo($this->getTableName());

        if (!in_array($fkField, array_keys($cols), true) && $this->getTranslationTableName())
        {
            $cols = $this->dbh->getColumnsInfo($this->getTranslationTableName());
            if (!in_array($fkField, array_keys($cols), true))
            {
                throw new SystemException('ERR_NO_COLUMN', SystemException::ERR_DEVELOPER, $fkField);
            }
        }
        elseif (!$this->getTranslationTableName())
        {
            throw new SystemException('ERR_NO_COLUMN', SystemException::ERR_DEVELOPER, $fkField);
        }

        if (!is_array($cols[$fkField]['key']))
        {
            throw new SystemException('ERR_BAD_FK_COLUMN', SystemException::ERR_DEVELOPER, $fkField);
        }

        $builder = new JSONCustomBuilder();
        $builder->setProperty(
            'result',
            $this->getFKData($cols[$fkField]['key']['tableName'], $cols[$fkField]['key']['fieldName'])
        );
        $this->setBuilder($builder);
    }

    /**
     * Save (external method).
     */
    protected function save()
    {
        $started = $this->dbh->beginTransaction();
        try
        {
            if (BaseObject::_getConfigValue('site.apcu') == 1)
            {
                apcu_clear_cache();
            }

            $result = $this->saveData();

            $this->dbh->commit();

            $b = new JSONCustomBuilder();
            $b->setProperties([
                'data' => (is_int($result)) ? $result
                    : (int)$_POST[$this->getTableName()][$this->getPK()],
                'result' => true,
                'mode' => (is_int($result)) ? 'insert' : 'update'
            ]);
            $this->setBuilder($b);
        }
        catch (SystemException $e)
        {
            if ($started)
            {
                $this->dbh->rollback();
            }
            throw $e;
        }
        catch (PDOException $e)
        {
            if ($started)
            {
                $this->dbh->rollback();
            }
            throw new SystemException($e->getMessage());
        }
    }

    /**
     * @copydoc DBDataSet::createData
     */
    protected function createData(): Data
    {
        if (in_array($this->getType(), [
            self::COMPONENT_TYPE_FORM_ADD,
            self::COMPONENT_TYPE_FORM_ALTER,
            self::COMPONENT_TYPE_FORM
        ], true))
        {
            $dd = $this->getDataDescription();
            if ($selects = $dd->getFieldDescriptionsByType(FieldDescription::FIELD_TYPE_SELECT))
            {
                foreach ($selects as $select)
                {
                    $editorClassName = $select->getPropertyValue('editor');
                    // null — используем Grid по умолчанию
                    if (is_null($editorClassName))
                    {
                        $select->setProperty('editor', 'Grid');
                    }
                    elseif ($editorClassName === '')
                    {
                        // пустая строка — редактор не используем
                        $select->removeProperty('editor');
                    }
                    else
                    {
                        // нормализуем FQCN вида Module\Class -> Class
                        $parts = explode('\\', $editorClassName);
                        $editorClassName = (count($parts) > 1) ? $parts[1] : $parts[0];

                        if (!class_exists($editorClassName))
                        {
                            throw new SystemException('ERR_NO_EDITOR_CLASS', SystemException::ERR_DEVELOPER, $editorClassName);
                        }
                    }
                }
            }
        }

        return parent::createData();
    }

    /**
     * @copydoc DBDataSet::createDataDescription
     *
     * ДОБАВЛЕН fallback: если после parent::createDataDescription()
     * набор полей пуст для формы (add/edit), описываем поля по схеме БД.
     */
    protected function createDataDescription(): DataDescription
    {
        if (in_array($this->getState(), ['printData' /*, 'exportCSV'*/ ], true))
        {
            $previousAction = $this->getState();
            $this->getConfig()->setCurrentState(self::DEFAULT_STATE_NAME);
            $result = parent::createDataDescription();
            $this->getConfig()->setCurrentState($previousAction);
        }
        else
        {
            $result = parent::createDataDescription();
        }

        // Fallback для форм, когда конфиг не отдал полей
        if (in_array($this->getType(), [
            self::COMPONENT_TYPE_FORM_ADD,
            self::COMPONENT_TYPE_FORM_ALTER,
            self::COMPONENT_TYPE_FORM
        ], true))
        {

            $hasAnyField = false;
            foreach ($result as $_)
            {
                $hasAnyField = true;
                break;
            }

            if (!$hasAnyField)
            {
                $dbDD = new DataDescription();
                $dbDD->load($this->loadDataDescription());
                $result = $dbDD;
            }
        }

        // Убираем колонку порядка, если она есть в описании
        if (($col = $this->getOrderColumn())
            && ($field = $result->getFieldDescriptionByName($col))
        ) {
            $result->removeFieldDescription($field);
        }

        return $result;
    }

    /**
     * @copydoc DBDataSet::getFKData
     */
    protected function getFKData($fkTableName, $fkKeyName): array
    {
        $result = [];

        if ($this->getState() !== self::DEFAULT_STATE_NAME)
        {
            $result = $this->dbh->getForeignKeyData(
                $fkTableName,
                $fkKeyName,
                $this->document->getLang()
            );
        }

        return $result;
    }

    /**
     * Generate error.
     *
     * @param string $errorType
     * @param string $errorMessage
     * @param mixed  $errorCustomInfo
     * @return array
     */
    protected function generateError($errorType, $errorMessage, $errorCustomInfo = false)
    {
        $message['errors'][] = ['message' => $errorMessage];
        $response = array_merge(
            ['result' => false, 'header' => $this->translate('TXT_SHIT_HAPPENS')],
            $message
        );
        return $response;
    }

    /**
     * Get saver.
     *
     * @return Saver
     *
     * @final
     */
    final protected function getSaver()
    {
        if (is_null($this->saver))
        {
            $this->saver = new ExtendedSaver();
        }
        return $this->saver;
    }

    /**
     * Set saver.
     *
     * @param Saver $saver Saver.
     */
    final protected function setSaver(Saver $saver)
    {
        $this->saver = $saver;
    }

    /**
     * Save data (internal).
     *
     * @return mixed
     *
     * @throws SystemException 'ERR_NO_ACTION'
     * @throws SystemException 'ERR_VALIDATE_FORM'
     */
    protected function saveData()
    {
        $result = false;

        // если PK в POST — режим редактирования
        if (isset($_POST[$this->getTableName()][$this->getPK()])
            && !empty($_POST[$this->getTableName()][$this->getPK()])
        ) {
            $mode = self::COMPONENT_TYPE_FORM_ALTER;
            $this->setFilter([$this->getPK() => $_POST[$this->getTableName()][$this->getPK()]]);
        }
        else
        {
            $mode = self::COMPONENT_TYPE_FORM_ADD;
        }

        // создаем объект описания данных (из конфига)
        $dataDescriptionObject = new DataDescription();

        if (!method_exists($this, $this->getPreviousState()))
        {
            throw new SystemException('ERR_NO_ACTION', SystemException::ERR_CRITICAL);
        }

        // получаем описание полей для метода из конфига
        $configDataDescription = $this->getConfig()->getStateConfig($this->getPreviousState());

        if (isset($configDataDescription->fields))
        {
            $dataDescriptionObject->loadXML($configDataDescription->fields);
        }

        // Создаем описание полей из БД
        $DBDataDescription = new DataDescription();
        $DBDataDescription->load($this->loadDataDescription());

        // Пересечение конфиг-полей и БД
        $this->setDataDescription($dataDescriptionObject->intersect($DBDataDescription));

        // Убираем поле порядка следования
        if (($col = $this->getOrderColumn())
            && ($field = $this->getDataDescription()->getFieldDescriptionByName($col))
        ) {
            $this->getDataDescription()->removeFieldDescription($field);
        }

        // Данные
        $dataObject = new Data();
        $dataObject->load($this->loadData());
        $this->setData($dataObject);

        // Saver
        $saver = $this->getSaver();
        $saver->setMode($mode);
        $saver->setDataDescription($this->getDataDescription());
        $saver->setData($this->getData());

        if ($saver->validate() === true)
        {
            $saver->setFilter($this->getFilter());
            $saver->save();
            $result = $saver->getResult();
        }
        else
        {
            throw new SystemException('ERR_VALIDATE_FORM', SystemException::ERR_WARNING, $this->saver->getErrors());
        }

        // Если вставка и есть orderColumn — сдвигаем порядок
        if (($orderColumn = $this->getOrderColumn())
            && ($mode == self::COMPONENT_TYPE_FORM_ADD)
        ) {
            $this->addFilterCondition([$this->getPK() . '!=' . $result]);
            $request =
                'UPDATE ' . $this->getTableName() . ' SET ' . $orderColumn .
                '=' . $orderColumn . '+1 ' .
                $this->dbh->buildWhereCondition($this->getFilter());
            $this->dbh->modifyRequest($request);
        }

        return $result;
    }

    /**
     * @copydoc DBDataSet::build
     *
     * @note It includes translations and information about tabs.
     */
    public function build(): DOMDocument
    {
        switch ($this->getState())
        {
            case 'attachments':
                return $this->attachmentEditor->build();
            case 'tags':
                return $this->tagEditor->build();
            case 'fkEditor':
                return $this->fkCRUDEditor->build();
            case 'filtersTreeEditor':
                return $this->filtersTree->build();
            default:
                // do nothing
        }

        if ($this->getType() == self::COMPONENT_TYPE_LIST)
        {
            $this->addTranslation('MSG_CONFIRM_DELETE');
        }

        $result = parent::build();

        if (!empty($this->filter_control))
        {
            if ($f = $this->filter_control->build())
            {
                $result->documentElement->appendChild(
                    $result->importNode($f, true)
                );
            }
        }

        return $result;
    }

    /**
     * @copydoc DBDataSet::loadData
     */
    protected function loadData(): array|false|null
    {
        // Для действия main не выводим данные
        // Для действия save определяем другой формат данных
        if ($this->getState() == self::DEFAULT_STATE_NAME || $this->getState() == 'move')
        {
            $result = false;

        }
        elseif ($this->getState() == 'save')
        {
            if (!isset($_POST[$this->getTableName()]))
            {
                throw new SystemException('ERR_NO_DATA', SystemException::ERR_CRITICAL);
            }

            $data = $_POST[$this->getTableName()];
            $result = [$data];

            if ($this->getTranslationTableName())
            {
                if (!isset($_POST[$this->getTranslationTableName()]))
                {
                    throw new SystemException('ERR_NO_DATA', SystemException::ERR_CRITICAL);
                }
                $result = [];
                $multidata = $_POST[$this->getTranslationTableName()];
                foreach ($multidata as $langID => $langValues)
                {
                    $idx = arrayPush($result, $data);
                    $result[$idx]['lang_id'] = $langID;
                    foreach ($langValues as $fieldName => $fieldValue)
                    {
                        $result[$idx][$fieldName] = $fieldValue;
                    }
                }
            }
        }
        else
        {
            $result = parent::loadData();
        }

        return $result;
    }

    /**
     * Show component: attachments.
     */
    protected function attachments()
    {
        $sp = $this->getStateParams(true);
        $attachmentEditorParams = [
            'origTableName' => $this->getTableName(),
            'pk' => $this->getPK(),
            'tableName' => $this->getTableName() . AttachmentManager::ATTACH_TABLE_SUFFIX,
        ];

        if (isset($sp['id']))
        {
            $this->request->shiftPath(2);
            $attachmentEditorParams['linkedID'] = $sp['id'];
        }
        else
        {
            $this->request->shiftPath(1);
        }

        $this->attachmentEditor = $this->document->componentManager->createComponent(
            'attachmentEditor',
            'share',
            'AttachmentEditor',
            $attachmentEditorParams
        );
        $this->attachmentEditor->run();
    }

    protected function filtersTreeEditor()
    {
        $sp = $this->getStateParams(true);
        $filtersTreeEditorParams = [
            'origTableName' => $this->getTableName(),
            'pk' => $this->getPK(),
            'tableName' => $this->getTableName() . FilterManager::FILTER_TABLE_SUFFIX,
        ];

        if (isset($sp['id']))
        {
            $this->request->shiftPath(2);
            $filtersTreeEditorParams['linkedID'] = $sp['id'];
        }
        else
        {
            $this->request->shiftPath(1);
        }

        $this->filtersTree = $this->document->componentManager->createComponent(
            'filtersTreeEditor',
            'share',
            'FiltersTreeEditor',
            $filtersTreeEditorParams
        );
        $this->filtersTree->run();
    }

    /**
     * Show component: tag editor.
     */
    protected function tags()
    {
        $this->request->setPathOffset($this->request->getPathOffset() + 1);
        $this->tagEditor = $this->document->componentManager->createComponent(
            'tageditor',
            'share',
            'TagEditor',
            ['config' => 'engine/core/modules/share/config/TagEditorModal.component.xml']
        );
        $this->tagEditor->run();
    }

    /**
     * Set column name for user sorting.
     *
     * @param string $columnName Column name.
     */
    protected function setOrderColumn($columnName)
    {
        $this->orderColumn = $columnName;
        $this->setOrder([$columnName => QAL::ASC]);
    }

    /**
     * Get column name for user sorting.
     *
     * @return string|false
     */
    protected function getOrderColumn()
    {
        if (is_null($this->orderColumn))
        {
            $this->orderColumn = false;
            $columns = $this->dbh->getColumnsInfo($this->getTableName());
            foreach (array_keys($columns) as $columnName)
            {
                // ВАЖНО: корректная проверка strpos
                if (strpos($columnName, '_order_num') !== false)
                {
                    $this->setOrderColumn($columnName);
                    break;
                }
            }
        }
        return $this->orderColumn;
    }

    /**
     * Show GRID for moving element.
     *
     * @throws SystemException 'ERR_NO_ORDER_COLUMN'
     * @throws SystemException 'ERR_404'
     */
    protected function move()
    {
        if (!$this->getOrderColumn())
        {
            throw new SystemException('ERR_NO_ORDER_COLUMN', SystemException::ERR_DEVELOPER);
        }
        $id = $this->getStateParams();
        list($id) = $id;

        if (!$this->recordExists($id))
        {
            throw new SystemException('ERR_404', SystemException::ERR_404);
        }

        $this->setType(self::COMPONENT_TYPE_LIST);
        $this->setProperty('moveFromId', $id);
        $this->prepare();
    }

    /**
     * Move the record.
     *
     * Allowed movement: above | below | top | bottom
     *
     * @throws SystemException 'ERR_NO_ORDER_COLUMN'
     */
    protected function moveTo()
    {
        if (!$this->getOrderColumn())
        {
            throw new SystemException('ERR_NO_ORDER_COLUMN', SystemException::ERR_DEVELOPER);
        }

        $params = $this->getStateParams();
        list($firstItem, $direction) = $params;

        $allowed_directions = ['first', 'last', 'above', 'below'];
        if (in_array($direction, $allowed_directions, true) && $firstItem == intval($firstItem))
        {
            switch ($direction)
            {
                case 'first':
                    $oldFirstItem = (int)$this->dbh->getScalar('SELECT MIN(' . $this->getOrderColumn() . ') FROM ' . $this->getTableName() . ' LIMIT 1');
                    if ($oldFirstItem != $firstItem)
                    {
                        $this->dbh->modify(
                            QAL::UPDATE,
                            $this->getTableName(),
                            [$this->getOrderColumn() => $oldFirstItem - 1],
                            [$this->getPK() => $firstItem]
                        );
                    }
                    break;

                case 'last':
                    $oldLastItem = (int)$this->dbh->getScalar('SELECT MAX(' . $this->getOrderColumn() . ') FROM ' . $this->getTableName() . ' LIMIT 1');
                    if ($oldLastItem != $firstItem)
                    {
                        $this->dbh->modify(
                            QAL::UPDATE,
                            $this->getTableName(),
                            [$this->getOrderColumn() => $oldLastItem + 1],
                            [$this->getPK() => $firstItem]
                        );
                    }
                    break;

                case 'above':
                case 'below':
                    $secondItem = (!empty($params[2])) ? $params[2] : null;
                    if ($secondItem == intval($secondItem) && $firstItem != $secondItem)
                    {
                        $secondItemOrderNum = $this->dbh->getScalar(
                            'SELECT ' . $this->getOrderColumn() . ' as secondItemOrderNum ' .
                            'FROM ' . $this->getTableName() . ' ' .
                            'WHERE ' . $this->getPK() . ' = ' . $secondItem
                        );

                        $this->dbh->beginTransaction();

                        // Сдвигаем все элементы
                        $this->dbh->select(
                            'UPDATE ' . $this->getTableName() . ' ' .
                            'SET ' . $this->getOrderColumn() . ' = ' .
                            $this->getOrderColumn() . (($direction == 'below') ? ' +2 ' : ' -2 ') .
                            'WHERE ' . $this->getOrderColumn() . (($direction == 'below') ? ' > ' : ' < ') .
                            intval($secondItemOrderNum)
                        );

                        // Устанавливаем новый порядок для перемещаемого id
                        $this->dbh->modify(
                            QAL::UPDATE,
                            $this->getTableName(),
                            [$this->getOrderColumn() => (($direction == 'below') ? $secondItemOrderNum + 1 : $secondItemOrderNum - 1)],
                            [$this->getPK() => $firstItem]
                        );

                        $this->dbh->commit();
                    }
                    break;
            }
        }

        $b = new JSONCustomBuilder();
        $b->setProperty('result', true);
        $this->setBuilder($b);
    }

    /**
     * Change the moving direction to Grid::DIR_UP.
     */
    protected function up()
    {
        $this->changeOrder(Grid::DIR_UP);
    }

    /**
     * Change the moving direction to Grid::DIR_DOWN.
     */
    protected function down()
    {
        $this->changeOrder(Grid::DIR_DOWN);
    }

    /**
     * Change order.
     *
     * @param string $direction Direction.
     *
     * @throws SystemException 'ERR_NO_ORDER_COLUMN'
     */
    protected function changeOrder(string $direction): void
    {
        $this->applyUserFilter();
        if (!$this->getOrderColumn())
        {
            throw new SystemException('ERR_NO_ORDER_COLUMN', SystemException::ERR_DEVELOPER);
        }

        $currentID = $this->getStateParams();
        list($currentID) = $currentID;

        // Определяем order_num текущего
        $currentOrderNum = simplifyDBResult(
            $this->dbh->selectRequest(
                'SELECT ' . $this->getOrderColumn() . ' ' .
                'FROM ' . $this->getTableName() . ' ' .
                'WHERE ' . $this->getPK() . ' = %s',
                $currentID
            ),
            $this->getOrderColumn(),
            true
        );

        $orderDirection = ($direction == Grid::DIR_DOWN) ? QAL::ASC : QAL::DESC;

        $baseFilter = $this->getFilter();

        if (!empty($baseFilter))
        {
            $baseFilter = ' AND ' .
                str_replace('WHERE', '', $this->dbh->buildWhereCondition($this->getFilter()));
        }
        else
        {
            $baseFilter = '';
        }

        // Ищем соседа
        $request =
            'SELECT ' . $this->getPK() . ' as neighborID, ' .
            $this->getOrderColumn() . ' as neighborOrderNum ' .
            'FROM ' . $this->getTableName() . ' ' .
            'WHERE ' . $this->getOrderColumn() . ' ' . $direction .
            ' ' . $currentOrderNum . ' ' . $baseFilter .
            'ORDER BY ' . $this->getOrderColumn() . ' ' .
            $orderDirection . ' Limit 1';

        $data = convertDBResult($this->dbh->selectRequest($request), 'neighborID');
        if ($data)
        {
            $neighborID = null;
            $neighborOrderNum = 0;
            extract(current($data));

            $this->dbh->beginTransaction();

            $this->dbh->modify(
                QAL::UPDATE,
                $this->getTableName(),
                [$this->getOrderColumn() => $neighborOrderNum],
                [$this->getPK() => $currentID]
            );
            $this->dbh->modify(
                QAL::UPDATE,
                $this->getTableName(),
                [$this->getOrderColumn() => $currentOrderNum],
                [$this->getPK() => $neighborID]
            );

            $this->dbh->commit();
        }

        $b = new JSONCustomBuilder();
        $b->setProperties([
            'result' => true,
            'dir' => $direction
        ]);
        $this->setBuilder($b);
    }

    /**
     * Apply user filter.
     */
    protected function applyUserFilter()
    {
        $filter = new Filter();
        $filter->apply($this);
    }

    /**
     * Apply user sorting.
     */
    protected function applyUserSort()
    {
        $actionParams = $this->getStateParams(true);
        if (isset($actionParams['sortField']) && isset($actionParams['sortDir']))
        {
            $this->setOrder([$actionParams['sortField'] => $actionParams['sortDir']]);
        }
    }

    /**
     * Add translations for WYSIWYG.
     */
    private function addToolbarTranslations()
    {
        foreach ($this->getDataDescription() as $fd)
        {
            if ($fd->getType() == FieldDescription::FIELD_TYPE_HTML_BLOCK)
            {
                $this->addWYSIWYGTranslations();
                break;
            }
        }
    }

    /**
     * Build the list of additional files / tabs.
     *
     * @param string $tableName Table name.
     * @param bool   $data      Data.
     */
    protected function linkExtraManagers($tableName, $data = false)
    {
        if ($this->dbh->tableExists($tableName . AttachmentManager::ATTACH_TABLE_SUFFIX) && $this->getState() != 'attachments')
        {

            $fd = new FieldDescription('attached_files');
            $fd->setType(FieldDescription::FIELD_TYPE_TAB);
            $fd->setProperty('title', $this->translate('TAB_ATTACHED_FILES'));
            $fd->setProperty('tableName', $tableName . AttachmentManager::ATTACH_TABLE_SUFFIX);
            $this->getDataDescription()->addFieldDescription($fd);

            $field = new Field('attached_files');
            $state = $this->getState();
            $tab_url = (($state != 'add') ? $this->getData()->getFieldByName($this->getPK())->getRowData(0) : '') . '/attachments/';

            $field->setData($tab_url, true);
            $this->getData()->addField($field);
        }

        if ($this->dbh->tableExists($this->getTableName() . TagManager::TAGS_TABLE_SUFFIX))
        {
            $tm = new TagManager($this->getDataDescription(), $this->getData(), $this->getTableName());
            $tm->createFieldDescription();
            $tm->createField();
        }

        if ($this->dbh->tableExists($tableName . FilterManager::FILTER_TABLE_SUFFIX) && $this->getState() != 'filtersTree')
        {

            $fd = new FieldDescription('filtersTree');
            $fd->setType(FieldDescription::FIELD_TYPE_TAB);
            $fd->setProperty('title', $this->translate('TAB_FILTERS'));
            $fd->setProperty('tableName', $tableName . FilterManager::FILTER_TABLE_SUFFIX);
            $this->getDataDescription()->addFieldDescription($fd);

            $field = new Field('filtersTree');
            $state = $this->getState();
            $tab_url = (($state != 'add') ? $this->getData()->getFieldByName($this->getPK())->getRowData(0) : '') . '/filtersTree/';

            $field->setData($tab_url, true);
            $this->getData()->addField($field);
        }
    }

    /**
     * Autocomplete tag names.
     *
     * @throws SystemException 'ERR_NO_DATA'
     */
    protected function autoCompleteTags()
    {
        $b = new JSONCustomBuilder();
        $this->setBuilder($b);

        try
        {
            if (!isset($_POST['value']))
            {
                throw new SystemException('ERR_NO_DATA', SystemException::ERR_CRITICAL);
            }
            else
            {

                $tags = TagManager::getTagStartedWith($_POST['value'], 10);
                $result['result'] = true;

                if (is_array($tags) && !empty($tags))
                {
                    foreach ($tags as $tag)
                    {
                        $result['data'][] = [
                            'key' => $tag,
                            'value' => $tag
                        ];
                    }
                }
            }
        }
        catch (Exception $e)
        {
            $result = [
                'result' => false,
                'data' => false,
                'errors' => []
            ];
        }

        $b->setProperties($result);
    }

    /**
     * @copydoc DBDataSet::prepare
     */
    protected function prepare(): void
    {
        parent::prepare();

        if ($this->getType() == self::COMPONENT_TYPE_LIST)
        {
            $this->createFilter();
        }
    }

    /**
     * Create Grid filter.
     */
    protected function createFilter()
    {
        if ($config = $this->getConfig()->getCurrentStateConfig())
        {
            $this->filter_control = new Filter();

            $cInfo = $this->dbh->getColumnsInfo($this->getTableName());
            if ($this->getTranslationTableName())
            {
                $cInfo = array_merge($cInfo, $this->dbh->getColumnsInfo($this->getTranslationTableName()));
            }

            if ($config->filter)
            {
                $this->filter_control->load($config->filter, $cInfo);
            }
            else
            {
                foreach ($this->getDataDescription() as $fName => $fAttributes)
                {
                    if (in_array($fAttributes->getType(), [
                            FieldDescription::FIELD_TYPE_DATETIME,
                            FieldDescription::FIELD_TYPE_DATE,
                            FieldDescription::FIELD_TYPE_INT,
                            FieldDescription::FIELD_TYPE_SELECT,
                            FieldDescription::FIELD_TYPE_PHONE,
                            FieldDescription::FIELD_TYPE_EMAIL,
                            FieldDescription::FIELD_TYPE_STRING,
                            FieldDescription::FIELD_TYPE_TEXT,
                            FieldDescription::FIELD_TYPE_HTML_BLOCK,
                            FieldDescription::FIELD_TYPE_BOOL
                        ], true)
                        && ($fAttributes->getPropertyValue('index') != 'PRI')
                        && (strpos($fName, '_num') === false)
                        && array_key_exists($fName, $cInfo)
                    ) {
                        $ff = new FilterField($fName, $fAttributes->getType());
                        $ff->setAttribute('tableName', $cInfo[$fName]['tableName']);
                        $ff->setAttribute('title', 'FIELD_' . $fName);
                        $this->filter_control->attachField($ff);
                    }
                }
            }
        }
    }
}
