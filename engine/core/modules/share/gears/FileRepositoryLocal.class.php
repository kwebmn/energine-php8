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
        $source = (string)$sourceFilename;
        $dest   = (string)$destFilename;
        $dir    = dirname($dest);

        if (!is_dir($dir)) {
            [$created, $error] = $this->callFs(static fn(): bool => mkdir($dir, 0777, true));
            if ($created === false && !is_dir($dir)) {
                $context = $error !== null ? ['error' => $error] : [];
                throw new SystemException('ERR_DIR_WRITE', SystemException::ERR_CRITICAL, $dir, null, $context);
            }
        }
        if (!is_writable($dir)) {
            throw new SystemException('ERR_DIR_WRITE', SystemException::ERR_CRITICAL, $dir);
        }
        [$copied, $copyError] = $this->callFs(static fn(): bool => copy($source, $dest));
        if ($copied === false) {
            $context = $copyError !== null ? ['error' => $copyError] : [];
            throw new SystemException('ERR_COPY_UPLOADED_FILE', SystemException::ERR_CRITICAL, $dest, null, $context);
        }

        if (is_file($source)) {
            [$deleted, $deleteError] = $this->callFs(static fn(): bool => unlink($source));
            if ($deleted === false) {
                $ctx = ['file' => $source];
                if ($deleteError !== null) { $ctx['error'] = $deleteError; }
                $this->logWarning('FileRepositoryLocal: unable to remove source file after upload', $ctx);
            }
        }

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
        $path = (string)$filePath;
        $dir  = dirname($path);

        if (!is_dir($dir)) {
            [$created, $error] = $this->callFs(static fn(): bool => mkdir($dir, 0777, true));
            if ($created === false && !is_dir($dir)) {
                $context = $error !== null ? ['error' => $error] : [];
                throw new SystemException('ERR_DIR_WRITE', SystemException::ERR_CRITICAL, $dir, null, $context);
            }
        }
        if (!is_writable($dir)) {
            throw new SystemException('ERR_DIR_WRITE', SystemException::ERR_CRITICAL, $dir);
        }
        [$written, $writeError] = $this->callFs(static fn() => file_put_contents($path, $fileData));
        if ($written === false) {
            $context = $writeError !== null ? ['error' => $writeError] : [];
            throw new SystemException('ERR_PUT_FILE', SystemException::ERR_CRITICAL, $dir . DIRECTORY_SEPARATOR . $path, null, $context);
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
        $source = (string)$sourceFilename;
        $dest   = (string)$destFilename;

        [$copied, $copyError] = $this->callFs(static fn(): bool => copy($source, $dest));
        if ($copied === false) {
            $ctx = ['src' => $source, 'dest' => $dest];
            if ($copyError !== null) { $ctx['error'] = $copyError; }
            $this->logWarning('FileRepositoryLocal: updateFile copy failed', $ctx);
        }

        return $copied !== false;
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
        $path = (string)$filename;
        if (!is_file($path)) {
            return false;
        }

        [$deleted, $deleteError] = $this->callFs(static fn(): bool => unlink($path));
        if ($deleted === false) {
            $ctx = ['file' => $path];
            if ($deleteError !== null) { $ctx['error'] = $deleteError; }
            $this->logWarning('FileRepositoryLocal: deleteFile failed', $ctx);
            return false;
        }

        return true;
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

        [$created, $error] = $this->callFs(static fn(): bool => mkdir($dir));
        if ($created === false) {
            $ctx = ['dir' => $dir];
            if ($error !== null) { $ctx['error'] = $error; }
            $this->logWarning('FileRepositoryLocal: createDir failed', $ctx);
            return false;
        }

        return true;
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

        [$items, $scanError] = $this->callFs(static fn() => scandir($dir));
        if (!is_array($items)) {
            if ($scanError !== null) {
                $this->logWarning('FileRepositoryLocal: unable to read directory contents', ['dir' => $dir, 'error' => $scanError]);
            }
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
                [$deleted, $deleteError] = $this->callFs(static fn(): bool => unlink($path));
                if ($deleted === false) {
                    $ctx = ['file' => $path];
                    if ($deleteError !== null) { $ctx['error'] = $deleteError; }
                    $this->logWarning('FileRepositoryLocal: unable to remove file', $ctx);
                    return false;
                }
            }
        }

        [$removed, $removeError] = $this->callFs(static fn(): bool => rmdir($dir));
        if ($removed === false) {
            $ctx = ['dir' => $dir];
            if ($removeError !== null) { $ctx['error'] = $removeError; }
            $this->logWarning('FileRepositoryLocal: unable to remove directory', $ctx);
            return false;
        }

        return true;
    }

    /**
     * @return array{0:mixed,1:?string}
     */
    protected function callFs(callable $operation): array
    {
        $result = null;
        $error  = null;

        set_error_handler(static function (int $severity, string $message, string $file = '', int $line = 0): bool {
            throw new \ErrorException($message, 0, $severity, $file, $line);
        });

        try {
            $result = $operation();
        } catch (\ErrorException $e) {
            $result = false;
            $error  = $e->getMessage();
        } finally {
            restore_error_handler();
        }

        return [$result, $error];
    }

    protected function logWarning(string $message, array $context = []): void
    {
        try {
            if (function_exists('E')) {
                $reg = E();
                if (isset($reg->logger)) {
                    $reg->logger->warning($message, $context);
                    return;
                }
            }
        } catch (\Throwable) {
        }

        $suffix = $context ? ' ' . json_encode($context, JSON_UNESCAPED_UNICODE) : '';
        error_log($message . $suffix);
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
