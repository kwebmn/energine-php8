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

    public function allowsCreateDir(): bool  { return false; }
    public function allowsUploadFile(): bool { return false; }
    public function allowsEditDir(): bool    { return true; }   // как в оригинале
    public function allowsEditFile(): bool   { return true; }   // как в оригинале
    public function allowsDeleteDir(): bool  { return false; }
    public function allowsDeleteFile(): bool { return false; }

    /**
     * Полная загрузка файла запрещена.
     *
     * @throws SystemException ERR_REPOSITORY_READ_ONLY
     */
    public function uploadFile($sourceFilename, $destFilename): mixed
    {
        throw new SystemException('ERR_REPOSITORY_READ_ONLY', SystemException::ERR_WARNING, (string)$destFilename);
    }

    /**
     * Разрешена только загрузка ALT-версии изображения в кеш.
     *
     * @throws SystemException ERR_COPY_UPLOADED_FILE
     * @throws SystemException ERR_DIR_WRITE
     */
    public function uploadAlt($sourceFilename, $destFilename, $width, $height): mixed
    {
        $altPath = str_replace(
            ['[width]', '[height]', '[upl_path]'],
            [(string)(int)$width, (string)(int)$height, (string)$destFilename],
            self::IMAGE_ALT_CACHE
        );

        $dir = \dirname($altPath);
        if (!is_dir($dir)) {
            [$created, $error] = $this->callFs(static fn(): bool => mkdir($dir, 0777, true));
            if ($created === false && !is_dir($dir)) {
                $context = $error !== null ? ['error' => $error] : [];
                throw new SystemException('ERR_DIR_WRITE', SystemException::ERR_CRITICAL, $dir, null, $context);
            }
        }

        $source = (string)$sourceFilename;
        [$copied, $copyError] = $this->callFs(static fn(): bool => copy($source, $altPath));
        if ($copied === false) {
            $context = $copyError !== null ? ['error' => $copyError] : [];
            throw new SystemException('ERR_COPY_UPLOADED_FILE', SystemException::ERR_CRITICAL, $altPath, null, $context);
        }

        return $this->analyze($altPath);
    }

    /**
     * Запись произвольных данных запрещена (добавлено для строгой RO-модели).
     *
     * @throws SystemException ERR_REPOSITORY_READ_ONLY
     */
    public function putFile($fileData, $filePath): mixed
    {
        throw new SystemException('ERR_REPOSITORY_READ_ONLY', SystemException::ERR_WARNING, (string)$filePath);
    }

    /**
     * Обновление исходного файла запрещено.
     *
     * @throws SystemException ERR_REPOSITORY_READ_ONLY
     */
    public function updateFile($sourceFilename, $destFilename): bool
    {
        throw new SystemException('ERR_REPOSITORY_READ_ONLY', SystemException::ERR_WARNING, (string)$destFilename);
    }

    /**
     * Обновление ALT-версии запрещено (чтобы соответствовать RO-политике).
     *
     * @throws SystemException ERR_REPOSITORY_READ_ONLY
     */
    public function updateAlt($sourceFilename, $destFilename, $width, $height): bool
    {
        throw new SystemException('ERR_REPOSITORY_READ_ONLY', SystemException::ERR_WARNING, (string)$destFilename);
    }

    /**
     * Удаление исходного файла запрещено.
     *
     * @throws SystemException ERR_REPOSITORY_READ_ONLY
     */
    public function deleteFile($filename): bool
    {
        throw new SystemException('ERR_REPOSITORY_READ_ONLY', SystemException::ERR_WARNING, (string)$filename);
    }

    /**
     * Удаление ALT-версии запрещено.
     *
     * @throws SystemException ERR_REPOSITORY_READ_ONLY
     */
    public function deleteAlt($filename, $width, $height): bool
    {
        throw new SystemException('ERR_REPOSITORY_READ_ONLY', SystemException::ERR_WARNING, (string)$filename);
    }

    /**
     * Создание каталогов запрещено.
     *
     * @throws SystemException ERR_REPOSITORY_READ_ONLY
     */
    public function createDir($dir): bool
    {
        throw new SystemException('ERR_REPOSITORY_READ_ONLY', SystemException::ERR_WARNING, (string)$dir);
    }

    /**
     * Переименование каталогов запрещено.
     *
     * @throws SystemException ERR_REPOSITORY_READ_ONLY
     */
    public function renameDir($dir)
    {
        throw new SystemException('ERR_REPOSITORY_READ_ONLY', SystemException::ERR_WARNING, (string)$dir);
    }

    /**
     * Удаление каталогов запрещено.
     *
     * @throws SystemException ERR_REPOSITORY_READ_ONLY
     */
    public function deleteDir($dir): bool
    {
        throw new SystemException('ERR_REPOSITORY_READ_ONLY', SystemException::ERR_WARNING, (string)$dir);
    }
}
