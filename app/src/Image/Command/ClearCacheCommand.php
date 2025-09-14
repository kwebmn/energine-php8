<?php

declare(strict_types=1);

namespace App\Image\Command;

use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(name: 'image:clear-cache', description: 'Clear Glide cache and pre-generated alts')]
final class ClearCacheCommand extends Command
{
    public function __construct(
        private readonly string $cacheDir,
        private readonly ?string $altsDir = null
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('path', null, InputOption::VALUE_REQUIRED, 'Relative path to clear', '');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $rel = trim((string)$input->getOption('path'), '/');
        $targets = [$this->cacheDir];
        if ($this->altsDir) {
            $targets[] = $this->altsDir;
        }
        foreach ($targets as $dir) {
            $target = rtrim($dir, '/') . ($rel ? '/' . $rel : '');
            if (is_dir($target)) {
                $this->rimraf($target);
            }
        }
        $output->writeln('<info>Image cache cleared</info>');
        return Command::SUCCESS;
    }

    private function rimraf(string $path): void
    {
        $it = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($path, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($it as $file) {
            $file->isDir() ? rmdir($file->getPathname()) : unlink($file->getPathname());
        }
        @rmdir($path);
    }
}
