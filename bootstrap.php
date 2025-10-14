<?php
declare(strict_types=1);

use Doctrine\DBAL\Connection;
use Doctrine\DBAL\DriverManager;
use Monolog\Handler\StreamHandler;
use Monolog\Level as MonologLevel;
use Monolog\Logger as MonologLogger;
use Psr\Log\LoggerInterface;
use Symfony\Component\Cache\Adapter\ApcuAdapter;
use Symfony\Component\Cache\Adapter\FilesystemAdapter;
use Symfony\Component\Cache\Adapter\RedisAdapter;
use Symfony\Component\Cache\Adapter\TagAwareAdapter;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\ContainerInterface as SymfonyContainerInterface;
use Symfony\Component\DependencyInjection\Definition;
use Symfony\Component\DependencyInjection\Dumper\PhpDumper;
use Symfony\Component\DependencyInjection\Reference;
use Symfony\Component\Translation\Translator;
use Symfony\Contracts\Cache\TagAwareCacheInterface;
use Symfony\Contracts\Translation\TranslatorInterface;
use Symfony\Component\Validator\Validation;
use Symfony\Component\Validator\Validator\ValidatorInterface as SymfonyValidatorInterface;

/**
 * Bootstrap: вычисляет пути ядра/сайта, подключает setup при необходимости
 * и инициализирует ядро. Совместимо с PHP 8.3 + Composer.
 */

// 0) (не обязательно) подхватим autoload, если index.php не сделал этого
$autoload = __DIR__ . '/vendor/autoload.php';
if (is_file($autoload)) {
    require_once $autoload;
}

// 1) Конфиг
$configPath = __DIR__ . '/system.config.php';
if (!is_file($configPath)) {
    throw new LogicException('Не найден конфигурационный файл system.config.php.');
}
$config = include $configPath;
if (!is_array($config)) {
    throw new LogicException('system.config.php должен возвращать массив конфигурации.');
}
if (!array_key_exists('setup_dir', $config)) {
    throw new LogicException('Не указана секция setup_dir в system.config.php.');
}

$siteCfg  = $config['site'] ?? [];
$siteRoot = (string)($siteCfg['root'] ?? '/');

// 2) Пути
define('HTDOCS_DIR', __DIR__);

// можно переопределить через уже объявленные константы, ENV или конфиг
$CORE_REL = defined('CORE_REL_DIR') ? CORE_REL_DIR : (getenv('CORE_REL_DIR') ?: ($config['core_rel_dir'] ?? 'core'));
$SITE_REL = defined('SITE_REL_DIR') ? SITE_REL_DIR : (getenv('SITE_REL_DIR') ?: ($config['site_rel_dir'] ?? 'site'));

if (!defined('CORE_REL_DIR')) define('CORE_REL_DIR', (string)$CORE_REL);
if (!defined('SITE_REL_DIR')) define('SITE_REL_DIR', (string)$SITE_REL);

$CORE_DIR = realpath(HTDOCS_DIR . DIRECTORY_SEPARATOR . CORE_REL_DIR) ?: HTDOCS_DIR . DIRECTORY_SEPARATOR . CORE_REL_DIR;
$SITE_DIR = realpath(HTDOCS_DIR . DIRECTORY_SEPARATOR . SITE_REL_DIR) ?: HTDOCS_DIR . DIRECTORY_SEPARATOR . SITE_REL_DIR;

if (!is_dir($CORE_DIR)) {
    throw new LogicException(sprintf('CORE_DIR не найден: %s', $CORE_DIR));
}
if (!is_dir($SITE_DIR)) {
    throw new LogicException(sprintf('SITE_DIR не найден: %s', $SITE_DIR));
}

define('CORE_DIR', $CORE_DIR);
define('SITE_DIR', $SITE_DIR);

// 3) Папка setup
$setupDir = $config['setup_dir'];
if (!is_string($setupDir) || $setupDir === '') {
    throw new LogicException('В system.config.php setup_dir должен быть непустой строкой.');
}
if (!str_starts_with($setupDir, DIRECTORY_SEPARATOR)) {
    // относительные пути считаем относительно HTDOCS_DIR
    $setupDir = HTDOCS_DIR . DIRECTORY_SEPARATOR . $setupDir;
}
$setupDirReal = realpath($setupDir) ?: $setupDir;
if (!is_dir($setupDirReal)) {
    throw new LogicException(sprintf('Каталог setup не найден: %s', $setupDirReal));
}
define('SETUP_DIR', $setupDirReal);

