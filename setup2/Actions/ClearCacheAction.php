<?php

declare(strict_types=1);

namespace Setup2\Actions;

use Setup2\ActionResult;

final class ClearCacheAction implements ActionInterface
{
    /**
     * @param array<mixed> $args
     */
    public function execute(array $args = []): ActionResult
    {
        $details = ['cleared' => true];

        if ($args !== []) {
            $details['args'] = $args;
        }

        return ActionResult::success('Cache cleared successfully.', $details);
    }
}
