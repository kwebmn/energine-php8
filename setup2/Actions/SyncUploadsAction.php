<?php

declare(strict_types=1);

namespace Setup2\Actions;

use FilesystemIterator;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use Setup2\ActionResult;
use Setup2\Paths;

final class SyncUploadsAction implements ActionInterface
{
    /**
     * @param array<mixed> $args
     */
    public function execute(array $args = []): ActionResult
    {
        $uploadsRoot = Paths::resolve('uploads');
        $publicRoot = Paths::resolve('uploads/public');
        $tempRoot = Paths::resolve('uploads/temp');

        $created = [];
        $existing = [];
        $failedDirectories = [];

        foreach ([$uploadsRoot, $publicRoot, $tempRoot] as $directory) {
            if (is_dir($directory)) {
                $existing[] = Paths::relativeToRoot($directory);
                continue;
            }

            if (Paths::ensureDirectory($directory)) {
                $created[] = Paths::relativeToRoot($directory);
            } else {
                $failedDirectories[] = Paths::relativeToRoot($directory);
            }
        }

        if ($failedDirectories !== []) {
            return ActionResult::failure('Не удалось подготовить директории загрузок.', [
                'failedDirectories' => $failedDirectories,
            ]);
        }

        $dryRun = $this->hasFlag($args, ['--dry-run', '-n', 'dry-run']);
        $requestedFiles = $this->extractRequestedFiles($args);
        $autoDiscovered = false;

        if ($requestedFiles === []) {
            $requestedFiles = $this->scanDirectory($tempRoot);
            $autoDiscovered = true;
        }

        $synced = [];
        $skipped = [];

        foreach ($requestedFiles as $relativePath) {
            $source = rtrim($tempRoot, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $relativePath;
            $destination = rtrim($publicRoot, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $relativePath;

            if (!is_file($source)) {
                $skipped[] = ['path' => $relativePath, 'reason' => 'source-missing'];
                continue;
            }

            if ($dryRun) {
                $synced[] = ['path' => $relativePath, 'action' => 'would-move'];
                continue;
            }

            $destinationDirectory = dirname($destination);
            Paths::ensureDirectory($destinationDirectory);

            if (@rename($source, $destination)) {
                $synced[] = ['path' => $relativePath, 'action' => 'moved'];
            } elseif (@copy($source, $destination)) {
                $synced[] = ['path' => $relativePath, 'action' => 'copied'];
            } else {
                $skipped[] = ['path' => $relativePath, 'reason' => 'write-failed'];
            }
        }

        $details = [
            'createdDirectories' => $created,
            'existingDirectories' => $existing,
            'failedDirectories' => $failedDirectories,
            'dryRun' => $dryRun,
            'autoDiscovered' => $autoDiscovered,
            'requestedFiles' => $requestedFiles,
            'synced' => $synced,
            'skipped' => $skipped,
        ];

        // TODO: добавить синхронизацию метаданных в БД и очистку старых записей share_uploads.

        return ActionResult::success('Синхронизация файлов загрузок завершена.', $details);
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
     * @param array<mixed> $args
     * @return list<string>
     */
    private function extractRequestedFiles(array $args): array
    {
        $files = [];

        foreach ($args as $key => $value) {
            if (is_int($key) && is_string($value)) {
                if ($value === '' || str_starts_with($value, '-')) {
                    continue;
                }

                $files[] = $this->normalizeRelativePath($value);
                continue;
            }

            if (is_string($key) && strtolower($key) === 'files') {
                if (is_string($value)) {
                    if ($value === '' || str_starts_with($value, '-')) {
                        continue;
                    }

                    $files[] = $this->normalizeRelativePath($value);
                    continue;
                }

                if (is_array($value)) {
                    foreach ($value as $item) {
                        if (!is_string($item) || $item === '' || str_starts_with($item, '-')) {
                            continue;
                        }

                        $files[] = $this->normalizeRelativePath($item);
                    }
                }
            }
        }

        return array_values(array_unique(array_filter($files, static fn(string $file): bool => $file !== '')));
    }

    /**
     * @return list<string>
     */
    private function scanDirectory(string $directory): array
    {
        if (!is_dir($directory)) {
            return [];
        }

        $files = [];
        $normalizedDirectory = rtrim($directory, DIRECTORY_SEPARATOR);

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($normalizedDirectory, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );

        $baseLength = strlen($normalizedDirectory);

        foreach ($iterator as $file) {
            if ($file->isDir()) {
                continue;
            }

            $relative = substr($file->getPathname(), $baseLength + 1);
            if ($relative === false) {
                $relative = $file->getFilename();
            }

            $files[] = $this->normalizeRelativePath($relative);
        }

        return $files;
    }

    private function normalizeRelativePath(string $path): string
    {
        $path = str_replace(['\\', '/'], '/', $path);
        $path = ltrim($path, '/');

        return $path;
    }
}
