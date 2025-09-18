<?php

declare(strict_types=1);

namespace Setup2\Actions;

use Setup2\ActionResult;

final class UninstallAction implements ActionInterface
{
    /**
     * @param array<mixed> $args
     */
    public function execute(array $args = []): ActionResult
    {
        $details = ['uninstalled' => true];

        if ($args !== []) {
            $details['args'] = $args;
        }

        return ActionResult::success('Uninstallation completed successfully.', $details);
    }
}
