<?php

/**
 * Класс SignInUpApi.
 *
 * Предоставляет методы для регистрации, авторизации и завершения
 * сессии пользователя через API.
 *
 * Использование:
 * - {@see signUpFast()} — быстрая регистрация без задания пароля;
 * - {@see signUp()} — стандартная регистрация;
 * - {@see signIn()} — авторизация пользователя;
 * - {@see logout()} — завершение текущей сессии.
 */
class SignInUpApi extends DBWorker
{
    /**
     * Быстрая регистрация пользователя без ввода пароля.
     *
     * @param array $data Данные пользователя.
     * @return array Результат выполнения с сообщением и редиректом.
     */
    public function signUpFast($data)
    {
        if (!$this->isEmailValid($data['email']))
        {
            return array(
                'result' => false,
                'message' => $this->translate('MSG_BAD_EMAIL_FORMAT'),
                'field' => 'email'
            );

        }

        if (strlen($data['country']) == 0)
        {
            return array(
                'result' => false,
                'message' => $this->translate('MSG_BAD_EMAIL_FORMAT'),
                'field' => 'country'
            );
        }

        if ($this->isUserExists($data['email']))
        {
            return array(
                'result' => false,
                'message' => $this->translate('TXT_ERR_EMAIL_EXISTS'),
                'field' => 'country'
            );
        }

        $user = new User();
        $password = $user->generatePassword(8);
        $user->create(
            array(
                'u_name' => $data['email'],
                'u_password' => $password,
                'u_fullname' => ' ',
                'u_country' => $data['country']
            )
        );
        $userId = $user->getID();
        call_user_func_array(
            array(E()->getResponse(), 'addCookie'),
            $cookieInfo = UserSession::manuallyCreateSessionInfo($userId)
        );
        $msgData = array(
            'login' => $data['email'],
            'password' => $password
        );
        E()->MailMessage->sendMessage(
                $data['email'],
                $this->translate('TXT_SUBJ_REGISTER'),
                $this->translate('TXT_BODY_REGISTER_FAST'),
                $msgData
        );
        $redirect = 'my/';

        return array(
            'result' => true,
            'message' => $this->translate('TXT_USER_REGISTRED'),
            'redirect' => $redirect
        );
    }

    /**
     * Стандартная регистрация пользователя.
     *
     * @param array $data Данные пользователя.
     * @return array Результат регистрации.
     */
    public function signUp($data)
    {
        if (!$this->isEmailValid($data['email']))
        {
            return array(
                'result' => false,
                'message' => $this->translate('MSG_BAD_EMAIL_FORMAT'),
                'field' => 'email'
            );
        }

        if ($this->isUserExists($data['email']))
        {
            return array(
                'result' => false,
                'message' => $this->translate('TXT_ERR_EMAIL_EXISTS'),
                'field' => 'country'
            );
        }
        if (strlen($data['password']) < 6)
        {
            throw new SystemException('MSG_PASSWORD_SHORT');
        }
        $user = new User();
        $password = $data['password'];
        $user->create(
            array(
                'u_name' => $data['email'],
                'u_password' => $password,
                'u_fullname' => $data['name'],
		        'u_is_active' => 1,
//                'u_country' => $data['country'],
//                'u_city'    =>  $data['city']
            )
        );
        $userId = $user->getID();
//        E()->StatsApi->makeStat($userId, StatsApi::STAT_TYPE_USER_REGISTER);
//        E()->StatsApi->makeStat($userId, StatsApi::STAT_TYPE_USER_AUTH);
        call_user_func_array(
            array(E()->getResponse(), 'addCookie'),
            $cookieInfo = UserSession::manuallyCreateSessionInfo($userId)
        );
        $msgData = array(
            'login' => $data['email'],
            'password' => $password,
            'name' => $data['name']
        );
        E()->MailMessage->sendMessage(
            $data['email'],
            $this->translate('TXT_SUBJ_REGISTER'),
            $this->translate('TXT_BODY_REGISTER'),
            $msgData
        );
        $redirect = 'my/';

        return array(
            'result' => true,
            'message' => $this->translate('TXT_USER_REGISTRED'),
            'redirect' =>  $redirect
        );
    }

    /**
     * Авторизация пользователя.
     *
     * @param array $data Массив с адресом e-mail и паролем.
     * @return array Результат авторизации и возможный редирект.
     */
    public function signIn($data)
    {
        if ($userId = AuthUser::authenticate($data['email'], $data['password'])) {
            call_user_func_array(
                array(E()->getResponse(), 'addCookie'),
                $cookieInfo = UserSession::manuallyCreateSessionInfo($userId)
            );
            $redirect = 'my/';

//            E()->StatsApi->makeStat($userId, StatsApi::STAT_TYPE_USER_AUTH);

            return array(
                'result' => true,
                'message' => $this->translate('TXT_LOGIN_SUCCESS'),
                'redirect' => $redirect
            );
        }
//        E()->StatsApi->makeStat(0, StatsApi::STAT_TYPE_USER_AUTH_FAIL);
        return array(
            'result' => false,
            'message' => $this->translate('ERR_BAD_LOGIN')
        );
    }

    /**
     * Проверяет корректность формата e-mail.
     *
     * @param string $email Проверяемый адрес.
     * @return bool true, если адрес валиден.
     */
    public function isEmailValid($email)
    {
        if( !preg_match("/^[_a-z0-9-]+(.[_a-z0-9-]+)*@[a-z0-9-]+(.[a-z0-9-]+)*(.[a-z]{2,3})$/i", $email) )
        {
            $result = false;
        }
        else
        {
            $result = true;
        }
        return $result;
    }

    /**
     * Проверяет, существует ли пользователь с указанным e-mail.
     *
     * @param string $email Адрес пользователя.
     * @return bool true при наличии пользователя.
     */
    public function isUserExists($email)
    {
        $res = $this->dbh->select(
            'user_users',
            array('u_id'),
            array('u_name' => $email)
        );
        if (is_array($res) and count($res) > 0 )
        {
            return true;
        }
        else
        {
            return false;
        }
    }

    /**
     * Завершает сессию пользователя и удаляет cookie.
     *
     * @return void
     */
    public function logout()
    {
        UserSession::manuallyDeleteSessionInfo();
        // Удаляем cookie с идентификатором сессии.
        E()->getResponse()->deleteCookie(UserSession::DEFAULT_SESSION_NAME);
    }
}