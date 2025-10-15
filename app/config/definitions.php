<?php
declare(strict_types=1);
use App\File\FlysystemManager;
use App\Security\EnergineRoleMapper;
use App\Security\EnergineUserProvider;
use App\Security\LegacySecuritySynchronizer;
use App\Security\NullAuthenticationManager;
use Energine\Core\ExtraManager\ExtraManagerFactory;
use Energine\Core\ExtraManager\ExtraManagerInterface;
use DI\ContainerBuilder;
use Doctrine\DBAL\Connection;
use Doctrine\DBAL\DriverManager;
use League\Flysystem\FilesystemOperator;
use Monolog\Handler\StreamHandler;
use Monolog\Logger;
use Psr\Container\ContainerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Cache\Adapter\FilesystemAdapter;
use Symfony\Component\Cache\Adapter\TagAwareAdapter;
use Symfony\Component\Security\Core\Authentication\AuthenticationManagerInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorage;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authorization\AccessDecisionManager;
use Symfony\Component\Security\Core\Authorization\AccessDecisionManagerInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationChecker;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Component\Security\Core\Authorization\Voter\RoleVoter;
use Symfony\Component\Security\Core\User\UserProviderInterface;
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

        FlysystemManager::class => static function (ContainerInterface $c): FlysystemManager {
            $cfg   = $c->has('config') ? $c->get('config') : [];
            $files = is_array($cfg['files'] ?? null) ? $cfg['files'] : [];

            return new FlysystemManager($files);
        },

        FilesystemOperator::class => static function (ContainerInterface $c): FilesystemOperator {
            return $c->get(FlysystemManager::class)->getDefaultFilesystem();
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

        EnergineRoleMapper::class => static function (ContainerInterface $c): EnergineRoleMapper {
            $cfg = $c->has('config') ? $c->get('config') : [];
            $security = $cfg['security'] ?? [];
            $roleCfg = is_array($security['roles'] ?? null) ? $security['roles'] : [];

            $groupMap = is_array($roleCfg['group_map'] ?? null) ? $roleCfg['group_map'] : [1 => 'ROLE_ADMIN'];
            $activeDefaults = is_array($roleCfg['active_defaults'] ?? null)
                ? $roleCfg['active_defaults']
                : ['ROLE_USER', 'ROLE_AUTHENTICATED'];
            $inactiveDefaults = is_array($roleCfg['inactive_defaults'] ?? null)
                ? $roleCfg['inactive_defaults']
                : ['ROLE_GUEST'];
            $groupPrefix = is_string($roleCfg['group_role_prefix'] ?? null)
                ? $roleCfg['group_role_prefix']
                : 'ROLE_GROUP_';

            return new EnergineRoleMapper($groupMap, $activeDefaults, $inactiveDefaults, $groupPrefix);
        },

        EnergineUserProvider::class => static function (ContainerInterface $c): EnergineUserProvider {
            $cfg = $c->has('config') ? $c->get('config') : [];
            $security = $cfg['security'] ?? [];
            $options = is_array($security['provider'] ?? null) ? $security['provider'] : [];

            return new EnergineUserProvider(
                $c->get(Connection::class),
                $c->get(EnergineRoleMapper::class),
                $options
            );
        },

        UserProviderInterface::class => static function (ContainerInterface $c): UserProviderInterface {
            return $c->get(EnergineUserProvider::class);
        },

        TokenStorageInterface::class => static function (): TokenStorageInterface {
            return new TokenStorage();
        },

        AuthenticationManagerInterface::class => static function (): AuthenticationManagerInterface {
            return new NullAuthenticationManager();
        },

        AccessDecisionManagerInterface::class => static function (): AccessDecisionManagerInterface {
            return new AccessDecisionManager([new RoleVoter()]);
        },

        AuthorizationCheckerInterface::class => static function (ContainerInterface $c): AuthorizationCheckerInterface {
            return new AuthorizationChecker(
                $c->get(TokenStorageInterface::class),
                $c->get(AuthenticationManagerInterface::class),
                $c->get(AccessDecisionManagerInterface::class)
            );
        },

        LegacySecuritySynchronizer::class => static function (ContainerInterface $c): LegacySecuritySynchronizer {
            $cfg = $c->has('config') ? $c->get('config') : [];
            $security = $cfg['security'] ?? [];
            $firewall = (string)($security['firewall_name'] ?? 'legacy');

            return new LegacySecuritySynchronizer(
                $c->get(TokenStorageInterface::class),
                $c->get(EnergineUserProvider::class),
                $firewall !== '' ? $firewall : 'legacy'
            );
        },

        ExtraManagerFactory::class => static function (ContainerInterface $c): ExtraManagerFactory {
            $cfg        = $c->has('config') ? $c->get('config') : [];
            $configured = $cfg['extra_managers']['defaults'] ?? null;

            if (is_array($configured))
            {
                $factory = new ExtraManagerFactory();
                foreach ($configured as $className)
                {
                    $className = ltrim((string)$className, '\\');
                    if ($className === '' || !class_exists($className))
                    {
                        continue;
                    }

                    try
                    {
                        $instance = new $className();
                    }
                    catch (\Throwable)
                    {
                        continue;
                    }

                    if ($instance instanceof ExtraManagerInterface)
                    {
                        $factory->addManager($instance);
                    }
                }

                return $factory;
            }

            $rootDir  = dirname(__DIR__, 2);
            $extraDir = $rootDir . '/engine/core/modules/share/gears/extra';

            foreach ([
                'AttachmentManager' => $extraDir . '/AttachmentManager.class.php',
                'TagManager'        => $extraDir . '/TagManager.class.php',
                'FilterManager'     => $extraDir . '/FilterManager.class.php',
            ] as $className => $file)
            {
                if (!class_exists($className, false) && is_file($file))
                {
                    require_once $file;
                }
            }

            return new ExtraManagerFactory([
                new \AttachmentManager(),
                new \TagManager(),
                new \FilterManager(),
            ]);
        },
    ]);
};
