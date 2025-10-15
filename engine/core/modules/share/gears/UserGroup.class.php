<?php

declare(strict_types=1);

/**
 * User groups manager (PHP 8.x ready).
 *
 * Загружает список групп из БД и предоставляет удобные методы:
 * - asArray(): array — все группы
 * - getDefaultGuestGroup(): int — ID дефолтной гостевой группы
 * - getDefaultUserGroup(): int — ID дефолтной группы для авторизованных
 * - getUserGroups($userId = false): array<int> — список ID групп пользователя (или гостя)
 * - getInfo(int $groupId): array — информация о группе
 * - getMembers(int $groupId): array<User> — активные участники группы
 */
final class UserGroup extends DBWorker
{
    /** ID дефолтной гостевой группы (ленивая инициализация) */
    private ?int $defaultGuestGroup = null;

    /** ID дефолтной группы для авторизованных (ленивая инициализация) */
    private ?int $defaultUserGroup = null;

    /**
     * Информация о всех группах:
     * [
     *   group_id => [
     *     'group_id'           => int,
     *     'group_name'         => string,
     *     'group_default'      => 0|1,        // дефолт для гостей
     *     'group_user_default' => 0|1,        // дефолт для авторизованных
     *     ... другие поля ...
     *   ],
     *   ...
     * ]
     * @var array<int, array<string, mixed>>
     */
    private array $groups = [];

    /** Кеш: userId => [groupId, ...] */
    private array $userGroupsCache = [];

    public function __construct()
    {
        parent::__construct();

        // Загружаем группы из БД
        $rows = $this->dbh->select('user_groups'); // true => все поля
        if (is_array($rows))
        {
            // В проекте есть convertDBResult(). Если по какой-то причине его нет — падаем на локальный фолбэк.
            if (function_exists('convertDBResult'))
            {
                /** @var array<int, array<string, mixed>> $byId */
                $byId = convertDBResult($rows, 'group_id', true);
                $this->groups = $byId ?: [];
            }
            else
            {
                $byId = [];
                foreach ($rows as $r)
                {
                    if (isset($r['group_id']))
                    {
                        $byId[(int)$r['group_id']] = $r;
                    }
                }
                $this->groups = $byId;
            }
        }
    }

    /**
     * Вернуть все группы как ассоциативный массив (ключ — group_id).
     */
    public function asArray(): array
    {
        return $this->groups;
    }

    /**
     * ID дефолтной гостевой группы.
     *
     * @throws SystemException 'ERR_DEV_NO_DEFAULT_GROUP' — если ни одна группа не помечена как guest-default
     */
    public function getDefaultGuestGroup(): int
    {
        if ($this->defaultGuestGroup !== null)
        {
            return $this->defaultGuestGroup;
        }

        foreach ($this->groups as $groupId => $groupInfo)
        {
            if (isset($groupInfo['group_default']) && (int)$groupInfo['group_default'] === 1)
            {
                return $this->defaultGuestGroup = (int)$groupId;
            }
        }

        throw new SystemException('ERR_DEV_NO_DEFAULT_GROUP', SystemException::ERR_CRITICAL);
    }

    /**
     * ID дефолтной группы для авторизованных пользователей.
     *
     * @throws SystemException 'ERR_DEV_NO_DEFAULT_USER_GROUP' — если ни одна группа не помечена как user-default
     */
    public function getDefaultUserGroup(): int
    {
        if ($this->defaultUserGroup !== null)
        {
            return $this->defaultUserGroup;
        }

        foreach ($this->groups as $groupId => $groupInfo)
        {
            if (isset($groupInfo['group_user_default']) && (int)$groupInfo['group_user_default'] === 1)
            {
                return $this->defaultUserGroup = (int)$groupId;
            }
        }

        throw new SystemException('ERR_DEV_NO_DEFAULT_USER_GROUP', SystemException::ERR_CRITICAL);
    }

    /**
     * Список ID групп пользователя.
     *
     * Если $userId пустой/ложный — вернёт массив только с гостевой группой.
     * Совместимость: параметр оставлен "mixed", т.к. в старом коде часто передавался false.
     *
     * @param mixed $userId
     * @return array<int>
     */
    public function getUserGroups($userId = false): array
    {
        // Нормализуем ключ кеша (гость => 0)
        $cacheKey = $userId ? (int)$userId : 0;

        if (!array_key_exists($cacheKey, $this->userGroupsCache))
        {
            // По умолчанию — гостевая группа
            $groups = [$this->getDefaultGuestGroup()];

            if (!empty($userId))
            {
                $res = $this->dbh->select('user_user_groups', ['group_id'], ['u_id' => (int)$userId]);
                if (is_array($res))
                {
                    if (function_exists('simplifyDBResult'))
                    {
                        /** @var array<int> $ids */
                        $ids = simplifyDBResult($res, 'group_id');
                        $groups = $ids ?: $groups;
                    }
                    else
                    {
                        $ids = [];
                        foreach ($res as $r)
                        {
                            if (isset($r['group_id']))
                            {
                                $ids[] = (int)$r['group_id'];
                            }
                        }
                        if ($ids)
                        {
                            $groups = $ids;
                        }
                    }
                }
            }

            $this->userGroupsCache[$cacheKey] = $groups;
        }

        return $this->userGroupsCache[$cacheKey];
    }

    /**
     * Информация по группе.
     *
     * @return array<string, mixed> Пустой массив, если группа не найдена
     */
    public function getInfo(int $groupId): array
    {
        return $this->groups[$groupId] ?? [];
    }

    /**
     * Активные участники группы.
     *
     * Возвращает массив объектов User, у которых u_is_active = 1.
     *
     * @return array<int, User>
     */
    public function getMembers(int $groupID): array
    {
        $result = [];

        $res = $this->dbh->select('user_user_groups', ['u_id'], ['group_id' => $groupID]);
        if (!is_array($res))
        {
            return $result;
        }

        // Получаем список ID пользователей
        $ids = [];
        if (function_exists('simplifyDBResult'))
        {
            /** @var array<int> $ids */
            $ids = simplifyDBResult($res, 'u_id');
        }
        else
        {
            foreach ($res as $row)
            {
                if (isset($row['u_id']))
                {
                    $ids[] = (int)$row['u_id'];
                }
            }
        }

        if (!$ids)
        {
            return $result;
        }

        foreach ($ids as $uid)
        {
            try
            {
                $user = new User($uid);
                if ((int)$user->getValue('u_is_active') === 1)
                {
                    $result[] = $user;
                }
            }
            catch (\Throwable $e)
            {
                // Если вдруг конструктор User бросит ошибку — просто пропустим.
                continue;
            }
        }

        return $result;
    }
}
