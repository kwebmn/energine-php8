<?php
declare(strict_types=1);

/**
 * Empty builder: используется, когда данные (recordset) не нужны.
 * Часто «main state» только подключает JS, который грузит данные по AJAX.
 */
final class EmptyBuilder implements IBuilder
{
    /** @var DOMDocument|null */
    private ?DOMDocument $result = null;

    /**
     * Ничего не строим кроме пустого <recordset/>.
     *
     * @return bool
     */
    public function build(): bool
    {
        $this->result = new DOMDocument('1.0', 'UTF-8');
        $this->result->formatOutput = true;
        $this->result->preserveWhiteSpace = false;

        $recordset = $this->result->createElement('recordset');
        $this->result->appendChild($recordset);

        return true;
    }

    /**
     * Вернёт корневой узел <recordset/>.
     *
     * @return mixed DOMNode|null
     */
    public function getResult() : mixed
    {
        // Ленивая инициализация на случай, если build() не вызывали явно
        if (!$this->result instanceof DOMDocument) {
            $this->build();
        }
        return $this->result->documentElement ?? null;
    }
}
