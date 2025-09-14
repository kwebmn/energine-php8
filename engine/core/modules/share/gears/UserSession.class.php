<?php
declare(strict_types=1);

/**
 * Менеджер пользовательских сессий (хранение в БД).
 * PHP 8.x: реализует \SessionHandlerInterface, корректные сигнатуры и типы.
 */
final class UserSession extends DBWorker implements \SessionHandlerInterface
{
    /** Имя cookie с пометкой неудачной авторизации (историческое, используется вне класса) */
    public const FAILED_LOGIN_COOKIE_NAME = 'failed_login';

    /** Имя cookie PHP-сессии */
    public const DEFAULT_SESSION_NAME = 'NRGNSID';

    /**
     * Вероятность запуска GC: DEFAULT_PROBABILITY / session.gc_divisor (по умолчанию 10/100 = 10%)
     * Влияет только на встроенный механизм PHP, наш gc() всё равно чистит просроченные записи.
     */
    public const DEFAULT_PROBABILITY = 10;

    /** Таблица хранилища сессий */
    private const TABLE = 'share_session';

    /** Флаг «инициализатор вызван» — запрещает прямой new, используйте start() */
    private static bool $instance = false;

    /** Текущий session_id (значение cookie) */
    private ?string $phpSessId = null;

    /** Таймаут неактивности (сек) — используется для валидации при необходимости */
    private int $timeout = 0;

    /** Время жизни сессии/куки (сек) */
    private int $lifespan = 0;

    /** User-Agent (для расширенной аналитики при желании) */
    private string $userAgent = 'ROBOT';

    /**
     * Кеш считанных данных сессии:
     * - null   — ещё не читали
     * - ''     — сессия есть, но данных нет
     * - string — сериализованные данные сессии
     */
    private ?string $data = null;

    /**
     * @param bool $force Принудительно создать новую сессию, если не передан cookie
     * @throws SystemException
     */
    public function __construct(bool $force = false)
    {
        if (!self::$instance) {
            throw new SystemException('ERR_NO_CONSTRUCTOR');
        }

        parent::__construct();

        $this->timeout  = (int)$this->getConfigValue('session.timeout') ?: 0;
        $this->lifespan = (int)$this->getConfigValue('session.lifespan') ?: (60 * 60 * 24);
        $this->userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'ROBOT';

        ini_set('session.gc_probability', (string)self::DEFAULT_PROBABILITY);

        // Регистрируем обработчик хранения
        session_set_save_handler($this, true);
        session_name(self::DEFAULT_SESSION_NAME);

        $existingId = self::isOpen();
        if ($existingId) {
            $this->phpSessId = $existingId;
            $loaded = self::isValid($existingId); // string|false
            if ($loaded !== false) {
                // валидная сессия: продлим жизнь
                $this->data = (string)$loaded;
                E()->getDB()->modifyRequest(
                    'UPDATE ' . self::TABLE . ' 
                       SET session_last_impression = UNIX_TIMESTAMP(),
                           session_expires = (UNIX_TIMESTAMP() + %s)
                     WHERE session_native_id = %s',
                    $this->lifespan,
                    $existingId
                );
            } elseif ($force) {
                // невалидна — создадим новую запись
                [, $newId] = self::manuallyCreateSessionInfo();
                $this->phpSessId = $newId;
                $this->data = '';
            } else {
                // удалить «битую» и cookie
                $this->dbh->modify(QAL::DELETE, self::TABLE, null, ['session_native_id' => addslashes($existingId)]);
                E()->getResponse()->deleteCookie(self::DEFAULT_SESSION_NAME);
                return;
            }
        } elseif ($force) {
            [, $newId] = self::manuallyCreateSessionInfo();
            $this->phpSessId = $newId;
            $this->data = '';
        } else {
            // Нет cookie и не форсируем — просто не стартуем сессию
            return;
        }

        // Настроим cookie с безопасными флагами
        $path   = $this->getConfigValue('site.domain') ? '/' : (E()->getSiteManager()->getCurrentSite()->root ?? '/');
        $domain = $this->getConfigValue('site.domain') ? ('.' . $this->getConfigValue('site.domain')) : '';

        @session_set_cookie_params([
            'lifetime' => $this->lifespan,
            'path'     => $path,
            'domain'   => $domain,
            'secure'   => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
            'httponly' => true,
            'samesite' => 'Lax',
        ]);

        if ($this->phpSessId) {
            session_id($this->phpSessId);
        }

        try {
            @session_start();
        } catch (\Throwable $e) {
            // глушим, чтобы не ронять страницу — хранение всё равно в БД
        }
    }

    /**
     * Есть ли открытая сессия (по cookie)?
     *
     * @return string|null
     */
    public static function isOpen(): ?string
    {
        $v = $_COOKIE[self::DEFAULT_SESSION_NAME] ?? null;
        return (is_string($v) && $v !== '') ? $v : null;
    }

    /**
     * Валидна ли запись о сессии в БД; при валидности — вернуть данные.
     *
     * @param string $sessID
     * @return string|false
     */
    public static function isValid(string $sessID)
    {
        $res = E()->getDB()->select(
            'SELECT session_id, session_data 
               FROM ' . self::TABLE . ' 
              WHERE session_native_id = %s 
                AND session_expires >= UNIX_TIMESTAMP()',
            addslashes($sessID)
        );
        return (is_array($res) && isset($res[0]['session_data'])) ? (string)$res[0]['session_data'] : false;
    }

