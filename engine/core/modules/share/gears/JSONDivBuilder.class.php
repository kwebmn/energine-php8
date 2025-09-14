<?php
declare(strict_types=1);

/**
 * JSON-builder для редактора разделов: добавляет в результат id текущего документа.
 */
class JSONDivBuilder extends JSONBuilder
{
    /**
     * ID текущего документа.
     */
    private ?int $documentId = null;

    /**
     * Установить ID документа.
     */
    public function setDocumentId(int $id): void
    {
        $this->documentId = $id;
    }

    /**
     * Добавляет поле `current` в итоговый JSON и возвращает строку.
     */
    public function getResult(): string
    {
        // Если результат уже собран (массив из JSONBuilder::build), дополним его.
        if (is_array($this->result)) {
            $this->result['current'] = $this->documentId;
        }
        // Дальнейшее оформление (pager и json_encode) — в родителе.
        return parent::getResult();
    }
}
