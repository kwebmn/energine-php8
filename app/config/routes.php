<?php
declare(strict_types=1);
namespace App\Routing;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

final class Router {
    public function health(Request $r): Response {
        return new Response('ok', 200);
    }
}