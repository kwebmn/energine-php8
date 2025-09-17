<?php
declare(strict_types=1);

namespace Symfony\Component\HttpFoundation {
    if (!class_exists(ParameterBag::class)) {
        class ParameterBag
        {
            private array $data = [];

            public function all(): array { return $this->data; }
            public function has(string $name): bool { return array_key_exists($name, $this->data); }
            public function get(string $name, $default = null) { return $this->data[$name] ?? $default; }
        }
    }

    if (!class_exists(HeaderBag::class)) {
        class HeaderBag extends ParameterBag
        {
            public function set(string $name, string $value, bool $replace = true): void {}
            public function setCookie($cookie): void {}
        }
    }

    if (!class_exists(Response::class)) {
        class Response
        {
            public HeaderBag $headers;

            public function __construct($content = '', $status = 200)
            {
                $this->headers = new HeaderBag();
            }

            public function setStatusCode(int $status): void {}
            public function setContent(string $content): void {}
        }
    }

    if (!class_exists(ResponseHeaderBag::class)) {
        class ResponseHeaderBag extends HeaderBag {}
    }

    if (!class_exists(Cookie::class)) {
        class Cookie
        {
            public const SAMESITE_LAX = 'lax';

            public function __construct(...$args)
            {
            }
        }
    }

    if (!class_exists(BinaryFileResponse::class)) {
        class BinaryFileResponse {}
    }

    if (!class_exists(AcceptHeader::class)) {
        class AcceptHeader
        {
            public static function fromString(string $header): self { return new self(); }
            public function has(string $value): bool { return false; }
        }
    }

    if (!class_exists(Request::class)) {
        class Request
        {
            public HeaderBag $headers;
            public ParameterBag $request;
            public ParameterBag $query;
            public ParameterBag $attributes;

            public function __construct()
            {
                $this->headers    = new HeaderBag();
                $this->request    = new ParameterBag();
                $this->query      = new ParameterBag();
                $this->attributes = new ParameterBag();
            }

            public static function createFromGlobals(): self
            {
                return new self();
            }

            public function getPathInfo(): string { return '/'; }
            public function getClientIp(): ?string { return '127.0.0.1'; }
            public function getHost(): string { return 'localhost'; }
            public function getScheme(): string { return 'http'; }
            public function getPort(): int { return 80; }
            public function getClientIps(): array { return ['127.0.0.1']; }
            public function getContent(): string { return ''; }
        }
    }
}

namespace {

$projectRoot = dirname(__DIR__, 2);

spl_autoload_register(function (string $class) use ($projectRoot): void {
    $baseDirs = [
        $projectRoot . '/engine/core/modules/share/components',
        $projectRoot . '/engine/core/modules/share/gears',
    ];
    $suffixes = ['.class.php', '.php', '.interface.php'];

    foreach ($baseDirs as $dir) {
        foreach ($suffixes as $suffix) {
            $path = $dir . '/' . $class . $suffix;
            if (is_file($path)) {
                require_once $path;
                return;
            }
        }
    }
});

require_once $projectRoot . '/engine/core/modules/share/gears/ComponentManager.class.php';
require_once $projectRoot . '/engine/core/modules/share/gears/DocumentController.class.php';

require_once $projectRoot . '/app/helpers.php';

if (!defined('HTDOCS_DIR')) {
    define('HTDOCS_DIR', $projectRoot);
}
if (!defined('CORE_DIR')) {
    define('CORE_DIR', $projectRoot . '/engine');
}
if (!defined('SITE_DIR')) {
    define('SITE_DIR', $projectRoot . '/site');
}

if (!defined('ACCESS_NONE')) {
    define('ACCESS_NONE', 0);
}
if (!defined('ACCESS_READ')) {
    define('ACCESS_READ', 1);
}
if (!defined('ACCESS_EDIT')) {
    define('ACCESS_EDIT', 2);
}
if (!defined('ACCESS_FULL')) {
    define('ACCESS_FULL', 3);
}

BaseObject::setConfigArray([
    'database' => [
        'prepare' => false,
        'host' => 'localhost',
        'port' => '3306',
        'db' => 'test',
        'username' => 'user',
        'password' => 'pass',
        'persistent' => false,
    ],
    'thumbnail' => [
        'width' => 100,
        'height' => 100,
    ],
]);

class DummyLanguage
{
    private int $current = 1;

    public function getCurrent(): int
    {
        return $this->current;
    }

    public function setCurrent(int $langId): void
    {
        $this->current = $langId;
    }

    public function getAbbrByID(int $langId): string
    {
        return 'en';
    }

    public function getIDByAbbr(string $abbr, bool $strict = false): ?int
    {
        return null;
    }

    public function isValidLangAbbr(string $abbr): bool
    {
        return false;
    }

