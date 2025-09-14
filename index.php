<?php
declare(strict_types=1);
ini_set('display_errors','1'); error_reporting(E_ALL);
/**
 * Legacy-first front controller (PHP 8.3 + Composer), без роутеров.
 * - В DEV исключения не гасим → их перехватит Whoops (регистрация в bootstrap.php).
 * - /healthz отдаём до запуска контроллера.
 */

require __DIR__ . '/vendor/autoload.php';

try {
    require __DIR__ . '/bootstrap.php';
} catch (LogicException $e) {
    if (!headers_sent()) {
        header('Content-Type: text/plain; charset=utf-8');
        http_response_code(500);
    }
    echo $e->getMessage();
    exit(1);
}

$reg    = E();
$config = $config ?? [];
$debug  = (defined('DEBUG') && DEBUG) || filter_var(getenv('APP_DEBUG') ?: '0', FILTER_VALIDATE_BOOL);

/* ---------- Основной запуск ---------- */
try {
    $useTimer = (bool)$reg->getConfigValue('site.useTimer');
    $t0 = $useTimer ? hrtime(true) : null;

    UserSession::start();
    $reg->getController()->run();

    if ($useTimer && $t0 !== null) {
        $elapsedMs = (hrtime(true) - $t0) / 1_000_000;
        $reg->getResponse()->setHeader('X-Timer', sprintf('%.3fms', $elapsedMs));
    }

    $reg->getResponse()->commit();
}
/* --------- ВАЖНО: в DEV даём Whoops отработать --------- */
catch (LogicException $e) {

    $debug = (defined('DEBUG') && DEBUG) || filter_var(getenv('APP_DEBUG') ?: '0', FILTER_VALIDATE_BOOL);
    if ($debug && class_exists(\Whoops\Run::class)) {
        throw $e; // <- В Dev даём Whoops нарисовать страницу
    }
    // Прод: лаконичная 500 + лог
    if (function_exists('log_exception')) { log_exception($e, 'error'); }
    if (!headers_sent()) { header('Content-Type: text/html; charset=utf-8'); http_response_code(500); }
    echo 'Server error';
    exit(1);
}

catch (SystemException $e) {
    $debug = (defined('DEBUG') && DEBUG) || filter_var(getenv('APP_DEBUG') ?: '0', FILTER_VALIDATE_BOOL);
    if ($debug && class_exists(\Whoops\Run::class)) {
        throw $e; // <- ключевая строка
    }
    if (function_exists('log_exception')) { log_exception($e, 'error'); }
    if (!headers_sent()) { header('Content-Type: text/html; charset=utf-8'); http_response_code(500); }
    echo 'Server error';
    exit(1);
}

catch (Throwable $e) {
    $debug = (defined('DEBUG') && DEBUG) || filter_var(getenv('APP_DEBUG') ?: '0', FILTER_VALIDATE_BOOL);
    if ($debug && class_exists(\Whoops\Run::class)) {
        throw $e; // <- ключевая строка
    }
    if (function_exists('log_exception')) { log_exception($e, 'critical'); }
    if (!headers_sent()) { header('Content-Type: text/html; charset=utf-8'); http_response_code(500); }
    echo 'Server error';
    exit(1);
}