// 4) DEBUG (ENV имеет приоритет над конфигом)
$debugCfg = (bool)($siteCfg['debug'] ?? false);
$debugEnv = filter_var(getenv('APP_DEBUG') ?: '0', FILTER_VALIDATE_BOOL);
if (!defined('DEBUG')) {
    define('DEBUG', $debugEnv ? true : $debugCfg);
}

// 5) Переход в установщик (/setup или CLI "setup")
$normRoot  = '/' . ltrim($siteRoot, '/');              // гарантируем ведущий слэш
$setupPath = rtrim($normRoot, '/') . '/setup';

$isSetup = (PHP_SAPI === 'cli' && (($argv[1] ?? null) === 'setup'))
    || (isset($_SERVER['REQUEST_URI']) && str_starts_with($_SERVER['REQUEST_URI'], $setupPath));

if ($isSetup) {
    require_once SETUP_DIR . DIRECTORY_SEPARATOR . 'index.php';
    exit;
}

// 6) Инициализация ядра
$iniPath = CORE_DIR . '/modules/share/gears/ini.func.php';
if (!is_file($iniPath)) {
    throw new LogicException('Ядро не подключено. Необходимо запустить setup.');
}
require_once $iniPath;

$utilsPath = CORE_DIR . '/modules/share/gears/utils.func.php';
if (is_file($utilsPath)) {
    require_once $utilsPath;
}

/* === Whoops: красивые страницы ошибок/трейсы (HTML/JSON/XML) в DEV ===
 * Требуется: composer require filp/whoops --dev
 * Регистрация идёт после ini.func.php, чтобы перехватывать ошибки/исключения проекта.
 */
// --- DEV error pages: Whoops (HTML или JSON; БЕЗ $_GET) ---
if ((defined('DEBUG') && DEBUG) && class_exists(\Whoops\Run::class)) {
    $whoops = new \Whoops\Run();

    if (PHP_SAPI === 'cli') {
        // CLI — текстовый трейс
        $whoops->pushHandler(new \Whoops\Handler\PlainTextHandler());
    } else {
        // Детекция: JSON если XHR или Accept просит JSON; иначе HTML
        $accept   = strtolower((string)($_SERVER['HTTP_ACCEPT'] ?? ''));
        $isXHR    = strtolower((string)($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '')) === 'xmlhttprequest';
        $wantsJson = $isXHR
            || str_contains($accept, 'application/json')
            || str_contains($accept, '+json');

        if ($wantsJson) {
            $jsonHandler = new \Whoops\Handler\JsonResponseHandler();
            // если в вашей версии есть метод ->setJsonApi(true), можно включить JSON:API
            // if (method_exists($jsonHandler, 'setJsonApi')) { $jsonHandler->setJsonApi(true); }
            $whoops->pushHandler($jsonHandler);
        } else {
            $pretty = new \Whoops\Handler\PrettyPageHandler();
            $pretty->setPageTitle('💥 Uncaught Exception');
            $pretty->addDataTable('Request', [
                'URI'     => (string)($_SERVER['REQUEST_URI'] ?? ''),
                'Method'  => (string)($_SERVER['REQUEST_METHOD'] ?? ''),
                'IP'      => (string)($_SERVER['REMOTE_ADDR'] ?? ''),
                'Referer' => (string)($_SERVER['HTTP_REFERER'] ?? ''),
                'Agent'   => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
            ]);
            $whoops->pushHandler($pretty);
        }
    }

    $whoops->register();
}

// 7) Передаём конфиг в ядро (если метод доступен)
if (class_exists('BaseObject') && method_exists('BaseObject', 'setConfigArray')) {
    BaseObject::setConfigArray($config);
}

$reg  = E();
$feat = $config['features'] ?? [];
$docRoot = rtrim($_SERVER['DOCUMENT_ROOT'] ?? HTDOCS_DIR, '/');

$monologLevelResolver = static function (string $name): ?MonologLevel {
    if (!class_exists(MonologLevel::class)) {
        return null;
    }

    try {
        return MonologLevel::fromName(strtoupper($name));
    } catch (\Throwable $e) {
        return MonologLevel::Debug;
    }
};

