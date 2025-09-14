<?php
declare(strict_types=1);

/**
 * User manager (PHP 8.x ready, без FB/VK/OK методов).
 *
 * Управляет данными пользователя:
 *  - загрузка информации по ID
 *  - создание/обновление
 *  - группы пользователя
 *  - поиск по Google (оставлен)
 */
class User extends DBWorker
{
    /** Таблица пользователей */
    public const USER_TABLE_NAME  = 'user_users';
    /** Таблица связки пользователь—группа */
    public const GROUP_TABLE_NAME = 'user_user_groups';

    /** ID пользователя (null, если не загружен/не создан) */
    private ?int $id = null;

    /** Менеджер групп */
    protected UserGroup $userGroup;

    /**
     * Информация о пользователе (пароль в get/load не раскрываем).
     * @var array<string,mixed>
     */
    private array $info = [];

    /**
     * @param mixed $id Если указан валидный ID — загрузит информацию о пользователе
     */
    public function __construct($id = null)
    {
        parent::__construct();
        /** @var UserGroup $ug */
        $ug = E()->UserGroup;
        $this->userGroup = $ug;

        if (is_numeric($id) && (int)$id > 0) {
            $this->loadInfo((int)$id);
        }
    }

    /**
     * Загрузка информации о пользователе по ID.
     */
    protected function loadInfo(int $UID): void
    {
        $result = $this->dbh->select(self::USER_TABLE_NAME, true, ['u_id' => $UID]);
        if (is_array($result) && !empty($result)) {
            $this->id = $UID;
            // Маскируем пароль (совместимость со старым поведением)
            $row = $result[0];
            $row['u_password'] = true;
            $this->info = $row;
        }
    }

    /**
     * Список ID групп пользователя (или гостя, если пользователь не загружен).
     *
     * @return array<int>
     */
    public function getGroups(): array
    {
        return $this->userGroup->getUserGroups($this->id ?? false);
    }

    /**
     * ID пользователя или null.
     */
    public function getID(): ?int
    {
        return $this->id;
    }

    /**
     * Значение произвольного поля пользователя или false, если поля нет.
     *
     * @return mixed
     */
    public function getValue(string $fieldName)
    {
        return $this->info[$fieldName] ?? false;
    }

    /**
     * Метаданные полей таблицы пользователей.
     *
     * @return array<string,array<string,mixed>>
     */
    public function getFields(): array
    {
        return $this->dbh->getColumnsInfo(self::USER_TABLE_NAME);
    }

    /**
     * Создание нового пользователя.
     *
     * Требования:
     *  - все NOT NULL поля без значения по умолчанию (кроме PK) должны быть переданы;
     *  - все уникальные поля не должны конфликтовать;
     *  - пароль хешируется sha1 (легаси-совместимость).
     *
     * @throws SystemException 'ERR_INSUFFICIENT_DATA'
     * @throws SystemException 'ERR_NOT_UNIQUE_DATA'
     */
    public function create(array $data): void
    {
        // 1) Определим обязательные и уникальные поля
        $tableInfo       = $this->dbh->getColumnsInfo(self::USER_TABLE_NAME);
        $necessaryFields = [];
        $uniqueFields    = [];

        foreach ($tableInfo as $columnName => $columnInfo) {
            $nullable = (bool)($columnInfo['nullable'] ?? false);
            $index    = $columnInfo['index']    ?? null;
            $default  = $columnInfo['default']  ?? null;

            // NOT NULL, не PK, без дефолта => обязательно к передаче
            if (!$nullable && $index !== DBA::PRIMARY_INDEX && empty($default)) {
                $necessaryFields[] = $columnName;
            }
            // Уникальные поля
            if ($index === DBA::UNIQUE_INDEX) {
                $uniqueFields[] = $columnName;
            }
        }

        // 2) Проверим, что все обязательные поля присутствуют
        if ($undefined = array_diff($necessaryFields, array_keys($data))) {
            throw new SystemException('ERR_INSUFFICIENT_DATA', SystemException::ERR_WARNING, $undefined);
        }

        // 3) Проверим уникальные поля
        if (!empty($uniqueFields)) {
            $parts = [];
            foreach ($uniqueFields as $field) {
                if (array_key_exists($field, $data)) {
                    $parts[] = $field . ' = "' . $data[$field] . '"';
                }
            }
            if ($parts) {
                $cond = implode(' OR ', $parts);
                $cnt  = simplifyDBResult(
                    $this->dbh->select(self::USER_TABLE_NAME, 'COUNT(u_id) as num', $cond),
                    'num',
                    true
                );
                if ((int)$cnt > 0) {
                    throw new SystemException('ERR_NOT_UNIQUE_DATA', SystemException::ERR_WARNING);
                }
            }
        }

        // 4) Сохраняем; пароль — sha1 (совместимость со старой БД)
        $this->info = $data;
        if (isset($data['u_password'])) {
            $data['u_password'] = sha1((string)$data['u_password']);
        }
        $this->id = (int)$this->dbh->modify(QAL::INSERT, self::USER_TABLE_NAME, $data);

        // 5) Присвоим дефолтную «пользовательскую» группу
        $this->setGroups([$this->userGroup->getDefaultUserGroup()]);
    }

    /**
     * Обновление полей пользователя.
     */
    public function update(array $data): bool
    {
        if (!$this->getID()) {
            return false;
        }
        return (bool)$this->dbh->modify(QAL::UPDATE, self::USER_TABLE_NAME, $data, ['u_id' => $this->getID()]);
    }

    /**
     * Проверка, состоит ли пользователь в группе.
     */
    public function isInGroup($groupID): bool
    {
        return in_array((int)$groupID, $this->getGroups(), true);
    }

    /**
     * Установка групп пользователя (перезаписывает).
     *
     * @param array<int>|int $groups
     * @throws SystemException
     */
    public function setGroups($groups): void
    {
        if (!$this->getID()) {
            return;
        }
        $groups = is_array($groups) ? $groups : [(int)$groups];

        try {
            $this->dbh->modify(QAL::DELETE, self::GROUP_TABLE_NAME, null, ['u_id' => $this->getID()]);
            foreach ($groups as $gid) {
                $this->dbh->modify(QAL::INSERT, self::GROUP_TABLE_NAME, [
                    'u_id'     => $this->getID(),
                    'group_id' => (int)$gid,
                ]);
            }
        } catch (SystemException $e) {
            throw new SystemException($e->getMessage(), $e->getCode(), $e->getCustomMessage());
        }
    }

    /**
     * Поиск активного пользователя по Google (u_name = email/subject).
     *
     * @return User|false
     * @throws SystemException
     */
    public static function getGoogleUser(string $uName)
    {
        $UID = simplifyDBResult(
            E()->getDB()->select(self::USER_TABLE_NAME, 'u_id', ['u_name' => $uName, 'u_is_active' => 1]),
            'u_id',
            true
        );
        return $UID ? new User((int)$UID) : false;
    }

    /**
     * Генерация случайного пароля из латиницы и цифр.
     */
    public static function generatePassword(int $length = 8): string
    {
        $chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $max   = strlen($chars) - 1;
        $pwd   = '';
        for ($i = 0; $i < $length; $i++) {
            $pwd .= $chars[random_int(0, $max)];
        }
        return $pwd;
    }
}
