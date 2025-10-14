<?php

declare(strict_types=1);

namespace App;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Minimal placeholder kernel to bootstrap the Symfony front controller.
 */
final class Kernel
{
    public function __construct(
        private readonly string $environment,
        private readonly bool $debug
    ) {
    }

    public function handle(Request $request): Response
    {
        return new Response(
            sprintf('Symfony kernel placeholder (env: %s, debug: %s)', $this->environment, $this->debug ? 'on' : 'off'),
            Response::HTTP_OK,
            ['Content-Type' => 'text/plain; charset=utf-8']
        );
    }

    public function terminate(Request $request, Response $response): void
    {
        // No background work yet.
    }
}