// --- DI (Symfony DependencyInjection) ---
if (!empty($feat['symfony_di']) && class_exists(ContainerBuilder::class)) {
    $sfCfg      = $config['symfony_di'] ?? [];
    $cacheFile  = (string)($sfCfg['cache_file'] ?? ($docRoot . '/var/cache/symfony_container.php'));
    $cacheClass = (string)($sfCfg['cache_class'] ?? 'CachedAppContainer');
    $sfContainer = null;

    if (!empty($sfCfg['compile']) && is_file($cacheFile)) {
        require_once $cacheFile;
        if (class_exists($cacheClass)) {
            $candidate = new $cacheClass();
            if ($candidate instanceof SymfonyContainerInterface) {
                $sfContainer = $candidate;
            }
        }
    }

    if (!$sfContainer instanceof SymfonyContainerInterface) {
        $builder = new ContainerBuilder();
        $builder->setParameter('app.config', $config);
        $builder->setParameter('app.doc_root', $docRoot);
        $builder->setParameter('app.env', $config['env']['name'] ?? null);

        if (!empty($config['logger']['enabled']) && class_exists(MonologLogger::class)) {
            $loggerDef = new Definition(MonologLogger::class);
            $loggerDef->setArgument(0, $config['logger']['channel'] ?? 'app');
            $loggerDef->setPublic(true);
            foreach (($config['logger']['handlers'] ?? []) as $idx => $handler) {
                if (($handler['type'] ?? '') !== 'stream' || empty($handler['path'])) {
                    continue;
                }

                $levelName = (string)($handler['level'] ?? ($config['logger']['level'] ?? 'debug'));
                $level     = $monologLevelResolver($levelName) ?? MonologLevel::Debug;

                $handlerDef = new Definition(StreamHandler::class);
                $handlerDef->setArguments([
                    $handler['path'],
                    $level,
                    (bool)($handler['bubble'] ?? true),
                ]);
                $handlerDef->setPublic(true);

                $handlerId = 'logger.handler.' . $idx;
                $builder->setDefinition($handlerId, $handlerDef);
                $loggerDef->addMethodCall('pushHandler', [new Reference($handlerId)]);
            }

            $builder->setDefinition('logger', $loggerDef);
            $builder->setAlias(LoggerInterface::class, 'logger')->setPublic(true);
        }

        if (!empty($config['cache2']) && interface_exists(TagAwareCacheInterface::class)) {
            $c2       = $config['cache2'];
            $ns       = (string)($c2['namespace'] ?? 'app');
            $ttl      = (int)($c2['default_ttl'] ?? 3600);
            $adapter  = strtolower((string)($c2['adapter'] ?? 'filesystem'));
            $poolId   = 'cache.pool';
            $poolDef  = null;

            switch ($adapter) {
                case 'redis':
                    $connId   = 'cache.redis.connection';
                    $connDef  = new Definition(\Redis::class);
                    $connDef->setFactory([RedisAdapter::class, 'createConnection']);
                    $connDef->setArguments([$c2['redis_dsn'] ?? 'redis://127.0.0.1:6379']);
                    $connDef->setPublic(true);
                    $builder->setDefinition($connId, $connDef);

                    $poolDef = new Definition(RedisAdapter::class);
                    $poolDef->setArguments([new Reference($connId), $ns, $ttl]);
                    break;

                case 'apcu':
                    $poolDef = new Definition(ApcuAdapter::class);
                    $poolDef->setArguments([$ns, $ttl]);
                    break;

                default:
                    $dir    = (string)($c2['directory'] ?? ($docRoot . '/var/cache'));
                    $poolDef = new Definition(FilesystemAdapter::class);
                    $poolDef->setArguments([$ns, $ttl, $dir]);
                    break;
            }

            if ($poolDef instanceof Definition) {
                $poolDef->setPublic(true);
                $builder->setDefinition($poolId, $poolDef);

                $tagDef = new Definition(TagAwareAdapter::class);
                $tagDef->setArguments([new Reference($poolId)]);
                $tagDef->setPublic(true);
                $builder->setDefinition('cache.tag_aware', $tagDef);

                $builder->setAlias(TagAwareCacheInterface::class, 'cache.tag_aware')->setPublic(true);
            }
        }

        if (!empty($feat['dbal']) && class_exists(DriverManager::class)) {
            $d  = $config['dbal'] ?? [];
            $db = [
                'driver'   => $d['driver']   ?? 'pdo_mysql',
                'host'     => $d['host']     ?? $config['database']['host'],
                'port'     => $d['port']     ?? (int)$config['database']['port'],
                'dbname'   => $d['dbname']   ?? $config['database']['db'],
                'user'     => $d['user']     ?? $config['database']['username'],
                'password' => $d['password'] ?? $config['database']['password'],
                'charset'  => $d['charset']  ?? 'utf8mb4',
            ];

            $connDef = new Definition(Connection::class);
            $connDef->setFactory([DriverManager::class, 'getConnection']);
            $connDef->setArguments([$db]);
            $connDef->setPublic(true);

            $builder->setDefinition('dbal.connection', $connDef);
            $builder->setAlias(Connection::class, 'dbal.connection')->setPublic(true);
        }

        if (!empty($feat['translation']) && class_exists(Translator::class)) {
            $i18n   = $config['i18n'] ?? [];
            $locale = (string)($i18n['default_locale'] ?? 'uk');

            $translatorDef = new Definition(Translator::class);
            $translatorDef->setArgument(0, $locale);
            $translatorDef->setPublic(true);
            $translatorDef->addMethodCall('addLoader', ['array', new Definition(\Symfony\Component\Translation\Loader\ArrayLoader::class)]);

            foreach (($i18n['resources'] ?? []) as $res) {
                if (!is_file($res['file'] ?? '')) {
                    continue;
                }

                $messages = include $res['file'];
                if (!is_array($messages)) {
                    continue;
                }

                $translatorDef->addMethodCall('addResource', [
                    'array',
                    $messages,
                    (string)($res['locale'] ?? $locale),
                    (string)($res['domain'] ?? 'messages'),
                ]);
            }

            if (!empty($i18n['fallbacks'])) {
                $translatorDef->addMethodCall('setFallbackLocales', [$i18n['fallbacks']]);
            }

            $builder->setDefinition('translator', $translatorDef);
            $builder->setAlias(TranslatorInterface::class, 'translator')->setPublic(true);
        }

        if (!empty($feat['validator']) && class_exists(Validation::class)) {
            $validatorDef = new Definition(SymfonyValidatorInterface::class);
            $validatorDef->setFactory([Validation::class, 'createValidator']);
            $validatorDef->setPublic(true);

            $builder->setDefinition('validator', $validatorDef);
            $builder->setAlias(SymfonyValidatorInterface::class, 'validator')->setPublic(true);
        }

        $servicesFile = $sfCfg['services'] ?? (HTDOCS_DIR . '/app/config/services.php');
        if (is_string($servicesFile) && is_file($servicesFile)) {
            $servicesConfigurator = require $servicesFile;
            if (is_callable($servicesConfigurator)) {
                $servicesConfigurator($builder, $config);
            }
        }

        $builder->compile(true);

        if (!empty($sfCfg['compile'])) {
            $cacheDir = dirname($cacheFile);
            if (!is_dir($cacheDir) && !mkdir($cacheDir, 0777, true) && !is_dir($cacheDir)) {
                throw new \RuntimeException('Unable to create Symfony DI cache directory: ' . $cacheDir);
            }

            $dumper = new PhpDumper($builder);
            $dump   = $dumper->dump(['class' => $cacheClass]);
            if (file_put_contents($cacheFile, $dump) === false) {
                throw new \RuntimeException('Unable to write Symfony DI cache file: ' . $cacheFile);
            }

            require_once $cacheFile;
            if (class_exists($cacheClass)) {
                $candidate = new $cacheClass();
                if ($candidate instanceof SymfonyContainerInterface) {
                    $sfContainer = $candidate;
                }
            }
        }

        if (!$sfContainer instanceof SymfonyContainerInterface) {
            $sfContainer = $builder;
        }
    }

    if ($sfContainer instanceof SymfonyContainerInterface) {
        $reg->symfonyContainer = $sfContainer;

        if (!isset($reg->logger) && $sfContainer->has(LoggerInterface::class)) {
            $reg->logger = $sfContainer->get(LoggerInterface::class);
        }

        if (!isset($reg->psrCache) && $sfContainer->has(TagAwareCacheInterface::class)) {
            $reg->psrCache = $sfContainer->get(TagAwareCacheInterface::class);
        }

        if (!isset($reg->dbal) && $sfContainer->has(Connection::class)) {
            $reg->dbal = $sfContainer->get(Connection::class);
        }

        if (!isset($reg->translator) && $sfContainer->has(TranslatorInterface::class)) {
            $reg->translator = $sfContainer->get(TranslatorInterface::class);
        }

        if (!isset($reg->validator) && $sfContainer->has(SymfonyValidatorInterface::class)) {
            $reg->validator = $sfContainer->get(SymfonyValidatorInterface::class);
        }
    }
}

