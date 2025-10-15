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
use Symfony\Component\Routing\Exception\MethodNotAllowedException;
use Symfony\Component\Routing\Exception\ResourceNotFoundException;
use Symfony\Component\Routing\Matcher\UrlMatcher;
use Symfony\Component\Routing\RequestContext;
use Symfony\Component\Routing\RouteCollection;
use Throwable;

final class Kernel
{
    private bool $bootstrapped = false;
    private ?\Registry $registry = null;
    /** @var array<mixed> */
    private array $config = [];
    private ?RouteCollection $routes = null;

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
            if ($response = $this->dispatchHttpRoutes($request)) {
                return $response;
            }

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

    private function dispatchHttpRoutes(Request $request): ?HttpResponse
    {
        $routerConfig = $this->config['router'] ?? [];
        $enabled = (bool)($routerConfig['enabled'] ?? false);
        if (!$enabled) {
            return null;
        }

        $routes = $this->getRouteCollection($routerConfig);
        if (!$routes instanceof RouteCollection || $routes->count() === 0) {
            return null;
        }

        $context = new RequestContext();
        $context->fromRequest($request);

        $matcher = new UrlMatcher($routes, $context);
        $fallbackEnabled = (bool)($routerConfig['legacy_fallback'] ?? true);

        try {
            $parameters = $matcher->match($request->getPathInfo());
        } catch (ResourceNotFoundException|MethodNotAllowedException) {
            return $fallbackEnabled ? null : $this->createNotFoundResponse();
        }

        $controller = $parameters['_controller'] ?? null;
        if ($controller === null) {
            return $fallbackEnabled ? null : $this->createNotFoundResponse();
        }

        unset($parameters['_controller'], $parameters['_route']);

        $callable = $this->resolveControllerCallable($controller);
        $arguments = $this->buildControllerArguments($callable, $request, $parameters);

        $response = call_user_func_array($callable, $arguments);
        if (!$response instanceof HttpResponse) {
            throw new LogicException('Контроллер маршрута должен возвращать экземпляр Symfony Response.');
        }

        return $response;
    }

    /**
     * @param array<string, mixed> $routerConfig
     */
    private function getRouteCollection(array $routerConfig): ?RouteCollection
    {
        if ($this->routes instanceof RouteCollection) {
            return $this->routes;
        }

        $routesFile = (string)($routerConfig['routes_file'] ?? '');
        if ($routesFile === '' || !is_file($routesFile)) {
            return null;
        }

        $cache = $routerConfig['cache'] ?? [];
        $cacheEnabled = (bool)($cache['enabled'] ?? false);
        $cacheFile = $cache['file'] ?? null;

        if ($cacheEnabled && is_string($cacheFile) && is_file($cacheFile)) {
            $cached = @file_get_contents($cacheFile);
            if (is_string($cached) && $cached !== '') {
                $routes = @unserialize($cached, ['allowed_classes' => true]);
                if ($routes instanceof RouteCollection) {
                    return $this->routes = $routes;
                }
            }
        }

        $routes = require $routesFile;
        if (!$routes instanceof RouteCollection) {
            throw new LogicException(sprintf('Файл маршрутов %s должен возвращать RouteCollection.', $routesFile));
        }

        if ($cacheEnabled && is_string($cacheFile) && $cacheFile !== '') {
            $dir = dirname($cacheFile);
            if (!is_dir($dir)) {
                @mkdir($dir, 0777, true);
            }
            @file_put_contents($cacheFile, serialize($routes));
        }

        return $this->routes = $routes;
    }

    private function resolveControllerCallable(mixed $controller): callable
    {
        if (is_string($controller) && str_contains($controller, '::')) {
            [$class, $method] = explode('::', $controller, 2);
            $instance = $this->instantiateControllerClass($class);
            if (!is_callable([$instance, $method])) {
                throw new LogicException(sprintf('Метод %s::%s не является вызываемым.', $class, $method));
            }

            return [$instance, $method];
        }

        if (is_array($controller)) {
            if (isset($controller[0]) && is_string($controller[0])) {
                $controller[0] = $this->instantiateControllerClass($controller[0]);
            }

            if (!is_callable($controller)) {
                throw new LogicException('Маршрут указывает на некорректный контроллер.');
            }

            return $controller;
        }

        if ($controller instanceof \Closure) {
            return $controller;
        }

        if (is_object($controller) && method_exists($controller, '__invoke')) {
            return $controller;
        }

        if (is_string($controller) && function_exists($controller)) {
            return $controller;
        }

        throw new LogicException('Не удалось разрешить контроллер маршрута.');
    }

    private function instantiateControllerClass(string $class): object
    {
        if (!class_exists($class)) {
            throw new LogicException(sprintf('Класс контроллера %s не найден.', $class));
        }

        if (function_exists('container')) {
            try {
                $container = container();
                if ($container->has($class)) {
                    $service = $container->get($class);
                    if (is_object($service)) {
                        return $service;
                    }
                }
            } catch (Throwable) {
                // fallback к прямому созданию экземпляра
            }
        }

        return new $class();
    }

    /**
     * @param array<string, mixed> $attributes
     */
    private function buildControllerArguments(callable $callable, Request $request, array $attributes): array
    {
        if (is_array($callable)) {
            $reflection = new \ReflectionMethod($callable[0], $callable[1]);
        } elseif ($callable instanceof \Closure) {
            $reflection = new \ReflectionFunction($callable);
        } elseif (is_object($callable) && method_exists($callable, '__invoke')) {
            $reflection = new \ReflectionMethod($callable, '__invoke');
        } elseif (is_string($callable) && function_exists($callable)) {
            $reflection = new \ReflectionFunction($callable);
        } else {
            throw new LogicException('Невозможно проанализировать параметры контроллера.');
        }

        $arguments = [];

        foreach ($reflection->getParameters() as $parameter) {
            $type = $parameter->getType();
            if ($type instanceof \ReflectionNamedType && !$type->isBuiltin() && is_a($type->getName(), Request::class, true)) {
                $arguments[] = $request;
                continue;
            }

            $name = $parameter->getName();
            if (array_key_exists($name, $attributes)) {
                $arguments[] = $attributes[$name];
                unset($attributes[$name]);
                continue;
            }

            if ($parameter->isDefaultValueAvailable()) {
                $arguments[] = $parameter->getDefaultValue();
                continue;
            }

            throw new LogicException(sprintf('Для контроллера не хватает аргумента "%s".', $name));
        }

        return $arguments;
    }

    private function createNotFoundResponse(): HttpResponse
    {
        return new HttpResponse(
            'Not Found',
            HttpResponse::HTTP_NOT_FOUND,
            ['Content-Type' => 'text/plain; charset=utf-8']
        );
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
