<?php

declare(strict_types=1);

namespace Setup2\Actions;

use Setup2\ActionResult;

final class InstallAction implements ActionInterface
{
    /**
     * @param array<mixed> $args
     */
    public function execute(array $args = []): ActionResult
    {
        $details = ['installed' => true];

        if ($args !== []) {
            $details['args'] = $args;
        }

        return ActionResult::success('Installation completed successfully.', $details);
    }
}