// --- DI (php-di) ---
if (!empty($feat['di']) && class_exists(\DI\ContainerBuilder::class)) {
    $diCfg = $config['di'] ?? [];
    $cb = new \DI\ContainerBuilder();
    if (!empty($diCfg['compile'])) {
        $cb->enableCompilation($diCfg['cache_dir'] ?? ($docRoot.'/var/cache/di'));
        $cb->writeProxiesToFile(true, $diCfg['proxy_dir'] ?? ($docRoot.'/var/cache/di/proxies'));
    }
    if (!empty($diCfg['definitions']) && is_file($diCfg['definitions'])) {
        (require $diCfg['definitions'])($cb);
    }
    $reg->container = $cb->build();
}

// --- Logger (Monolog) ---
if (!isset($reg->logger) && !empty($config['logger']['enabled']) && class_exists(MonologLogger::class)) {
    $levelMap = [
        'debug' => MonologLevel::Debug,
        'info' => MonologLevel::Info,
        'notice' => MonologLevel::Notice,
        'warning' => MonologLevel::Warning,
        'error' => MonologLevel::Error,
        'critical' => MonologLevel::Critical,
        'alert' => MonologLevel::Alert,
        'emergency' => MonologLevel::Emergency,
    ];

    $logger = new MonologLogger($config['logger']['channel'] ?? 'app');
    foreach (($config['logger']['handlers'] ?? []) as $handler) {
        if (($handler['type'] ?? '') !== 'stream' || empty($handler['path'])) {
            continue;
        }

        $lvl = $levelMap[strtolower((string)($handler['level'] ?? 'debug'))] ?? MonologLevel::Debug;
        $logger->pushHandler(new StreamHandler($handler['path'], $lvl, (bool)($handler['bubble'] ?? true)));
    }

    $reg->logger = $logger;
}

