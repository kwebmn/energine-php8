<?php
declare(strict_types=1);
use DI\ContainerBuilder;
use Doctrine\DBAL\Connection;
use Doctrine\DBAL\DriverManager;
use Monolog\Handler\StreamHandler;
use Monolog\Logger;
use Psr\Container\ContainerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Cache\Adapter\FilesystemAdapter;
use Symfony\Component\Cache\Adapter\TagAwareAdapter;
use Symfony\Component\Translation\Loader\ArrayLoader;
use Symfony\Component\Translation\Translator;
use Symfony\Contracts\Cache\TagAwareCacheInterface;
use Symfony\Contracts\Translation\TranslatorInterface;

return static function (ContainerBuilder $cb): void {
    $cb->addDefinitions([
        LoggerInterface::class => static function (ContainerInterface $c): LoggerInterface {
            $cfg     = $c->has('config') ? $c->get('config') : [];
            $channel = (string)($cfg['logger']['channel'] ?? 'app');
            $log     = new Logger($channel);
            $log->pushHandler(new StreamHandler(__DIR__ . '/../../var/log/app.log'));
            return $log;
        },

        TagAwareCacheInterface::class => static function (): TagAwareCacheInterface {
            $fs = new FilesystemAdapter(namespace: 'app', defaultLifetime: 3600, directory: __DIR__ . '/../../var/cache');
            return new TagAwareAdapter($fs);
        },

        Connection::class => static function (ContainerInterface $c): Connection {
            $cfg    = $c->has('config') ? $c->get('config') : [];
            $dbconf = $cfg['database'] ?? [];
            $params = [
                'dbname'   => $dbconf['db'] ?? 'c1phpbase',
                'user'     => $dbconf['username'] ?? 'root',
                'password' => $dbconf['password'] ?? '',
                'host'     => $dbconf['host'] ?? '127.0.0.1',
                'port'     => (int)($dbconf['port'] ?? 3306),
                'driver'   => 'pdo_mysql',
                'charset'  => 'utf8mb4',
            ];
            return DriverManager::getConnection($params);
        },

        TranslatorInterface::class => static function (ContainerInterface $c): TranslatorInterface {
            $cfg    = $c->has('config') ? $c->get('config') : [];
            $i18n   = $cfg['i18n'] ?? [];
            $locale = (string)($i18n['default_locale'] ?? 'uk');
            $t = new Translator($locale);
            $t->addLoader('array', new ArrayLoader());
            return $t;
        },
    ]);
};