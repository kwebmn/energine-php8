<?php
declare(strict_types=1);

/**
 * UserProfile — форма редактирования профиля текущего пользователя.
 * Совместимо с PHP 8.3: строгие типы, аккуратные проверки и JSON-ответ.
 */
#[\AllowDynamicProperties]
final class UserProfile extends DBDataSet
{
    /**
     * @inheritDoc
     */
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);
        $this->setTableName('user_users');
        $this->setType(self::COMPONENT_TYPE_FORM_ALTER);
    }

    /**
     * Главный режим: проверяем авторизацию, настраиваем фильтр и форму.
     *
     * @throws SystemException 'ERR_DEV_NO_AUTH_USER'
     */
    protected function main(): void
    {
        if (!$this->document->user->isAuthenticated()) {
            throw new SystemException('ERR_DEV_NO_AUTH_USER', SystemException::ERR_DEVELOPER);
        }

        $this->setFilter($this->document->user->getID());
        $this->setAction('save-user'); // эндпоинт сохранения
        $this->setTitle($this->translate('TXT_USER_PROFILE'));
        $this->prepare();
    }

    /**
     * @inheritDoc
     * Переопределяем параметр active: компонент активен.
     */
    protected function defineParams(): array
    {
        return array_merge(parent::defineParams(), [
            'active' => true,
        ]);
    }

    /**
     * Сохранение профиля текущего пользователя.
     * Возвращает JSON: { result: bool, message: string }.
     */
    protected function save(): void
    {
        $builder = new JSONCustomBuilder();
        $this->setBuilder($builder);

        $response = [
            'result'  => false,
            'message' => $this->translate('TXT_ERROR'),
        ];

        try {
            $user = E()->getAUser(); // актуальный пользователь (модель)

            // Блок смены пароля (опционально)
            if (isset($_POST[$this->getTableName()]['u_password'])) {
                $pwd  = (string)($_POST[$this->getTableName()]['u_password'] ?? '');
                $pwd2 = (string)($_POST[$this->getTableName()]['u_password2'] ?? '');

                if ($pwd !== '' || $pwd2 !== '') {
                    if ($pwd !== $pwd2) {
                        throw new SystemException('MSG_PWD_MISMATCH');
                    }
                    // Хеш оставляем sha1 для совместимости с существующей БД
                    $_POST[$this->getTableName()]['u_password'] = sha1($pwd);
                    unset($_POST[$this->getTableName()]['u_password2']);
                } else {
                    // Пустые поля — пароль не меняем
                    unset($_POST[$this->getTableName()]['u_password'], $_POST[$this->getTableName()]['u_password2']);
                }
            }

            // Проверка уникальности u_name (email/логин)
            if (isset($_POST[$this->getTableName()]['u_name'])) {
                $newName = (string)$_POST[$this->getTableName()]['u_name'];
                $res = $this->dbh->selectRequest(
                    'SELECT u_id FROM user_users WHERE u_name LIKE "%s" AND u_id != %s',
                    $newName,
                    $user->getID()
                );
                if (is_array($res) && count($res) > 0) {
                    throw new SystemException('ERR_NO_U_NAME');
                }
            }

            // Никогда не даём обновлять u_id руками
            unset($_POST[$this->getTableName()]['u_id']);

            // Обновляем профиль
            $dataSave = (array)($_POST[$this->getTableName()] ?? []);
            $user->update($dataSave);

            $response['result']  = true;
            $response['message'] = $this->translate('TXT_SAVED');
        } catch (SystemException $e) {
            $response['message'] = $e->getMessage();
        }

        $builder->setProperties($response);
    }

    /**
     * @inheritDoc
     * Для профиля скрываем u_is_active.
     * Если есть u_password — добавляем подтверждение u_password2.
     */
    protected function createDataDescription(): DataDescription
    {
        // В исходнике была опечатка createdataDescription; исправлено на createDataDescription
        $result = parent::createDataDescription();

        // Скрываем флаг активности
        if ($fd = $result->getFieldDescriptionByName('u_is_active')) {
            $result->removeFieldDescription($fd);
        }

        // Добавляем поле подтверждения пароля рядом с u_password (если оно есть в метаданных)
        if ($result->getFieldDescriptionByName('u_password')) {
            $pwd2 = new FieldDescription('u_password2');
            $pwd2->setType(FieldDescription::FIELD_TYPE_PWD);
            $pwd2->setProperty('customField', true);
            $pwd2->setProperty('title', $this->translate('FIELD_U_PASSWORD2'));
            $pwd2->setProperty('message2', $this->translate('ERR_PWD_MISMATCH'));
            $pwd2->setProperty('tableName', $this->getTableName());

            // Помещаем сразу после u_password, если у DataDescription есть такая возможность,
            // иначе просто добавим в конец
            if (method_exists($result, 'addFieldDescription')) {
                $result->addFieldDescription(
                    $pwd2,
                    DataDescription::FIELD_POSITION_AFTER,
                    'u_password'
                );
            } else {
                $result->addFieldDescription($pwd2);
            }
        }

        return $result;
    }

    /**
     * @inheritDoc
     * Очищаем поле u_password, чтобы не показывать хеш/старый пароль в форме.
     */
    protected function createData(): Data
    {
        $data = parent::createData();

        if ($pwd = $data->getFieldByName('u_password')) {
            $pwd->setData(''); // пустое значение — пользователь вводит новый пароль при необходимости
        }

        return $data;
    }
}
