<?php

declare(strict_types=1);

/**
 * Редактор пользователей.
 *
 * Совместимо с PHP 8.3, содержит аккуратные проверки и строгие типы.
 */
final class UserEditor extends Grid
{
    /**
     * @copydoc Grid::__construct
     */
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);
        $this->setTableName('user_users');
        $this->setTitle($this->translate('TXT_USER_EDITOR'));
    }

    /**
     * @copydoc Grid::deleteData
     *
     * @throws SystemException 'ERR_CANT_DELETE_YOURSELF'
     */
    public function deleteData(int|string $id): void
    {
        // запретить удалять себя
        if ((int)$this->document->user->getID() === $id)
        {
            throw new SystemException('ERR_CANT_DELETE_YOURSELF', SystemException::ERR_CRITICAL);
        }
        parent::deleteData($id);
    }

    /**
     * @copydoc Grid::saveData
     *
     * - При edit: пустой пароль не изменяет текущий;
     * - Иначе: хешируем пароль через password_hash;
     * - При add: запрещаем дубль u_name.
     */
    protected function saveData()
    {
        $table = $this->getTableName();
        $pk    = $this->getPK();

        // Нормализуем структуру POST для безопасности обращений
        $_POST[$table] = $_POST[$table] ?? [];

        // Если edit и пароль пустой — не трогаем его
        if (
            $this->getPreviousState() === 'edit'
            && array_key_exists('u_password', $_POST[$table])
            && $_POST[$table]['u_password'] === ''
        ) {
            unset($_POST[$table]['u_password']);
        }
        else
        {
            // Если пароль пришёл — хешируем современным способом
            if (isset($_POST[$table]['u_password']))
            {
                $_POST[$table]['u_password'] = User::hashPassword((string)$_POST[$table]['u_password']);
            }
        }

        // Проверка уникальности логина при добавлении
        $isAdd = isset($_POST[$table][$pk]) && $_POST[$table][$pk] === '';
        if ($isAdd)
        {
            $uName = (string)($_POST[$table]['u_name'] ?? '');
            if ($uName !== '' && $this->dbh->getScalar(
                'SELECT COUNT(*) FROM ' . $table . ' WHERE u_name=%s',
                $uName
            ))
            {
                throw new SystemException('ERR_USER_EXISTS', SystemException::ERR_CRITICAL);
            }
        }

        // Сохраняем базовые поля
        $result = parent::saveData();

        // Определяем ID пользователя, которого сохраняли
        $UID = is_int($result)
            ? $result
            : (int)current((array)$this->getFilter());

        // Обновляем группы пользователя
        $this->dbh->modify(QAL::DELETE, 'user_user_groups', null, ['u_id' => $UID]);

        if (!empty($_POST['group_id']) && is_array($_POST['group_id']))
        {
            foreach ($_POST['group_id'] as $groupID)
            {
                $groupID = (int)$groupID;
                $this->dbh->modify(QAL::INSERT, 'user_user_groups', ['u_id' => $UID, 'group_id' => $groupID]);
            }
        }

        return $result;
    }

    /**
     * Переключить активность пользователя (u_is_active).
     * Запрещаем переключать самого себя.
     */
    protected function activate(): void
    {
        $transactionStarted = $this->dbh->beginTransaction();
        $b = new JSONCustomBuilder();
        $this->setBuilder($b);

        try
        {
            [$id] = $this->getStateParams();
            $id = (int)$id;

            if (!$this->recordExists($id))
            {
                throw new SystemException('ERR_404', SystemException::ERR_404);
            }
            if ((int)$this->document->user->getID() === $id)
            {
                throw new SystemException('ERR_CANT_ACTIVATE_YOURSELF', SystemException::ERR_CRITICAL);
            }

            $this->dbh->modifyRequest(
                'UPDATE ' . $this->getTableName() . ' SET u_is_active = NOT u_is_active WHERE u_id = %s',
                $id
            );

            $b->setProperties(['result' => true]);

            $this->dbh->commit();
        }
        catch (SystemException $e)
        {
            if ($transactionStarted)
            {
                $this->dbh->rollback();
            }
            $b->setProperties([
                'result' => false,
                'error'  => $e->getMessage(),
            ]);
        }
    }

    /**
     * @copydoc Grid::loadData
     *
     * - getRawData: добавляем строку с группами пользователя u_group;
     * - edit/view: убираем пароль из данных.
     */
    protected function loadData(): array|false|null
    {
        $result = parent::loadData();

        if ($this->getState() === 'getRawData' && is_array($result))
        {
            $result = array_map([$this, 'printUserGroups'], $result);
        }
        elseif (in_array($this->getState(), ['edit', 'view'], true))
        {
            if (is_array($result) && isset($result[0]))
            {
                $result[0]['u_password'] = '';
            }
        }

        return $result;
    }

    /**
     * Преобразование строки данных: добавляет строку со списком групп пользователя.
     */
    private function printUserGroups(array $row): array
    {
        $userGroup     = E()->UserGroup;
        $userGroupIDs  = (array)$userGroup->getUserGroups((int)($row['u_id'] ?? 0));
        $userGroupName = [];

        foreach ($userGroupIDs as $UGID)
        {
            $info = (array)$userGroup->getInfo((int)$UGID);
            if (isset($info['group_name']))
            {
                $userGroupName[] = (string)$info['group_name'];
            }
        }

        $row['u_group'] = implode(', ', $userGroupName);
        return $row;
    }

    /**
     * @copydoc Grid::createDataDescription
     *
     * Для add/edit:
     *  - все поля показываем на вкладке "Пользователь";
     *  - u_name делаем тип Email;
     *  - скрываем служебные u_is_active, u_recovery_code, u_recovery_date;
     *  - добавляем multi-select group_id из user_groups (без group_default).
     * Для edit: пароль делаем nullable, убираем pattern/message.
     */
    protected function createDataDescription(): DataDescription
    {
        $dd = parent::createDataDescription();

        if (in_array($this->getState(), ['add', 'edit'], true))
        {
            foreach ($dd as $fd)
            {
                $fd->setProperty('tabName', $this->translate('TXT_USER_EDITOR'));
            }

            if ($fd = $dd->getFieldDescriptionByName('u_name'))
            {
                $fd->setType(FieldDescription::FIELD_TYPE_EMAIL);
            }
            foreach (['u_is_active', 'u_recovery_code', 'u_recovery_date'] as $name)
            {
                if ($fd = $dd->getFieldDescriptionByName($name))
                {
                    $dd->removeFieldDescription($fd);
                }
            }

            // Поле выбора групп
            $fdGroups = new FieldDescription('group_id');
            $fdGroups->setSystemType(FieldDescription::FIELD_TYPE_INT);
            $fdGroups->setType(FieldDescription::FIELD_TYPE_MULTI);
            $fdGroups->setProperty('tabName', $this->translate('TXT_USER_GROUPS'));
            $fdGroups->setProperty('customField', value: true);
            $fdGroups->setProperty( 'editor', 'RoleEditor');

            $data = $this->dbh->select(
                'user_groups',
                ['group_id', 'group_name'],
                'group_id IN (SELECT group_id FROM user_groups WHERE group_default=0 OR group_default IS NULL)'
            );
            $fdGroups->loadAvailableValues($data, 'group_id', 'group_name');

            $dd->addFieldDescription($fdGroups);
        }

        // Для формы редактирования пароль необязателен
        if ($this->getType() === self::COMPONENT_TYPE_FORM_ALTER)
        {
            if ($f = $dd->getFieldDescriptionByName('u_password'))
            {
                $f->removeProperty('pattern');
                $f->removeProperty('message');
                $f->setProperty('nullable', true);
            }
        }

        return $dd;
    }

    /**
     * @copydoc Grid::loadDataDescription
     *
     * На сохранении делаем u_password nullable.
     */
    protected function loadDataDescription(): array
    {
        $result = parent::loadDataDescription();
        if ($this->getState() === 'save' && isset($result['u_password']))
        {
            $result['u_password']['nullable'] = true;
        }
        return $result;
    }

    /**
     * @copydoc Grid::createData
     *
     * В add/edit добавляем поле group_id с текущими группами пользователя.
     */
    protected function createData(): Data
    {
        /** @var Data $data */
        $data = parent::createData();

        $filter = $this->getFilter();
        $id     = (is_array($filter) && !empty($filter)) ? (int)current($filter) : 0;

        if ($this->getType() !== self::COMPONENT_TYPE_LIST)
        {
            $selectedGroups = [];

            if (!empty($_POST['group_id']) && is_array($_POST['group_id']))
            {
                foreach ($_POST['group_id'] as $groupID)
                {
                    $groupID = (int)$groupID;
                    if ($groupID > 0)
                    {
                        $selectedGroups[$groupID] = $groupID;
                    }
                }
            }
            elseif ($id > 0)
            {
                $rows = $this->dbh->select('user_user_groups', ['group_id'], ['u_id' => $id]);
                if (is_array($rows))
                {
                    foreach ($rows as $row)
                    {
                        if (isset($row['group_id']))
                        {
                            $groupID = (int)$row['group_id'];
                            if ($groupID > 0)
                            {
                                $selectedGroups[$groupID] = $groupID;
                            }
                        }
                    }
                }
            }

            $f = new Field('group_id');
            $f->setData([array_values($selectedGroups)]);
            $data->addField($f);
        }

        return $data;
    }

    /**
     * Войти под пользователем (имперсонация).
     */
    protected function auth(): void
    {
        try
        {
            [$id] = $this->getStateParams();
            $id = (int)$id;

            if (!$this->recordExists($id))
            {
                throw new SystemException('ERR_404', SystemException::ERR_404);
            }

            $_SESSION['userID'] = $id;
            $this->response->setRedirect('/my/');
        }
        catch (\Exception $e)
        {
            // Безопасно игнорируем, логирование по месту
        }
    }
}
