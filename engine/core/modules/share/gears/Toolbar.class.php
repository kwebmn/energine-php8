<?php
declare(strict_types=1);

/**
 * Toolbar: контейнер для набора Control-элементов.
 */
class Toolbar extends BaseObject
{
    /** Тег корневого узла. */
    public const TAG_NAME = 'toolbar';

    /** @var DOMDocument */
    private DOMDocument $doc;

    /** @var Control[] */
    private array $controls = [];

    /** @var string Имя тулбара. */
    private string $name;

    /** @var string|null Путь к каталогу с изображениями (зарезервировано). */
    private ?string $imageDir;

    /** @var array<string,mixed> Произвольные свойства тулбара. */
    private array $properties = [];

    /** @var Component|null Компонент-владелец тулбара. */
    private ?Component $component = null;

    /**
     * @param string      $name     Имя тулбара.
     * @param string|null $imageDir Путь к каталогу с изображениями (опционально).
     */
    public function __construct(string $name, ?string $imageDir = null)
    {
        $this->name     = $name;
        $this->imageDir = $imageDir;

        $this->doc = new DOMDocument('1.0', 'UTF-8');
        $this->doc->formatOutput = true;
        $this->doc->preserveWhiteSpace = false;
    }

    /**
     * Вернуть имя тулбара.
     *
     * @final
     */
    final public function getName(): string
    {
        return $this->name;
    }

    /**
     * Привязать тулбар к компоненту.
     */
    public function attachToComponent(Component $component): void
    {
        $this->component = $component;
    }

    /**
     * Получить компонент-владельца.
     */
    public function getComponent(): ?Component
    {
        return $this->component;
    }

    /**
     * Присоединить контрол.
     *
     * Вставка всегда в конец (параметр $position намеренно не используется для совместимости).
     *
     * @param Control      $control
     * @param Control|null $position  (ignored)
     */
    public function attachControl(Control $control, ?Control $position = null): void
    {
        $index = count($this->controls);
        $this->controls[] = $control;

        $control->setIndex($index);
        $control->attach($this);
    }

    /**
     * Отсоединить контрол.
     *
     * @throws SystemException 'ERR_DEV_NO_CONTROL_TO_DETACH'
     */
    public function detachControl(Control $control): void
    {
        $i = $control->getIndex();
        if (!isset($this->controls[$i])) {
            throw new SystemException('ERR_DEV_NO_CONTROL_TO_DETACH', SystemException::ERR_DEVELOPER);
        }
        unset($this->controls[$i]); // оставляем «дыру» как в исходной логике
    }

    /**
     * Найти контрол по ID.
     *
     * @return Control|false
     */
    public function getControlByID(string $id)
    {
        foreach ($this->controls as $control) {
            if ($control && method_exists($control, 'getID') && $control->getID() === $id) {
                return $control;
            }
        }
        return false;
    }

    /**
     * Создать тулбар по XML-описанию.
     *
     * @throws SystemException 'ERR_DEV_NO_CONTROL_TYPE'
     * @throws SystemException 'ERR_DEV_NO_CONTROL_CLASS'
     */
    public function loadXML(SimpleXMLElement $toolbarDescription): void
    {
        if (empty($toolbarDescription)) {
            return;
        }

        foreach ($toolbarDescription->control as $controlDescription) {
            if (!isset($controlDescription['type'])) {
                throw new SystemException('ERR_DEV_NO_CONTROL_TYPE', SystemException::ERR_DEVELOPER);
            }

            $type = (string)$controlDescription['type'];
            $controlClassName = ucfirst($type);
            if ($controlClassName === 'Togglebutton') {
                // историческая совместимость
                $controlClassName = 'Switcher';
            }

            if (!class_exists($controlClassName, true)) {
                throw new SystemException('ERR_DEV_NO_CONTROL_CLASS', SystemException::ERR_DEVELOPER, $controlClassName);
            }

            // ID обязателен для Control::__construct(string $id) — сгенерируем, если не задан
            $id = isset($controlDescription['id'])
                ? (string)$controlDescription['id']
                : $this->generateControlId($type);

            /** @var Control $control */
            $control = new $controlClassName($id);

            $this->attachControl($control);
            $control->loadFromXml($controlDescription);
        }
    }

    /**
     * Получить все контролы.
     *
     * @return Control[]
     */
    public function getControls(): array
    {
        return $this->controls;
    }

    /**
     * Задать свойство тулбара.
     */
    public function setProperty(string $name, mixed $value): void
    {
        $this->properties[$name] = $value;
    }

    /**
     * Получить свойство тулбара.
     */
    public function getProperty(string $name): mixed
    {
        return $this->properties[$name] ?? null;
    }

    /**
     * Построить DOM тулбара.
     *
     * @return DOMNode|false Корневой узел <toolbar> или false, если контролов нет (совместимость с исходником).
     */
    public function build(): DOMNode|false
    {
        if (count($this->controls) === 0) {
            return false;
        }

        $toolbarElem = $this->doc->createElement(self::TAG_NAME);
        $toolbarElem->setAttribute('name', $this->name);

        if (!empty($this->properties)) {
            $props = $this->doc->createElement('properties');
            foreach ($this->properties as $propName => $propValue) {
                $prop = $this->doc->createElement('property');
                $prop->setAttribute('name', (string)$propName);
                $prop->appendChild($this->doc->createTextNode((string)$propValue));
                $props->appendChild($prop);
            }
            $toolbarElem->appendChild($props);
        }

        foreach ($this->controls as $control) {
            if (!$control) continue;
            $toolbarElem->appendChild($this->doc->importNode($control->build(), true));
        }

        $this->doc->appendChild($toolbarElem);
        return $this->doc->documentElement;
    }

    /**
     * Перевести контролы тулбара.
     */
    public function translate(): void
    {
        foreach ($this->controls as $control) {
            if ($control) {
                $control->translate();
            }
        }
    }

    /**
     * Сгенерировать ID для контрола, если он не задан в XML.
     */
    private function generateControlId(string $type): string
    {
        $base = strtolower($type);
        return $this->name . '_' . $base . '_' . (count($this->controls) + 1);
    }
}
