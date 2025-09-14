<?php
declare(strict_types=1);

/**
 * Backward-compatible cache with PSR bridge + file fallback (PHP 8.3).
 *
 * Совместим со старым API:
 *  - const CACHE_DIR, TRANSLATIONS_KEY, CLASS_STRUCTURE_KEY, DB_STRUCTURE_KEY
 *  - методы: isEnabled(), store(), retrieve(), dispose()
 *
 * Новое:
 *  - In-memory слой на время запроса
 *  - remember() с file-lock (анти-штампед)
 *  - storeTagged()/invalidateTags() (PSR TagAware + файловый индекс)
 *  - has(), clear(), getMultiple(), setMultiple()
 *  - Шардирование файлового кэша, атомарная запись, opcache_invalidate()
 *  - Префикс ключей и дефолтный TTL (site.cache_prefix, site.cache_default_ttl)
 *  - Необязательная независимость от DEBUG:
 *      * ENV APP_CACHE_IGNORE_DEBUG=1
 *      * или site.cache_ignore_debug = 1 в конфиге
 *  - Мягкое логирование через Monolog (E()->logger, если есть)
 */
class Cache
{
    /** Историческая директория по умолчанию (если ничего не настроено). */
    public const CACHE_DIR = './cache/';

    /** @deprecated сохранено для совместимости. */
    public const TRANSLATIONS_KEY    = 'translations';
    public const CLASS_STRUCTURE_KEY = 'class_structure';
    public const DB_STRUCTURE_KEY    = 'db_structure';

    /** Включён ли кэш фактически. */
    private bool $enabled = false;

    /** Абсолютный путь к корню файлового кэша. */
    private string $dir;

    /** Префикс ключей (напр. env/site). */
    private string $prefix = '';

    /** Дефолтный TTL (сек). */
    private ?int $defaultTtl = null;

    /** In-memory слой на время запроса. */
    private static array $local = [];

    public function __construct()
    {
        // 1) Каталог кэша
        $cfgDir  = (string)(BaseObject::_getConfigValue('site.cache_dir') ?? '');
        $default = defined('HTDOCS_DIR') ? (HTDOCS_DIR . '/var/cache') : self::CACHE_DIR;
        $this->dir = rtrim($cfgDir !== '' ? $cfgDir : $default, '/\\') . DIRECTORY_SEPARATOR;
        if (!is_dir($this->dir)) { @mkdir($this->dir, 0777, true); }

        // 2) Опции
        $this->prefix     = (string)(BaseObject::_getConfigValue('site.cache_prefix') ?? '');
        $ttl              = BaseObject::_getConfigValue('site.cache_default_ttl');
        $this->defaultTtl = is_numeric($ttl) ? (int)$ttl : null;

        // 3) Включение кэша: учитываем флаг игнора DEBUG
        $wantCache       = (bool)BaseObject::_getConfigValue('site.cache');
        $ignoreDebugEnv  = filter_var(getenv('APP_CACHE_IGNORE_DEBUG') ?: '0', FILTER_VALIDATE_BOOL);
        $ignoreDebugConf = (bool)(BaseObject::_getConfigValue('site.cache_ignore_debug') ?? false);
        $ignoreDebug     = $ignoreDebugEnv || $ignoreDebugConf;
        $debugOn         = (bool)BaseObject::_getConfigValue('site.debug');
        $okDebug         = $ignoreDebug ? true : !$debugOn;

        // 4) Доступность хранилища
        $storageAvailable = $this->hasPsrPool() || (is_dir($this->dir) && is_writable($this->dir));

        $this->enabled = $wantCache && $okDebug && $storageAvailable;
    }

    /* ======================= ПУБЛИЧНЫЙ API ======================= */

    public function isEnabled(): bool
    {
        return $this->enabled;
    }

    public function store(string $key, mixed $value, ?int $ttlSeconds = null): bool
    {
        if (!$this->isEnabled()) return false;

        self::$local[$key] = $value;
        $ttl = $ttlSeconds ?? $this->defaultTtl;

        if ($pool = $this->getPsrPool()) {
            try {
                $item = $pool->getItem($this->normalizeKey($key));
                $item->set($value);
                if ($ttl !== null) $item->expiresAfter($ttl);
                return $pool->save($item);
            } catch (\Throwable $e) {
                $this->logWarning('Cache store via PSR failed', ['key' => $key, 'err' => $e->getMessage()]);
            }
        }

        return $this->fileStore($key, $value);
    }

