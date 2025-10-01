<?php
declare(strict_types=1);

/**
 * Simplified Builder.
 *
 * Используется, когда не нужно выводить все атрибуты полей.
 */
class SimpleBuilder extends Builder
{
    /**
     * @param string $title Заголовок набора записей.
     */
    public function __construct(string $title = '')
    {
        parent::__construct($title);
    }

    /**
     * Убираем «лишние» свойства поля перед построением ноды.
     *
     * Сигнатура полностью совместима с AbstractBuilder::createField.
     *
     * @param mixed             $fieldName
     * @param FieldDescription  $fieldInfo
     * @param mixed             $fieldValue
     * @param mixed             $fieldProps
     * @return mixed
     */
    protected function createField(
        $fieldName,
        FieldDescription $fieldInfo,
        $fieldValue = false,
        $fieldProps = false
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
                 ] as $propertyName) {
            if (method_exists($fieldInfo, 'removeProperty')) {
                $fieldInfo->removeProperty($propertyName);
            }
        }

        return parent::createField($fieldName, $fieldInfo, $fieldValue, $fieldProps);
    }
}
