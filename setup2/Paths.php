<?php

declare(strict_types=1);

namespace Setup2;

final class Paths
{
    private function __construct()
    {
    }

    public static function projectRoot(): string
    {
        return dirname(__DIR__);
    }

    public static function resolve(string $relativePath): string
    {
        $relativePath = str_replace(['\\', '/'], DIRECTORY_SEPARATOR, $relativePath);
        $relativePath = ltrim($relativePath, DIRECTORY_SEPARATOR);

        if ($relativePath === '') {
            return self::projectRoot();
        }

        return self::projectRoot() . DIRECTORY_SEPARATOR . $relativePath;
    }

    public static function ensureDirectory(string $absolutePath, int $mode = 0o775): bool
    {
        if (is_dir($absolutePath)) {
            return true;
        }

        if (@mkdir($absolutePath, $mode, true) || is_dir($absolutePath)) {
            return true;
        }

        return false;
    }

    public static function relativeToRoot(string $absolutePath): string
    {
        $root = self::projectRoot();

        if (str_starts_with($absolutePath, $root)) {
            $relative = substr($absolutePath, strlen($root));

            return ltrim(str_replace(['\\', '/'], '/', $relative), '/');
        }

        return str_replace(['\\', '/'], '/', $absolutePath);
    }
}