    public function retrieve(string $key): mixed
    {
        if (!$this->isEnabled()) return null;

        if (array_key_exists($key, self::$local)) {
            return self::$local[$key];
        }

        if ($pool = $this->getPsrPool()) {
            try {
                $item = $pool->getItem($this->normalizeKey($key));
                if ($item->isHit()) {
                    $val = $item->get();
                    self::$local[$key] = $val;
                    return $val;
                }
            } catch (\Throwable $e) {
                $this->logWarning('Cache retrieve via PSR failed', ['key' => $key, 'err' => $e->getMessage()]);
            }
        }

        $file = $this->existingFile($key);
        if ($file === false) return null;

        try {
            /** @noinspection PhpIncludeInspection */
            $val = include $file;
            self::$local[$key] = $val;
            return $val;
        } catch (\Throwable $e) {
            $this->logWarning('Cache retrieve via file failed', ['key' => $key, 'err' => $e->getMessage()]);
            return null;
        }
    }

    public function dispose(string $key): void
    {
        unset(self::$local[$key]);

        if ($pool = $this->getPsrPool()) {
            try { $pool->deleteItem($this->normalizeKey($key)); }
            catch (\Throwable $e) { $this->logWarning('Cache dispose via PSR failed', ['key' => $key, 'err' => $e->getMessage()]); }
        }

        if ($file = $this->existingFile($key)) {
            @unlink($file);
            if (function_exists('opcache_invalidate')) { @opcache_invalidate($file, true); }
        }
    }

    public function has(string $key): bool
    {
        if (array_key_exists($key, self::$local)) return true;

        if ($pool = $this->getPsrPool()) {
            try { return $pool->getItem($this->normalizeKey($key))->isHit(); }
            catch (\Throwable) {}
        }

        return $this->existingFile($key) !== false;
    }

    public function getMultiple(array $keys): array
    {
        $out = [];
        foreach ($keys as $k) $out[$k] = $this->retrieve((string)$k);
        return $out;
    }

    public function setMultiple(array $pairs, ?int $ttl = null): bool
    {
        $ok = true;
        foreach ($pairs as $k => $v) {
            $ok = $this->store((string)$k, $v, $ttl) && $ok;
        }
        return $ok;
    }

    public function clear(): void
    {
        self::$local = [];

        if ($pool = $this->getPsrPool()) {
            try { $pool->clear(); }
            catch (\Throwable $e) { $this->logWarning('Cache clear via PSR failed', ['err' => $e->getMessage()]); }
        }

        $this->flushFiles();
        $this->flushTagsIndex();
    }

    public function remember(string $key, callable $compute, ?int $ttl = null, array $tags = []): mixed
    {
        $existing = $this->retrieve($key);
        if ($existing !== null) return $existing;

        $lockFile = $this->filePath($key) . '.lock';
        $fh = @fopen($lockFile, 'c');
        if ($fh && @flock($fh, LOCK_EX)) {
            try {
                $again = $this->retrieve($key);
                if ($again !== null) return $again;

                $value = $compute();
                if ($tags) {
                    $this->storeTagged($key, $value, $tags, $ttl);
                } else {
                    $this->store($key, $value, $ttl);
                }
                return $value;
            } finally {
                @flock($fh, LOCK_UN);
                @fclose($fh);
                @unlink($lockFile);
            }
        }

        return $this->retrieve($key);
    }

    public function storeTagged(string $key, mixed $value, array $tags, ?int $ttl = null): bool
    {
        if (!$this->isEnabled()) return false;

        self::$local[$key] = $value;
        $ttl ??= $this->defaultTtl;

        $pool = $this->getPsrPool();
        if ($pool instanceof \Symfony\Contracts\Cache\TagAwareCacheInterface) {
            try {
                $item = $pool->getItem($this->normalizeKey($key));
                $item->set($value);
                if ($ttl !== null) $item->expiresAfter($ttl);
                $item->tag($tags);
                return $pool->save($item);
            } catch (\Throwable $e) {
                $this->logWarning('Cache storeTagged via PSR failed', ['key' => $key, 'err' => $e->getMessage()]);
            }
        }

        $ok = $this->fileStore($key, $value);
        if ($ok) $this->indexTags($key, $tags);
        return $ok;
    }

    public function invalidateTags(array $tags): void
    {
        $pool = $this->getPsrPool();
        if ($pool instanceof \Symfony\Contracts\Cache\TagAwareCacheInterface) {
            try { $pool->invalidateTags($tags); return; }
            catch (\Throwable $e) { $this->logWarning('Cache invalidateTags via PSR failed', ['err' => $e->getMessage()]); }
        }

        foreach ($tags as $tag) {
            $idx = $this->tagsFile($tag);
            if (!is_file($idx)) continue;
            $keys = @json_decode((string)file_get_contents($idx), true) ?: [];
            foreach ($keys as $k) $this->dispose($k);
            @unlink($idx);
        }
    }

