<?php
declare(strict_types=1);

use Symfony\Component\HttpFoundation\Request as SRequest;
use Symfony\Component\HttpFoundation\AcceptHeader;

/**
 * HTTP-Request (legacy API + Symfony HttpFoundation under the hood), PHP 8.3.
 *
 * Сохранены методы: getURI(), getLang(), getLangSegment(),
 * getPath(), setPathOffset(), shiftPath(), getPathOffset(),
 * useSegments(), getUsedSegments(), getClientIP().
 *
 * Добавлены хелперы: getHost(), getScheme(), getPort(), getUserAgent(),
 * getReferrer(), getClientIps(), hasParam(), intParam(), boolParam(),
 * only(), except(), wantsJson(), accepts(), getJson(), getBearerToken(),
 * raw(), getUriSegments().
 */
final class Request extends BaseObject
{
    /** «Сырой» Symfony Request */
    private SRequest $sreq;

    /** Legacy URI-объект (совместимость) */
    private $uri;

    private string $rootPath = '/';
    private string $lang     = '';

    /** @var array<int,string> */
    private array $path   = [];
    private int   $offset = 0;
    private int   $usedSegmentsCount = 0;

    public const PATH_WHOLE    = 1;
    public const PATH_TEMPLATE = 2;
    public const PATH_ACTION   = 3;

    /**
     * @throws SystemException
     */
    public function __construct()
    {
        $this->sreq = SRequest::createFromGlobals();
        $this->uri  = URI::create();

        $rawPath  = (string)$this->sreq->getPathInfo(); // безопаснее, чем $_SERVER['REQUEST_URI']
        $siteRoot = (string)(E()->getSiteManager()->getCurrentSite()->root ?? '/');
        $siteRoot = $this->normalizeRoot($siteRoot);
        $this->rootPath = $siteRoot;

        // срезаем префикс только если он реально в начале пути
        $trimmed  = $this->stripRootPrefix($rawPath, $siteRoot);
        $segments = $this->splitSegments($trimmed);

        // язык — первый валидный сегмент; мягко синхронизируем Language::setCurrent()
        try {
            $langSvc = E()->getLanguage();
            if (isset($segments[0]) && $langSvc->isValidLangAbbr($segments[0])) {
                $this->lang = array_shift($segments);
                $langId = $langSvc->getIDByAbbr($this->lang, true);
                if ($langId) {
                    try { $langSvc->setCurrent((int)$langId); } catch (\Throwable) {}
                }
            } else {
                $this->lang = '';
            }
        } catch (\Throwable) {
            $this->lang = '';
        }

        $this->path = $segments;
    }

    /** Legacy: вернуть URI-объект */
    public function getURI() { return $this->uri; }

    /** Короткий код языка из URL (или '' если нет) */
    public function getLang(): string { return $this->lang; }

    /** «uk/» либо '' */
    public function getLangSegment(): string { return ($this->lang === '') ? '' : ($this->lang . '/'); }

    /**
     * Путь:
     *  - PATH_WHOLE    — весь путь после site.root и языка,
     *  - PATH_TEMPLATE — до $offset,
     *  - PATH_ACTION   — после $offset.
     * $asString=true — строка с завершающим '/' (как в старом коде).
     *
     * @return array<string>|string
     */
    public function getPath(int $what = self::PATH_WHOLE, bool $asString = false): array|string
    {
        switch ($what) {
            case self::PATH_TEMPLATE: $path = array_slice($this->path, 0, $this->offset); break;
            case self::PATH_ACTION:   $path = array_slice($this->path, $this->offset);   break;
            default:                  $path = $this->path;                                break;
        }
        return $asString ? (empty($path) ? '' : implode('/', $path) . '/') : $path;
    }

    /** Доп.: массив сегментов целиком */
    public function getUriSegments(): array { return $this->path; }

    public function setPathOffset(int $offset): void { $this->offset = max(0, $offset); $this->useSegments($this->offset); }
    public function shiftPath(int $offset): void     { $this->setPathOffset($this->getPathOffset() + $offset); }
    public function getPathOffset(): int             { return $this->offset; }

    public function useSegments(int $count = 1): void { $this->usedSegmentsCount = max(0, $count); }
    public function getUsedSegments(): int            { return $this->usedSegmentsCount; }

