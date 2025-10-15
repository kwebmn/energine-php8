<?php

declare(strict_types=1);

/**
 * Button control on the toolbar.
 */
class Button extends Control
{
    /**
     * @param string     $id       Control ID.
     * @param mixed|null $action   Action name (legacy may pass false).
     * @param mixed|null $image    Image path.
     * @param mixed|null $title    Control title.
     * @param mixed|null $tooltip  Control tooltip.
     */
    public function __construct(string $id, mixed $action = null, mixed $image = null, mixed $title = null, mixed $tooltip = null)
    {
        parent::__construct($id);
        $this->type = 'button';

        // BC: в оригинале action ставился, если !== false (пустая строка допустима)
        if ($action !== false)
        {
            $this->setAttribute('action', (string)$action);
        }
        // Остальные — только если «есть значение»
        if ($image !== null && $image !== false && $image !== '')
        {
            $this->setAttribute('image', (string)$image);
        }
        if ($title !== null && $title !== false && $title !== '')
        {
            $this->setAttribute('title', (string)$title);
        }
        if ($tooltip !== null && $tooltip !== false && $tooltip !== '')
        {
            $this->setAttribute('tooltip', (string)$tooltip);
        }
    }

    /** Set title. */
    public function setTitle(string $title): void
    {
        $this->setAttribute('title', $title);
    }

    /** Get title. */
    public function getTitle(): string
    {
        return (string)$this->getAttribute('title');
    }

    /** Get action name. */
    public function getAction(): string
    {
        return (string)$this->getAttribute('action');
    }

    /** Get image path. */
    public function getImage(): string
    {
        return (string)$this->getAttribute('image');
    }

    /** Set tooltip. */
    public function setTooltip(string $tooltip): void
    {
        $this->setAttribute('tooltip', $tooltip);
    }

    /** Get tooltip. */
    public function getTooltip(): string
    {
        return (string)$this->getAttribute('tooltip');
    }
}

/**
 * File button (legacy alias).
 * TODO: consider removing if unused.
 */
class File extends Button
{
}
