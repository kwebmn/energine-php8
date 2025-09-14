<?php
declare(strict_types=1);

/**
 * Drop-down container (menu) control.
 */
class Container extends Control
{
    /** @var Control[] */
    private array $controls = [];

    /**
     * @param string     $id       Control ID.
     * @param mixed|null $action   Action name (legacy может передавать false/empty).
     * @param mixed|null $title    Control title.
     * @param mixed|null $tooltip  Control tooltip.
     */
    public function __construct(string $id, mixed $action = null, mixed $title = null, mixed $tooltip = null)
    {
        parent::__construct($id);
        $this->type = 'container';

        if ($action !== null && $action !== false && $action !== '') {
            $this->setAttribute('action', (string)$action);
        }
        if ($title !== null && $title !== false && $title !== '') {
            $this->setAttribute('title', (string)$title);
        }
        if ($tooltip !== null && $tooltip !== false && $tooltip !== '') {
            $this->setAttribute('tooltip', (string)$tooltip);
        }
    }

    /**
     * @copydoc Control::loadFromXml
     *
     * @throws SystemException 'ERR_DEV_NO_CONTROL_TYPE'
     * @throws SystemException 'ERR_DEV_NO_CONTROL_CLASS'
     */
    public function loadFromXml(SimpleXMLElement $description): void
    {
        parent::loadFromXml($description);

        foreach ($description->control as $controlDescription) {
            if (!isset($controlDescription['type'])) {
                throw new SystemException('ERR_DEV_NO_CONTROL_TYPE', SystemException::ERR_DEVELOPER);
            }

            $controlClassName = ucfirst((string)$controlDescription['type']);
            if (!class_exists($controlClassName, false)) {
                throw new SystemException('ERR_DEV_NO_CONTROL_CLASS', SystemException::ERR_DEVELOPER, $controlClassName);
            }

            // ID обязателен для наших контролов → сгенерируем, если отсутствует
            $childId = isset($controlDescription['id'])
                ? (string)$controlDescription['id']
                : $this->generateChildId($controlClassName);

            /** @var Control $control */
            $control = new $controlClassName($childId);

            $this->attachControl($control);
            $control->loadFromXml($controlDescription);
        }
    }

    /**
     * @copydoc Control::build
     */
    public function build(): DOMNode
    {
        $root = parent::build(); // <control type="container" .../>

        foreach ($this->controls as $control) {
            $childNode = $control->build(); // корневой узел чужого DOMDocument
            $root->appendChild($this->doc->importNode($childNode, true));
        }

        return $root;
    }

    /**
     * Attach control.
     */
    public function attachControl(Control $control): void
    {
        // 0-based индекс: предыдущий размер массива
        $index = count($this->controls);
        $this->controls[] = $control;

        $control->setIndex($index);
        $control->attach($this->getToolbar());
    }

    /**
     * Сгенерировать ID дочернего контрола, если он не задан в XML.
     */
    private function generateChildId(string $className): string
    {
        $base = strtolower($className);
        return $this->getID() . '_' . $base . '_' . (count($this->controls) + 1);
    }
}
