<?php

declare(strict_types=1);

/**
 * Drop-down list control.
 */
class Select extends Control
{
    /**
     * List items:
     * [
     *   <id> => ['value' => string, 'properties' => array<string,string>]
     * ]
     */
    private array $items = [];

    /**
     * @param string     $id      Control ID.
     * @param mixed|null $action  Action name (legacy may pass false/empty).
     * @param mixed|null $title   Control title (legacy may pass false/empty).
     */
    public function __construct(string $id, mixed $action = null, mixed $title = null)
    {
        parent::__construct($id);
        $this->type = 'select';

        if ($title !== null && $title !== false && $title !== '')
        {
            $this->setAttribute('title', (string)$title);
        }
        if ($action !== null && $action !== false && $action !== '')
        {
            $this->setAttribute('action', (string)$action);
        }
    }

    /**
     * @copydoc Control::loadFromXml
     */
    public function loadFromXml(SimpleXMLElement $description): void
    {
        parent::loadFromXml($description);

        if (!empty($description->options))
        {
            foreach ($description->options->option as $item)
            {
                $id = isset($item['id']) ? (string)$item['id'] : '';
                $val = (string)$item;

                // Соберём доп. атрибуты option (кроме id)
                $props = [];
                foreach ($item->attributes() as $k => $v)
                {
                    if ((string)$k === 'id')
                    {
                        continue;
                    }
                    $props[(string)$k] = (string)$v;
                }

                if ($id !== '')
                {
                    $this->addItem($id, $val, $props);
                }
            }
        }
    }

    /**
     * Add item.
     *
     * @param string|int            $id             Item ID.
     * @param string                $value          Item value (will be translated).
     * @param array<string, string> $itemProperties Item properties (attr => value).
     */
    public function addItem(string|int $id, string $value, array $itemProperties = []): void
    {
        $this->items[(string)$id] = [
            'value'      => DBWorker::_translate($value),
            'properties' => $itemProperties,
        ];
    }

    /**
     * @copydoc Control::build
     */
    public function build(): DOMNode
    {
        $result = parent::build();

        if (!empty($this->items))
        {
            $options = $this->doc->createElement('options');

            foreach ($this->items as $itemID => $itemData)
            {
                $option = $this->doc->createElement('option');
                // текст через DOMText во избежание двойного экранирования
                $option->appendChild(new DOMText((string)$itemData['value']));
                $option->setAttribute('id', (string)$itemID);

                if (!empty($itemData['properties']))
                {
                    foreach ($itemData['properties'] as $key => $value)
                    {
                        if (is_array($value))
                        {
                            continue;
                        }
                        $option->setAttribute((string)$key, (string)$value);
                    }
                }

                $options->appendChild($option);
            }

            $result->appendChild($options);
        }

        return $result;
    }

    /**
     * Remove item from list.
     *
     * @param string|int $id Item ID.
     */
    public function removeItem(string|int $id): void
    {
        $key = (string)$id;
        if (isset($this->items[$key]))
        {
            unset($this->items[$key]);
        }
    }

    /**
     * Get item.
     *
     * @param string|int $id
     * @return array<string, mixed>|null
     */
    public function getItem(string|int $id): ?array
    {
        $key = (string)$id;
        return $this->items[$key] ?? null;
    }
}