    public function getLanguages(): array
    {
        return [$this->current => ['id' => $this->current]];
    }
}

class DummySite
{
    public string $folder = '';
    public string $root = '/';
    public string $base = '/';
    public string $domain = 'localhost';
    public int $id = 1;
    public bool $isIndexed = false;
}

class DummySiteManager
{
    private DummySite $site;

    public function __construct()
    {
        $this->site = new DummySite();
    }

    public function getCurrentSite(): DummySite
    {
        return $this->site;
    }
}

class DummyAuthUser
{
    public function getGroups(): array
    {
        return [];
    }

    public function getID(): int
    {
        return 0;
    }
}

class DummyDBStructureInfo extends DBStructureInfo
{
    public function __construct()
    {
    }

    public function tableExists(string $tableName): bool
    {
        return false;
    }

    public function getTableMeta(string $tableName): array
    {
        return [];
    }
}

/**
 * Создаёт тестовый экземпляр QAL без подключения к MySQL.
 */
function createTestQAL(): QAL
{
    $reflection = new ReflectionClass(QAL::class);
    /** @var QAL $qal */
    $qal = $reflection->newInstanceWithoutConstructor();

    $pdo = new PDO('sqlite::memory:');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    $parent = $reflection->getParentClass();
    if ($parent) {
        $pdoProperty = $parent->getProperty('pdo');
        $pdoProperty->setAccessible(true);
        $pdoProperty->setValue($qal, $pdo);

        $dbCacheProperty = $parent->getProperty('dbCache');
        $dbCacheProperty->setAccessible(true);
        $dbCacheProperty->setValue($qal, new DummyDBStructureInfo());
    }

    return $qal;
}

function createTestDocument(QAL $qal): Document
{
    $reflection = new ReflectionClass(Document::class);
    /** @var Document $document */
    $document = $reflection->newInstanceWithoutConstructor();

    $propertiesProp = $reflection->getProperty('properties');
    $propertiesProp->setAccessible(true);
    $propertiesProp->setValue($document, ['single' => false]);

    $rightsProp = $reflection->getProperty('rights');
    $rightsProp->setAccessible(true);
    $rightsProp->setValue($document, ACCESS_READ);

    $componentManager = new ComponentManager($document);
    $document->componentManager = $componentManager;

    $parent = $reflection->getParentClass();
    if ($parent) {
        $dbhProp = $parent->getProperty('dbh');
        $dbhProp->setAccessible(true);
        $dbhProp->setValue($document, $qal);
    }

    return $document;
}

function createTestRequest(): Request
{
    $reflection = new ReflectionClass(Request::class);
    /** @var Request $request */
    $request = $reflection->newInstanceWithoutConstructor();

    $rootProp = $reflection->getProperty('rootPath');
    $rootProp->setAccessible(true);
    $rootProp->setValue($request, '/');

    $langProp = $reflection->getProperty('lang');
    $langProp->setAccessible(true);
    $langProp->setValue($request, '');

    $pathProp = $reflection->getProperty('path');
    $pathProp->setAccessible(true);
    $pathProp->setValue($request, []);

    $offsetProp = $reflection->getProperty('offset');
    $offsetProp->setAccessible(true);
    $offsetProp->setValue($request, 0);

    $usedProp = $reflection->getProperty('usedSegmentsCount');
    $usedProp->setAccessible(true);
    $usedProp->setValue($request, 0);

    return $request;
}

function createTestResponse(): Response
{
    $reflection = new ReflectionClass(Response::class);
    /** @var Response $response */
    $response = $reflection->newInstanceWithoutConstructor();

    $respProp = $reflection->getProperty('resp');
    $respProp->setAccessible(true);
    $respProp->setValue($response, new Symfony\Component\HttpFoundation\Response());

    $bodyProp = $reflection->getProperty('body');
    $bodyProp->setAccessible(true);
    $bodyProp->setValue($response, '');

    $cookiesProp = $reflection->getProperty('cookies');
    $cookiesProp->setAccessible(true);
    $cookiesProp->setValue($response, []);

    return $response;
}

$registry = E();
$registry->Language = new DummyLanguage();
$registry->SiteManager = new DummySiteManager();
$registry->Request = createTestRequest();
$registry->Response = createTestResponse();
$registry->AuthUser = new DummyAuthUser();

$qal = createTestQAL();
$registry->QAL = $qal;
$registry->Document = createTestDocument($qal);

$configXml = new SimpleXMLElement('<configuration><state name="main"><uri_patterns/></state></configuration>');

$editor = new SitePropertiesEditor('site_props', 'share', [
    'siteID' => 42,
    'active' => false,
    'config' => $configXml,
]);

$filter = $editor->getFilter();
if (!is_array($filter)) {
    throw new RuntimeException('SitePropertiesEditor filter is not an array.');
}

$condition = E()->getDB()->buildWhereCondition($filter);
if ($condition !== ' WHERE site_id = 42 OR site_id IS NULL') {
    throw new RuntimeException('Unexpected WHERE condition: ' . $condition);
}

echo "OK\n";
}
