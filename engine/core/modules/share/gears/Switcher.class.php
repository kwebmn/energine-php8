<?php
declare(strict_types=1);

/**
 * Switcher control element.
 */
class Switcher extends Button
{
    /** Текущее состояние переключателя. */
    private bool $state = false;

    /**
     * @param string     $id
     * @param mixed|null $action
     *  @param mixed|null $image
     * @param mixed|null $title
     * @param mixed|null $tooltip
     */
    public function __construct(string $id, mixed $action = null, mixed $image = null, mixed $title = null, mixed $tooltip = null)
    {
        parent::__construct($id, $action, $image, $title, $tooltip);
        $this->type = 'switcher';
    }

    /** Получить состояние. */
    public function getState(): bool
    {
        return $this->state;
    }

    /** Установить состояние (принимает bool|int|string для обратной совместимости). */
    public function setState(bool|int|string $state): void
    {
        $this->state = self::normalizeToBool($state);
    }

    /** Переключить состояние и вернуть новое значение. */
    public function toggle(): bool
    {
        $this->state = !$this->state;
        return $this->state;
    }

    /** @inheritDoc */
    public function build(): DOMNode
    {
        // Передаём состояние как "1"/"0" в атрибут.
        $this->setAttribute('state', $this->state ? '1' : '0');
        return parent::build();
    }

    /** Нормализация входного значения в bool. */
    private static function normalizeToBool(bool|int|string $v): bool
    {
        if (is_bool($v))   { return $v; }
        if (is_int($v))    { return $v !== 0; }
        $s = strtolower(trim((string)$v));
        return in_array($s, ['1','true','yes','on','y'], true);
    }
}