// --- Cache (Symfony Cache TagAware) ---
if (!isset($reg->psrCache) && !empty($config['cache2']) && interface_exists(TagAwareCacheInterface::class)) {
    $c2  = $config['cache2'];
    $ns  = $c2['namespace'] ?? 'app';
    $ttl = (int)($c2['default_ttl'] ?? 3600);

    switch (strtolower((string)($c2['adapter'] ?? 'filesystem'))) {
        case 'redis':
            $redis = new \Redis();
            $dsn   = parse_url($c2['redis_dsn'] ?? 'redis://127.0.0.1:6379');
            $redis->connect($dsn['host'] ?? '127.0.0.1', (int)($dsn['port'] ?? 6379));
            $pool  = new RedisAdapter($redis, $ns, $ttl);
            break;

        case 'apcu':
            $pool = new ApcuAdapter($ns, $ttl);
            break;

        default:
            $dir  = $c2['directory'] ?? ($docRoot . '/var/cache');
            $pool = new FilesystemAdapter($ns, $ttl, $dir);
            break;
    }

    $reg->psrCache = new TagAwareAdapter($pool);
}

// --- File cache fallback (если PSR-пул не задан) ---
$wantCache = (bool)($config['site']['cache'] ?? 0);

$ignoreDebugEnv  = filter_var(getenv('APP_CACHE_IGNORE_DEBUG') ?: '0', FILTER_VALIDATE_BOOL);
$ignoreDebugConf = (bool)($config['site']['cache_ignore_debug'] ?? 0);
$ignoreDebug     = $ignoreDebugEnv || $ignoreDebugConf;

$debugOn = (bool)($config['site']['debug'] ?? 0);
$okDebug = $ignoreDebug ? true : !$debugOn;

