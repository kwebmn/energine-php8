<?php

declare(strict_types=1);

/**
 * Read-only FTP repository implementation.
 */
class FileRepositoryFTPRO extends FileRepositoryRO implements IFileRepository
{
    public function getName(): string
    {
        return 'ftpro';
    }

    protected function resolveAdapterName(): string
    {
        return 'ftp';
    }
}
