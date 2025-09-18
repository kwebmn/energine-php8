<?php

declare(strict_types=1);

namespace Setup2\Actions;

use FilesystemIterator;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use Setup2\ActionResult;
use Setup2\Paths;

final class UninstallAction implements ActionInterface
{
    /**
     * @var list<string>
     */
    private const TARGETS = [
        'var/cache',
        'var/export',
        'var/log',
        'var/install-state.json',
        'uploads/public',
        'uploads/temp',
        'uploads',
    ];

    /**
     * @param array<mixed> $args
     */
    public function execute(array $args = []): ActionResult
    {
        if (!$this->isForceRequested($args)) {
            return ActionResult::failure('Для выполнения удаления требуется флаг подтверждения.', [
                'hint' => 'Добавьте --force или force=1, чтобы подтвердить деинсталляцию.',
            ]);
        }

        $removed = [];
        $missing = [];
        $errors = [];

        foreach (self::TARGETS as $relativePath) {
            $absolutePath = Paths::resolve($relativePath);

            if (!file_exists($absolutePath)) {
                $missing[] = $relativePath;
                continue;
            }

            if (!$this->removePath($absolutePath)) {
                $errors[] = $relativePath;
                continue;
            }

            $removed[] = $relativePath;
        }

        if ($errors !== []) {
            return ActionResult::failure('Не удалось удалить часть служебных директорий.', [
                'removed' => $removed,
                'missing' => $missing,
                'errors' => $errors,
            ]);
        }

        // TODO: добавить удаление БД и регистрационных данных после реализации подключения к БД.

        return ActionResult::success('Деинсталляция выполнена.', [
            'removed' => $removed,
            'missing' => $missing,
        ]);
    }

    /**
     * @param array<mixed> $args
     */
    private function isForceRequested(array $args): bool
    {
        foreach ($args as $key => $value) {
            if (is_int($key) && is_string($value) && in_array(strtolower($value), ['--force', '-f'], true)) {
                return true;
            }

            if (is_string($key) && strtolower($key) === 'force') {
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

    private function removePath(string $path): bool
    {
        $root = Paths::projectRoot();

        if (!str_starts_with($path, $root)) {
            return false;
        }

        if (is_file($path) || is_link($path)) {
            return @unlink($path);
        }

        if (!is_dir($path)) {
            return true;
        }

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($path, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );

        foreach ($iterator as $item) {
            $itemPath = $item->getPathname();

            if ($item->isDir()) {
                if (!@rmdir($itemPath)) {
                    return false;
                }

                continue;
            }

            if (!@unlink($itemPath)) {
                return false;
            }
        }

        return @rmdir($path);
    }
}
