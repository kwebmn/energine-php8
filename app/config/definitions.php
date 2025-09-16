<?php
declare(strict_types=1);
use DI\ContainerBuilder;
use Doctrine\DBAL\Connection;
use Doctrine\DBAL\DriverManager;
use Monolog\Handler\StreamHandler;
use Monolog\Logger;
use Psr\Log\LoggerInterface;
use Symfony\Component\Cache\Adapter\FilesystemAdapter;
use Symfony\Component\Cache\Adapter\TagAwareAdapter;
use Symfony\Component\Translation\Loader\ArrayLoader;
use Symfony\Component\Translation\Translator;
use Symfony\Contracts\Cache\TagAwareCacheInterface;
use Symfony\Contracts\Translation\TranslatorInterface;

return static function (ContainerBuilder $cb): void {
    $cb->addDefinitions([

        LoggerInterface::class => static function (): LoggerInterface {
            $log = new Logger('app');
            $log->pushHandler(new StreamHandler(__DIR__ . '/../../var/log/app.log'));
            return $log;
        },

        TagAwareCacheInterface::class => static function (): TagAwareCacheInterface {
            $fs = new FilesystemAdapter(namespace: 'app', defaultLifetime: 3600, directory: __DIR__.'/../../var/cache');
            return new TagAwareAdapter($fs);
        },

        Connection::class => static function (): Connection {
            // возьми из system.config.php или ENV
            $params = [
                'dbname'   => E()->getConfigValue('database.db'),
                'user'     => E()->getConfigValue('database.username'),
                'password' => E()->getConfigValue('database.password'),
                'host'     => E()->getConfigValue('database.host'),
                'port'     => (int)E()->getConfigValue('database.port'),
                'driver'   => 'pdo_mysql',
                'charset'  => 'utf8mb4',
            ];
            return DriverManager::getConnection($params);
        },

        TranslatorInterface::class => static function (): TranslatorInterface {
            $t = new Translator('uk');
            $t->addLoader('array', new ArrayLoader());
            // Подключите свои источники (DB/файлы) и кеш
            return $t;
        },
    ]);
};