<?php

declare(strict_types=1);
/**
 * @file
 * E(), Registry.
 *
 * It contains the definition to:
 *   function E();
 *   final class Registry;
 *
 * Legacy-compatible, adjusted for PHP 8.3 and Composer autoload.
 * - Absolute include for BaseObject.class.php (no set_include_path reliance)
 * - E() is guarded with function_exists to avoid redeclare
 */

// Подключаем предка напрямую (абсолютный путь из текущей директории файла)
//require __DIR__ . '/BaseObject.class.php';

/**
 * E[nergine] shortcut.
 * @return Registry
 */
if (!function_exists('E'))
{
    function E()
    {
        return \Registry::getInstance();
    }
}

/**
 * Application registry (Service Locator hybrid).
 *
 * Any injected object here becomes a singleton.
 * In addition there is a set of methods that return commonly used objects.
 *
 * @final
 */
use DI\FactoryInterface;
use Doctrine\DBAL\Connection as DoctrineConnection;
use Doctrine\DBAL\DriverManager;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;

final class Registry extends BaseObject
{
    /**
     * Instance of this class.
     * @var Registry|null
     */
    private static $instance = null;

    /**
     * Shared DI container.
     * @var ContainerInterface|null
     */
    private static $container = null;

    /**
     * List of stored objects in the registry.
     * @var array
     */
    private $entities = [];

    /**
     * Flag for imitation the private constructor.
     * @var bool|null
     */
    private static $flag = null;

    /**
     * @throws SystemException
     */
    public function __construct()
    {
        if (is_null(self::$flag))
        {
            throw new SystemException('ERR_PRIVATE_CONSTRUCTOR', SystemException::ERR_DEVELOPER);
        }
        self::$flag = null;
    }

    /**
     * Disable cloning.
     */
    private function __clone()
    {
    }

    /**
     * Get instance.
     *
     * @return Registry
     * @final
     */
    final public static function getInstance()
    {
        if (is_null(self::$instance))
        {
            self::$flag = true;
            self::$instance = new Registry();
        }
        return self::$instance;
    }

    /**
     * Attach DI container.
     */
    public static function setContainer(?ContainerInterface $container): void
    {
        self::$container = $container;
    }

    /**
     * Get DI container.
     */
    public static function getContainer(): ?ContainerInterface
    {
        return self::$container;
    }

    /**
     * Magic get.
     *
     * @param string $className Class name.
     * @return mixed
     * @throws Exception 'Use Registry::getMap($siteID) instead.'
     */
    public function __get($className)
    {
        if ($className == 'Sitemap')
        {
            throw new Exception('Use Registry::getMap($siteID) instead.');
        }
        return $this->get($className);
    }

    /**
     * Get class by name.
     *
     * @param string $className Class name.
     * @return mixed
     */
    private function get($className)
    {
        if (isset($this->entities[$className]))
        {
            return $this->entities[$className];
        }

        if (self::$container instanceof ContainerInterface)
        {
            try
            {
                if (self::$container->has($className))
                {
                    $resolved = self::$container->get($className);
                    $this->entities[$className] = $resolved;

                    return $resolved;
                }

                if (self::$container instanceof FactoryInterface)
                {
                    $resolved = self::$container->make($className);
                    $this->entities[$className] = $resolved;

                    return $resolved;
                }
            }
            catch (NotFoundExceptionInterface|ContainerExceptionInterface $e)
            {
                // Fallback ниже
            }
        }

        // Поскольку предполагается хранить синглтоны, создаём класс по имени
        $result = new $className();
        $this->entities[$className] = $result;

        return $result;
    }

    /**
     * Container accessor for helpers.
     */
    public function getContainerInstance(): ?ContainerInterface
    {
        return self::$container;
    }

    /**
     * Magic set.
     *
     * @param string $className Class name.
     * @param mixed  $object    Object.
     */
    public function __set($className, $object)
    {
        if (!isset($this->entities[$className]))
        {
            $this->entities[$className] = $object;
        }
    }

    /**
     * Check if some entity name is set.
     *
     * @param string $entityName
     * @return bool
     */
    public function __isset($entityName)
    {
        return isset($this->entities[$entityName]);
    }

    /**
     * Disable manual unsetting.
     *
     * @param string $entityName Entity name.
     */
    public function __unset($entityName)
    {
        // intentionally no-op
    }

    /**
     * Get AuthUser.
     *
     * @return AuthUser
     */
    public function getAUser()
    {
        return $this->get('AuthUser');
    }

    /**
     * Set AuthUser.
     *
     * @param AuthUser $anotherAuthUserObject AuthUser object.
     *
     * @throws Exception 'AuthUser object is already used. You can not substitute it here.'
     */
    public function setAUser($anotherAuthUserObject)
    {
        if (isset($this->entities['AuthUser']))
        {
            throw new Exception('AuthUser object is already used. You can not substitute it here.');
        }
        $this->entities['AuthUser'] = $anotherAuthUserObject;
    }

    /**
     * Get Request.
     *
     * @return Request
     */
    public function getRequest()
    {
        return $this->get('Request');
    }

