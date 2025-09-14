<?php
use DI\ContainerBuilder;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use Psr\Log\LoggerInterface;
use Symfony\Component\Cache\Adapter\FilesystemAdapter;
use Symfony\Contracts\Cache\TagAwareCacheInterface;
use Symfony\Component\Cache\Adapter\TagAwareAdapter;
use Doctrine\DBAL\DriverManager;
use Doctrine\DBAL\Connection;
use Symfony\Contracts\Translation\TranslatorInterface;
use Symfony\Component\Translation\Translator;
use Symfony\Component\Translation\Loader\ArrayLoader;
use App\Image\UrlSigner;
use App\Image\ImageService;
use App\Image\Command\ClearCacheCommand;
use League\Glide\ServerFactory;
use League\Glide\Responses\SymfonyResponseFactory;

return function (ContainerBuilder $cb): void {
    $cb->addDefinitions([

        LoggerInterface::class => function () {
            $log = new Logger('app');
            $log->pushHandler(new StreamHandler(__DIR__ . '/../../var/log/app.log'));
            return $log;
        },

        TagAwareCacheInterface::class => function () {
            $fs = new FilesystemAdapter(namespace: 'app', defaultLifetime: 3600, directory: __DIR__.'/../../var/cache');
            return new TagAwareAdapter($fs);
        },

        Connection::class => function () {
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

        TranslatorInterface::class => function () {
            $t = new Translator('uk');
            $t->addLoader('array', new ArrayLoader());
            // Подключите свои источники (DB/файлы) и кеш
            return $t;
        },

        UrlSigner::class => function () {
            $key = (string) (E()->getConfigValue('images.sign_key') ?? '');
            return new UrlSigner($key);
        },

        ImageService::class => function (UrlSigner $signer) {
            $cfg = (array) E()->getConfigValue('images');
            $server = ServerFactory::create([
                'source' => $cfg['source'],
                'cache' => $cfg['cache'],
                'base_url' => $cfg['base_url'],
                'defaults' => $cfg['defaults'],
                'response' => new SymfonyResponseFactory(),
            ]);
            return new ImageService($server, $signer, $cfg);
        },

        ClearCacheCommand::class => function () {
            $cache = (string)E()->getConfigValue('images.cache');
            $alts  = HTDOCS_DIR . '/uploads/alts/resizer';
            return new ClearCacheCommand($cache, is_dir($alts) ? $alts : null);
        },
    ]);
};