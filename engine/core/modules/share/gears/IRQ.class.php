<?php
declare(strict_types=1);

/**
 * IRQ — «исключение-прерывание» потока исполнения,
 * используемое для возврата подготовленных XML-блоков (layout/content).
 *
 * Совместимо со старой версией:
 *  - addBlock(SimpleXMLElement $block)
 *  - getContentBlock(): SimpleXMLElement|false
 *  - getLayoutBlock():  SimpleXMLElement|false
 *
 * Добавлены удобные методы:
 *  - setContentBlock(), setLayoutBlock(), hasContentBlock(), hasLayoutBlock(), clearBlocks()
 */
class IRQ extends \Exception
{
    /**
     * Контент-блок (обычно компонент).
     * @var \SimpleXMLElement|false
     */
    private \SimpleXMLElement|false $contentBlock = false;

    /**
     * Layout-блок (обычно <page>).
     * @var \SimpleXMLElement|false
     */
    private \SimpleXMLElement|false $layoutBlock = false;

    /**
     * Установить блок. Если это <page> — считается layout, иначе content.
     */
    public function addBlock(\SimpleXMLElement $block): void
    {
        if ($block->getName() === 'page') {
            $this->layoutBlock = $block;
        } else {
            $this->contentBlock = $block;
        }
    }

    /**
     * Явно установить content-блок.
     */
    public function setContentBlock(\SimpleXMLElement $block): void
    {
        $this->contentBlock = $block;
    }

    /**
     * Явно установить layout-блок.
     */
    public function setLayoutBlock(\SimpleXMLElement $block): void
    {
        $this->layoutBlock = $block;
    }

    /**
     * Получить content-блок.
     *
     * Совместимо со старым API: возвращает false, если не задан.
     */
    public function getContentBlock(): \SimpleXMLElement|false
    {
        return $this->contentBlock;
    }

    /**
     * Получить layout-блок.
     *
     * Совместимо со старым API: возвращает false, если не задан.
     */
    public function getLayoutBlock(): \SimpleXMLElement|false
    {
        return $this->layoutBlock;
    }

    /**
     * Есть ли content-блок?
     */
    public function hasContentBlock(): bool
    {
        return $this->contentBlock !== false;
    }

    /**
     * Есть ли layout-блок?
     */
    public function hasLayoutBlock(): bool
    {
        return $this->layoutBlock !== false;
    }

    /**
     * Очистить оба блока.
     */
    public function clearBlocks(): void
    {
        $this->contentBlock = false;
        $this->layoutBlock  = false;
    }
}