    /**
     * Get Response.
     *
     * @return Response
     */
    public function getResponse()
    {
        return $this->get('Response');
    }

    /**
     * Get Document.
     *
     * @return Document
     */
    public function getDocument()
    {
        return $this->get('Document');
    }

    /**
     * Get OGObject.
     *
     * @return OGObject
     */
    public function getOGObject()
    {
        return $this->get('OGObject');
    }

    /**
     * Get Language.
     *
     * @return Language
     */
    public function getLanguage()
    {
        return $this->get('Language');
    }

    /**
     * Get SiteManager.
     *
     * @return SiteManager
     */
    public function getSiteManager()
    {
        return $this->get('SiteManager');
    }

    /**
     * Get Sitemap object.
     *
     * @param bool|int $siteID Site ID.
     * @return Sitemap
     *
     * @note In fact, several objects of this class exist.
     */
    public function getMap($siteID = false)
    {
        if (!$siteID)
        {
            $siteID = E()->getSiteManager()->getCurrentSite()->id;
        }
        if (!isset($this->entities['Sitemap'][$siteID]))
        {
            if (self::$container instanceof FactoryInterface)
            {
                try
                {
                    $this->entities['Sitemap'][$siteID] = self::$container->make(Sitemap::class, ['siteID' => $siteID]);
                }
                catch (NotFoundExceptionInterface|ContainerExceptionInterface)
                {
                    $this->entities['Sitemap'][$siteID] = new Sitemap($siteID);
                }
            }
            else
            {
                $this->entities['Sitemap'][$siteID] = new Sitemap($siteID);
            }
        }
        return $this->entities['Sitemap'][$siteID];
    }

    /**
     * Get DocumentController.
     *
     * @return DocumentController
     */
    public function getController()
    {
        return $this->get('DocumentController');
    }

    /**
     * Получить подключение Doctrine DBAL (если включено).
     */
    public function getDbal(): ?DoctrineConnection
    {
        $existing = $this->entities['dbal'] ?? null;
        if ($existing instanceof DoctrineConnection)
        {
            return $existing;
        }

        if ($existing !== null)
        {
            return null;
        }

        if (self::$container instanceof ContainerInterface)
        {
            try
            {
                if (self::$container->has(DoctrineConnection::class))
                {
                    $connection = self::$container->get(DoctrineConnection::class);
                    if ($connection instanceof DoctrineConnection)
                    {
                        return $this->entities['dbal'] = $connection;
                    }
                }
            }
            catch (NotFoundExceptionInterface|ContainerExceptionInterface)
            {
                // переходим к ручному созданию
            }
        }

        $features = (array)$this->getConfigValue('features', []);
        if (empty($features['dbal']) || !class_exists(DriverManager::class))
        {
            return null;
        }

        $dbalConfig = (array)$this->getConfigValue('dbal', []);
        $dbConfig   = (array)$this->getConfigValue('database', []);

        if (!isset($dbalConfig['url']))
        {
            $map = [
                'driver'   => 'driver',
                'host'     => 'host',
                'port'     => 'port',
                'dbname'   => 'db',
                'user'     => 'username',
                'password' => 'password',
                'charset'  => 'charset',
            ];

            foreach ($map as $target => $source)
            {
                if (!array_key_exists($target, $dbalConfig) && array_key_exists($source, $dbConfig))
                {
                    $dbalConfig[$target] = $dbConfig[$source];
                }
            }

            if (!isset($dbalConfig['driver']))
            {
                $dbalConfig['driver'] = 'pdo_mysql';
            }

            if (!isset($dbalConfig['charset']))
            {
                $dbalConfig['charset'] = 'utf8mb4';
            }
        }

        if (isset($dbalConfig['port']))
        {
            $dbalConfig['port'] = (int)$dbalConfig['port'];
        }

        try
        {
            $connection = DriverManager::getConnection($dbalConfig);
        }
        catch (Throwable)
        {
            return null;
        }

        return $this->entities['dbal'] = $connection;
    }

    /**
     * Get QAL (DB).
     *
     * @return QAL
     */
    public function getDB()
    {
        if (!isset($this->entities['QAL']))
        {
            $dbal = $this->getDbal();
            $database = (array)$this->getConfigValue('database', []);
            $dbalConfig = (array)$this->getConfigValue('dbal', []);
            $charset = (string)($dbalConfig['charset'] ?? $database['charset'] ?? 'utf8mb4');

            $this->entities['QAL'] = new QAL(
                sprintf(
                    'mysql:host=%s;port=%s;dbname=%s',
                    $this->getConfigValue('database.host'),
                    $this->getConfigValue('database.port'),
                    $this->getConfigValue('database.db')
                ),
                $this->getConfigValue('database.username'),
                $this->getConfigValue('database.password'),
                [
                    PDO::ATTR_PERSISTENT            => (bool)$this->getConfigValue('database.persistent'),
                    PDO::ATTR_EMULATE_PREPARES      => true,
                    PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true,
                ],
                $charset,
                $dbal
            );
        }
        return $this->entities['QAL'];
    }

    /**
     * Get Cache.
     *
     * @return Cache
     */
    public function getCache()
    {
        return $this->get('Cache');
    }
}
