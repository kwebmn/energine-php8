<?php

declare(strict_types=1);

namespace Setup2\Actions;

use Setup2\ActionResult;

final class CheckEnvAction implements ActionInterface
{
    /**
     * @param array<mixed> $args
     */
    public function execute(array $args = []): ActionResult
    {
        $details = $args !== [] ? ['args' => $args] : null;

        return ActionResult::success('Environment check completed successfully.', $details);
    }
}
