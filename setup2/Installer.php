<?php

declare(strict_types=1);

namespace Setup2;

use Setup2\Actions\CheckEnvAction;
use Setup2\Actions\ClearCacheAction;
use Setup2\Actions\ExportTransAction;
use Setup2\Actions\InstallAction;
use Setup2\Actions\SyncUploadsAction;
use Setup2\Actions\UninstallAction;

final class Installer
{
    /**
     * @var array<string, callable>
     */
    private array $actions;

    public function __construct()
    {
        $this->actions = [
            'check-env' => new CheckEnvAction(),
            'install' => new InstallAction(),
            'clear-cache' => new ClearCacheAction(),
            'sync-uploads' => new SyncUploadsAction(),
            'export-trans' => new ExportTransAction(),
            'uninstall' => new UninstallAction(),
        ];
    }

    public function runAction(string $name): void
    {
        $action = $this->actions[$name] ?? null;

        if (!is_callable($action)) {
            throw new \InvalidArgumentException(sprintf('Unknown installer action "%s".', $name));
        }

        $action();
    }

    /**
     * @return list<string>
     */
    public function listActions(): array
    {
        return array_keys($this->actions);
    }
}
