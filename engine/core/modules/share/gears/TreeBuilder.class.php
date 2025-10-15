<?php

declare(strict_types=1);

/**
 * TreeBuilder — билдер древовидных данных.
 * Совместимо с PHP 8.3: строгие типы, аккуратные проверки.
 *
 * Ожидает:
 *  - DataDescription с помеченным "key" полем (идентификатор строки),
 *  - Data, содержащую строки с этим ключом,
 *  - TreeNodeList с иерархией узлов (id => TreeNode).
 */
final class TreeBuilder extends AbstractBuilder
{
    /**
     * Имя поля-ключа (идентификатор записи).
     */
    private ?string $idFieldName = null;

    /**
     * Дерево узлов.
     */
    private ?TreeNodeList $tree = null;

    /**
     * Установить дерево.
     */
    public function setTree(TreeNodeList $tree): void
    {
        $this->tree = $tree;
    }

    /**
     * Получить дерево.
     */
    public function getTree(): ?TreeNodeList
    {
        return $this->tree;
    }

    /**
     * @inheritDoc
     *
     * @throws SystemException 'ERR_DEV_NO_TREE_IDENT'
     */
    protected function run(): void
    {
        // Ищем поле-ключ (id)
        foreach ($this->dataDescription as $fieldName => $fd)
        {
            /** @var FieldDescription $fd */
            if ($fd->getPropertyValue('key') !== null)
            {
                $this->idFieldName = (string)$fieldName;
                break;
            }
        }

        if (!$this->idFieldName)
        {
            throw new SystemException('ERR_DEV_NO_TREE_IDENT', SystemException::ERR_DEVELOPER);
        }

        if ($this->tree instanceof TreeNodeList && !$this->data->isEmpty())
        {
            $this->result->appendChild($this->buildTree($this->tree));
        }
    }

    /**
     * Построить XML дерева.
     */
    private function buildTree(TreeNodeList $tree): DOMNode
    {
        $domRecordset = $this->result->createElement('recordset');

        // Быстрый доступ: значение ключа -> индекс строки
        $idField   = $this->data->getFieldByName($this->idFieldName);
        $idToIndex = $idField ? array_flip((array)$idField->getData()) : [];

        foreach ($tree as $id => $node)
        {
            if (!isset($idToIndex[$id]))
            {
                // В дереве есть узел, которого нет в наборе данных — пропускаем
                continue;
            }

            $rowIndex  = (int)$idToIndex[$id];
            $domRecord = $this->result->createElement('record');

            // Поля строки
            foreach ($this->dataDescription as $fieldName => $fd)
            {
                /** @var FieldDescription $fd */
                $fieldValue      = '';
                $fieldProperties = [];

                if ($f = $this->data->getFieldByName((string)$fieldName))
                {
                    $fieldValue      = $f->getRowData($rowIndex);
                    $fieldValue      = $fieldValue === null ? '' : $fieldValue;
                    $fieldProperties = $f->getRowProperties($rowIndex);

                    // Для SELECT — подменяем значение на <options>
                    if ($fd->getType() === FieldDescription::FIELD_TYPE_SELECT)
                    {
                        $fieldValue = $this->createOptions($fd, [$fieldValue]);
                    }
                }

                $domField = $this->createField((string)$fieldName, $fd, $fieldValue, $fieldProperties);
                $domRecord->appendChild($domField);
            }

            $domRecordset->appendChild($domRecord);

            // Рекурсивно добавляем детей
            if ($node->hasChildren())
            {
                $domRecord->appendChild($this->buildTree($node->getChildren()));
            }
        }

        return $domRecordset;
    }

    /**
     * Упрощаем поле: удаляем несущ. в дереве свойства, затем отдаём базовой реализации.
     */
    protected function createField(
        $fieldName,
        FieldDescription $fieldInfo,
        $fieldValue = '',
        $fieldProperties = []
    ) {
        foreach ([
                     // не удаляем 'nullable' — поведение должно совпадать с базовым билдером
                     'pattern',
                     'message',
                     'tabName',
                     'tableName',
                     'sort',
                     'customField',
                     'default',
                 ] as $prop)
        {
            $fieldInfo->removeProperty($prop);
        }

        return parent::createField($fieldName, $fieldInfo, $fieldValue, $fieldProperties);
    }
}
