<?php
declare(strict_types=1);

/**
 * Implementation of IFileRepository for local repositories (filesystem).
 *
 * Репозиторий пишет файлы напрямую в ФС, без удалённых протоколов.
 */
class FileRepositoryLocal extends BaseObject implements IFileRepository
{
    /**
     * Шаблон пути для альтернативных изображений (ресайзов).
     * Пример: uploads/alts/resizer/w200-h100/uploads/public/path/to/img.jpg
     */
    public const IMAGE_ALT_CACHE = 'uploads/alts/resizer/w[width]-h[height]/[upl_path]';

    /** Внутренний ID репозитория (из share_uploads.upl_id). */
    protected int $id;

    /** Базовый путь репозитория (например, "uploads/public"). */
    protected string $base;

    public function __construct($id, $base)
    {
        $this->setId((int)$id);
        $this->setBase((string)$base);
    }

    public function getName(): string
    {
        return 'local';
    }

    public function setId($id): self
    {
        $this->id = (int)$id;
        return $this;
    }

    public function getId(): int
    {
        return $this->id;
    }

    public function setBase($base): self
    {
        $this->base = (string)$base;
        return $this;
    }

    public function getBase(): string
    {
        return $this->base;
    }

    public function allowsCreateDir(): bool { return true; }
    public function allowsUploadFile(): bool { return true; }
    public function allowsEditDir(): bool   { return true; }
    public function allowsEditFile(): bool  { return true; }
    public function allowsDeleteDir(): bool { return true; }
    public function allowsDeleteFile(): bool{ return true; }

    /**
     * @copydoc IFileRepository::uploadFile
     *
     * @throws SystemException 'ERR_DIR_WRITE'
     * @throws SystemException 'ERR_COPY_UPLOADED_FILE'
     */
    public function uploadFile($sourceFilename, $destFilename)
    {
        $dir = dirname((string)$destFilename);

        if (!is_dir($dir) && !@mkdir($dir, 0777, true)) {
            throw new SystemException('ERR_DIR_WRITE', SystemException::ERR_CRITICAL, $dir);
        }
        if (!is_writable($dir)) {
            throw new SystemException('ERR_DIR_WRITE', SystemException::ERR_CRITICAL, $dir);
        }
        if (!@copy((string)$sourceFilename, (string)$destFilename)) {
            throw new SystemException('ERR_COPY_UPLOADED_FILE', SystemException::ERR_CRITICAL, (string)$destFilename);
        }

        @unlink((string)$sourceFilename);

        return $this->analyze($destFilename);
    }

    /**
     * Записать данные в файл.
     *
     * @throws SystemException 'ERR_DIR_WRITE'
     * @throws SystemException 'ERR_PUT_FILE'
     */
    public function putFile($fileData, $filePath)
    {
        $dir = dirname((string)$filePath);

        if (!is_dir($dir) && !@mkdir($dir, 0777, true)) {
            throw new SystemException('ERR_DIR_WRITE', SystemException::ERR_CRITICAL, $dir);
        }
        if (!is_writable($dir)) {
            throw new SystemException('ERR_DIR_WRITE', SystemException::ERR_CRITICAL, $dir);
        }
        if (@file_put_contents((string)$filePath, $fileData) === false) {
            throw new SystemException('ERR_PUT_FILE', SystemException::ERR_CRITICAL, $dir . DIRECTORY_SEPARATOR . (string)$filePath);
        }

        return $this->analyze($filePath);
    }

    public function uploadAlt($sourceFilename, $destFilename, $width, $height)
    {
        $altPath = str_replace(
            ['[width]', '[height]', '[upl_path]'],
            [(string)(int)$width, (string)(int)$height, (string)$destFilename],
            self::IMAGE_ALT_CACHE
        );

        return $this->uploadFile($sourceFilename, $altPath);
    }

    public function updateFile($sourceFilename, $destFilename): bool
    {
        return @copy((string)$sourceFilename, (string)$destFilename);
    }

    public function updateAlt($sourceFilename, $destFilename, $width, $height): bool
    {
        $altPath = str_replace(
            ['[width]', '[height]', '[upl_path]'],
            [(string)(int)$width, (string)(int)$height, (string)$destFilename],
            self::IMAGE_ALT_CACHE
        );

        return $this->updateFile($sourceFilename, $altPath);
    }

    public function deleteFile($filename): bool
    {
        return @unlink((string)$filename);
    }

    public function deleteAlt($filename, $width, $height): bool
    {
        // Исторически: удаляет исходный путь, а не расчётный alt-путь.
        // Сохраняем поведение для обратной совместимости.
        return $this->deleteFile($filename);
    }

    public function analyze($filename)
    {
        $fi = E()->FileRepoInfo->analyze((string)$filename, true);
        if (is_object($fi)) {
            $fi->ready = true;
        }
        return $fi;
    }

    /**
     * @copydoc IFileRepository::createDir
     *
     * @throws SystemException 'ERR_DIR_CREATE'
     */
    public function createDir($dir): bool
    {
        $dir = (string)$dir;
        if (is_dir($dir)) {
            return true;
        }

        $parentDir = dirname($dir);
        if (!is_dir($parentDir) || !is_writable($parentDir)) {
            throw new SystemException('ERR_DIR_CREATE', SystemException::ERR_CRITICAL, $parentDir);
        }

        return @mkdir($dir);
    }

    /**
     * @copydoc IFileRepository::renameDir
     *
     * @throws SystemException 'ERR_UNIMPLEMENTED_YET'
     */
    public function renameDir($dir)
    {
        throw new SystemException('ERR_UNIMPLEMENTED_YET');
    }

    /**
     * @copydoc IFileRepository::deleteDir
     */
    public function deleteDir($dir): bool
    {
        return $this->rmdirRecursive((string)$dir);
    }

    private function rmdirRecursive(string $dir): bool
    {
        if (!is_dir($dir)) {
            return false;
        }

        $items = @scandir($dir);
        if ($items === false) {
            return false;
        }

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            $path = $dir . DIRECTORY_SEPARATOR . $item;

            if (is_dir($path) && !is_link($path)) {
                if (!$this->rmdirRecursive($path)) {
                    return false;
                }
            } else {
                if (!@unlink($path)) {
                    return false;
                }
            }
        }

        return @rmdir($dir);
    }

    public function prepare(&$data)
    {
        return $data;
    }

    /**
     * @copydoc IFileRepository::setPrepareFunction
     *
     * @throws SystemException 'ERR_NOT_USED'
     */
    public function setPrepareFunction($func)
    {
        throw new SystemException('ERR_NOT_USED');
    }
}
