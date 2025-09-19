<?php

declare(strict_types=1);

use Setup2\Installer;

$securityHeaders = [
    'X-Content-Type-Options' => 'nosniff',
    'X-Frame-Options' => 'DENY',
    'Referrer-Policy' => 'no-referrer',
    'Content-Security-Policy' => "default-src 'self'",
];

foreach ($securityHeaders as $headerName => $headerValue) {
    header(sprintf('%s: %s', $headerName, $headerValue));
}

$allowedMethods = ['GET', 'POST'];
$requestMethod = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? ''));

if (!in_array($requestMethod, $allowedMethods, true)) {
    http_response_code(405);
    header('Allow: ' . implode(', ', $allowedMethods));
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Method Not Allowed';
    exit;
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

require_once __DIR__ . '/../vendor/autoload.php';

session_start();

$alerts = $_SESSION['setup2_alerts'] ?? [];
unset($_SESSION['setup2_alerts']);

$csrfToken = $_SESSION['setup2_csrf_token'] ?? null;
if (!is_string($csrfToken) || $csrfToken === '') {
    $csrfToken = bin2hex(random_bytes(32));
    $_SESSION['setup2_csrf_token'] = $csrfToken;
}

$installer = new Installer();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $acceptHeader = strtolower((string) ($_SERVER['HTTP_ACCEPT'] ?? ''));
    $wantsJson = str_contains($acceptHeader, 'application/json');
    $postedToken = (string) ($_POST['_csrf_token'] ?? '');

    if (!hash_equals($csrfToken, $postedToken)) {
        http_response_code(403);

        if ($wantsJson) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'status' => 'error',
                'message' => 'Invalid CSRF token.',
            ]);
        } else {
            header('Content-Type: text/plain; charset=utf-8');
            echo 'Forbidden';
        }

        exit;
    }

    $actionName = trim((string) ($_POST['action'] ?? ''));
    $actionArgs = $_POST;

    if (is_array($actionArgs)) {
        unset($actionArgs['_csrf_token'], $actionArgs['action']);
    } else {
        $actionArgs = [];
    }
    $message = '';
    $status = 'success';
    $statusCode = 200;
    $logEntries = [];
    $details = null;
    $logPointer = null;

    try {
        $logEntries[] = sprintf('[%s] Starting "%s" action.', date('Y-m-d H:i:s'), $actionName);
        $result = $installer->run($actionName, $actionArgs);
        $message = $result->message;
        $status = $result->success ? 'success' : 'error';
        $statusCode = $result->success ? 200 : 500;
        $details = $result->details;
        $logPointer = $result->logPointer;
        $logEntries[] = sprintf('[%s] %s', date('Y-m-d H:i:s'), $message);

        if (is_array($details)) {
            $encodedDetails = json_encode($details, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            $logEntries[] = sprintf('[%s] Details: %s', date('Y-m-d H:i:s'), is_string($encodedDetails) ? $encodedDetails : print_r($details, true));
        }

        if (is_string($logPointer) && $logPointer !== '') {
            $logEntries[] = sprintf('[%s] Log pointer: %s', date('Y-m-d H:i:s'), $logPointer);
        }
    } catch (\InvalidArgumentException $exception) {
        $message = $exception->getMessage();
        $status = 'error';
        $statusCode = 400;
        $logEntries[] = sprintf('[%s] %s', date('Y-m-d H:i:s'), $message);
    } catch (\Throwable $exception) {
        $message = sprintf('Failed to execute action "%s".', $actionName);
        $status = 'error';
        $statusCode = 500;
        $logEntries[] = sprintf('[%s] %s', date('Y-m-d H:i:s'), $exception->getMessage());
    }

    $logText = implode("\n", $logEntries);

    if ($wantsJson) {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        $response = [
            'status' => $status,
            'message' => $message,
            'action' => $actionName,
        ];

        if ($logText !== '') {
            $response['log'] = $logText;
        }

        if ($details !== null) {
            $response['details'] = $details;
        }

        if ($logPointer !== null) {
            $response['logPointer'] = $logPointer;
        }

        echo json_encode($response);
        exit;
    }

    $_SESSION['setup2_alerts'] = [[
        'status' => $status,
        'message' => $message,
        'action' => $actionName,
        'log' => $logText,
        'details' => $details,
        'logPointer' => $logPointer,
    ]];
    header('Location: ' . (string) $_SERVER['PHP_SELF'], true, 303);
    exit;
}

$actions = $installer->listActions();

ob_start();
include __DIR__ . '/View/home.php';
$content = (string) ob_get_clean();

include __DIR__ . '/View/layout.php';
