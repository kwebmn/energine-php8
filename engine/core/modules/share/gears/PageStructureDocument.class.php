<?php

declare(strict_types=1);

/**
 * @file
 * PageStructureDocument.
 *
 * Generate document structure: <page> (layout) + optional content subtree.
 */
class PageStructureDocument extends Object implements IDocument
{
    /** @var DOMDocument */
    private DOMDocument $doc;

    /** @var SimpleXMLElement|null */
    private ?SimpleXMLElement $layout = null;

    /** @var SimpleXMLElement|null */
    private ?SimpleXMLElement $content = null;

    /**
     * Установить layout (корневой узел страницы).
     */
    public function setLayout(SimpleXMLElement $layout): void
    {
        $this->layout = $layout;
    }

    /**
     * Установить контент (будет добавлен внутрь layout).
     */
    public function setContent(SimpleXMLElement $content): void
    {
        $this->content = $content;
    }

    /**
     * Результирующий DOMDocument.
     */
    public function getResult(): DOMDocument
    {
        return $this->doc;
    }

    /**
     * Построить документ.
     */
    public function build(): void
    {
        $this->doc = new DOMDocument('1.0', 'UTF-8');

        // 1) Создаём/импортируем layout
        if ($this->layout instanceof SimpleXMLElement)
        {
            $layoutNode = dom_import_simplexml($this->layout);
            // На случай сбоя импорта — дефолтный корень <page>
            $layoutElem = ($layoutNode === false)
                ? $this->doc->createElement('page')
                : $this->doc->importNode($layoutNode, true);
        }
        else
        {
            // Если layout не задан — корень <page>
            $layoutElem = $this->doc->createElement('page');
        }
        $this->doc->appendChild($layoutElem);

        // 2) Импортируем content внутрь layout (если он задан)
        if ($this->content instanceof SimpleXMLElement)
        {
            $contentNode = dom_import_simplexml($this->content);
            if ($contentNode !== false)
            {
                $layoutElem->appendChild($this->doc->importNode($contentNode, true));
            }
        }
    }
}