if ($wantCache && $okDebug && empty($reg->psrCache)) {
    $docRoot  = rtrim($_SERVER['DOCUMENT_ROOT'] ?? HTDOCS_DIR, '/');
    $cacheDir = rtrim((string)($config['site']['cache_dir'] ?? ($docRoot . '/var/cache')), '/');

    $fsCall = static function (callable $operation): array {
        $result = null;
        $error  = null;

        set_error_handler(static function (int $severity, string $message, string $file = '', int $line = 0): bool {
            throw new \ErrorException($message, 0, $severity, $file, $line);
        });

        try {
            $result = $operation();
        } catch (\ErrorException $e) {
            $result = false;
            $error  = $e->getMessage();
        } finally {
            restore_error_handler();
        }

        return [$result, $error];
    };

    if (!is_dir($cacheDir)) {
        [$created, $error] = $fsCall(static fn(): bool => mkdir($cacheDir, 0777, true));
        if ($created === false && !is_dir($cacheDir)) {
            $details = $error ? ' (' . $error . ')' : '';
            throw new \RuntimeException('Unable to create cache directory: ' . $cacheDir . $details);
        }
    }

    $tagsDir = $cacheDir . '/tags';
    if (!is_dir($tagsDir)) {
        [$createdTags, $tagsError] = $fsCall(static fn(): bool => mkdir($tagsDir, 0777, true));
        if ($createdTags === false && !is_dir($tagsDir)) {
            $details = $tagsError ? ' (' . $tagsError . ')' : '';
            throw new \RuntimeException('Unable to create cache tags directory: ' . $tagsDir . $details);
        }
    }

    $gi = $cacheDir . '/.gitignore';
    if (!is_file($gi)) {
        [$written, $writeError] = $fsCall(static fn() => file_put_contents($gi, "*\n!.gitignore\n"));
        if ($written === false) {
            $details = $writeError ? ' (' . $writeError . ')' : '';
            throw new \RuntimeException('Unable to write cache gitignore file: ' . $gi . $details);
        }
    }

    // обновим рантайм-конфиг, чтобы Cache увидел директорию
    $config['site']['cache_dir'] = $cacheDir;
    if (class_exists('BaseObject') && method_exists('BaseObject', 'setConfigArray')) {
        BaseObject::setConfigArray($config);
    }

    if (isset($reg->logger)) {
        $reg->logger->info('Using FILE cache fallback (no PSR cache configured).', [
            'dir'         => $cacheDir,
            'debug_on'    => $debugOn,
            'ignore_debug'=> $ignoreDebug,
        ]);
    }
}

// --- DBAL (опционально) ---
if (!isset($reg->dbal) && !empty($feat['dbal']) && class_exists(DriverManager::class)) {
    $d  = $config['dbal'] ?? [];
    $db = [
        'driver'   => $d['driver']   ?? 'pdo_mysql',
        'host'     => $d['host']     ?? $config['database']['host'],
        'port'     => $d['port']     ?? (int)$config['database']['port'],
        'dbname'   => $d['dbname']   ?? $config['database']['db'],
        'user'     => $d['user']     ?? $config['database']['username'],
        'password' => $d['password'] ?? $config['database']['password'],
        'charset'  => $d['charset']  ?? 'utf8mb4',
    ];
    $reg->dbal = DriverManager::getConnection($db);
}

// --- HttpFoundation как «двигатель» Ваших Request/Response ---
if (!empty($feat['http_foundation']) && class_exists(\Symfony\Component\HttpFoundation\Request::class)) {
//    $reg->Request  = \App\Bridge\Http\LegacyRequest::fromGlobals();
//    $reg->Response = new \App\Bridge\Http\LegacyResponse();
}

// --- Translation ---
if (!isset($reg->translator) && !empty($feat['translation']) && class_exists(Translator::class)) {
    $i18n    = $config['i18n'] ?? [];
    $locale  = $i18n['default_locale'] ?? 'uk';
    $translator = new Translator($locale);
    $translator->addLoader('array', new \Symfony\Component\Translation\Loader\ArrayLoader());
    foreach (($i18n['resources'] ?? []) as $res) {
        if (is_file($res['file'] ?? '')) {
            $messages = include $res['file'];
            $translator->addResource('array', $messages, $res['locale'] ?? $locale, $res['domain'] ?? 'messages');
        }
    }
    if (!empty($i18n['fallbacks'])) {
        $translator->setFallbackLocales($i18n['fallbacks']);
    }
    $reg->translator = $translator;
}

// --- Validator ---
if (!isset($reg->validator) && !empty($feat['validator']) && class_exists(Validation::class)) {
    $reg->validator = Validation::createValidator();
}
