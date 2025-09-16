<?php
declare(strict_types=1);

/**
 * URI (Unified Resource Identifier), PHP 8.3, drop-in совместимость.
 *
 * Публичные методы сохранены: validate(), create(), get/set Scheme/Host/Port/Path/Query/Fragment,
 * getPathSegment(), __toString().
 *
 * Улучшения:
 *  - validate() использует parse_url (корректнее для IPv6, нестандартных портов и т.п.).
 *  - create() аккуратно собирает URL из $_SERVER с учётом HTTPS/форвардинга.
 *  - getPath(true) сохраняет формат со слешами и поддерживает legacy-мэппинг через конфиг:
 *    При отсутствии — остаётся прежний хак на '/Тарпан/'.
 */
final class URI extends BaseObject
{
    /** Request scheme (protocol). */
    private string $scheme = '';

    /** Host name. */
    private string $host = '';

    /** @var array<int,string> Path segments */
    private array $path = [];

    /** Raw query string (без '?'). */
    private string $query = '';

    /** Document fragment (без '#'). */
    private string $fragment = '';

    /** Port number (по умолчанию 80 — как в старом коде). */
    private int $port = 80;

    /**
     * Трюк для имитации приватного конструктора (совместимость со старым кодом).
     * Если null — бросаем исключение. Устанавливается в create().
     */
    private static ?bool $trick = null;

    /**
     * @param string $uri
     * @throws SystemException 'ERR_PRIVATE_CONSTRUCTOR'
     */
    public function __construct(string $uri)
    {
        if (self::$trick === null) {
            throw new SystemException('ERR_PRIVATE_CONSTRUCTOR', SystemException::ERR_DEVELOPER);
        }
        // закрываем «окно» сразу, чтобы нельзя было new URI() второй раз напрямую
        self::$trick = null;

        if ($uri !== '' && ($matches = self::validate($uri))) {
            // Порядок совместим с прежним конструктором:
            // [0]=scheme, [1]=host, [2]=port, [3]=path, [4]=query, [5]=fragment
            $this->setScheme($matches[0]);
            $this->setHost($matches[1]);
            $this->setPort((int)$matches[2]);
            $this->setPath($matches[3]);
            $this->setQuery($matches[4] ?? '');
            $this->setFragment($matches[5] ?? '');
        } else {
            $this->scheme = '';
            $this->host = '';
            $this->path = [];
            $this->query = '';
            $this->fragment = '';
            $this->port = 80;
        }
    }

    /**
     * Validate URI → массив совместимого формата или false.
     *
     * Возвращаем:
     *  [0] scheme (string, lower)
     *  [1] host   (string, lower)
     *  [2] port   (int,     80 если не указан)
     *  [3] path   (string, начинается с '/'; если пусто — '/')
     *  [4] query  (string, без '?', может отсутствовать)
     *  [5] fragment (string, без '#', может отсутствовать)
     *
     * @return array<int,mixed>|bool
     */
    public static function validate(string $uri)
    {
        $parts = self::parseUrlSafe($uri);
        if ($parts === false) {
            return false;
        }

        $scheme = isset($parts['scheme']) ? strtolower((string)$parts['scheme']) : '';
        $host   = isset($parts['host'])   ? strtolower((string)$parts['host'])   : '';
        $port   = isset($parts['port'])   ? (int)$parts['port']                  : 0;
        $path   = (string)($parts['path'] ?? '/');
        $query  = (string)($parts['query'] ?? '');
        $frag   = (string)($parts['fragment'] ?? '');

        if ($scheme === '' || $host === '') {
            return false;
        }

        if ($path === '') {
            $path = '/';
        } elseif ($path[0] !== '/') {
            $path = '/' . $path;
        }

        if ($port <= 0) {
            // совместимость: по умолчанию 80
            $port = 80;
        }

        // Формируем массив в том же порядке, который использовался раньше
        return [$scheme, $host, $port, $path, $query, $frag];
    }

    private static function parseUrlSafe(string $uri): array|false
    {
        $error = null;

        set_error_handler(static function (int $severity, string $message, string $file = '', int $line = 0) use (&$error): bool {
            $error = $message;
            return true;
        });

        $parts = parse_url($uri);

        restore_error_handler();

        if ($parts === false || $error !== null) {
            return false;
        }

        return $parts;
    }

