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
        if (isset($_SESSION['userID']) && is_numeric($_SESSION['userID'])) {
            $id = (int)$_SESSION['userID'];
        } elseif (is_numeric($id)) {
            $id = (int)$id;
        } else {
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
     * На вход подаётся "обычный" пароль, внутри считается sha1 (совместимость со старой БД).
     * Возвращает ID пользователя при успехе либо false при неудаче.
     *
     * @param string $username Логин (u_name)
     * @param string $password Пароль в открытом виде (будет хэширован sha1)
     * @return int|false
     */
    public static function authenticate(string $username, string $password): int|false
    {
        $username = trim($username);
        $password = sha1(trim($password)); // легаси-совместимость

        // Проверяем совпадение логин/пароль и активность пользователя
        $id = simplifyDBResult(
            E()->getDB()->select(
                'user_users',
                ['u_id'],
                [
                    'u_name'      => $username,
                    'u_password'  => $password,
                    'u_is_active' => 1,
                ]
            ),
            'u_id',
            true
        );

        return $id ? (int)$id : false;
    }
}
