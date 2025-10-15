<?php
namespace App\Image;

use Psr\Container\ContainerExceptionInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Log\LoggerInterface;

/**
 * Класс ImageService.
 * Предоставляет возможности для динамической генерации изображений
 * и обслуживания файлового кэша.
 * Использование: $service = new ImageService(); $service->render();
 */
final class ImageService
{
    /**
     * Генерирует изображение и при необходимости запускает очистку кэша.
     *
     * @return void
     */
    public function render(): void
    {
        $cacheDir     = (string)$this->registry()->getConfigValue('images.cache');
        $cacheMaxAge  = (int)$this->registry()->getConfigValue('images.cache_max_age');
        $gcInterval   = (int)$this->registry()->getConfigValue('images.gc_interval');
        $tsFile       = rtrim($cacheDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . '.gc_timestamp';

        $lastRun = is_file($tsFile) ? (int)file_get_contents($tsFile) : 0;
        $now     = time();

        if (!is_dir($cacheDir)) {
            $this->logWarning('ImageService: cache directory is not accessible', ['dir' => $cacheDir]);
            return;
        }

        if (($now - $lastRun) >= $gcInterval) {
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($cacheDir, \FilesystemIterator::SKIP_DOTS)
            );
            foreach ($iterator as $file) {
                /** @var \SplFileInfo $file */
                if ($file->isFile() && ($now - $file->getMTime()) >= $cacheMaxAge) {
                    $this->removeFile($file->getPathname());
                }
            }
            [$written, $error] = $this->callFs(static fn() => file_put_contents($tsFile, (string)$now));
            if ($written === false) {
                $ctx = ['file' => $tsFile];
                if ($error !== null) { $ctx['err'] = $error; }
                $this->logWarning('ImageService: unable to update GC timestamp', $ctx);
            }
        }

        // ...здесь должна быть логика генерации изображения...
    }

    /**
     * @return array{0:mixed,1:?string}
     */
    private function callFs(callable $operation): array
    {
        $result = null;
        $error  = null;

        set_error_handler(static function (int $severity, string $message, string $file = '', int $line = 0): bool {
            throw new \ErrorException($message, 0, $severity, $file, $line);
        });

        try {
            $result = $operation();
        } catch (\ErrorException $e) {
            $result = false;
            $error  = $e->getMessage();
        } finally {
            restore_error_handler();
        }

        return [$result, $error];
    }

    private function removeFile(string $path): void
    {
        if (!is_file($path)) {
            return;
        }

        [$result, $error] = $this->callFs(static fn(): bool => unlink($path));
        if ($result === false) {
            $ctx = ['file' => $path];
            if ($error !== null) { $ctx['err'] = $error; }
            $this->logWarning('ImageService: unable to delete cache file', $ctx);
        }
    }

    private function logWarning(string $message, array $context = []): void
    {
        try {
            if ($logger = $this->logger()) {
                $logger->warning($message, $context);
                return;
            }
        } catch (\Throwable) {
        }

        $suffix = $context ? ' ' . json_encode($context, JSON_UNESCAPED_UNICODE) : '';
        error_log($message . $suffix);
    }

    private function registry(): \Registry
    {
        if (function_exists('\\container')) {
            try {
                $container = \container();
                if ($container->has(\Registry::class)) {
                    $registry = $container->get(\Registry::class);
                    if ($registry instanceof \Registry) {
                        return $registry;
                    }
                }

                if ($container->has('registry')) {
                    $registry = $container->get('registry');
                    if ($registry instanceof \Registry) {
                        return $registry;
                    }
                }
            } catch (NotFoundExceptionInterface|ContainerExceptionInterface) {
                // fallback ниже
            }
        }

        return \Registry::getInstance();
    }

    private function logger(): ?LoggerInterface
    {
        if (function_exists('\\container')) {
            try {
                $container = \container();
                if ($container->has(LoggerInterface::class)) {
                    $logger = $container->get(LoggerInterface::class);
                    if ($logger instanceof LoggerInterface) {
                        return $logger;
                    }
                }
            } catch (NotFoundExceptionInterface|ContainerExceptionInterface) {
                // fallback на реестр
            }
        }

        $registry = $this->registry();
        if (isset($registry->logger) && $registry->logger instanceof LoggerInterface) {
            return $registry->logger;
        }

        return null;
    }
}