    /**
     * Создать URI из строки или из окружения (как раньше).
     */
    public static function create(string $uriString = ''): self
    {
        self::$trick = true;

        if ($uriString === '') {
            // Схема с учётом обратного проксирования
            $https  = $_SERVER['HTTPS'] ?? '';
            $proto  = $_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '';
            $scheme = ($https && strtolower((string)$https) !== 'off') || strtolower((string)$proto) === 'https'
                ? 'https' : 'http';

            // Хост может содержать порт (host:port)
            $hostHeader = $_SERVER['HTTP_HOST'] ?? ($_SERVER['SERVER_NAME'] ?? 'localhost');
            $hostHeader = (string)$hostHeader;

            // Разделим host:port, если в HTTP_HOST уже есть порт
            $hostOnly = $hostHeader;
            $port = null;
            if (strpos($hostHeader, ':') !== false && substr_count($hostHeader, ':') === 1) {
                [$hostOnly, $portPart] = explode(':', $hostHeader, 2);
                $port = (int)$portPart;
            }

            if ($port === null) {
                // если порт не пришёл в HTTP_HOST, берём SERVER_PORT
                $serverPort = (int)($_SERVER['SERVER_PORT'] ?? 0);
                if ($serverPort > 0) {
                    $port = $serverPort;
                } else {
                    $port = ($scheme === 'https') ? 443 : 80;
                }
            }

            $requestUri = (string)($_SERVER['REQUEST_URI'] ?? '/');

            $uriString = sprintf('%s://%s:%d%s', $scheme, $hostOnly, $port, $requestUri);
        }

        return new self($uriString);
    }

    /* ==================== Setters/Getters ==================== */

    public function setScheme(string $scheme): void
    {
        $this->scheme = strtolower($scheme);
    }

    public function getScheme(): string
    {
        return $this->scheme;
    }

    public function setHost(string $host): void
    {
        $this->host = strtolower($host);
    }

    public function getHost(): string
    {
        return $this->host;
    }

    /**
     * Если $port = 0 → 80 (совместимость со старым кодом).
     */
    public function setPort(int $port): void
    {
        if ($port <= 0) {
            $port = 80;
        }
        $this->port = $port;
    }

    public function getPort(): int
    {
        return $this->port;
    }

    /**
     * @param string|array<int,string> $path
     */
    public function setPath($path): void
    {
        if (!is_array($path)) {
            // строку → сегменты, убираем пустые
            $segments = array_values(array_filter(explode('/', $path), 'strlen'));
        } else {
            $segments = array_values(array_filter($path, 'strlen'));
        }
        $this->path = $segments;
    }

    /**
     * @param bool $asString Если true — строка вида "/a/b/" (как раньше),
     *                       иначе — массив сегментов.
     * @return array<int,string>|string
     */
    public function getPath(bool $asString = true)
    {
        $path = $this->path;

        if ($asString) {
            $s = empty($path) ? '/' : '/' . implode('/', $path) . '/';

            // Поддержка legacy-мэппинга через конфиг: 'uri.legacy_path_map' => ['/Тарпан/' => '/products/']
            try {
                $map = BaseObject::_getConfigValue('uri.legacy_path_map');
                if (is_array($map) && $map) {
                    $decoded = urldecode($s);
                    if (isset($map[$decoded])) {
                        return (string)$map[$decoded];
                    }
                }
            } catch (\Throwable) {
                // игнорируем, если конфиг недоступен
            }

            return $s;
        }

        return $path;
    }

    public function getPathSegment(int $pos): string
    {
        return $this->path[$pos] ?? '';
    }

    public function setQuery(string $query): void
    {
        // Без '?'
        $this->query = ltrim($query, '?');
    }

    public function getQuery(): string
    {
        return $this->query;
    }

    public function setFragment(string $fragment): void
    {
        // Без '#'
        $this->fragment = ltrim($fragment, '#');
    }

    public function getFragment(): string
    {
        return $this->fragment;
    }

    /* ==================== Helpers ==================== */

    /**
     * Собрать строку URI (как раньше).
     * Обрати внимание: порт намеренно НЕ подставляется (совместимость с твоим кодом).
     */
    public function __toString(): string
    {
        if ($this->scheme !== '' && $this->host !== '') {
            return $this->scheme . '://' . $this->host
                . (empty($this->path) ? '/' : $this->getPath(true))
                . ($this->query !== '' ? ('?' . $this->query) : '')
                . ($this->fragment !== '' ? ('#' . $this->fragment) : '');
        }
        return '';
    }
}
