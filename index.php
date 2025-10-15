<?php

declare(strict_types=1);

use App\Kernel;
use Symfony\Component\HttpFoundation\Request;

require_once __DIR__ . '/vendor/autoload_runtime.php';

return function (array $context): void {
    $kernel = new Kernel($context['APP_ENV'], (bool) $context['APP_DEBUG']);

    $request = Request::createFromGlobals();
    $response = $kernel->handle($request);

    $response->send();
    $kernel->terminate($request, $response);
};
