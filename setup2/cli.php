<?php

declare(strict_types=1);

use InvalidArgumentException;
use Setup2\Installer;

require_once __DIR__ . '/../vendor/autoload.php';

$installer = new Installer();

if ($argc < 2) {
    fwrite(STDERR, 'Usage: php cli.php <action>' . PHP_EOL);
    exit(1);
}

try {
    $installer->runAction($argv[1]);
} catch (InvalidArgumentException $exception) {
    fwrite(STDERR, $exception->getMessage() . PHP_EOL);
    exit(1);
}
