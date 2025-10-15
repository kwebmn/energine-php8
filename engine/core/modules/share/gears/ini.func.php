<?php

declare(strict_types=1);

/**
 * Initialisation file (PHP 8.3 + Composer).
 * - Без самописного autoload: используем Composer.
 * - Корректная таймзона Europe/Kyiv.
 * - Единый обработчик ошибок → исключения (SystemException если доступен).
 */

// ------------------------------------------------------------------
// CGI hack (историческая совместимость)
// ------------------------------------------------------------------
if (isset($_SERVER['SCRIPT_FILENAME']))
{
    $_SERVER['SCRIPT_FILENAME'] = $_SERVER['PATH_TRANSLATED'] ?? $_SERVER['SCRIPT_FILENAME'];
}

// ------------------------------------------------------------------
// Ошибки / таймзона
// ------------------------------------------------------------------
$DEBUG = (defined('DEBUG') && DEBUG) || filter_var(getenv('APP_DEBUG') ?: '0', FILTER_VALIDATE_BOOL);

error_reporting(E_ALL);
@ini_set('display_errors', $DEBUG ? '1' : '0');
@ini_set('html_errors', '0');
@ini_set('log_errors', '1');

@date_default_timezone_set('Europe/Kyiv');

// Для аккуратной диагностики XSLT/libxml
libxml_use_internal_errors(true);

// ------------------------------------------------------------------
// Константы путей (оставлены для совместимости со старым кодом)
// ------------------------------------------------------------------
if (defined('SITE_DIR'))
{
    defined('SITE_COMPONENTS_DIR') || define('SITE_COMPONENTS_DIR', SITE_DIR . '/modules/*/components');
    defined('SITE_GEARS_DIR')      || define('SITE_GEARS_DIR', SITE_DIR . '/modules/*/gears');
    defined('SITE_KERNEL_DIR')     || define('SITE_KERNEL_DIR', SITE_DIR . '/kernel');
}
if (defined('CORE_DIR'))
{
    defined('CORE_COMPONENTS_DIR') || define('CORE_COMPONENTS_DIR', CORE_DIR . '/modules/*/components');
    defined('CORE_GEARS_DIR')      || define('CORE_GEARS_DIR', CORE_DIR . '/modules/*/gears');
}

// ------------------------------------------------------------------
// Константы прав доступа (совместимость)
// ------------------------------------------------------------------
defined('ACCESS_NONE') || define('ACCESS_NONE', 0);
defined('ACCESS_READ') || define('ACCESS_READ', 1);
defined('ACCESS_EDIT') || define('ACCESS_EDIT', 2);
defined('ACCESS_FULL') || define('ACCESS_FULL', 3);

// ------------------------------------------------------------------
// ВАЖНО: удалили самописный автозагрузчик и прямые require старых классов.
// Composer загрузит классы через psr-4/classmap из composer.json.
// ------------------------------------------------------------------
// !! РАНЬШЕ ЗДЕСЬ БЫЛО:
// require_once('Registry.class.php');
// require_once('Cache.class.php');
// spl_autoload_register(function (...) { ... });
// Теперь не нужно.

// ------------------------------------------------------------------
// Обработчик ошибок → исключения
// ------------------------------------------------------------------
set_error_handler('nrgnErrorHandler');

/**
 * Преобразует все ошибки PHP в исключения.
 * Если есть SystemException — используем её c кодом ERR_DEVELOPER и проставляем file/line.
 *
 * @param int         $errLevel
 * @param string      $message
 * @param string|null $file
 * @param int|null    $line
 * @return bool
 * @throws SystemException|\ErrorException
 */
function nrgnErrorHandler(int $errLevel, string $message, ?string $file = null, ?int $line = null): bool
{
    // Уважать маску error_reporting()
    if ((error_reporting() & $errLevel) === 0)
    {
        return false;
    }

    $msg = $message;

    // Если ошибка связана с XSLT/libxml — добавим детали
    if (str_contains($message, 'XSLTProcessor'))
    {
        $xmlErrors = libxml_get_errors();
        if ($xmlErrors)
        {
            $details = [];
            foreach ($xmlErrors as $e)
            {
                $details[] = trim(sprintf('[libxml] %s (file: %s; line: %d)', $e->message, $e->file ?: '-', $e->line));
            }
            if ($details)
            {
                $msg .= "\n" . implode("\n", $details);
            }
        }
        libxml_clear_errors();
    }

    // Бросаем совместимый тип исключения
    if (class_exists('SystemException'))
    {
        /** @var SystemException $ex */
        $ex = new SystemException($msg, \SystemException::ERR_DEVELOPER);
        if (method_exists($ex, 'setFile') && $file !== null)
        {
            $ex->setFile($file);
        }
        if (method_exists($ex, 'setLine') && $line !== null)
        {
            $ex->setLine($line);
        }
        throw $ex;
    }

    throw new \ErrorException($msg, 0, $errLevel, $file ?? 'unknown', $line ?? 0);
}
