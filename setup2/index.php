<?php

declare(strict_types=1);

if (PHP_SAPI === 'cli') {
    require __DIR__ . '/cli.php';
    return;
}

$configPath = dirname(__DIR__) . '/system.config.php';

if (!is_file($configPath)) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Setup disabled (production mode)';
    exit;
}

$config = require $configPath;
$debugEnabled = false;

if (is_array($config)) {
    $siteConfig = $config['site'] ?? null;

    if (is_array($siteConfig) && array_key_exists('debug', $siteConfig)) {
        $debugValue = $siteConfig['debug'];
        $debugEnabled = $debugValue === true || $debugValue === 1 || $debugValue === '1';
    }
}

if (!$debugEnabled) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Setup disabled (production mode)';
    exit;
}

require __DIR__ . '/web.php';
