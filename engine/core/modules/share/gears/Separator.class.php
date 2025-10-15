<?php

declare(strict_types=1);

/**
 * Separator element on toolbar.
 */
class Separator extends Control
{
    /**
     * @param string $id Unique separator ID.
     */
    public function __construct(string $id)
    {
        parent::__construct($id);
        $this->type = 'separator';
    }
}
