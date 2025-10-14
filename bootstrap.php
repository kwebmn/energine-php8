<?php
declare(strict_types=1);

use DI\ContainerBuilder as PhpDiContainerBuilder;
use Doctrine\DBAL\Connection;
use Doctrine\DBAL\DriverManager;
use Monolog\Handler\StreamHandler;
use Monolog\Level as MonologLevel;
use Monolog\Logger as MonologLogger;
use Psr\Container\ContainerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Cache\Adapter\ApcuAdapter;
use Symfony\Component\Cache\Adapter\FilesystemAdapter;
use Symfony\Component\Cache\Adapter\RedisAdapter;
use Symfony\Component\Cache\Adapter\TagAwareAdapter;
use Symfony\Component\Translation\Loader\ArrayLoader as SymfonyArrayLoader;
use Symfony\Component\Translation\Translator;
use Symfony\Component\Validator\Validation;
use Symfony\Component\Validator\Validator\ValidatorInterface as SymfonyValidatorInterface;
use Symfony\Contracts\Cache\TagAwareCacheInterface;
use Symfony\Contracts\Translation\TranslatorInterface;

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

// --- DI (PHP-DI) ---
$container = null;
if (class_exists(PhpDiContainerBuilder::class)) {
    $diCfg = $config['di'] ?? [];
    $cb    = new PhpDiContainerBuilder();

    if (!empty($diCfg['compile'])) {
        $cb->enableCompilation($diCfg['cache_dir'] ?? ($docRoot . '/var/cache/di'));
        $cb->writeProxiesToFile(true, $diCfg['proxy_dir'] ?? ($docRoot . '/var/cache/di/proxies'));
    }

    $baseDefinitions = [
        'config'      => $config,
        'app.docRoot' => $docRoot,
        'app.env'     => $config['env']['name'] ?? null,
        Registry::class => $reg,
        'registry'      => $reg,
    ];

    $serviceDefinitions = [];

    if (!empty($config['logger']['enabled']) && class_exists(MonologLogger::class)) {
        $serviceDefinitions[LoggerInterface::class] = static function (ContainerInterface $c) use ($monologLevelResolver): LoggerInterface {
            $cfg     = $c->get('config');
            $logCfg  = $cfg['logger'] ?? [];
            $channel = (string)($logCfg['channel'] ?? 'app');
            $logger  = new MonologLogger($channel);

            foreach (($logCfg['handlers'] ?? []) as $handler) {
                if (($handler['type'] ?? '') !== 'stream' || empty($handler['path'])) {
                    continue;
                }

                $levelName = (string)($handler['level'] ?? ($logCfg['level'] ?? 'debug'));
                $level     = $monologLevelResolver($levelName) ?? MonologLevel::Debug;
                $logger->pushHandler(new StreamHandler($handler['path'], $level, (bool)($handler['bubble'] ?? true)));
            }

            return $logger;
        };
    }

    if (!empty($config['cache2']) && interface_exists(TagAwareCacheInterface::class)) {
        $serviceDefinitions[TagAwareCacheInterface::class] = static function (ContainerInterface $c): TagAwareCacheInterface {
            $cfg = $c->get('config');
            $c2  = $cfg['cache2'];
            $ns  = (string)($c2['namespace'] ?? 'app');
            $ttl = (int)($c2['default_ttl'] ?? 3600);

            switch (strtolower((string)($c2['adapter'] ?? 'filesystem'))) {
                case 'redis':
                    $redis = RedisAdapter::createConnection($c2['redis_dsn'] ?? 'redis://127.0.0.1:6379');
                    $pool  = new RedisAdapter($redis, $ns, $ttl);
                    break;

                case 'apcu':
                    $pool = new ApcuAdapter($ns, $ttl);
                    break;

                default:
                    $docRoot = (string)($c->has('app.docRoot') ? $c->get('app.docRoot') : HTDOCS_DIR);
                    $dir     = (string)($c2['directory'] ?? ($docRoot . '/var/cache'));
                    $pool    = new FilesystemAdapter($ns, $ttl, $dir);
                    break;
            }

            return new TagAwareAdapter($pool);
        };
    }

    if (!isset($serviceDefinitions[TagAwareCacheInterface::class]) && !empty($config['site']['cache']) && interface_exists(TagAwareCacheInterface::class)) {
        // allow container consumers to still depend on the cache contract if cache2 is not configured
        $serviceDefinitions[TagAwareCacheInterface::class] = static function () use ($docRoot): TagAwareCacheInterface {
            $pool = new FilesystemAdapter('app', 3600, $docRoot . '/var/cache');
            return new TagAwareAdapter($pool);
        };
    }

    if (!empty($feat['dbal']) && class_exists(DriverManager::class)) {
        $serviceDefinitions[Connection::class] = static function (ContainerInterface $c): Connection {
            $cfg = $c->get('config');
            $d   = $cfg['dbal'] ?? [];
            $db  = [
                'driver'   => $d['driver']   ?? 'pdo_mysql',
                'host'     => $d['host']     ?? $cfg['database']['host'],
                'port'     => $d['port']     ?? (int)$cfg['database']['port'],
                'dbname'   => $d['dbname']   ?? $cfg['database']['db'],
                'user'     => $d['user']     ?? $cfg['database']['username'],
                'password' => $d['password'] ?? $cfg['database']['password'],
                'charset'  => $d['charset']  ?? 'utf8mb4',
            ];

            return DriverManager::getConnection($db);
        };
    }

    if (!empty($feat['translation']) && class_exists(Translator::class)) {
        $serviceDefinitions[TranslatorInterface::class] = static function (ContainerInterface $c): TranslatorInterface {
            $cfg     = $c->get('config');
            $i18n    = $cfg['i18n'] ?? [];
            $locale  = (string)($i18n['default_locale'] ?? 'uk');
            $translator = new Translator($locale);
            $translator->addLoader('array', new SymfonyArrayLoader());

            foreach (($i18n['resources'] ?? []) as $res) {
                if (!is_file($res['file'] ?? '')) {
                    continue;
                }

                $messages = include $res['file'];
                if (!is_array($messages)) {
                    continue;
                }

                $translator->addResource(
                    'array',
                    $messages,
                    (string)($res['locale'] ?? $locale),
                    (string)($res['domain'] ?? 'messages')
                );
            }

            if (!empty($i18n['fallbacks'])) {
                $translator->setFallbackLocales($i18n['fallbacks']);
            }

            return $translator;
        };
    }

    if (!empty($feat['validator']) && class_exists(Validation::class)) {
        $serviceDefinitions[SymfonyValidatorInterface::class] = static function (): SymfonyValidatorInterface {
            return Validation::createValidator();
        };
    }

    $cb->addDefinitions($baseDefinitions);
    if (!empty($serviceDefinitions)) {
        $cb->addDefinitions($serviceDefinitions);
    }

    $definitionsFile = $diCfg['definitions'] ?? (HTDOCS_DIR . '/app/config/definitions.php');
    if (is_string($definitionsFile) && is_file($definitionsFile)) {
        $definitionsConfigurator = require $definitionsFile;
        if (is_callable($definitionsConfigurator)) {
            $definitionsConfigurator($cb);
        }
    }

    $container = $cb->build();

    if (class_exists('Registry') && method_exists('Registry', 'setContainer')) {
        Registry::setContainer($container);
    }

    $reg->container = $container;

    if (!isset($reg->logger) && $container->has(LoggerInterface::class)) {
        $reg->logger = $container->get(LoggerInterface::class);
    }

    if (!isset($reg->psrCache) && $container->has(TagAwareCacheInterface::class)) {
        $reg->psrCache = $container->get(TagAwareCacheInterface::class);
    }

    if (!isset($reg->dbal) && $container->has(Connection::class)) {
        $reg->dbal = $container->get(Connection::class);
    }

    if (!isset($reg->translator) && $container->has(TranslatorInterface::class)) {
        $reg->translator = $container->get(TranslatorInterface::class);
    }

    if (!isset($reg->validator) && $container->has(SymfonyValidatorInterface::class)) {
        $reg->validator = $container->get(SymfonyValidatorInterface::class);
    }
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