    /**
     * IP клиента (учёт прокси). Совместимость:
     *  - $returnAsInt=true → unsigned int для IPv4 (как строка); IPv6 вернёт исходную строку.
     */
    public function getClientIP(bool $returnAsInt = false): string
    {
        $ip = $this->sreq->getClientIp() ?? '0.0.0.0';
        if ($returnAsInt && filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            $long = ip2long($ip);
            if ($long !== false) return sprintf('%u', $long);
        }
        return $ip;
    }

    /* ===== Удобные хелперы (не ломают совместимость) ===== */

    public function getHost(): string   { return $this->sreq->getHost(); }
    public function getScheme(): string { return $this->sreq->getScheme(); }
    public function getPort(): int      { return (int)$this->sreq->getPort(); }

    public function getUserAgent(): string { return (string)$this->sreq->headers->get('User-Agent', ''); }
    public function getReferrer(): string  { return (string)$this->sreq->headers->get('Referer', ''); }

    public function getClientIps(): array { return $this->sreq->getClientIps(); }

    public function hasParam(string $name): bool {
        return $this->sreq->request->has($name) || $this->sreq->query->has($name) || $this->sreq->attributes->has($name);
    }

    public function getParam(string $name, mixed $default = null): mixed {
        return $this->sreq->request->all()[$name]
            ?? $this->sreq->query->all()[$name]
            ?? $this->sreq->attributes->get($name, $default);
    }

    public function intParam(string $name, ?int $default = null): ?int {
        $v = $this->getParam($name, $default);
        return is_numeric($v) ? (int)$v : $default;
    }

    public function boolParam(string $name, ?bool $default = null): ?bool {
        $v = $this->getParam($name, $default);
        if (is_bool($v)) return $v;
        if (is_string($v)) {
            $map = ['1'=>true,'true'=>true,'on'=>true,'yes'=>true,'0'=>false,'false'=>false,'off'=>false,'no'=>false];
            $k = strtolower($v);
            return array_key_exists($k,$map) ? $map[$k] : $default;
        }
        if (is_numeric($v)) return (bool)$v;
        return $default;
    }

    public function only(array $keys): array {
        $all = array_merge($this->sreq->query->all(), $this->sreq->request->all());
        return array_intersect_key($all, array_flip($keys));
    }

    public function except(array $keys): array {
        $all = array_merge($this->sreq->query->all(), $this->sreq->request->all());
        foreach ($keys as $k) unset($all[$k]);
        return $all;
    }

    public function wantsJson(): bool {
        $a = (string)$this->sreq->headers->get('Accept', '');
        if ($a === '') return false;
        $h = AcceptHeader::fromString($a);
        return $h->has('application/json') || $h->has('application/*+json') || str_contains($a, 'json');
    }

    public function accepts(string $mime): bool {
        $a = (string)$this->sreq->headers->get('Accept', '');
        if ($a === '') return true;
        $h = AcceptHeader::fromString($a);
        return $h->has($mime);
    }

    public function getJson(bool $assoc = true) {
        $ct = (string)$this->sreq->headers->get('Content-Type', '');
        if (!str_contains($ct, 'application/json')) return null;
        $raw = (string)$this->sreq->getContent();
        if ($raw === '') return null;
        try {
            return json_decode($raw, $assoc, 512, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            return null;
        }
    }

    public function getBearerToken(): ?string {
        $h = (string)$this->sreq->headers->get('Authorization', '');
        return ($h && stripos($h, 'Bearer ') === 0) ? substr($h, 7) : null;
    }

    /** Доступ к «сырому» Symfony Request при необходимости */
    public function raw(): SRequest { return $this->sreq; }

    /* ======================= helpers ======================= */

    private function normalizeRoot(string $root): string
    {
        $root = '/' . ltrim($root, '/');
        $root = rtrim($root, '/');
        return $root === '' ? '/' : $root;
    }

    private function stripRootPrefix(string $path, string $root): string
    {
        $path = '/' . ltrim($path, '/');
        if ($root === '/' || $root === '') return $path;

        $prefix = rtrim($root, '/') . '/';
        if (str_starts_with($path, $prefix)) {
            return '/' . ltrim(substr($path, strlen($prefix)), '/');
        }
        if ($path === $root) return '/';
        return $path;
    }

    /** @return array<int,string> */
    private function splitSegments(string $p): array
    {
        $trim = trim($p, '/');
        if ($trim === '') return [];
        return array_values(array_filter(explode('/', $trim), 'strlen'));
    }
}
