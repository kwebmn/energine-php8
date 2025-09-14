<?php
namespace App\Image;

/**
 * Service for dynamic image rendering and cache maintenance.
 */
final class ImageService
{
    /**
     * Render image and trigger cache garbage collection.
     *
     * @return void
     */
    public function render(): void
    {
        $cacheDir     = (string)E()->getConfigValue('images.cache');
        $cacheMaxAge  = (int)E()->getConfigValue('images.cache_max_age');
        $gcInterval   = (int)E()->getConfigValue('images.gc_interval');
        $tsFile       = rtrim($cacheDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . '.gc_timestamp';

        $lastRun = is_file($tsFile) ? (int)file_get_contents($tsFile) : 0;
        $now     = time();

        if (($now - $lastRun) >= $gcInterval) {
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($cacheDir, \FilesystemIterator::SKIP_DOTS)
            );
            foreach ($iterator as $file) {
                /** @var \SplFileInfo $file */
                if ($file->isFile() && ($now - $file->getMTime()) >= $cacheMaxAge) {
                    @unlink($file->getPathname());
                }
            }
            @file_put_contents($tsFile, (string)$now);
        }

        // ...здесь должна быть логика генерации изображения...
    }
}
