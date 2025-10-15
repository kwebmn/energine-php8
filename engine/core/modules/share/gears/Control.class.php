<?php

declare(strict_types=1);

/**
 * Toolbar control.
 *
 * @abstract
 */
abstract class Control extends BaseObject
{
    /** Element tag name. */
    public const TAG_NAME = 'control';

    /** Document. */
    protected DOMDocument $doc;

    /** Element type. */
    protected ?string $type = null;

    /** Is element disabled? */
    private bool $disabled = false;

    /** Additional attributes. */
    private array $attributes = [];

    /** Toolbar. */
    private ?Toolbar $toolbar = null;

    /**
     * Element index (assigned by toolbar after attaching).
     */
    private ?int $index = null;

    /**
     * @param string $id Control ID.
     */
    public function __construct(string $id)
    {
        $this->setAttribute('id', $id);
        $this->doc = new DOMDocument('1.0', 'UTF-8');
        $this->doc->preserveWhiteSpace = false;
    }

    /**
     * Attach control element to the toolbar.
     */
    public function attach(Toolbar $toolbar): void
    {
        $this->toolbar = $toolbar;
    }

    /**
     * Get toolbar.
     *
     * @return Toolbar|null (оставлено как раньше — без исключений ради совместимости)
     */
    protected function getToolbar(): ?Toolbar
    {
        return $this->toolbar;
    }

    /**
     * Set element index (called from Toolbar).
     */
    public function setIndex(int $index): void
    {
        $this->index = $index;
    }

    /**
     * Get element index (called from Toolbar).
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
     * @throws SystemException 'ERR_DEV_NO_CONTROL_TYPE'
     */
    public function loadFromXml(SimpleXMLElement $description): void
    {
        if (!isset($description['type']))
        {
            throw new SystemException('ERR_DEV_NO_CONTROL_TYPE', SystemException::ERR_DEVELOPER);
        }

        $attr = $description->attributes();

        // mode рассчитываем сразу, как и в исходнике
        $toolbar = $this->getToolbar();
        if ($toolbar)
        {
            $mode = FieldDescription::computeRights(
                $toolbar->getComponent()->document->getRights(),
                isset($attr['ro_rights']) ? (int)$attr['ro_rights'] : null,
                isset($attr['fc_rights']) ? (int)$attr['fc_rights'] : null
            );
            $this->setAttribute('mode', $mode);
        }

        unset($attr['ro_rights'], $attr['fc_rights']);

        foreach ($attr as $key => $value)
        {
            $k = (string)$key;
            $v = (string)$value;

            // В свойства пишем только то, что реально является свойствами
            if ($k === 'type')
            {
                $this->type = $v;
                continue;
            }
            if ($k === 'disabled')
            {
                $this->disabled = in_array(strtolower($v), ['1', 'true', 'yes', 'disabled'], true);
                continue;
            }

            // Всё остальное — обычные атрибуты элемента
            $this->setAttribute($k, $v);
        }
    }

    /** Disable element. */
    public function disable(): void
    {
        $this->disabled = true;
    }

    /** Enable element. */
    public function enable(): void
    {
        $this->disabled = false;
    }

    /**
     * Get element type.
     *
     * @throws SystemException 'ERR_DEV_NO_CONTROL_TYPE'
     */
    public function getType(): string
    {
        if ($this->type === null || $this->type === '')
        {
            throw new SystemException('ERR_DEV_NO_CONTROL_TYPE', SystemException::ERR_DEVELOPER);
        }
        return $this->type;
    }

    /** Set attribute. */
    public function setAttribute(string $attrName, mixed $attrValue): void
    {
        $this->attributes[$attrName] = $attrValue;
    }

    /** Get attribute value. */
    public function getAttribute(string $attrName): mixed
    {
        return $this->attributes[$attrName] ?? false;
    }

    /** Get element ID. */
    public function getID(): string
    {
        return (string)$this->getAttribute('id');
    }

    /**
     * Build control element.
     *
     * @return DOMNode
     */
    public function build(): DOMNode
    {
        $controlElem = $this->doc->createElement(self::TAG_NAME);

        foreach ($this->attributes as $attrName => $attrValue)
        {
            $controlElem->setAttribute($attrName, (string)$attrValue);
        }
        if ($this->disabled)
        {
            $controlElem->setAttribute('disabled', 'disabled');
        }

        $controlElem->setAttribute('type', $this->getType());
        $this->doc->appendChild($controlElem);

        return $this->doc->documentElement;
    }

    /**
     * Translate language-dependent attributes.
     *
     * @param array $attrs Set of attributes for translation.
     */
    public function translate(array $attrs = ['title', 'tooltip']): void
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
