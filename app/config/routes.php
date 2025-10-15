<?php

declare(strict_types=1);

use App\Routing\Router;
use Symfony\Component\Routing\Route;
use Symfony\Component\Routing\RouteCollection;

$routes = new RouteCollection();
$routes->add('app_health_check', new Route(
    path: '/health',
    defaults: [
        '_controller' => Router::class . '::health',
    ],
    methods: ['GET']
));

return $routes;
