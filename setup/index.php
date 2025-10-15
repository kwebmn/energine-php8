<?php

declare(strict_types=1);

ob_start();

define('CHARSET', 'UTF-8');

//Минимальная версия РНР
define('MIN_PHP_VERSION', 5.3);

$safeRealpath = static function ($path) {
    $resolved = @realpath($path);

    return ($resolved !== false) ? $resolved : null;
};

$rootCandidates = [
    $safeRealpath(__DIR__ . '/..') ?: dirname(__DIR__),
    dirname(dirname(__DIR__)),
];

$projectRoot = $rootCandidates[0];
foreach ($rootCandidates as $candidate) {
    if ($candidate && is_file($candidate . '/system.config.php')) {
        $projectRoot = $candidate;
        break;
    }
}

if (!defined('HTDOCS_DIR')) {
    define('HTDOCS_DIR', $projectRoot);
}

$bootstrapConfig = [];
$configPath = HTDOCS_DIR . '/system.config.php';
if (is_file($configPath)) {
    $loadedConfig = include $configPath;
    if (is_array($loadedConfig)) {
        $bootstrapConfig = $loadedConfig;
    }
}

$coreRel = defined('CORE_REL_DIR') ? CORE_REL_DIR : (string)($bootstrapConfig['core_rel_dir'] ?? 'engine/core');
$siteRel = defined('SITE_REL_DIR') ? SITE_REL_DIR : (string)($bootstrapConfig['site_rel_dir'] ?? 'site');

if (!defined('CORE_REL_DIR')) {
    define('CORE_REL_DIR', $coreRel);
}
if (!defined('SITE_REL_DIR')) {
    define('SITE_REL_DIR', $siteRel);
}

$coreDir = $safeRealpath(HTDOCS_DIR . DIRECTORY_SEPARATOR . CORE_REL_DIR)
    ?: HTDOCS_DIR . DIRECTORY_SEPARATOR . CORE_REL_DIR;
$siteDir = $safeRealpath(HTDOCS_DIR . DIRECTORY_SEPARATOR . SITE_REL_DIR)
    ?: HTDOCS_DIR . DIRECTORY_SEPARATOR . SITE_REL_DIR;

if (!defined('CORE_DIR')) {
    define('CORE_DIR', $coreDir);
}
if (!defined('SITE_DIR')) {
    define('SITE_DIR', $siteDir);
}

if (!defined('SETUP_DIR')) {
    define('SETUP_DIR', __DIR__);
}

//Название директории в которой содержатся модули(как ядра, так и модули проекта)
define('MODULES', 'modules');

$acceptableActions = array(
    'install',
    'linker',
    'clearCache',
    'syncUploads',
    'scriptMap',
    'loadTransFile',
    'exportTrans',
    'untranslated',
    'minify',
);

//вариант запуска приложения
$isConsole = false;

//действие по умолчанию
$action = 'install';

//Смотрим а как запущен сетап(консоль/веб)
//Ориентируемся на наличие $argv - как показатель
if (isset($argv)) {
    $args = $argv;
    //консоль
    $isConsole = true;
    array_shift($args); // имя скрипта (index.php)
    array_shift($args); // ключевое слово setup
}
else {
    //веб
    $args = array_keys($_GET);
}

$additionalArgs  = array();
//если нам в параметрах пришло что то очень похожее на допустимое действие
//то считаем, что это оно и есть
if (!empty($args)) {
    list($action) = $args;


    if(count($args)>1){
        $additionalArgs = $args;
        unset($additionalArgs[0]);
    }
}


try {
    require_once('Setup.class.php');
    $setup = new Setup($isConsole);
    $setup->execute($action, $additionalArgs);


    //Ну вроде как все проверили
    //на этот момент у нас есть вся необходимая информация
    //как для инсталляции так и для линкера

    //Запускаем одноименную функцию
    //Тут позволили себе использваоть переменное имя функции поскольку все равно это точно одно из приемлимых значений
    //впрочем наверное возможны варианты

}
catch (Exception $e) {
    if(ob_get_length()) ob_end_clean();
    echo 'При установке все пошло не так.', PHP_EOL, 'А точнее :', PHP_EOL, $e->getMessage();
}

$data = ob_get_contents();
if(ob_get_length())ob_end_clean();

echo PHP_EOL, $data, PHP_EOL, PHP_EOL;
exit;
