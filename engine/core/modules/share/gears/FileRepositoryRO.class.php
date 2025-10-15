<?php

declare(strict_types=1);

/**
 * Read-only file repository.
 *
 * Разрешает только загрузку ALT-изображений (ресайзов) в кеш.
 * Все прочие операции записи/удаления — запрещены.
 */
class FileRepositoryRO extends FileRepositoryLocal implements IFileRepository
{
    public function getName(): string
    {
        return 'ro';
    }

    public function allowsCreateDir(): bool
    {
        return false;
    }
    public function allowsUploadFile(): bool
    {
        return false;
    }
    public function allowsEditDir(): bool
    {
        return true;
    }   // как в оригинале
    public function allowsEditFile(): bool
    {
        return true;
    }   // как в оригинале
    public function allowsDeleteDir(): bool
    {
        return false;
    }
    public function allowsDeleteFile(): bool
    {
        return false;
    }

    public function uploadFile($sourceFilename, $destFilename): mixed
    {
        throw new SystemException('ERR_REPOSITORY_READ_ONLY', SystemException::ERR_WARNING, (string)$destFilename);
    }

    public function uploadAlt($sourceFilename, $destFilename, $width, $height): mixed
    {
        $altPath = str_replace(
            ['[width]', '[height]', '[upl_path]'],
            [(string)(int)$width, (string)(int)$height, (string)$destFilename],
            self::IMAGE_ALT_CACHE
        );

        $this->writeFromSource((string)$sourceFilename, $altPath, true, true);

        return $this->analyze($altPath);
    }

    public function putFile($fileData, $filePath): mixed
    {
        throw new SystemException('ERR_REPOSITORY_READ_ONLY', SystemException::ERR_WARNING, (string)$filePath);
    }

    public function updateFile($sourceFilename, $destFilename): bool
    {
        throw new SystemException('ERR_REPOSITORY_READ_ONLY', SystemException::ERR_WARNING, (string)$destFilename);
    }

    public function updateAlt($sourceFilename, $destFilename, $width, $height): bool
    {
        throw new SystemException('ERR_REPOSITORY_READ_ONLY', SystemException::ERR_WARNING, (string)$destFilename);
    }

    public function deleteFile($filename): bool
    {
        throw new SystemException('ERR_REPOSITORY_READ_ONLY', SystemException::ERR_WARNING, (string)$filename);
    }

    public function deleteAlt($filename, $width, $height): bool
    {
        throw new SystemException('ERR_REPOSITORY_READ_ONLY', SystemException::ERR_WARNING, (string)$filename);
    }

    public function createDir($dir): bool
    {
        throw new SystemException('ERR_REPOSITORY_READ_ONLY', SystemException::ERR_WARNING, (string)$dir);
    }

    public function renameDir($dir)
    {
        throw new SystemException('ERR_REPOSITORY_READ_ONLY', SystemException::ERR_WARNING, (string)$dir);
    }

    public function deleteDir($dir): bool
    {
        throw new SystemException('ERR_REPOSITORY_READ_ONLY', SystemException::ERR_WARNING, (string)$dir);
    }
}
