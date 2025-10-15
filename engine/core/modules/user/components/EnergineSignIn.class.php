<?php

declare(strict_types=1);

/**
 * Компонент EnergineSignIn.
 *
 * Обрабатывает действия регистрации, авторизации и работы с сессией
 * через AJAX-запросы.
 *
 * Использование:
 * - {@see signUpFast()} — быстрая регистрация;
 * - {@see signUp()} — стандартная регистрация;
 * - {@see signIn()} — авторизация пользователя;
 * - {@see upload()} — загрузка файла (заглушка);
 * - {@see logout()} — выход из системы;
 * - {@see google()} — авторизация через Google.
 */
class EnergineSignIn extends DataSet
{
    public const COOKIE_LIFETIME = 3600;

    /**
     * Определяет параметры компонента.
     *
     * @return array Список параметров.
     */
    protected function defineParams(): array
    {
        return array_merge(
            parent::defineParams(),
            [
                'active' => true,
            ]
        );
    }

    /**
     * Быстрая регистрация пользователя.
     *
     * @return void
     */
    public function signUpFast(): void
    {
        $data = ['result' => false];

        try
        {
            $this->dbh->beginTransaction();
            $payload = (array)($_POST['signup_fast'] ?? []);
            $data = E()->SignInUpApi->signUpFast($payload);
            $this->dbh->commit();
        }
        catch (\Throwable $e)
        {
            $this->dbh->rollback();
            $data['result']  = false;
            $data['message'] = $e->getMessage();
        }

        $this->writeJson($data);
    }

    /**
     * Стандартная регистрация пользователя.
     *
     * @return void
     */
    public function signUp(): void
    {
        $data = ['result' => false];

        try
        {
            $this->dbh->beginTransaction();
            $payload = (array)($_POST['signup'] ?? []);
            $data = E()->SignInUpApi->signUp($payload);
            $this->dbh->commit();
        }
        catch (\Throwable $e)
        {
            $this->dbh->rollback();
            $data['result']  = false;
            $data['message'] = $e->getMessage();
        }

        $this->writeJson($data);
    }

    /**
     * Авторизация пользователя.
     *
     * @return void
     */
    public function signIn(): void
    {
        $data = ['result' => false];

        try
        {
            $payload = (array)($_POST['signin'] ?? []);
            $data = E()->SignInUpApi->signIn($payload);
        }
        catch (\Throwable $e)
        {
            $data['result']  = false;
            $data['message'] = $e->getMessage();
        }

        $this->writeJson($data);
    }

    /**
     * Заглушка обработки загрузки файлов.
     *
     * @return void
     */
    public function upload(): void
    {
        // Заглушка вместо debug-вывода; при необходимости реализуйте загрузку.
        $this->writeJson([
            'result'  => false,
            'message' => 'Не реализовано',
        ]);
    }

    /**
     * Завершает сессию пользователя.
     *
     * @return void
     */
    public function logout(): void
    {
        $data = ['result' => false];

        try
        {
            $data = E()->SignInUpApi->logout();
            $data['result']  = true;
            $data['message'] = $this->translate('TXT_LOGOUT_TEXT');
        }
        catch (\Throwable $e)
        {
            $data['result']  = false;
            $data['message'] = $e->getMessage();
        }

        $this->writeJson($data);
    }

    /**
     * Авторизация пользователя через Google.
     *
     * @return void
     */
    public function google(): void
    {
        // Авторизация через Google
        $response = E()->getResponse();
        $response->disableCache();

        $client = new Google_Client();
        $client->setClientId(BaseObject::_getConfigValue('auth.google.appID'));
        $client->setClientSecret(BaseObject::_getConfigValue('auth.google.secretKey'));
        $client->setRedirectUri(BaseObject::_getConfigValue('auth.google.redirectUrl'));
        $client->setScopes(['email', 'profile']);

        if (isset($_GET['code']))
        {
            $client->authenticate((string)$_GET['code']);
            $res          = (array)$client->getAccessToken();
            $access_token = $res['access_token'] ?? '';
            setcookie('access_token', $access_token, time() + self::COOKIE_LIFETIME, '/');
            header('Location: ' . BaseObject::_getConfigValue('auth.google.redirectUrl'));
            exit;
        }

        if (!isset($_COOKIE['access_token']))
        {
            $authUrl = $client->createAuthUrl();
            header('Location: ' . filter_var($authUrl, FILTER_SANITIZE_URL));
            exit;
        }

        // Установка токена доступа
        $client->setAccessToken($_COOKIE['access_token']);

        // Получаем данные пользователя
        $googleApiService = new Google_Service_Oauth2($client);
        $userInfo         = $googleApiService->userinfo->get();

        $uName = (string)$userInfo->getEmail();

        // Если пользователя нет — создаём (если разрешена регистрация)
        if (!($user = User::getGoogleUser($uName)) && BaseObject::_getConfigValue('auth.google.allowRegister'))
        {
            $user     = new User();
            $password = User::generatePassword();
            $fullName = (string)$userInfo->getName();

            $user->create([
                'u_name'     => $uName,
                'u_password' => $password,
                'u_fullname' => $fullName,
                'u_is_active' => 1,
            ]);

            $msgData = [
                'login'    => $uName,
                'password' => $password,
                'name'     => $fullName,
            ];
            E()->MailMessage->sendMessage(
                $uName,
                $this->translate('TXT_SUBJ_REGISTER'),
                $this->translate('TXT_BODY_REGISTER'),
                $msgData
            );
        }

        // Создаём сессию вручную и кладём cookie через Response
        call_user_func_array(
            [$response, 'addCookie'],
            UserSession::manuallyCreateSessionInfo($user->getID())
        );

        $redirect = BaseObject::_getConfigValue('auth.google.redirect');
        $this->response->setRedirect($redirect);
    }

    /* ===== Вспомогательные методы ===== */

    /**
     * Отправляет ответ в формате JSON.
     *
     * @param array $data Данные для отправки.
     * @return void
     */
    private function writeJson(array $data): void
    {
        $this->response->setHeader('Content-Type', 'text/javascript; charset=utf-8');
        $this->response->write(json_encode($data));
        $this->response->commit();
    }
}
