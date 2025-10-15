<?php

declare(strict_types=1);

use App\File\FlysystemManager;
use League\Flysystem\FilesystemException;
use League\Flysystem\FilesystemOperator;

/**
 * Implementation of IFileRepository backed by Flysystem operators.
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

    private ?FlysystemManager $flysystemManager = null;

    private ?FilesystemOperator $filesystem = null;

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

    public function allowsCreateDir(): bool
    {
        return true;
    }
    public function allowsUploadFile(): bool
    {
        return true;
    }
    public function allowsEditDir(): bool
    {
        return true;
    }
    public function allowsEditFile(): bool
    {
        return true;
    }
    public function allowsDeleteDir(): bool
    {
        return true;
    }
    public function allowsDeleteFile(): bool
    {
        return true;
    }

    public function uploadFile($sourceFilename, $destFilename)
    {
        $source = (string)$sourceFilename;
        $dest   = (string)$destFilename;

        $info = $this->analyze($source);
        $this->writeFromSource($source, $dest, true, true);

        if (is_object($info))
        {
            $info->ready = true;
        }

        return $info;
    }

    public function putFile($fileData, $filePath)
    {
        $path       = (string)$filePath;
        $normalized = $this->normalizePath($path);

        try
        {
            $filesystem = $this->getFilesystem();
            if ($filesystem->fileExists($normalized))
            {
                $filesystem->delete($normalized);
            }
            $filesystem->write($normalized, (string)$fileData);
        }
        catch (FilesystemException $e)
        {
            throw new SystemException(
                'ERR_PUT_FILE',
                SystemException::ERR_CRITICAL,
                $path,
                null,
                ['error' => $e->getMessage()]
            );
        }

        return $this->analyze($path);
    }

    public function uploadAlt($sourceFilename, $destFilename, $width, $height)
    {
        $altPath = str_replace(
            ['[width]', '[height]', '[upl_path]'],
            [(string)(int)$width, (string)(int)$height, (string)$destFilename],
            self::IMAGE_ALT_CACHE
        );

        $this->writeFromSource((string)$sourceFilename, $altPath, true, true);

        return $this->analyze($altPath);
    }

    public function updateFile($sourceFilename, $destFilename): bool
    {
        return $this->writeFromSource((string)$sourceFilename, (string)$destFilename, true, false);
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
        $path       = (string)$filename;
        $normalized = $this->normalizePath($path);

        try
        {
            $filesystem = $this->getFilesystem();
            if (!$filesystem->fileExists($normalized))
            {
                return false;
            }

            $filesystem->delete($normalized);
        }
        catch (FilesystemException $e)
        {
            $this->logWarning('FileRepositoryLocal: deleteFile failed', ['file' => $path, 'error' => $e->getMessage()]);
            return false;
        }

        return true;
    }

    public function deleteAlt($filename, $width, $height): bool
    {
        return $this->deleteFile($filename);
    }

    public function analyze($filename)
    {
        $path = (string)$filename;

        if (is_file($path))
        {
            $fi = E()->FileRepoInfo->analyze($path, true);
            if (is_object($fi))
            {
                $fi->ready = true;
            }
            return $fi;
        }

        $normalized = $this->normalizePath($path);

        try
        {
            $filesystem = $this->getFilesystem();
            if (!$filesystem->fileExists($normalized))
            {
                return E()->FileRepoInfo->analyze($path, false);
            }

            $remoteStream = $filesystem->readStream($normalized);
            if (!is_resource($remoteStream))
            {
                throw new \RuntimeException('Unable to open remote stream');
            }

            $temp = tmpfile();
            if ($temp === false)
            {
                throw new \RuntimeException('Unable to create temporary file');
            }

            try
            {
                while (!feof($remoteStream))
                {
                    $chunk = fread($remoteStream, 8192);
                    if ($chunk === false)
                    {
                        throw new \RuntimeException('Unable to read remote chunk');
                    }
                    fwrite($temp, $chunk);
                }

                $meta    = stream_get_meta_data($temp);
                $tmpPath = $meta['uri'] ?? '';
                if ($tmpPath === '')
                {
                    throw new \RuntimeException('Temporary path unavailable');
                }

                $fi = E()->FileRepoInfo->analyze($tmpPath, true);
                if (is_object($fi))
                {
                    $fi->ready = true;
                }

                return $fi;
            }
            finally
            {
                fclose($remoteStream);
                fclose($temp);
            }
        }
        catch (\Throwable $e)
        {
            $this->logWarning('FileRepositoryLocal: analyze failed', ['file' => $path, 'error' => $e->getMessage()]);
        }

        return E()->FileRepoInfo->analyze($path, false);
    }

    public function createDir($dir): bool
    {
        $path       = (string)$dir;
        $normalized = $this->normalizePath($path);

        try
        {
            $filesystem = $this->getFilesystem();
            if ($filesystem->directoryExists($normalized))
            {
                return true;
            }

            $filesystem->createDirectory($normalized);
        }
        catch (FilesystemException $e)
        {
            throw new SystemException(
                'ERR_DIR_CREATE',
                SystemException::ERR_CRITICAL,
                $path,
                null,
                ['error' => $e->getMessage()]
            );
        }

        return true;
    }

    public function renameDir($dir)
    {
        throw new SystemException('ERR_UNIMPLEMENTED_YET');
    }

    public function deleteDir($dir): bool
    {
        $path       = (string)$dir;
        $normalized = $this->normalizePath($path);

        try
        {
            $filesystem = $this->getFilesystem();
            if (!$filesystem->directoryExists($normalized))
            {
                return false;
            }

            $filesystem->deleteDirectory($normalized);
        }
        catch (FilesystemException $e)
        {
            $this->logWarning('FileRepositoryLocal: unable to remove directory', ['dir' => $path, 'error' => $e->getMessage()]);
            return false;
        }

        return true;
    }

    public function prepare(&$data)
    {
        return $data;
    }

    public function setPrepareFunction($func)
    {
        throw new SystemException('ERR_NOT_USED');
    }

    protected function writeFromSource(string $source, string $destination, bool $overwrite, bool $deleteSource): bool
    {
        if (!is_file($source))
        {
            throw new SystemException('ERR_COPY_UPLOADED_FILE', SystemException::ERR_CRITICAL, $destination);
        }

        $normalized = $this->normalizePath($destination);

        $stream = fopen($source, 'rb');
        if ($stream === false)
        {
            throw new SystemException('ERR_COPY_UPLOADED_FILE', SystemException::ERR_CRITICAL, $destination);
        }

        try
        {
            $filesystem = $this->getFilesystem();

            if ($overwrite && $filesystem->fileExists($normalized))
            {
                $filesystem->delete($normalized);
            }

            $filesystem->writeStream($normalized, $stream);
        }
        catch (FilesystemException $e)
        {
            throw new SystemException(
                'ERR_COPY_UPLOADED_FILE',
                SystemException::ERR_CRITICAL,
                $destination,
                null,
                ['error' => $e->getMessage()]
            );
        }
        finally
        {
            fclose($stream);
        }

        if ($deleteSource && is_file($source) && !@unlink($source))
        {
            $this->logWarning('FileRepositoryLocal: unable to remove source file after upload', ['file' => $source]);
        }

        return true;
    }

    protected function normalizePath(string $path): string
    {
        $path   = str_replace('\\', '/', $path);
        $parts  = [];
        foreach (explode('/', $path) as $part)
        {
            if ($part === '' || $part === '.')
            {
                continue;
            }
            if ($part === '..')
            {
                array_pop($parts);
                continue;
            }
            $parts[] = $part;
        }

        return implode('/', $parts);
    }

    protected function resolveAdapterName(): string
    {
        return 'local';
    }

    protected function getFilesystem(): FilesystemOperator
    {
        if ($this->filesystem === null)
        {
            $this->filesystem = $this->getFlysystemManager()->get($this->resolveAdapterName());
        }

        return $this->filesystem;
    }

    protected function getFlysystemManager(): FlysystemManager
    {
        if ($this->flysystemManager === null)
        {
            try
            {
                $this->flysystemManager = container()->get(FlysystemManager::class);
            }
            catch (\Throwable $e)
            {
                throw new \RuntimeException('FlysystemManager service unavailable', 0, $e);
            }
        }

        return $this->flysystemManager;
    }

    protected function logWarning(string $message, array $context = []): void
    {
        try
        {
            if (function_exists('E'))
            {
                $reg = E();
                if (isset($reg->logger))
                {
                    $reg->logger->warning($message, $context);
                    return;
                }
            }
        }
        catch (\Throwable)
        {
        }

        $suffix = $context ? ' ' . json_encode($context, JSON_UNESCAPED_UNICODE) : '';
        error_log($message . $suffix);
    }
}
