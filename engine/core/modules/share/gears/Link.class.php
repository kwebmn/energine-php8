<?php

declare(strict_types=1);

/**
 * Link control element.
 */
class Link extends Control
{
    /**
     * @param string      $id       Control ID.
     * @param string|null $action   Action name.
     * @param string|null $title    Control title.
     * @param string|null $tooltip  Control tooltip.
     */
    public function __construct(string $id, ?string $action = null, ?string $title = null, ?string $tooltip = null)
    {
        parent::__construct($id);
        $this->type = 'link';

        if ($action !== null && $action !== '')
        {
            $this->setAttribute('action', $action);
        }
        if ($title  !== null && $title  !== '')
        {
            $this->setAttribute('title', $title);
        }
        if ($tooltip !== null && $tooltip !== '')
        {
            $this->setAttribute('tooltip', $tooltip);
        }
    }

    /**
     * Set title.
     */
    public function setTitle(string $title): void
    {
        $this->setAttribute('title', $title);
    }

    /**
     * Get title.
     */
    public function getTitle(): ?string
    {
        $v = $this->getAttribute('title');
        return ($v !== false) ? (string)$v : null;
    }

    /**
     * Get action name.
     */
    public function getAction(): ?string
    {
        $v = $this->getAttribute('action');
        return ($v !== false) ? (string)$v : null;
    }

    /**
     * Set tooltip.
     */
    public function setTooltip(string $tooltip): void
    {
        $this->setAttribute('tooltip', $tooltip);
    }

    /**
     * Get tooltip.
     */
    public function getTooltip(): ?string
    {
        $v = $this->getAttribute('tooltip');
        return ($v !== false) ? (string)$v : null;
    }
}
