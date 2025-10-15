<?php

declare(strict_types=1);

namespace App\File;

use Aws\S3\S3Client;
use League\Flysystem\AwsS3V3\AwsS3V3FilesystemAdapter;
use League\Flysystem\Filesystem;
use League\Flysystem\FilesystemOperator;
use League\Flysystem\Ftp\FtpAdapter;
use League\Flysystem\Ftp\FtpConnectionOptions;
use League\Flysystem\Local\LocalFilesystemAdapter;
use League\Flysystem\UnixVisibility\PortableVisibilityConverter;
use League\Flysystem\Visibility;
use RuntimeException;

/**
 * Lazily creates Flysystem filesystem operators based on configuration.
 */
final class FlysystemManager
{
    /** @var array<string,mixed> */
    private array $config;

    /** @var array<string,FilesystemOperator> */
    private array $instances = [];

    /**
     * @param array<string,mixed> $config
     */
    public function __construct(array $config = [])
    {
        $this->config = $config;
    }

    public function getDefaultAdapterName(): string
    {
        $default = (string)($this->config['default_adapter'] ?? 'local');
        return $default !== '' ? $default : 'local';
    }

    public function getDefaultFilesystem(): FilesystemOperator
    {
        return $this->get($this->getDefaultAdapterName());
    }

    public function get(string $name): FilesystemOperator
    {
        $adapter = $name !== '' ? $name : $this->getDefaultAdapterName();

        if (!isset($this->instances[$adapter])) {
            $this->instances[$adapter] = $this->createFilesystem($adapter);
        }

        return $this->instances[$adapter];
    }

    private function createFilesystem(string $adapter): FilesystemOperator
    {
        return match ($adapter) {
            'local' => $this->createLocalFilesystem(),
            'ftp'   => $this->createFtpFilesystem(),
            's3'    => $this->createS3Filesystem(),
            default => throw new RuntimeException(sprintf('Unsupported filesystem adapter "%s"', $adapter)),
        };
    }

    private function createLocalFilesystem(): FilesystemOperator
    {
        $cfg  = is_array($this->config['local'] ?? null) ? $this->config['local'] : [];
        $root = (string)($cfg['root'] ?? '');

        if ($root === '') {
            $root = (string)($_SERVER['DOCUMENT_ROOT'] ?? '');
        }

        $trimmed = rtrim($root, "\\/");
        if ($trimmed !== '' && !preg_match('~^[A-Za-z]:$~', $trimmed)) {
            $root = $trimmed;
        }

        if ($root === '') {
            throw new RuntimeException('Flysystem local adapter requires "files.local.root" configuration.');
        }

        if (!is_dir($root)) {
            throw new RuntimeException(sprintf('Flysystem local adapter root "%s" does not exist or is not a directory.', $root));
        }

        $visibility = PortableVisibilityConverter::fromArray([
            Visibility::PUBLIC => 0755,
            Visibility::PRIVATE => 0700,
        ], Visibility::PUBLIC);

        $adapter = new LocalFilesystemAdapter($root, $visibility);

        return new Filesystem($adapter);
    }

    private function createFtpFilesystem(): FilesystemOperator
    {
        $cfg = is_array($this->config['ftp'] ?? null) ? $this->config['ftp'] : [];
        $host = (string)($cfg['host'] ?? '');
        if ($host === '') {
            throw new RuntimeException('Flysystem FTP adapter requires "files.ftp.host" configuration.');
        }

        $options = FtpConnectionOptions::fromArray([
            'host' => $host,
            'root' => (string)($cfg['root'] ?? ''),
            'username' => (string)($cfg['username'] ?? ''),
            'password' => (string)($cfg['password'] ?? ''),
            'port' => (int)($cfg['port'] ?? 21),
            'ssl' => (bool)($cfg['ssl'] ?? false),
            'passive' => (bool)($cfg['passive'] ?? true),
            'timeout' => (int)($cfg['timeout'] ?? 30),
        ]);

        $adapter = new FtpAdapter($options);

        return new Filesystem($adapter);
    }

    private function createS3Filesystem(): FilesystemOperator
    {
        $cfg = is_array($this->config['s3'] ?? null) ? $this->config['s3'] : [];
        $bucket = (string)($cfg['bucket'] ?? '');
        if ($bucket === '') {
            throw new RuntimeException('Flysystem S3 adapter requires "files.s3.bucket" configuration.');
        }

        $clientConfig = [
            'credentials' => [
                'key'    => (string)($cfg['key'] ?? ''),
                'secret' => (string)($cfg['secret'] ?? ''),
            ],
            'region'  => (string)($cfg['region'] ?? ''),
            'version' => 'latest',
        ];

        if (!empty($cfg['endpoint'])) {
            $clientConfig['endpoint'] = (string)$cfg['endpoint'];
        }

        $client = new S3Client($clientConfig);

        $adapter = new AwsS3V3FilesystemAdapter(
            $client,
            $bucket,
            (string)($cfg['prefix'] ?? '')
        );

        return new Filesystem($adapter);
    }
}