    public function getDirectory(): string
    {
        return $this->dir;
    }

    /* ======================= НИЗКИЙ УРОВЕНЬ ======================= */

    private function fileStore(string $key, mixed $value): bool
    {
        $file = $this->filePath($key);
        $tmp  = $file . '.' . uniqid('tmp', true);

        $payload = "<?php\nreturn " . var_export($value, true) . ";\n";

        if (@file_put_contents($tmp, $payload, LOCK_EX) === false) {
            $this->logWarning('Cache fileStore write failed', ['file' => $tmp]);
            return false;
        }
        @chmod($tmp, 0666);

        if (!@rename($tmp, $file)) {
            @unlink($file);
            if (!@rename($tmp, $file)) {
                @unlink($tmp);
                $this->logWarning('Cache fileStore rename failed', ['file' => $file]);
                return false;
            }
        }

        if (function_exists('opcache_invalidate')) { @opcache_invalidate($file, true); }
        return true;
    }

    private function getPsrPool(): ?\Psr\Cache\CacheItemPoolInterface
    {
        if (!interface_exists(\Psr\Cache\CacheItemPoolInterface::class)) return null;

        try {
            if (function_exists('E')) {
                $reg = E();
                $pool = $reg->psrCache ?? null;
                if ($pool instanceof \Psr\Cache\CacheItemPoolInterface) {
                    return $pool;
                }
            }
        } catch (\Throwable) {}

        return null;
    }

    private function hasPsrPool(): bool
    {
        return $this->getPsrPool() instanceof \Psr\Cache\CacheItemPoolInterface;
    }

    private function filePath(string $key): string
    {
        $safe = $this->normalizeKey($key);
        $hash = sha1($safe);

        $path = $this->dir . substr($hash, 0, 2) . '/' . substr($hash, 2, 2) . '/';
        if (!is_dir($path)) @mkdir($path, 0777, true);

        return $path . $safe . '.cache.php';
    }

    private function existingFile(string $key): string|false
    {
        $f = $this->filePath($key);
        return is_file($f) ? $f : false;
    }

    private function normalizeKey(string $key): string
    {
        $k = ($this->prefix !== '' ? $this->prefix . ':' : '') . $key;
        $k = preg_replace('~[^A-Za-z0-9_.:-]~', '_', $k) ?? '_';
        return strlen($k) > 150 ? substr($k, 0, 150) : $k;
    }

    private function tagsDir(): string
    {
        $dir = $this->dir . 'tags/';
        if (!is_dir($dir)) @mkdir($dir, 0777, true);
        return $dir;
    }

    private function tagsFile(string $tag): string
    {
        return $this->tagsDir() . $this->normalizeKey($tag) . '.json';
    }

    private function indexTags(string $key, array $tags): void
    {
        foreach ($tags as $tag) {
            $file = $this->tagsFile($tag);
            $list = is_file($file) ? @json_decode((string)file_get_contents($file), true) ?: [] : [];
            if (!in_array($key, $list, true)) $list[] = $key;
            @file_put_contents($file, json_encode($list), LOCK_EX);
        }
    }

    private function flushTagsIndex(): void
    {
        $dir = $this->tagsDir();
        foreach ((array)@scandir($dir) as $f) {
            if ($f === '.' || $f === '..') continue;
            @unlink($dir . $f);
        }
    }

    private function flushFiles(): void
    {
        $this->rrm($this->dir, function (string $path, bool $isFile): bool {
            if ($isFile && str_ends_with($path, '.cache.php')) {
                @unlink($path);
                if (function_exists('opcache_invalidate')) { @opcache_invalidate($path, true); }
            }
            return true;
        });
    }

    private function rrm(string $root, callable $fn): void
    {
        if (!is_dir($root)) return;

        $it = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($root, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );

        /** @var \SplFileInfo $info */
        foreach ($it as $info) {
            $path = $info->getPathname();
            if ($info->isDir()) {
                $fn($path, false);
                if (!in_array($path, [$this->dir, $this->tagsDir()], true)) {
                    @rmdir($path);
                }
            } else {
                $fn($path, true);
            }
        }
    }

    private function logWarning(string $msg, array $ctx = []): void
    {
        try {
            if (function_exists('E')) {
                $reg = E();
                if (isset($reg->logger)) {
                    $reg->logger->warning($msg, $ctx);
                }
            }
        } catch (\Throwable) {}
    }
}
