<?php

declare(strict_types=1);

use Symfony\Component\HttpFoundation\Session\Session;
use Symfony\Component\HttpFoundation\Session\Storage\NativeSessionStorage;

/**
 * Менеджер пользовательских сессий (хранение в БД).
 * Теперь использует Symfony Session поверх таблицы share_session.
 */
final class UserSession extends DBWorker
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

    /** Таймаут неактивности (сек) — используется для валидации при необходимости */
    private int $timeout = 0;

    /** Время жизни сессии/куки (сек) */
    private int $lifespan = 0;

    /** User-Agent (для расширенной аналитики при желании) */
    private string $userAgent = 'ROBOT';
    private ?NativeSessionStorage $storage = null;
    private ?ShareSessionHandler $handler = null;
    private static ?Session $session = null;

    /**
     * @param bool $force Принудительно создать новую сессию, если не передан cookie
     * @throws SystemException
     */
    public function __construct(bool $force = false)
    {
        if (!self::$instance)
        {
            throw new SystemException('ERR_NO_CONSTRUCTOR');
        }

        parent::__construct();

        $this->timeout  = (int)$this->getConfigValue('session.timeout') ?: 0;
        $this->lifespan = (int)$this->getConfigValue('session.lifespan') ?: (60 * 60 * 24);
        $this->userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'ROBOT';

        $this->handler = new ShareSessionHandler($this->dbh, $this->lifespan, $this->userAgent);

        // Настроим cookie с безопасными флагами
        $path   = $this->getConfigValue('site.domain') ? '/' : (E()->getSiteManager()->getCurrentSite()->root ?? '/');
        $domain = $this->getConfigValue('site.domain') ? ('.' . $this->getConfigValue('site.domain')) : '';

        $options = [
            'cookie_lifetime' => $this->lifespan,
            'cookie_path'     => $path,
            'cookie_domain'   => $domain ?: null,
            'cookie_secure'   => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
            'cookie_httponly' => true,
            'cookie_samesite' => 'lax',
            'gc_probability'  => self::DEFAULT_PROBABILITY,
            'gc_divisor'      => 100,
            'gc_maxlifetime'  => $this->lifespan,
            'name'            => self::DEFAULT_SESSION_NAME,
            'use_strict_mode' => true,
        ];

        $this->storage = new NativeSessionStorage($options, $this->handler);
        self::$session = new Session($this->storage);

        $existingId = self::isOpen();
        if ($existingId)
        {
            if ($this->handler->isValid($existingId))
            {
                self::$session->setId($existingId);
            }
            else
            {
                $this->handler->deleteById($existingId);
                if ($force)
                {
                    self::$session->setId(self::createIdentifier());
                }
                else
                {
                    E()->getResponse()->deleteCookie(self::DEFAULT_SESSION_NAME);
                    return;
                }
            }
        }
        elseif (!$force)
        {
            // Нет cookie и не форсируем — просто не стартуем сессию
            return;
        }

        try
        {
            self::$session->start();
        }
        catch (\Throwable)
        {
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
     * Валидна ли запись о сессии в БД.
     */
    public static function isValid(string $sessID): bool
    {
        $handler = self::resolveHandler();
        if ($handler)
        {
            return $handler->isValid($sessID);
        }

        $res = E()->getDB()->select(
            'SELECT session_id FROM ' . self::TABLE . ' WHERE session_native_id = %s AND session_expires >= UNIX_TIMESTAMP()',
            addslashes($sessID)
        );

        return is_array($res) && !empty($res);
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

        if ($UID)
        {
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
        if (!empty($_COOKIE[self::DEFAULT_SESSION_NAME]))
        {
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
        if (self::$instance)
        {
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
        try
        {
            return bin2hex(random_bytes(16)); // 32 hex-символа
        }
        catch (\Throwable)
        {
            return sha1((string)(microtime(true) . random_int(PHP_INT_MIN, PHP_INT_MAX)));
        }
    }

    private static function resolveHandler(): ?ShareSessionHandler
    {
        if (self::$session instanceof Session)
        {
            $storage = self::$session->getStorage();
            if ($storage instanceof NativeSessionStorage)
            {
                $handler = $storage->getSaveHandler();
                if ($handler instanceof ShareSessionHandler)
                {
                    return $handler;
                }
            }
        }

        return null;
    }
}
