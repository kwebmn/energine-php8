<?php
declare(strict_types=1);

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
if (!empty($config['logger']['enabled']) && class_exists(\Monolog\Logger::class)) {
    $levelMap = [
        'debug'=>\Monolog\Level::Debug,'info'=>\Monolog\Level::Info,'notice'=>\Monolog\Level::Notice,
        'warning'=>\Monolog\Level::Warning,'error'=>\Monolog\Level::Error,
        'critical'=>\Monolog\Level::Critical,'alert'=>\Monolog\Level::Alert,'emergency'=>\Monolog\Level::Emergency,
    ];
    $logger = new \Monolog\Logger($config['logger']['channel'] ?? 'app');
    foreach (($config['logger']['handlers'] ?? []) as $h) {
        if (($h['type'] ?? '') === 'stream' && !empty($h['path'])) {
            $lvl = $levelMap[strtolower($h['level'] ?? 'debug')] ?? \Monolog\Level::Debug;
            $logger->pushHandler(new \Monolog\Handler\StreamHandler($h['path'], $lvl, (bool)($h['bubble'] ?? true)));
        }
    }
    $reg->logger = $logger;
}

// --- Cache (Symfony Cache TagAware) ---
if (!empty($config['cache2']) && interface_exists(\Symfony\Contracts\Cache\TagAwareCacheInterface::class)) {
    $c2 = $config['cache2'];
    $ns = $c2['namespace'] ?? 'app';
    $ttl= (int)($c2['default_ttl'] ?? 3600);
    switch (strtolower($c2['adapter'] ?? 'filesystem')) {
        case 'redis':
            $redis = new \Redis();
            $dsn   = parse_url($c2['redis_dsn'] ?? 'redis://127.0.0.1:6379');
            $redis->connect($dsn['host'] ?? '127.0.0.1', (int)($dsn['port'] ?? 6379));
            $pool  = new \Symfony\Component\Cache\Adapter\RedisAdapter($redis, $ns, $ttl);
            break;
        case 'apcu':
            $pool  = new \Symfony\Component\Cache\Adapter\ApcuAdapter($ns, $ttl);
            break;
        default:
            $dir   = $c2['directory'] ?? ($docRoot.'/var/cache');
            $pool  = new \Symfony\Component\Cache\Adapter\FilesystemAdapter($ns, $ttl, $dir);
            break;
    }
    $reg->psrCache = new \Symfony\Component\Cache\Adapter\TagAwareAdapter($pool);
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

    if (!is_dir($cacheDir))               { @mkdir($cacheDir, 0777, true); }
    if (!is_dir($cacheDir . '/tags'))     { @mkdir($cacheDir . '/tags', 0777, true); }

    $gi = $cacheDir . '/.gitignore';
    if (!is_file($gi)) {
        @file_put_contents($gi, "*\n!.gitignore\n");
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
if (!empty($feat['dbal']) && class_exists(\Doctrine\DBAL\DriverManager::class)) {
    $d  = $config['dbal'] ?? [];
    $db = [
        'driver'  => $d['driver']  ?? 'pdo_mysql',
        'host'    => $d['host']    ?? $config['database']['host'],
        'port'    => $d['port']    ?? (int)$config['database']['port'],
        'dbname'  => $d['dbname']  ?? $config['database']['db'],
        'user'    => $d['user']    ?? $config['database']['username'],
        'password'=> $d['password']?? $config['database']['password'],
        'charset' => $d['charset'] ?? 'utf8mb4',
    ];
    $reg->dbal = \Doctrine\DBAL\DriverManager::getConnection($db);
}

// --- HttpFoundation как «двигатель» Ваших Request/Response ---
if (!empty($feat['http_foundation']) && class_exists(\Symfony\Component\HttpFoundation\Request::class)) {
//    $reg->Request  = \App\Bridge\Http\LegacyRequest::fromGlobals();
//    $reg->Response = new \App\Bridge\Http\LegacyResponse();
}

// --- Translation ---
if (!empty($feat['translation']) && class_exists(\Symfony\Component\Translation\Translator::class)) {
    $i18n = $config['i18n'] ?? [];
    $locale = $i18n['default_locale'] ?? 'uk';
    $translator = new \Symfony\Component\Translation\Translator($locale);
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
if (!empty($feat['validator']) && class_exists(\Symfony\Component\Validator\Validation::class)) {
    $reg->validator = \Symfony\Component\Validator\Validation::createValidator();
}
