<?php

declare(strict_types=1);

namespace Setup2;

use InvalidArgumentException;
use LogicException;
use Setup2\Actions\ActionInterface;
use Setup2\Actions\CheckEnvAction;
use Setup2\Actions\ClearCacheAction;
use Setup2\Actions\ExportTransAction;
use Setup2\Actions\InstallAction;
use Setup2\Actions\LinkerAction;
use Setup2\Actions\SyncUploadsAction;
use Setup2\Actions\UninstallAction;

final class Installer
{
    /**
     * @var array<string, class-string<ActionInterface>>
     */
    private const ACTION_MAP = [
        'check-env' => CheckEnvAction::class,
        'install' => InstallAction::class,
        'linker' => LinkerAction::class,
        'clear-cache' => ClearCacheAction::class,
        'sync-uploads' => SyncUploadsAction::class,
        'export-trans' => ExportTransAction::class,
        'uninstall' => UninstallAction::class,
    ];

    /**
     * @var array<string, ActionInterface>
     */
    private array $resolvedActions = [];

    /**
     * @param array<mixed> $args
     */
    public function run(string $action, array $args = []): ActionResult
    {
        $handler = $this->resolveAction($action);

        return $handler->execute($args);
    }

    /**
     * @return list<string>
     */
    public function listActions(): array
    {
        return array_keys(self::ACTION_MAP);
    }

    private function resolveAction(string $action): ActionInterface
    {
        if (isset($this->resolvedActions[$action])) {
            return $this->resolvedActions[$action];
        }

        $class = self::ACTION_MAP[$action] ?? null;

        if ($class === null) {
            throw new InvalidArgumentException(sprintf('Unknown installer action "%s".', $action));
        }

        $instance = new $class();

        if (!$instance instanceof ActionInterface) {
            throw new LogicException(sprintf(
                'Installer action "%s" must implement %s.',
                $action,
                ActionInterface::class
            ));
        }

        $this->resolvedActions[$action] = $instance;

        return $instance;
    }
}
