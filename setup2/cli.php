<?php

declare(strict_types=1);

use Setup2\Installer;

require_once __DIR__ . '/../vendor/autoload.php';

$installer = new Installer();

if ($argc < 2) {
    fwrite(STDERR, 'Usage: php setup2/cli.php <action> [args...]' . PHP_EOL);
    exit(1);
}

$rawAction = trim((string) ($argv[1] ?? ''));

if ($rawAction === '') {
    fwrite(STDERR, 'Usage: php setup2/cli.php <action> [args...]' . PHP_EOL);
    exit(1);
}

$availableActions = $installer->listActions();
$aliases = [];

foreach ($availableActions as $availableAction) {
    $aliases[strtolower($availableAction)] = $availableAction;
    $camelCaseAlias = preg_replace_callback(
        '/-([a-z])/',
        static fn(array $matches): string => strtoupper($matches[1]),
        $availableAction
    );

    if (is_string($camelCaseAlias)) {
        $aliases[strtolower($camelCaseAlias)] = $availableAction;
    }
}

$actionName = $aliases[strtolower($rawAction)] ?? $rawAction;

try {
    $installer->runAction($actionName);
} catch (\Throwable $exception) {
    fwrite(STDERR, $exception->getMessage() . PHP_EOL);
    exit(1);
}
