<?php

declare(strict_types=1);

/**
 * Authenticated user (PHP 8.x ready).
 *
 * Берёт ID из сессии (если есть) и подгружает данные пользователя.
 * Предоставляет проверку авторизации и метод аутентификации по логину/паролю.
 */
class AuthUser extends User
{
    /**
     * Конструктор.
     *
     * Если в сессии есть $_SESSION['userID'], считаем пользователя
     * аутентифицированным и загружаем его данные. Иначе — создаём гостя.
     *
     * @param int|string|null $id Необязательный ID пользователя (будет проигнорирован,
     *                             если в сессии найден userID)
     */
    public function __construct($id = null)
    {
        // Если сессия уже содержит ID пользователя — используем его
        if (isset($_SESSION['userID']) && is_numeric($_SESSION['userID']))
        {
            $id = (int)$_SESSION['userID'];
        }
        elseif (is_numeric($id))
        {
            $id = (int)$id;
        }
        else
        {
            $id = null;
        }

        parent::__construct($id);
    }

    /**
     * Пользователь авторизован?
     *
     * @return bool true — у пользователя есть валидный ID; false — гость
     */
    public function isAuthenticated(): bool
    {
        return $this->getID() !== null;
    }

    /**
     * Аутентификация по логину/паролю.
     *
     * На вход подаётся "обычный" пароль, внутри используется password_hash/password_verify.
     * Возвращает ID пользователя при успехе либо false при неудаче. Legacy-хеши sha1 автоматически
     * перехешируются при успешной проверке.
     *
     * @param string $username Логин (u_name)
     * @param string $password Пароль в открытом виде (будет проверен password_verify)
     * @return int|false
     */
    public static function authenticate(string $username, string $password): int|false
    {
        $username = trim($username);
        $password = trim($password);

        $rows = E()->getDB()->select(
            'user_users',
            ['u_id', 'u_password'],
            [
                'u_name'      => $username,
                'u_is_active' => 1,
            ]
        );

        if (!is_array($rows) || empty($rows))
        {
            return false;
        }

        $row = array_change_key_case((array)$rows[0], CASE_LOWER);
        $storedHash = (string)($row['u_password'] ?? '');
        if ($storedHash === '')
        {
            return false;
        }

        $isValid = password_verify($password, $storedHash);
        $needsRehash = $isValid && password_needs_rehash($storedHash, PASSWORD_DEFAULT);

        if (!$isValid && self::isLegacyPasswordHash($storedHash))
        {
            $isValid = hash_equals($storedHash, sha1($password));
            $needsRehash = $isValid; // обязательно обновим легаси-хеш
        }

        if (!$isValid)
        {
            return false;
        }

        $userID = (int)($row['u_id'] ?? 0);

        if ($needsRehash && $userID > 0)
        {
            $newHash = self::hashPassword($password);
            E()->getDB()->modify(QAL::UPDATE, 'user_users', ['u_password' => $newHash], ['u_id' => $userID]);
        }

        return $userID ?: false;
    }
}
