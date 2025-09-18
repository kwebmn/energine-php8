<?php

declare(strict_types=1);

use InvalidArgumentException;
use Setup2\Installer;

require_once __DIR__ . '/../vendor/autoload.php';

$installer = new Installer();
$alerts = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $actionName = trim((string) ($_POST['action'] ?? ''));

    try {
        $installer->runAction($actionName);
        $alerts[] = sprintf('Action "%s" executed successfully.', $actionName);
    } catch (InvalidArgumentException $exception) {
        $alerts[] = $exception->getMessage();
    }
}

$actions = $installer->listActions();

ob_start();
include __DIR__ . '/View/home.php';
$content = (string) ob_get_clean();

include __DIR__ . '/View/layout.php';
