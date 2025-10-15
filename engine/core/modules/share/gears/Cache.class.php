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
        if (!is_dir($this->dir))
        {
            $this->ensureDirectoryExists($this->dir);
        }

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
        if (!$this->isEnabled())
        {
            return false;
        }

        self::$local[$key] = $value;
        $ttl = $ttlSeconds ?? $this->defaultTtl;

        if ($pool = $this->getPsrPool())
        {
            try
            {
                $item = $pool->getItem($this->normalizeKey($key));
                $item->set($value);
                if ($ttl !== null)
                {
                    $item->expiresAfter($ttl);
                }
                return $pool->save($item);
            }
            catch (\Throwable $e)
            {
                $this->logWarning('Cache store via PSR failed', ['key' => $key, 'err' => $e->getMessage()]);
            }
        }

        return $this->fileStore($key, $value);
    }

    public function retrieve(string $key): mixed
    {
        if (!$this->isEnabled())
        {
            return null;
        }

        if (array_key_exists($key, self::$local))
        {
            return self::$local[$key];
        }

        if ($pool = $this->getPsrPool())
        {
            try
            {
                $item = $pool->getItem($this->normalizeKey($key));
                if ($item->isHit())
                {
                    $val = $item->get();
                    self::$local[$key] = $val;
                    return $val;
                }
            }
            catch (\Throwable $e)
            {
                $this->logWarning('Cache retrieve via PSR failed', ['key' => $key, 'err' => $e->getMessage()]);
            }
        }

        $file = $this->existingFile($key);
        if ($file === false)
        {
            return null;
        }

        try
        {
            /** @noinspection PhpIncludeInspection */
            $val = include $file;
            self::$local[$key] = $val;
            return $val;
        }
        catch (\Throwable $e)
        {
            $this->logWarning('Cache retrieve via file failed', ['key' => $key, 'err' => $e->getMessage()]);
            return null;
        }
    }

    public function dispose(string $key): void
    {
        unset(self::$local[$key]);

        if ($pool = $this->getPsrPool())
        {
            try
            {
                $pool->deleteItem($this->normalizeKey($key));
            }
            catch (\Throwable $e)
            {
                $this->logWarning('Cache dispose via PSR failed', ['key' => $key, 'err' => $e->getMessage()]);
            }
        }

        if ($file = $this->existingFile($key))
        {
            $this->removeFile($file);
        }
    }

    public function has(string $key): bool
    {
        if (array_key_exists($key, self::$local))
        {
            return true;
        }

        if ($pool = $this->getPsrPool())
        {
            try
            {
                return $pool->getItem($this->normalizeKey($key))->isHit();
            }
            catch (\Throwable)
            {
            }
        }

        return $this->existingFile($key) !== false;
    }

    public function getMultiple(array $keys): array
    {
        $out = [];
        foreach ($keys as $k)
        {
            $out[$k] = $this->retrieve((string)$k);
        }
        return $out;
    }

    public function setMultiple(array $pairs, ?int $ttl = null): bool
    {
        $ok = true;
        foreach ($pairs as $k => $v)
        {
            $ok = $this->store((string)$k, $v, $ttl) && $ok;
        }
        return $ok;
    }

    public function clear(): void
    {
        self::$local = [];

        if ($pool = $this->getPsrPool())
        {
            try
            {
                $pool->clear();
            }
            catch (\Throwable $e)
            {
                $this->logWarning('Cache clear via PSR failed', ['err' => $e->getMessage()]);
            }
        }

        $this->flushFiles();
        $this->flushTagsIndex();
    }

    public function remember(string $key, callable $compute, ?int $ttl = null, array $tags = []): mixed
    {
        $existing = $this->retrieve($key);
        if ($existing !== null)
        {
            return $existing;
        }

        $lockFile = $this->filePath($key) . '.lock';
        [$fh, $openError] = $this->callFs(static fn () => fopen($lockFile, 'c'));
        if (!is_resource($fh))
        {
            if ($openError !== null)
            {
                $this->logWarning('Cache remember fopen failed', ['file' => $lockFile, 'err' => $openError]);
            }
            return $this->retrieve($key);
        }

        $locked = $this->runFs(static fn () => flock($fh, LOCK_EX), 'Cache remember flock failed', ['file' => $lockFile]);
        if ($locked !== true)
        {
            $this->runFs(static fn () => fclose($fh), 'Cache remember fclose failed', ['file' => $lockFile], false);
            return $this->retrieve($key);
        }

        try
        {
            $again = $this->retrieve($key);
            if ($again !== null)
            {
                return $again;
            }

            $value = $compute();
            if ($tags)
            {
                $this->storeTagged($key, $value, $tags, $ttl);
            }
            else
            {
                $this->store($key, $value, $ttl);
            }
            return $value;
        }
        finally
        {
            $this->runFs(static fn () => flock($fh, LOCK_UN), 'Cache remember unlock failed', ['file' => $lockFile], false);
            $this->runFs(static fn () => fclose($fh), 'Cache remember fclose failed', ['file' => $lockFile], false);
            if (is_file($lockFile))
            {
                $this->runFs(static fn () => unlink($lockFile), 'Cache remember unlink lock failed', ['file' => $lockFile]);
            }
        }

        return $this->retrieve($key);
    }

    public function storeTagged(string $key, mixed $value, array $tags, ?int $ttl = null): bool
    {
        if (!$this->isEnabled())
        {
            return false;
        }

        self::$local[$key] = $value;
        $ttl ??= $this->defaultTtl;

        $pool = $this->getPsrPool();
        if ($pool instanceof \Symfony\Contracts\Cache\TagAwareCacheInterface)
        {
            try
            {
                $item = $pool->getItem($this->normalizeKey($key));
                $item->set($value);
                if ($ttl !== null)
                {
                    $item->expiresAfter($ttl);
                }
                $item->tag($tags);
                return $pool->save($item);
            }
            catch (\Throwable $e)
            {
                $this->logWarning('Cache storeTagged via PSR failed', ['key' => $key, 'err' => $e->getMessage()]);
            }
        }

        $ok = $this->fileStore($key, $value);
        if ($ok)
        {
            $this->indexTags($key, $tags);
        }
        return $ok;
    }

    public function invalidateTags(array $tags): void
    {
        $pool = $this->getPsrPool();
        if ($pool instanceof \Symfony\Contracts\Cache\TagAwareCacheInterface)
        {
            try
            {
                $pool->invalidateTags($tags);
                return;
            }
            catch (\Throwable $e)
            {
                $this->logWarning('Cache invalidateTags via PSR failed', ['err' => $e->getMessage()]);
            }
        }

        foreach ($tags as $tag)
        {
            $idx = $this->tagsFile($tag);
            if (!is_file($idx))
            {
                continue;
            }
            $keys = json_decode((string)file_get_contents($idx), true) ?: [];
            foreach ($keys as $k)
            {
                $this->dispose($k);
            }
            if (is_file($idx))
            {
                $this->runFs(static fn () => unlink($idx), 'Cache unlink tag index failed', ['file' => $idx]);
            }
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

        [$written, $writeError] = $this->callFs(static fn () => file_put_contents($tmp, $payload, LOCK_EX));
        if ($written === false)
        {
            $ctx = ['file' => $tmp];
            if ($writeError !== null)
            {
                $ctx['err'] = $writeError;
            }
            $this->logWarning('Cache fileStore write failed', $ctx);
            return false;
        }

        if (is_file($tmp))
        {
            $this->runFs(static fn () => chmod($tmp, 0666), 'Cache fileStore chmod failed', ['file' => $tmp], false);
        }

        if ($this->runFs(static fn () => rename($tmp, $file), 'Cache fileStore rename failed', ['tmp' => $tmp, 'file' => $file]) === false)
        {
            if (is_file($file))
            {
                $this->runFs(static fn () => unlink($file), 'Cache unlink failed before rename', ['file' => $file]);
            }
            if ($this->runFs(static fn () => rename($tmp, $file), 'Cache fileStore rename failed', ['tmp' => $tmp, 'file' => $file]) === false)
            {
                if (is_file($tmp))
                {
                    $this->runFs(static fn () => unlink($tmp), 'Cache tmp cleanup failed', ['file' => $tmp]);
                }
                return false;
            }
        }

        if (function_exists('opcache_invalidate'))
        {
            $this->runFs(static fn () => opcache_invalidate($file, true), 'Cache opcache invalidate failed', ['file' => $file], false);
        }
        return true;
    }

    private function getPsrPool(): ?\Psr\Cache\CacheItemPoolInterface
    {
        if (!interface_exists(\Psr\Cache\CacheItemPoolInterface::class))
        {
            return null;
        }

        try
        {
            if (function_exists('E'))
            {
                $reg = E();
                $pool = $reg->psrCache ?? null;
                if ($pool instanceof \Psr\Cache\CacheItemPoolInterface)
                {
                    return $pool;
                }
            }
        }
        catch (\Throwable)
        {
        }

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
        if (!is_dir($path))
        {
            $this->ensureDirectoryExists($path);
        }

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
        if (!is_dir($dir))
        {
            $this->ensureDirectoryExists($dir);
        }
        return $dir;
    }

    private function tagsFile(string $tag): string
    {
        return $this->tagsDir() . $this->normalizeKey($tag) . '.json';
    }

    private function indexTags(string $key, array $tags): void
    {
        foreach ($tags as $tag)
        {
            $file = $this->tagsFile($tag);
            $list = is_file($file) ? (json_decode((string)file_get_contents($file), true) ?: []) : [];
            if (!in_array($key, $list, true))
            {
                $list[] = $key;
            }
            [$written, $writeError] = $this->callFs(static fn () => file_put_contents($file, json_encode($list), LOCK_EX));
            if ($written === false)
            {
                $ctx = ['file' => $file];
                if ($writeError !== null)
                {
                    $ctx['err'] = $writeError;
                }
                $this->logWarning('Cache indexTags write failed', $ctx);
            }
        }
    }

    private function flushTagsIndex(): void
    {
        $dir = $this->tagsDir();
        $items = $this->runFs(static fn () => scandir($dir), 'Cache flushTagsIndex scandir failed', ['dir' => $dir]);
        if (!is_array($items))
        {
            return;
        }
        foreach ($items as $f)
        {
            if ($f === '.' || $f === '..')
            {
                continue;
            }
            $path = $dir . $f;
            if (is_file($path))
            {
                $this->runFs(static fn () => unlink($path), 'Cache flushTagsIndex unlink failed', ['file' => $path]);
            }
        }
    }

    private function flushFiles(): void
    {
        $this->rrm($this->dir, function (string $path, bool $isFile): bool
        {
            if ($isFile && str_ends_with($path, '.cache.php'))
            {
                $this->removeFile($path);
            }
            return true;
        });
    }

    private function rrm(string $root, callable $fn): void
    {
        if (!is_dir($root))
        {
            return;
        }

        $it = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($root, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );

        $tagsRoot = $this->tagsDir();

        /** @var \SplFileInfo $info */
        foreach ($it as $info)
        {
            $path = $info->getPathname();
            if ($info->isDir())
            {
                $fn($path, false);
                if (!in_array($path, [$this->dir, $tagsRoot], true))
                {
                    $this->runFs(static fn () => rmdir($path), 'Cache rmdir failed', ['dir' => $path]);
                }
            }
            else
            {
                $fn($path, true);
            }
        }
    }

    private function ensureDirectoryExists(string $dir): bool
    {
        if (is_dir($dir))
        {
            return true;
        }

        [$result, $error] = $this->callFs(static fn (): bool => mkdir($dir, 0777, true));
        if ($result === false && !is_dir($dir))
        {
            $ctx = ['dir' => $dir];
            if ($error !== null)
            {
                $ctx['err'] = $error;
            }
            $this->logWarning('Cache directory create failed', $ctx);
            return false;
        }

        return true;
    }

    private function removeFile(string $file): void
    {
        if (!is_file($file))
        {
            return;
        }

        $this->runFs(static fn (): bool => unlink($file), 'Cache unlink failed', ['file' => $file]);
        if (function_exists('opcache_invalidate'))
        {
            $this->runFs(static fn (): bool => opcache_invalidate($file, true), 'Cache opcache invalidate failed', ['file' => $file], false);
        }
    }

    /**
     * @return array{0:mixed,1:?string}
     */
    private function callFs(callable $operation): array
    {
        $result = null;
        $error  = null;

        set_error_handler(static function (int $severity, string $message, string $file = '', int $line = 0): bool
        {
            throw new \ErrorException($message, 0, $severity, $file, $line);
        });

        try
        {
            $result = $operation();
        }
        catch (\ErrorException $e)
        {
            $result = false;
            $error  = $e->getMessage();
        }
        finally
        {
            restore_error_handler();
        }

        return [$result, $error];
    }

    private function runFs(callable $operation, string $message, array $context = [], bool $logWhenFalseWithoutError = true): mixed
    {
        [$result, $error] = $this->callFs($operation);
        if ($result === false)
        {
            if ($error !== null)
            {
                $context['err'] = $error;
            }
            if ($error !== null || $logWhenFalseWithoutError)
            {
                $this->logWarning($message, $context);
            }
        }

        return $result;
    }

    private function logWarning(string $msg, array $ctx = []): void
    {
        try
        {
            if (function_exists('E'))
            {
                $reg = E();
                if (isset($reg->logger))
                {
                    $reg->logger->warning($msg, $ctx);
                }
            }
        }
        catch (\Throwable)
        {
        }
    }
}
