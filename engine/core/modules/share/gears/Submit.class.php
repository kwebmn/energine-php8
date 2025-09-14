<?php
declare(strict_types=1);

/**
 * Submit button control.
 */
class Submit extends Button
{
    /**
     * @param string     $id       Control ID
     * @param mixed      $action   Action name (optional)
     * @param mixed      $image    Image path/name (optional)
     * @param mixed      $title    Button title (optional)
     * @param mixed      $tooltip  Tooltip text (optional)
     */
    public function __construct(string $id, $action = false, $image = false, $title = false, $tooltip = false)
    {
        parent::__construct($id, $action, $image, $title, $tooltip);
        $this->type = 'submit';
    }
}
