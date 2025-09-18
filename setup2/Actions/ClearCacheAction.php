<?php

declare(strict_types=1);

namespace Setup2\Actions;

use FilesystemIterator;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use Setup2\ActionResult;
use Setup2\Paths;

final class ClearCacheAction implements ActionInterface
{
    /**
     * @var list<string>
     */
    private const CACHE_DIRECTORIES = [
        'var/cache',
        'var/cache/di',
        'var/cache/twig',
        'uploads/temp',
    ];

    /**
     * @param array<mixed> $args
     */
    public function execute(array $args = []): ActionResult
    {
        $dryRun = $this->hasFlag($args, ['--dry-run', '-n', 'dry-run']);
        $cleared = [];
        $missing = [];
        $totalFiles = 0;
        $totalDirectories = 0;

        foreach (self::CACHE_DIRECTORIES as $relativePath) {
            $absolutePath = Paths::resolve($relativePath);

            if (!is_dir($absolutePath)) {
                $missing[] = $relativePath;
                continue;
            }

            $stats = $dryRun
                ? $this->countDirectoryContents($absolutePath)
                : $this->removeDirectoryContents($absolutePath);

            $totalFiles += $stats['files'];
            $totalDirectories += $stats['directories'];
            $cleared[] = [
                'path' => $relativePath,
                'files' => $stats['files'],
                'directories' => $stats['directories'],
            ];
        }

        $details = [
            'dryRun' => $dryRun,
            'cleared' => $cleared,
            'missing' => $missing,
            'totalFiles' => $totalFiles,
            'totalDirectories' => $totalDirectories,
        ];

        $message = $dryRun
            ? 'Проверка очистки кэша выполнена (dry-run).'
            : 'Очистка кэш-директория завершена.';

        // TODO: добавить очистку кешей шаблонов и Doctrine после переноса на новую подсистему.

        return ActionResult::success($message, $details);
    }

    /**
     * @param array<mixed> $args
     * @param list<string> $flags
     */
    private function hasFlag(array $args, array $flags): bool
    {
        $normalized = array_map('strtolower', $flags);

        foreach ($args as $key => $value) {
            if (is_int($key) && is_string($value) && in_array(strtolower($value), $normalized, true)) {
                return true;
            }

            if (is_string($key) && in_array(strtolower($key), $normalized, true)) {
                if (is_bool($value)) {
                    return $value;
                }

                if (is_string($value)) {
                    return in_array(strtolower($value), ['1', 'true', 'yes', 'on'], true);
                }

                if (is_int($value)) {
                    return $value === 1;
                }
            }
        }

        return false;
    }

    /**
     * @return array{files:int, directories:int}
     */
    private function countDirectoryContents(string $directory): array
    {
        $files = 0;
        $directories = 0;

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($directory, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );

        foreach ($iterator as $item) {
            if ($item->isDir()) {
                $directories++;
            } else {
                $files++;
            }
        }

        return ['files' => $files, 'directories' => $directories];
    }

    /**
     * @return array{files:int, directories:int}
     */
    private function removeDirectoryContents(string $directory): array
    {
        $files = 0;
        $directories = 0;

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($directory, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );

        foreach ($iterator as $item) {
            $path = $item->getPathname();

            if ($item->isDir()) {
                if (@rmdir($path)) {
                    $directories++;
                }

                continue;
            }

            if (@unlink($path)) {
                $files++;
            }
        }

        return ['files' => $files, 'directories' => $directories];
    }
}
