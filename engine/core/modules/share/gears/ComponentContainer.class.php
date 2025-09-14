<?php
declare(strict_types=1);

/**
 * Контейнер блоков/компонентов.
 * Совместим с исходным API, но исправлены баги и усилены типы.
 */
class ComponentContainer extends BaseObject implements IBlock, Iterator
{
    /** Включён ли контейнер */
    private bool $enabled = true;

    /** Свойства контейнера (атрибуты узла) */
    private array $properties = [];

    /** Имя контейнера */
    private string $name;

    /** @var array<string,IBlock> Дочерние блоки по имени */
    private array $blocks = [];

    /** Индекс итератора */
    private int $iteratorIndex = 0;

    /** Плоский список имён для итератора */
    private array $childNames = [];

    /** Документ страницы */
    private Document $document;

    /**
     * @param string $name
     * @param array  $properties
     */
    public function __construct(string $name, array $properties = [])
    {
        $this->name      = $name;
        $this->document  = E()->getDocument();
        $this->properties = $properties;

        if (!isset($this->properties['tag'])) {
            $this->properties['tag'] = 'container';
        }

        // Регистрация в менеджере компонентов страницы
        $this->document->componentManager->register($this);
    }

    /**
     * Добавить блок (перезапишет блок с тем же именем).
     */
    public function add(IBlock $block): self
    {
        $this->blocks[$block->getName()] = $block;
        return $this;
    }

    /**
     * Создание контейнера из XML-описания.
     *
     * @throws SystemException ERR_NO_CONTAINER_NAME
     */
    public static function createFromDescription(SimpleXMLElement $containerDescription, array $additionalAttributes = []): self
    {
        $properties = [];
        $attributes = $containerDescription->attributes();

        if (in_array($containerDescription->getName(), ['page', 'content'], true)) {
            $properties['name'] = (string)$containerDescription->getName();
        } elseif (!isset($attributes['name'])) {
            throw new SystemException('ERR_NO_CONTAINER_NAME', SystemException::ERR_DEVELOPER);
        }

        foreach ($attributes as $propertyName => $propertyValue) {
            $properties[(string)$propertyName] = (string)$propertyValue;
        }

        $name = (string)$properties['name'];
        unset($properties['name']);

        // Дополнительные атрибуты перекрывают исходные
        $properties = array_merge($properties, $additionalAttributes);

        $result = new self($name, $properties);

        foreach ($containerDescription->children() as $blockDescription) {
            $result->add(ComponentManager::createBlockFromDescription($blockDescription));
        }

        return $result;
    }

    /**
     * Пуст ли контейнер (нет ни одного дочернего блока)?
     */
    public function isEmpty(): bool
    {
        return empty($this->blocks);
    }

    public function getName(): string
    {
        return $this->name;
    }

    /** Установить свойство контейнера (значение будет приведено к строке при выводе) */
    public function setProperty(string $propertyName, $propertyValue): void
    {
        $this->properties[$propertyName] = $propertyValue;
    }

    /** Получить свойство контейнера */
    public function getProperty(string $propertyName)
    {
        return $this->properties[$propertyName] ?? null;
    }

    /** Удалить свойство контейнера */
    public function removeProperty(string $propertyName): void
    {
        unset($this->properties[$propertyName]);
    }

    /**
     * Построить DOM документа контейнера с дочерними блоками.
     */
    public function build(): DOMDocument
    {
        $doc = new DOMDocument('1.0', 'UTF-8');

        $tag = (string)($this->properties['tag'] ?? 'container');
        $containerDOM = $doc->createElement($tag);
        $containerDOM->setAttribute('name', $this->getName());
        $doc->appendChild($containerDOM);

        foreach ($this->properties as $propertyName => $propertyValue) {
            if ($propertyName === 'tag') {
                continue;
            }
            // приводим к строке (DOM атрибуты — всегда строки)
            $containerDOM->setAttribute((string)$propertyName, (string)$propertyValue);
        }

        foreach ($this->blocks as $block) {
            if (
                $block->enabled() &&
                ($this->document->getRights() >= $block->getCurrentStateRights())
            ) {
                $blockDOM = $block->build();

                if ($blockDOM instanceof DOMDocument) {
                    $node = $doc->importNode($blockDOM->documentElement, true);
                    $containerDOM->appendChild($node);
                } elseif ($blockDOM instanceof DOMNode) {
                    $node = $doc->importNode($blockDOM, true);
                    $containerDOM->appendChild($node);
                }
            }
        }

        return $doc;
    }

    /**
     * Запустить все дочерние блоки (в разрешённых правах).
     */
    public function run(): void
    {
        foreach ($this->blocks as $block) {
            if (
                $block->enabled() &&
                ($this->document->getRights() >= $block->getCurrentStateRights())
            ) {
                $block->run();
            }
        }
    }

    /* ================= Iterator ================= */

    public function rewind(): void
    {
        $this->childNames    = array_keys($this->blocks);
        $this->iteratorIndex = 0;
    }

    public function valid(): bool
    {
        return isset($this->childNames[$this->iteratorIndex]);
    }

    public function key(): mixed
    {
        return $this->childNames[$this->iteratorIndex] ?? null;
    }

    public function next(): void
    {
        $this->iteratorIndex++;
    }

    public function current(): mixed
    {
        $key = $this->childNames[$this->iteratorIndex] ?? null;
        return ($key !== null && isset($this->blocks[$key])) ? $this->blocks[$key] : null;
    }

    /* ================= IBlock ================= */

    /** Отключить контейнер и все дочерние блоки */
    public function disable(): void
    {
        $this->enabled = false;
        foreach ($this->blocks as $block) {
            $block->disable();
        }
    }

    public function enabled(): bool
    {
        return $this->enabled;
    }

    /** У контейнера нет собственных ограничений по правам */
    public function getCurrentStateRights(): int
    {
        return 0;
    }
}
