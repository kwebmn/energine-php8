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
    $result = $installer->run($actionName, array_slice($argv, 2));
} catch (\InvalidArgumentException $exception) {
    fwrite(STDERR, $exception->getMessage() . PHP_EOL);
    exit(1);
} catch (\Throwable $exception) {
    fwrite(STDERR, $exception->getMessage() . PHP_EOL);
    exit(1);
}

$stream = $result->success ? STDOUT : STDERR;

fwrite($stream, $result->message . PHP_EOL);

if ($result->details !== null) {
    fwrite($stream, print_r($result->details, true) . PHP_EOL);
}

if ($result->logPointer !== null) {
    fwrite($stream, 'See log: ' . $result->logPointer . PHP_EOL);
}

exit($result->success ? 0 : 1);
