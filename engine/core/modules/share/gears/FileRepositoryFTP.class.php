<?php

declare(strict_types=1);

/**
 * Flysystem-backed FTP repository implementation.
 */
class FileRepositoryFTP extends FileRepositoryLocal implements IFileRepository
{
    public function getName(): string
    {
        return 'ftp';
    }

    protected function resolveAdapterName(): string
    {
        return 'ftp';
    }
}
