<?php

declare(strict_types=1);

namespace App;

use App\Bootstrap\EnergineBootstrapper;
use App\Security\LegacySecuritySynchronizer;
use LogicException;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\NotFoundExceptionInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response as HttpResponse;
use Throwable;

final class Kernel
{
    private bool $bootstrapped = false;
    private ?\Registry $registry = null;
    /** @var array<mixed> */
    private array $config = [];

    public function __construct(
        private readonly string $environment,
        private readonly bool $debug
    ) {
        ini_set('display_errors', '1');
        error_reporting(E_ALL);
    }

    public function handle(Request $request): HttpResponse
    {
        if (!$this->bootstrapped) {
            try {
                $this->bootstrap();
            } catch (LogicException $e) {
                return $this->renderBootstrapFailure($e);
            }
        }

        try {
            return $this->runEnergine($request);
        } catch (LogicException $e) {
            return $this->handleAppException($e, 'error');
        } catch (\SystemException $e) {
            return $this->handleAppException($e, 'error');
        } catch (Throwable $e) {
            return $this->handleAppException($e, 'critical');
        }
    }

    public function terminate(Request $request, HttpResponse $response): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }
    }

    private function bootstrap(): void
    {
        $this->config = EnergineBootstrapper::boot();
        $this->registry = $this->resolveRegistry();
        $this->bootstrapped = true;
    }

    private function renderBootstrapFailure(LogicException $e): HttpResponse
    {
        return new HttpResponse(
            $e->getMessage(),
            HttpResponse::HTTP_INTERNAL_SERVER_ERROR,
            ['Content-Type' => 'text/plain; charset=utf-8']
        );
    }

    private function runEnergine(Request $request): HttpResponse
    {
        $registry = $this->resolveRegistry();

        $useTimer = (bool)$registry->getConfigValue('site.useTimer');
        $start = $useTimer ? hrtime(true) : null;

        \UserSession::start();
        $this->synchroniseSecurityToken();
        $registry->getController()->run();

        if ($useTimer && $start !== null) {
            $elapsedMs = (hrtime(true) - $start) / 1_000_000;
            $registry->getResponse()->setHeader('X-Timer', sprintf('%.3fms', $elapsedMs));
        }

        return $registry->getResponse()->toHttpFoundationResponse();
    }

    private function handleAppException(Throwable $e, string $logLevel): HttpResponse
    {
        if ($this->shouldRethrow($e)) {
            throw $e;
        }

        if (function_exists('log_exception')) {
            log_exception($e, $logLevel);
        }

        return new HttpResponse(
            'Server error',
            HttpResponse::HTTP_INTERNAL_SERVER_ERROR,
            ['Content-Type' => 'text/html; charset=utf-8']
        );
    }

    private function shouldRethrow(Throwable $e): bool
    {
        $debugFlag = $this->isDebugMode();

        return $debugFlag && class_exists(\Whoops\Run::class);
    }

    private function isDebugMode(): bool
    {
        if (defined('DEBUG') && DEBUG) {
            return true;
        }

        if ($this->debug) {
            return true;
        }

        return (bool)filter_var(getenv('APP_DEBUG') ?: '0', FILTER_VALIDATE_BOOL);
}

    /**
     * Получить экземпляр Registry через контейнер PHP-DI.
     */
    private function resolveRegistry(): \Registry
    {
        if ($this->registry instanceof \Registry) {
            return $this->registry;
        }

        if (function_exists('\\container')) {
            try {
                $container = \container();
                if ($container->has(\Registry::class)) {
                    $registry = $container->get(\Registry::class);
                    if ($registry instanceof \Registry) {
                        return $this->registry = $registry;
                    }
                }

                if ($container->has('registry')) {
                    $registry = $container->get('registry');
                    if ($registry instanceof \Registry) {
                        return $this->registry = $registry;
                    }
                }
            } catch (NotFoundExceptionInterface|ContainerExceptionInterface) {
                // ниже fallback на singleton
            }
        }

        return $this->registry = \Registry::getInstance();
    }

    private function synchroniseSecurityToken(): void
    {
        if (!function_exists('container')) {
            return;
        }

        try {
            $container = container();
        } catch (\RuntimeException) {
            return;
        }

        if (!$container->has(LegacySecuritySynchronizer::class)) {
            return;
        }

        try {
            $container->get(LegacySecuritySynchronizer::class)->synchronise();
        } catch (Throwable $e) {
            if ($this->shouldRethrow($e)) {
                throw $e;
            }

            if (function_exists('log_exception')) {
                log_exception($e, 'warning');
            }
        }
    }
}
