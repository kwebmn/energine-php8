<?php
declare(strict_types=1);

/**
 * Компонент RecoverPassword.
 *
 * Предоставляет API для восстановления пароля пользователя по
 * электронной почте.
 *
 * Использование:
 * - {@see main()} — выводит форму восстановления;
 * - {@see check()} — отправляет письмо со ссылкой восстановления;
 * - {@see change()} — сохраняет новый пароль;
 * - {@see recover()} — проверяет код и отображает форму смены пароля.
 */
class RecoverPassword extends DataSet
{
    /**
     * Определяет параметры компонента.
     *
     * @return array Список параметров.
     */
    protected function defineParams(): array
    {
        return array_merge(
            parent::defineParams(),
            ['active' => true]
        );
    }

    /**
     * Главный режим компонента.
     *
     * @return void
     */
    public function main(): void
    {
        parent::main(); // ничего не возвращаем
    }

    /**
     * Проверяет существование пользователя и отправляет ссылку для восстановления.
     *
     * @return void
     */
    public function check(): void
    {
        $data = ['result' => false];

        try {
            $uName = (string)($_POST['email'] ?? '');
            if ($uName === '') {
                throw new \Exception();
            }

            $UID = simplifyDBResult(
                $this->dbh->select('user_users', 'u_id', ['u_name' => $uName]),
                'u_id',
                true
            );
            if (!$UID) {
                throw new \Exception();
            }

            $code = uniqid() . uniqid();

            $this->dbh->modifyRequest(
                'UPDATE user_users
                   SET u_recovery_code = %s,
                       u_recovery_date = DATE_ADD(NOW(), INTERVAL 1 DAY)
                 WHERE u_id = %s',
                $code,
                $UID
            );

            $site     = E()->SiteManager->getCurrentSite();
            $langAbbr = E()->getLanguage()->getAbbrByID(E()->getLanguage()->getCurrent());

            E()->MailMessage->sendMessage(
                $uName,
                $this->translate('TXT_SUBJ_RESTORE_PASSWORD') . ': ' . $site->host,
                $this->translate('TXT_RECOVERY_EMAIL_BODY'),
                ['link' => $site->base . $langAbbr . '/restore-password/recover/' . $code . '/']
            );

            $data['result']  = true;
            $data['message'] = $this->translate('TXT_RECOVER_MESSAGE_SUCCESS');
        } catch (\Throwable $e) {
            $data['message'] = $this->translate('ERR_NO_U_NAME');
        }

        $this->writeJson($data);
    }

    /**
     * Сохраняет новый пароль по коду из письма.
     *
     * @return void
     */
    public function change(): void
    {
        $data = [
            'result'  => false,
            'message' => $this->translate('TXT_ERROR'),
        ];

        try {
            $code = (string)($_POST['code'] ?? '');
            $res  = $this->dbh->selectRequest(
                'SELECT u_id FROM user_users WHERE u_recovery_code = %s AND u_recovery_date > NOW()',
                $code
            );

            if (!is_array($res) || count($res) === 0) {
                throw new SystemException('TXT_RECOVERY_CODE_EXPIRED');
            }

            if (!isset($_POST['password1'], $_POST['password2'])) {
                throw new SystemException('TXT_ERROR');
            }
            if ($_POST['password1'] !== $_POST['password2']) {
                throw new SystemException('MSG_PWD_MISMATCH');
            }
            if (strlen((string)$_POST['password1']) < 6) {
                // legacy-поведение — ограничение оставлено пустым
            }

            $_POST['password1'] = sha1((string)$_POST['password1']);
            unset($_POST['password2']);

            $user = new User((int)$res[0]['u_id']);
            $user->update([
                'u_password'      => $_POST['password1'],
                'u_recovery_code' => null,
                'u_recovery_date' => false,
            ]);

            $data['result']  = true;
            $data['message'] = $this->translate('TXT_RECOVERY_COMPLETED');
        } catch (\Throwable $e) {
            $data['message'] = $e->getMessage();
        }

        $this->writeJson($data);
    }

    /**
     * Проверяет код восстановления и отображает форму смены пароля.
     *
     * @return void
     */
    public function recover(): void
    {
        $code = $this->getStateParams();
        $res  = $this->dbh->selectRequest(
            'SELECT u_id FROM user_users WHERE u_recovery_code = %s AND u_recovery_date > NOW()',
            (string)$code[0]
        );
        if (!is_array($res) || count($res) === 0) {
            throw new SystemException('ERR_403', SystemException::ERR_403);
        }
        $this->setProperty('code', (string)$code[0]);
        parent::main(); // ничего не возвращаем
    }

    /* ===== Вспомогательные методы ===== */

    /**
     * Отправляет JSON-ответ клиенту.
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
