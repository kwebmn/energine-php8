<?php

declare(strict_types=1);

namespace Setup2\Actions;

use Setup2\ActionResult;
use Setup2\Paths;
use Throwable;

final class CheckEnvAction implements ActionInterface
{
    private const MIN_PHP_VERSION = '8.3.0';

    /**
     * @var array<string, array{required:bool, aliases:list<string>}>
     */
    private const EXTENSIONS = [
        'opcache' => ['required' => true, 'aliases' => ['opcache', 'Zend OPcache']],
        'pdo' => ['required' => true, 'aliases' => ['pdo']],
        'mbstring' => ['required' => true, 'aliases' => ['mbstring']],
        'json' => ['required' => true, 'aliases' => ['json']],
        'curl' => ['required' => true, 'aliases' => ['curl']],
        'openssl' => ['required' => true, 'aliases' => ['openssl']],
        'dom' => ['required' => true, 'aliases' => ['dom']],
        'simplexml' => ['required' => true, 'aliases' => ['SimpleXML', 'simplexml']],
        'fileinfo' => ['required' => true, 'aliases' => ['fileinfo']],
        'intl' => ['required' => false, 'aliases' => ['intl']],
        'zip' => ['required' => false, 'aliases' => ['zip']],
        'gd' => ['required' => false, 'aliases' => ['gd', 'gd2']],
    ];

    /**
     * @var list<array{path:string, required:bool}>
     */
    private const DIRECTORIES = [
        ['path' => 'var', 'required' => true],
        ['path' => 'var/cache', 'required' => true],
        ['path' => 'var/log', 'required' => true],
        ['path' => 'var/export', 'required' => false],
        ['path' => 'uploads', 'required' => true],
        ['path' => 'uploads/public', 'required' => true],
        ['path' => 'uploads/temp', 'required' => false],
    ];

    /**
     * @param array<mixed> $args
     */
    public function execute(array $args = []): ActionResult
    {
        $phpOk = version_compare(PHP_VERSION, self::MIN_PHP_VERSION, '>=');
        $extensions = $this->checkExtensions();
        $directories = $this->checkDirectories();

        $missingExtensions = array_filter(
            $extensions,
            static fn(array $extension): bool => $extension['required'] && !$extension['loaded']
        );

        $problemDirectories = array_filter(
            $directories,
            static fn(array $directory): bool => $directory['required'] && !$directory['satisfied']
        );

        $success = $phpOk && $missingExtensions === [] && $problemDirectories === [];

        $message = $success
            ? 'Окружение соответствует минимальным требованиям.'
            : 'Обнаружены проблемы окружения. Проверьте детали.';

        $details = [
            'php' => [
                'current' => PHP_VERSION,
                'required' => self::MIN_PHP_VERSION,
                'satisfied' => $phpOk,
            ],
            'extensions' => $extensions,
            'directories' => $directories,
        ];

        // TODO: расширить проверку на наличие сервисов (Redis, RabbitMQ и т.д.) после интеграции.

        return $success
            ? ActionResult::success($message, $details)
            : ActionResult::failure($message, $details);
    }

    /**
     * @return list<array{name:string, required:bool, loaded:bool, aliases:list<string>, status:string}>
     */
    private function checkExtensions(): array
    {
        $results = [];

        foreach (self::EXTENSIONS as $name => $meta) {
            $loaded = false;

            foreach ($meta['aliases'] as $alias) {
                if (extension_loaded($alias)) {
                    $loaded = true;
                    break;
                }
            }

            $status = $loaded ? 'ok' : ($meta['required'] ? 'error' : 'warning');

            $results[] = [
                'name' => $name,
                'required' => $meta['required'],
                'loaded' => $loaded,
                'aliases' => $meta['aliases'],
                'status' => $status,
            ];
        }

        return $results;
    }

    /**
     * @return list<array{
     *     path:string,
     *     required:bool,
     *     exists:bool,
     *     writable:bool,
     *     writeTest:?bool,
     *     parent:?string,
     *     parentWritable:bool,
     *     canCreate:bool,
     *     satisfied:bool,
     *     status:string
     * }>
     */
    private function checkDirectories(): array
    {
        $results = [];

        foreach (self::DIRECTORIES as $meta) {
            $relativePath = $meta['path'];
            $absolutePath = Paths::resolve($relativePath);
            $exists = is_dir($absolutePath);
            $nativeWritable = $exists && is_writable($absolutePath);
            $writeTest = $exists ? $this->canWriteIntoDirectory($absolutePath) : null;
            $parentPath = $this->findExistingParent($absolutePath);
            $parentWritable = $parentPath !== null ? is_writable($parentPath) : false;
            $canCreate = !$exists && $parentWritable;
            $satisfied = $exists ? (($writeTest ?? false) || $nativeWritable) : $canCreate;

            $status = 'ok';
            if (!$exists && $canCreate) {
                $status = 'pending';
            } elseif (!$satisfied) {
                $status = $meta['required'] ? 'error' : 'warning';
            } elseif ($exists && !$nativeWritable) {
                $status = 'warning';
            }

            $results[] = [
                'path' => $relativePath,
                'required' => $meta['required'],
                'exists' => $exists,
                'writable' => $nativeWritable,
                'writeTest' => $writeTest,
                'parent' => $parentPath !== null ? Paths::relativeToRoot($parentPath) : null,
                'parentWritable' => $parentWritable,
                'canCreate' => $canCreate,
                'satisfied' => $satisfied,
                'status' => $status,
            ];
        }

        return $results;
    }

    private function canWriteIntoDirectory(string $directory): bool
    {
        if (!is_dir($directory) || !is_writable($directory)) {
            return false;
        }

        try {
            $tempName = '.setup2_' . bin2hex(random_bytes(6));
        } catch (Throwable $exception) {
            $tempName = '.setup2_' . uniqid('', false);
        }

        $filePath = rtrim($directory, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $tempName;
        $bytes = @file_put_contents($filePath, 'setup2');

        if ($bytes === false) {
            return false;
        }

        @unlink($filePath);

        return true;
    }

    private function findExistingParent(string $path): ?string
    {
        $root = Paths::projectRoot();
        $current = dirname($path);

        while (!is_dir($current)) {
            if ($current === '' || $current === DIRECTORY_SEPARATOR || !str_starts_with($current, $root)) {
                return null;
            }

            $next = dirname($current);

            if ($next === $current) {
                return null;
            }

            $current = $next;
        }

        return $current;
    }
}
