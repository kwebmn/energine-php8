<?php

/**
 * Конфигурация проекта на базе системы управления сайтами Energine
 *
 * @copyright 2013 Energine
 */
//echo '<pre>';
//var_dump($_SERVER);die();
return array(

    // название проекта
    'project' => 'Energine 2.11.4',

    // путь к директории setup текущего используемого ядра
    'setup_dir' => ($energine_release = $_SERVER['DOCUMENT_ROOT'] . '/engine') . '/setup',

    // список подключенных модулей ядра в конкретном проекте
    // ключи массива - названия модулей, значения - абсолютные пути к месторасположению
    'modules' => array(
        'share'     => $energine_release . '/core/modules/share',
        'user'      => $energine_release . '/core/modules/user',
        'apps'      => $energine_release . '/core/modules/apps',
        'seo'  => $energine_release . '/core/modules/seo',
        'wizard'  => $energine_release . '/core/modules/wizard',
        'auto'  => $energine_release . '/core/modules/auto',
    ),

    // настройки подключения к mysql
    'database' => array(
        'host' => 'localhost',
        'port' => '3306',
        'db' => 'c1phpbase',
        'username' => 'c1phpbase',
        'password' => 'NfEq@pS8',
        // использовать ли persistent-соединение
        'persistent' => 0,
        /**
         * Подготовленый запрос
         */
        'prepare' => 1,
        'slow_ms' => 1000,
    ),

    // настройки сайта
    'site' => array(
        // имя домена
        'domain' => 'phpbase.kweb.ua', 
        // корень проекта
        'root' => '/',
        // отладочный режим: 1 - включено, 0 - выключено
        'debug' => 1,
        // делать ли замеры времени рендеринга страниц и выводить их в header X-Timer
        'useTimer' => 1,
        // выводить для отладки сразу в XML
        'asXML' => 0,
        // использовать Tidy для очистки кода текстового блока от лишних тегов (если модяль Tidy не подключен  - работать не будет )
        'aggressive_cleanup' => 1,
        // перечень глобальных переменных, которые будут доступны в XML документе на всех страницах
        /*
        'vars' => array(
            'SOME_GLOBAL_XML_VARIABLE' => 'some constant value',
            'ANOTHER_GLOBAL_XML_VARIABLE' => 'another value',
        ),
        */
        'cache' => 0,
        'cache_ignore_debug' => 0,
        'cache_dir' => $energine_release . '/var/cache', // опционально (иначе автозадастся)
        'cache_prefix' => 'prod:site1', // опционально: префикс ключей
        'cache_default_ttl' => 3600,    // опционально: дефолтный TTL (сек)
        'aliases' => 0,
        'apcu' => 0,
        'apcu_ttl' => 3600,
        // список доменов для дев-окружения
        'dev_domains' => array(),
        // базовый URL для статических файлов
        'static' => '',
        // базовый URL для медиафайлов
        'media' => '',
        // базовый URL ресайзера изображений
        'resizer' => '',
        // включать ли сжатие ответа
        'compress' => 0,
    ),
    // настройки документа
    'document' => array(
        // основная точка входа в xslt преобразователь
        'transformer' => 'main.xslt',
        // насткойка кеширования xslt (при использовании XSLTCache)
        'xslcache' => extension_loaded('xslcache') ? 1 : 0,
        // тип контента по умолчанию для XML-ответов
        'xml_content_type' => 'application/xml; charset=UTF-8',
        // выводить XML с форматированием
        'pretty_xml' => 0,
        // выводить JSON с форматированием
        'pretty_json' => 0,
    ),

    // настройки миниатюр в интерфейсе
    'thumbnail' => array(
        'width' => 100,
        'height' => 100,
    ),

    // перечень дополнительнх полей с превьюшками в виде отдельной вкладки в файловом менеджере
//    'thumbnails' => array(
//        'auxmiddle' => array(
//            'width' => 190,
//            'height' => 132,
//        ),
//        'middle' => array(
//            'width' => 184,
//            'height' => 138,
//        ),
//        'anchormiddle' => array(
//            'width' => 190,
//            'height' => 192,
//        ),
//        'anchorxsmall' => array(
//            'width' => 48,
//            'height' => 48,
//        ),
//        'small' => array(
//            'width' => 140,
//            'height' => 107,
//        ),
//        'xsmall' => array(
//            'width' => 75,
//            'height' => 56,
//        ),
//        'xxsmall' => array(
//            'width' => 60,
//            'height' => 45,
//        ),
//        'big' => array(
//            'width' => 650,
//            'height' => 367,
//        ),
//    ),
    // дополнительные внешние системы авторизации
    'auth' => array(
        'google' => array(
            'appID' => '103852271718-cic5gkithf0iogg6hle0o8cjfbqjv9ev.apps.googleusercontent.com',
            'secretKey' => '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',
            'redirectUrl' => 'https://' . $_SERVER['HTTP_HOST'] . '/login/google/',
            'allowRegister' => true,
            'redirect' => '/my/'
        )
        // FACEBOOK.COM
//        'facebook' => array(
//            'appID' => 'FACEBOOK APP ID',
//            'secretKey' => 'FACEBOOK SECRET'
//        ),
    ),

    // натройка сессий
    'session' => array(
        'timeout' => 6000,
        'lifespan' => 108000*7,
    ),

    // настройка почтовых уведомлений
    'mail' => array(
        // адрес отправителя почтовой корреспонденции
        'from' => 'webmaster@mbase.kweb.biz',
        // адрес менеджера
        'manager' => 'webmaster@mbase.kweb.biz',
        // адрес для сообщений обратной связи
        'feedback' => 'webmaster@mbase.kweb.biz',
        // строка подключения к транспортной системе
        'dsn' => '',
    ),

    // настройки google
    'google' => array(
        // код подтверждения сайта в Google
        'verify' => '',
        // код Google Analytics
        'analytics' => '',
    ),

    // настройки recaptcha
    'recaptcha' => array(
        // публичный ключ
        'public' => '',
        // приватный ключ
        'private' => '',
    ),

    // пути к различным директориям
    'paths' => array(
        // папка для логов
        'log_dir' => $_SERVER['DOCUMENT_ROOT'].'/var/log',
    ),

    // карта соответствия устаревших URI
    'uri' => array(
        'legacy_path_map' => array(),
    ),

    // настройки файловых репозитариев
    'repositories' => array(
        // маппинг типов репозитариев (share_uploads.upl_mime_type) с реализациями интерфейса IFileRepository
        'mapping' => array(
            'repo/local' => 'FileRepositoryLocal',
            'repo/ftp' => 'FileRepositoryFTP',
            'repo/ftpro' => 'FileRepositoryFTPRO',
            'repo/ro' => 'FileRepositoryRO',
        ),
        // папка по-умолчанию для быстрой загрузки файлов
        'quick_upload_path' => 'uploads/public/fast-upload',
        // конфигурация для FTP репозитариев
        'ftp' => array(
            // конфигурация FTP доступа для репозитария с share_uploads.upl_path uploads/ftp
            'uploads/ftp' => array(
                'media' => array(
                    'server' => '10.0.1.10',
                    'port' => 21,
                    'username' => 'username',
                    'password' => 'password'
                ),
                'alts' => array(
                    'server' => '10.0.1.10',
                    'port' => 21,
                    'username' => 'username',
                    'password' => 'password',
                ),
                // использовать ли безопасное подключение
                'secure' => 0,
            ),
            // конфигурация FTP доступа для репозитария с share_uploads.upl_path uploads/ftpro
            'uploads/ftpro' => array(
                'media' => array(
                    'server' => '10.0.1.10',
                    'port' => 21,
                    'username' => 'username',
                    'password' => 'password'
                ),
                'alts' => array(
                    'server' => '10.0.1.10',
                    'port' => 21,
                    'username' => 'username',
                    'password' => 'password',
                ),
                // использовать ли безопасное подключение
                'secure' => 0,
            )
        ),
    ),

    // настройка SEO модуля
    'seo' => array(
        'sitemapSegment' => 'google_sitemap',
        'sitemapTemplate' => 'google_sitemap',
        'maxVideosInMap' => '10'
    ),

    // параметри пользовательских стилей RichText редактора
    'wysiwyg' => array(
        'styles' => array(
            'p.red' => array(
                'element' => 'p',
                'class' => 'red',
                'caption' => 'TXT_RED_PARAGRAPH'
            ),
            'p.underline' => array(
                'element' => 'p',
                'class' => 'underline',
                'caption' => 'TXT_TEXT_UNDERLINE'
            )
        )
    ),


    // ====== НОВЫЕ ОПЦИИ ДЛЯ УПРАВЛЕНИЯ СТЕКОМ ================================

    // Пути ядра/сайта (читает bootstrap.php; можно не задавать — будут 'core'/'site')
    'core_rel_dir' => 'core',
    'site_rel_dir' => 'site',

    // Окружение/ENV (дублирует APP_ENV; влияет на логи/кеш/Twig)
    'env' => array(
        'name' => 'dev', // dev|prod|stage
    ),

    // Включатели подсистем (безопасно держать выключенными и подключать по частям)
    'features' => [
        'di'              => 1,
        'http_foundation' => 1,   // адаптеры под твои Request/Response
        'fast_route'      => 0,   // роутер выключен
        'dbal'            => 0,   // включишь позже
        'validator'       => 1,
        'translation'     => 1,
        'xsl_refactor'    => 1,
    ],

    // DI (php-di)
    'di' => array(
        'compile'   => 0, // в prod → 1
        'cache_dir' => $_SERVER['DOCUMENT_ROOT'].'/var/cache/di',
        'proxy_dir' => $_SERVER['DOCUMENT_ROOT'].'/var/cache/di/proxies',
        'definitions'=> $_SERVER['DOCUMENT_ROOT'].'/app/config/definitions.php',
    ),

    // Логирование (Monolog)
    'logger' => array(
        'enabled' => 1,
        'channel' => 'app',
        'level'   => 'warning', // debug|info|notice|warning|error|critical|alert|emergency
        'handlers'=> array(
            array(
                'type' => 'stream',
                'path' => $_SERVER['DOCUMENT_ROOT'].'/var/log/app.log',
                'level'=> 'debug',
                'bubble'=> true,
            ),
            // можно добавить syslog, rotating_file и т.д.
        ),
    ),

    // Современный кеш (Symfony Cache, TagAware)
    'cache2' => array(
        'adapter'      => 'filesystem', // filesystem|redis|apcu
        'namespace'    => 'app',
        'default_ttl'  => 3600,
        'directory'    => $_SERVER['DOCUMENT_ROOT'].'/var/cache',
        'redis_dsn'    => 'redis://127.0.0.1:6379', // если adapter=redis
        // что кешируем: флаги для удобной проверки/отладки
        'layers' => array(
            'tableExists'  => 1,
            'columnsInfo'  => 1,
            'translations' => 1,
            'routes'       => 1,
            'fileAnalyze'  => 1,
        ),
    ),

    // DBAL (Doctrine) — параметры могут брать значения из 'database'
    'dbal' => array(
        'driver'  => 'pdo_mysql',
        'host'    => 'localhost',
        'port'    => 3306,
        'dbname'  => 'c1phpbase',
        'user'    => 'c1phpbase',
        'password'=> 'NfEq@pS8',
        'charset' => 'utf8mb4',
        // 'url' => 'mysql://user:pass@host:port/dbname?charset=utf8mb4', // альтернативно
        'migrations' => array(
            'enabled' => 0,
            'path'    => $_SERVER['DOCUMENT_ROOT'].'/app/migrations',
            'table'   => 'doctrine_migration_versions',
        ),
    ),

    // HTTP (Symfony HttpFoundation)
    'http' => array(
        'trust_proxies' => array(),  // напр. ['127.0.0.1','10.0.0.0/8']
        'trust_hosts'   => array(),  // напр. ['^phpbase\.kweb\.biz$']
        'base_url'      => '/',      // если нужен префикс
    ),

    // Маршрутизация (FastRoute)
    'router' => array(
        'enabled'     => 1,
        'routes_file' => $_SERVER['DOCUMENT_ROOT'].'/app/config/routes.php',
        'cache'       => array(
            'enabled' => 0,
            'file'    => $_SERVER['DOCUMENT_ROOT'].'/var/cache/routes.cache.php',
        ),
        'legacy_fallback' => 1, // при промахе — старый ComponentConfig::getActionByURI()
    ),

    // Twig (параллельно XSLT)
    'twig' => array(
        'enabled'   => 0,
        'paths'     => array($_SERVER['DOCUMENT_ROOT'].'/app/templates'),
        'cache_dir' => $_SERVER['DOCUMENT_ROOT'].'/var/cache/twig',
        'debug'     => 1,
        'auto_reload'=> 1,
    ),

    // Файлы (Flysystem)
    'files' => array(
        'default_adapter' => 'local', // local|s3|ftp
        'local' => array(
            'root' => $_SERVER['DOCUMENT_ROOT'].'/var/storage',
        ),
        's3' => array(
            'key'     => 'AWS_KEY',
            'secret'  => 'AWS_SECRET',
            'region'  => 'eu-central-1',
            'bucket'  => 'bucket-name',
            'prefix'  => 'uploads',
            'endpoint'=> null,
        ),
        'ftp' => array(
            'host'     => '127.0.0.1',
            'port'     => 21,
            'username' => 'user',
            'password' => 'pass',
            'root'     => '/',
            'ssl'      => false,
            'passive'  => true,
            'timeout'  => 30,
        ),
    ),

    // Изображения (Glide)
    'images' => array(
        'enabled'  => 1,
        'source'   => $_SERVER['DOCUMENT_ROOT'].'/var/storage/images',
        'cache'    => $_SERVER['DOCUMENT_ROOT'].'/var/cache/glide',
        'base_url' => '/img',
        'sign_key' => null, // например 'your-secret' (тогда ссылки подписываем)
        'defaults' => array('fit' => 'max', 'q' => 80),
        'cache_max_age' => 604800,
        'gc_interval'   => 3600,
    ),

    // Переводы (Symfony Translation)
    'i18n' => array(
        'enabled'        => 1,
        'default_locale' => 'uk',
        'fallbacks'      => array('uk','ru','en'),
        'cache'          => array(
            'enabled' => 1,
            'dir'     => $_SERVER['DOCUMENT_ROOT'].'/var/cache/trans',
        ),
        // время жизни кеша переводов
        'cache_ttl'     => 3600,
        // источники переводов можно описать здесь, если не из БД
        'resources'      => array(
            // ['locale'=>'uk','domain'=>'messages','file'=>$_SERVER['DOCUMENT_ROOT'].'/app/trans/messages.uk.php'],
        ),
    ),

    // настройки языкового кеша
    'language' => array(
        'cache_ttl' => 3600,
    ),

    // Валидация (Symfony Validator)
    'validation' => array(
        'enabled' => 1,
        // mapping правил из FieldDescription → Symfony Constraints смотри в вашем маппере
    ),

    // Пагинация (Pagerfanta)
    'pagination' => array(
        'default_per_page' => 20,
        'max_per_page'     => 100,
    ),

    // Производительность / OPcache / Preload (для справки сборщику)
    'opcache' => array(
        'preload_script' => $_SERVER['DOCUMENT_ROOT'].'/opcache-preload.php',
        'jit'            => 1255,
    ),


);

