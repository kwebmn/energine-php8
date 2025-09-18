<?php

declare(strict_types=1);

namespace Setup2\Actions;

use Setup2\ActionResult;

interface ActionInterface
{
    /**
     * @param array<mixed> $args
     */
    public function execute(array $args = []): ActionResult;
}
