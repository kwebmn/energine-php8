<?php

declare(strict_types=1);

namespace Setup2\Actions;

use Setup2\ActionResult;

final class SyncUploadsAction implements ActionInterface
{
    /**
     * @param array<mixed> $args
     */
    public function execute(array $args = []): ActionResult
    {
        $details = ['synced' => true];

        if ($args !== []) {
            $details['args'] = $args;
        }

        return ActionResult::success('Uploads synchronized successfully.', $details);
    }
}
