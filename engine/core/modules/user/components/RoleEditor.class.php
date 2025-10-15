<?php

declare(strict_types=1);

/**
 * Редактор ролей (групп пользователей).
 *
 * Совместимо с PHP 8.3, содержит аккуратные проверки и строгие типы.
 */
final class RoleEditor extends Grid
{
    /**
     * Поля, значение true у которых может быть только у одной записи.
     * Например: единственная "группа по умолчанию".
     */
    private array $uniqueFields = ['group_default', 'group_user_default'];

    /**
     * @copydoc Grid::__construct
     */
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);
        $this->setTableName('user_groups');
        $this->setTitle($this->translate('TXT_ROLE_EDITOR'));
    }

    /**
     * @copydoc Grid::build
     *
     * В форме редактирования — если флажок "по умолчанию" уже установлен,
     * делаем соответствующие поля только для чтения.
     */
    public function build(): DOMDocument
    {
        if ($this->getType() === self::COMPONENT_TYPE_FORM_ALTER)
        {
            foreach ($this->uniqueFields as $fieldName)
            {
                $f = $this->getData()->getFieldByName($fieldName);
                if ($f && ($f->getRowData(0) === true || $f->getRowData(0) === 1 || $f->getRowData(0) === '1'))
                {
                    if ($fd = $this->getDataDescription()->getFieldDescriptionByName($fieldName))
                    {
                        $fd->setMode(FieldDescription::FIELD_MODE_READ);
                    }
                }
            }
        }

        return parent::build();
    }

    /**
     * @copydoc Grid::loadData
     *
     * На сохранении: если отмечено одно из unique-полей — снимаем это свойство у всех остальных записей.
     */
    protected function loadData(): array|false|null
    {
        $result = parent::loadData();

        if ($this->getState() === 'save' && is_array($result) && isset($result[0]))
        {
            foreach ($this->uniqueFields as $fieldName)
            {
                if (!empty($result[0][$fieldName]))
                {
                    // Снимаем признак у всех перед сохранением текущей записи.
                    $this->dbh->modify(QAL::UPDATE, $this->getTableName(), [$fieldName => false]);
                }
            }
        }

        return $result;
    }

    /**
     * @copydoc Grid::createDataDescription
     *
     * Добавляет вкладку с правами на разделы (fake-поле group_div_rights).
     */
    protected function createDataDescription(): DataDescription
    {
        $dd = parent::createDataDescription();

        if ($this->getType() !== self::COMPONENT_TYPE_LIST)
        {
            // Все поля — на вкладку редактора ролей
            foreach ($dd as $fd)
            {
                $fd->setProperty('tabName', $this->translate('TXT_ROLE_EDITOR'));
            }

            // Вкладка "Права на разделы" (кастомное поле)
            $fd = new FieldDescription('group_div_rights');
            $fd->setType(FieldDescription::FIELD_TYPE_CUSTOM);
            $fd->setProperty('tabName', $this->translate('TXT_ROLE_DIV_RIGHTS'));
            $fd->setProperty('customField', true);
            $dd->addFieldDescription($fd);
        }

        return $dd;
    }

    /**
     * Построение данных для вкладки прав на разделы.
     */
    private function buildDivRightsData(): DOMNode
    {
        $builder = new TreeBuilder();

        // Дерево разделов
        $builder->setTree(
            TreeConverter::convert(
                $this->dbh->select(
                    'share_sitemap',
                    ['smap_id', 'smap_pid'],
                    null,
                    ['smap_order_num' => QAL::ASC]
                ),
                'smap_id',
                'smap_pid'
            )
        );

        // Текущая роль
        $filter = $this->getFilter();
        $groupId = (is_array($filter) && !empty($filter)) ? (int)current($filter) : 0;

        // Данные по разделам с именем и сайтом
        $data = convertDBResult(
            $this->dbh->selectRequest(
                'SELECT s.smap_id AS Id, s.smap_pid AS Pid, s.site_id AS Site, st.smap_name AS Name
                 FROM share_sitemap s
                 LEFT JOIN share_sitemap_translation st ON st.smap_id = s.smap_id
                 WHERE st.lang_id=' . (int)E()->getLanguage()->getCurrent()
            ),
            'Id'
        );

        foreach ($data as $smapID => $smapInfo)
        {
            $siteId = (int)$smapInfo['Site'];
            $data[$smapID]['RightsId'] = E()->getMap($siteId)->getDocumentRights($smapID, $groupId);
            $data[$smapID]['Site']     = E()->getSiteManager()->getSiteByID($siteId)->name;
        }

        // Заполняем Data
        $dataObj = new Data();
        $dataObj->load($data);
        $builder->setData($dataObj);

        // Описание данных
        $dd = new DataDescription();

        $f = new FieldDescription('Id');
        $f->setType(FieldDescription::FIELD_TYPE_INT);
        $f->setProperty('key', true);
        $dd->addFieldDescription($f);

        $f = new FieldDescription('Pid');
        $f->setType(FieldDescription::FIELD_TYPE_INT);
        $dd->addFieldDescription($f);

        $f = new FieldDescription('Name');
        $f->setType(FieldDescription::FIELD_TYPE_STRING);
        $dd->addFieldDescription($f);

        $f = new FieldDescription('Site');
        $f->setType(FieldDescription::FIELD_TYPE_STRING);
        $dd->addFieldDescription($f);

        $f = new FieldDescription('RightsId');
        $f->setType(FieldDescription::FIELD_TYPE_SELECT);
        if ($this->getState() === 'view')
        {
            $f->setMode(FieldDescription::FIELD_MODE_READ);
        }

        // Список прав (добавляем NO_RIGHTS)
        $rights = $this->dbh->select('user_group_rights', ['right_id', 'right_const']) ?: [];
        $rights = array_merge([['right_id' => 0, 'right_const' => 'NO_RIGHTS']], $rights);
        foreach ($rights as $k => $row)
        {
            $rights[$k]['right_const'] = $this->translate('TXT_' . $row['right_const']);
        }
        $f->loadAvailableValues($rights, 'right_id', 'right_const');
        $dd->addFieldDescription($f);

        $builder->setDataDescription($dd);
        $builder->build();

        return $builder->getResult();
    }

    /**
     * @copydoc Grid::createData
     *
     * Для форм add/edit/view добавляет fake-поле group_div_rights с деревом.
     */
    protected function createData(): Data
    {
        /** @var Data $data */
        $data = parent::createData();

        if ($this->getType() !== self::COMPONENT_TYPE_LIST)
        {
            $f = new Field('group_div_rights');
            $f->setData($this->buildDivRightsData());
            $data->addField($f);
        }

        return $data;
    }

    /**
     * @copydoc Grid::saveData
     *
     * Сохраняет права на разделы из POST['div_right'].
     */
    protected function saveData(): mixed
    {
        $result = parent::saveData();

        $roleID = is_int($result) ? $result : (int)current((array)$this->getFilter());

        // Пересобираем права
        $this->dbh->modify(QAL::DELETE, 'share_access_level', null, ['group_id' => $roleID]);

        if (!empty($_POST['div_right']) && is_array($_POST['div_right']))
        {
            foreach ($_POST['div_right'] as $smapID => $rightID)
            {
                $smapID  = (int)$smapID;
                $rightID = (int)$rightID;
                if ($rightID > 0)
                {
                    $this->dbh->modify(
                        QAL::INSERT,
                        'share_access_level',
                        ['group_id' => $roleID, 'smap_id' => $smapID, 'right_id' => $rightID]
                    );
                }
            }
        }

        return $result;
    }

    /**
     * @copydoc Grid::deleteData
     *
     * Запрещает удалять дефолтные группы (group_default или group_user_default).
     */
    public function deleteData(int|string $id): void
    {
        $isDefault = (int)$this->dbh->getScalar(
            'SELECT COALESCE(group_default,0) FROM ' . $this->getTableName() . ' WHERE group_id=%s',
            $id
        ) === 1;

        $isUserDefault = (int)$this->dbh->getScalar(
            'SELECT COALESCE(group_user_default,0) FROM ' . $this->getTableName() . ' WHERE group_id=%s',
            $id
        ) === 1;

        if ($isDefault || $isUserDefault)
        {
            throw new SystemException('ERR_DEFAULT_GROUP', SystemException::ERR_NOTICE);
        }

        parent::deleteData($id);
    }
}
