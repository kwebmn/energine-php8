<?php
declare(strict_types=1);

/**
 * API для регистрации и авторизации пользователей.
 */
class SignInUpApi extends DBWorker
{
    /**
     * Быстрая регистрация пользователя без задания пароля.
     *
     * @param array<string, mixed> $data
     * @return array{result:bool,message:string,field?:string,redirect?:string}
     */
    public function signUpFast(array $data): array
    {
        $email = $this->normalizeEmail($data['email'] ?? null);
        if ($email === null) {
            return [
                'result'  => false,
                'message' => $this->translate('MSG_BAD_EMAIL_FORMAT'),
                'field'   => 'email',
            ];
        }

        $country = trim((string)($data['country'] ?? ''));
        if ($country === '') {
            return [
                'result'  => false,
                'message' => $this->translate('MSG_BAD_EMAIL_FORMAT'),
                'field'   => 'country',
            ];
        }

        if ($this->isUserExists($email)) {
            return [
                'result'  => false,
                'message' => $this->translate('TXT_ERR_EMAIL_EXISTS'),
                'field'   => 'country',
            ];
        }

        $user     = new User();
        $password = $user->generatePassword(8);
        $user->create([
            'u_name'     => $email,
            'u_password' => $password,
            'u_fullname' => ' ',
            'u_country'  => $country,
        ]);

        $userId = $user->getID();
        call_user_func_array(
            [E()->getResponse(), 'addCookie'],
            UserSession::manuallyCreateSessionInfo($userId)
        );

        $msgData = [
            'login'    => $email,
            'password' => $password,
        ];
        E()->MailMessage->sendMessage(
            $email,
            $this->translate('TXT_SUBJ_REGISTER'),
            $this->translate('TXT_BODY_REGISTER_FAST'),
            $msgData
        );

        return [
            'result'   => true,
            'message'  => $this->translate('TXT_USER_REGISTRED'),
            'redirect' => 'my/',
        ];
    }

    /**
     * Стандартная регистрация пользователя.
     *
     * @param array<string, mixed> $data
     * @return array{result:bool,message:string,field?:string,redirect?:string}
     */
    public function signUp(array $data): array
    {
        $email = $this->normalizeEmail($data['email'] ?? null);
        if ($email === null) {
            return [
                'result'  => false,
                'message' => $this->translate('MSG_BAD_EMAIL_FORMAT'),
                'field'   => 'email',
            ];
        }

        if ($this->isUserExists($email)) {
            return [
                'result'  => false,
                'message' => $this->translate('TXT_ERR_EMAIL_EXISTS'),
                'field'   => 'country',
            ];
        }

        $password = (string)($data['password'] ?? '');
        if (mb_strlen($password) < 6) {
            throw new SystemException('MSG_PASSWORD_SHORT');
        }

        $fullName = trim((string)($data['name'] ?? ''));

        $user = new User();
        $user->create([
            'u_name'     => $email,
            'u_password' => $password,
            'u_fullname' => $fullName,
            'u_is_active'=> 1,
        ]);

        $userId = $user->getID();
        call_user_func_array(
            [E()->getResponse(), 'addCookie'],
            UserSession::manuallyCreateSessionInfo($userId)
        );

        $msgData = [
            'login'    => $email,
            'password' => $password,
            'name'     => $fullName,
        ];
        E()->MailMessage->sendMessage(
            $email,
            $this->translate('TXT_SUBJ_REGISTER'),
            $this->translate('TXT_BODY_REGISTER'),
            $msgData
        );

        return [
            'result'   => true,
            'message'  => $this->translate('TXT_USER_REGISTRED'),
            'redirect' => 'my/',
        ];
    }

    /**
     * Авторизация пользователя.
     *
     * @param array<string, mixed> $data
     * @return array{result:bool,message:string,redirect?:string}
     */
    public function signIn(array $data): array
    {
        $email    = $this->normalizeEmail($data['email'] ?? null);
        $password = (string)($data['password'] ?? '');
        if ($email === null || $password === '') {
            return [
                'result'  => false,
                'message' => $this->translate('ERR_BAD_LOGIN'),
            ];
        }

        $userId = AuthUser::authenticate($email, $password);
        if ($userId) {
            call_user_func_array(
                [E()->getResponse(), 'addCookie'],
                UserSession::manuallyCreateSessionInfo($userId)
            );

            return [
                'result'   => true,
                'message'  => $this->translate('TXT_LOGIN_SUCCESS'),
                'redirect' => 'my/',
            ];
        }

        return [
            'result'  => false,
            'message' => $this->translate('ERR_BAD_LOGIN'),
        ];
    }

    public function logout(): void
    {
        UserSession::manuallyDeleteSessionInfo();
        E()->getResponse()->deleteCookie(UserSession::DEFAULT_SESSION_NAME);
    }

    private function isUserExists(string $email): bool
    {
        $res = $this->dbh->select(
            'user_users',
            ['u_id'],
            ['u_name' => $email]
        );

        return is_array($res) && count($res) > 0;
    }

    private function normalizeEmail(mixed $email): ?string
    {
        $value = trim((string)($email ?? ''));
        if ($value === '') {
            return null;
        }

        return filter_var($value, FILTER_VALIDATE_EMAIL) ? $value : null;
    }
}