    /**
     * Ручное создание записи о сессии (для auth/captcha и т.п.).
     *
     * @param int|false $UID
     * @param int|false $expires Unix-время истечения; если false — +15 минут
     * @return array{0:string,1:string,2:int} [cookieName, sessionId, expires]
     */
    public static function manuallyCreateSessionInfo($UID = false, $expires = false): array
    {
        $id   = self::createIdentifier();
        $now  = time();
        $exp  = $expires ? (int)$expires : ($now + 15 * 60);

        $data = [
            'session_native_id'    => $id,
            'session_created'      => $now,
            'session_last_impression' => $now,
            'session_expires'      => $exp,
            'session_ip'           => E()->getRequest()->getClientIP(true),
        ];

        if ($UID) {
            $data['u_id'] = (int)$UID;
            // совместимость с форматом PHP-хранилища (имя переменной + сериализованное значение)
            $data['session_data'] = 'userID|' . serialize((int)$UID);
        }

        E()->getDB()->modify(QAL::INSERT, self::TABLE, $data);

        // чтобы downstream-код видел новый id в том же запросе
        $_COOKIE[self::DEFAULT_SESSION_NAME] = $id;

        return [self::DEFAULT_SESSION_NAME, $id, $exp];
    }

    /**
     * Ручное удаление записи о сессии.
     */
    public static function manuallyDeleteSessionInfo(): void
    {
        if (!empty($_COOKIE[self::DEFAULT_SESSION_NAME])) {
            $sid = $_COOKIE[self::DEFAULT_SESSION_NAME];
            E()->getDB()->modify(QAL::DELETE, self::TABLE, null, ['session_native_id' => $sid]);
        }
    }

    /**
     * Точка входа — безопасный способ запустить обработчик.
     *
     * @throws SystemException
     */
    public static function start(bool $force = false): void
    {
        if (self::$instance) {
            throw new SystemException('ERR_SESSION_ALREADY_STARTED');
        }
        self::$instance = true;
        new self($force);
    }

    /**
     * Генерация безопасного идентификатора сессии.
     */
    public static function createIdentifier(): string
    {
        try {
            return bin2hex(random_bytes(16)); // 32 hex-символа
        } catch (\Throwable) {
            return sha1((string)(microtime(true) . random_int(PHP_INT_MIN, PHP_INT_MAX)));
        }
    }

    // ===== SessionHandlerInterface =====

    public function open(string $savePath, string $sessionName): bool
    {
        return true;
    }

    public function close(): bool
    {
        return true;
    }

    /**
     * Возвращает сериализованные данные сессии (строку) либо пустую строку.
     */
    public function read(string $phpSessId): string
    {
        // если уже знаем данные — вернём их (или пустую строку)
        if ($this->data !== null && $this->phpSessId === $phpSessId) {
            return $this->data;
        }

        $res = E()->getDB()->select(
            'SELECT session_data 
               FROM ' . self::TABLE . ' 
              WHERE session_native_id = %s 
                AND session_expires >= UNIX_TIMESTAMP()',
            addslashes($phpSessId)
        );

        $this->data = (is_array($res) && isset($res[0]['session_data'])) ? (string)$res[0]['session_data'] : '';
        return $this->data;
    }

    /**
     * Сохраняет данные сессии. Всегда возвращает true.
     */
    public function write(string $phpSessId, string $data): bool
    {
        // Даже пустую строку стоит записать, чтобы продлить срок жизни и обновить время.
        $payload = ['session_data' => $data];

        if (isset($_SESSION['userID'])) {
            $payload['u_id'] = (int)$_SESSION['userID'];
        }

        // Продлим жизнь
        $payload['session_last_impression'] = time();
        $payload['session_expires'] = time() + $this->lifespan;

        // Обновим (если нет — вставим)
        $updated = $this->dbh->modify(QAL::UPDATE, self::TABLE, $payload, ['session_native_id' => $phpSessId]);
        if ($updated !== true) {
            // В случае, если записи не было (нестандартный сценарий)
            $payload['session_native_id'] = $phpSessId;
            $payload['session_created']   = time();
            $payload['session_ip']        = E()->getRequest()->getClientIP(true);
            $this->dbh->modify(QAL::INSERT, self::TABLE, $payload);
        }

        $this->data = $data;
        return true;
    }

    public function destroy(string $phpSessId): bool
    {
        $this->dbh->modify(QAL::DELETE, self::TABLE, null, ['session_native_id' => $phpSessId]);
        return true;
    }

    /**
     * Удаляет просроченные сессии. Возвращает число удалённых записей (или false при ошибке).
     */
    public function gc(int $max_lifetime): int|false
    {
        try {
            $pdo = $this->dbh->getPDO();
            $stmt = $pdo->prepare('DELETE FROM ' . self::TABLE . ' WHERE session_expires < UNIX_TIMESTAMP()');
            $stmt->execute();
            return $stmt->rowCount();
        } catch (\Throwable) {
            return false;
        }
    }
}
