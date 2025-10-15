<?php

declare(strict_types=1);

/**
 * Filter control.
 */
class FilterField extends BaseObject
{
    /**
     * Element tag name.
     */
    public const TAG_NAME = 'field';

    /**
     * Document.
     */
    protected DOMDocument $doc;

    /**
     * Element type.
     */
    protected string $type = FieldDescription::FIELD_TYPE_STRING;

    /**
     * Additional attributes.
     * @var array<string, mixed>
     */
    private array $attributes = [];

    /**
     * Filter that holds this control element.
     */
    private ?Filter $filter = null;

    /**
     * Element index.
     */
    private ?int $index = null;

    /**
     * @param string $name Field name.
     * @param string $type Field type (defaults to string).
     */
    public function __construct(string $name, string $type = FieldDescription::FIELD_TYPE_STRING)
    {
        $this->setAttribute('name', $name);
        $this->type = $type;
        $this->doc = new DOMDocument('1.0', 'UTF-8');
    }

    /**
     * Attach filter.
     */
    public function attach(Filter $filter): void
    {
        $this->filter = $filter;
    }

    /**
     * Get attached filter.
     */
    protected function getFilter(): ?Filter
    {
        return $this->filter;
    }

    /**
     * Set element ID.
     */
    public function setIndex(int $index): void
    {
        $this->index = $index;
    }

    /**
     * Get element ID.
     *
     * @throws SystemException 'ERR_DEV_NO_CONTROL_INDEX'
     */
    public function getIndex(): int
    {
        if ($this->index === null)
        {
            throw new SystemException('ERR_DEV_NO_CONTROL_INDEX', SystemException::ERR_DEVELOPER);
        }
        return $this->index;
    }

    /**
     * Load element from XML description.
     *
     * @param SimpleXMLElement   $description Element description.
     * @param array<string,mixed>|null $meta DB column meta data
     * @throws SystemException 'ERR_DEV_NO_CONTROL_TYPE'
     */
    public function load(SimpleXMLElement $description, ?array $meta = null): void
    {
        // Собираем атрибуты из XML безопасно
        $attrs = [];
        $xmlAttrs = $description->attributes();
        if ($xmlAttrs)
        {
            foreach ($xmlAttrs as $key => $value)
            {
                $attrs[(string)$key] = (string)$value;
            }
        }
        // name приходит извне конструктором
        unset($attrs['name']);

        // Если есть метаданные колонки — дополним тип/заголовок/имя таблицы
        if ($meta)
        {
            if (!isset($attrs['title']))
            {
                $attrs['title'] = 'FIELD_' . (string)$this->getAttribute('name');
            }
            // convertType: (dbType, fieldName, length, metaRow)
            $attrs['type']      = FieldDescription::convertType(
                $meta['type'] ?? '',
                (string)$this->getAttribute('name'),
                $meta['length'] ?? null,
                $meta
            );
            if (isset($meta['tableName']))
            {
                $attrs['tableName'] = $meta['tableName'];
            }
        }

        // Присваиваем свойства/атрибуты
        foreach ($attrs as $key => $value)
        {
            if (property_exists($this, $key))
            {
                // сейчас это актуально только для $type
                /** @phpstan-ignore-next-line */
                $this->$key = $value;
            }
            else
            {
                $this->setAttribute($key, $value);
            }
        }
    }

    /**
     * Get element type.
     */
    public function getType(): string
    {
        return $this->type;
    }

    /**
     * Set attribute.
     *
     * @param string $attrName
     * @param mixed  $attrValue
     */
    public function setAttribute(string $attrName, mixed $attrValue): void
    {
        $this->attributes[$attrName] = $attrValue;
    }

    /**
     * Get attribute.
     *
     * @return mixed Returns false if not set (BC with legacy code).
     */
    public function getAttribute(string $attrName): mixed
    {
        return $this->attributes[$attrName] ?? false;
    }

    /**
     * Build element.
     */
    public function build(): DOMNode
    {
        $controlElem = $this->doc->createElement(self::TAG_NAME);

        foreach ($this->attributes as $attrName => $attrValue)
        {
            $controlElem->setAttribute($attrName, (string)$attrValue);
        }
        $controlElem->setAttribute('type', $this->getType());

        $this->doc->appendChild($controlElem);
        return $this->doc->documentElement;
    }

    /**
     * Translate language-dependent attributes.
     *
     * @param array<int,string> $attrs
     */
    public function translate(array $attrs = ['title']): void
    {
        foreach ($attrs as $attrName)
        {
            $attrValue = (string)$this->getAttribute($attrName);
            if ($attrValue !== '')
            {
                $this->setAttribute($attrName, DBWorker::_translate($attrValue));
            }
        }
    }
}
