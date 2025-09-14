<?php
declare(strict_types=1);

/**
 * ImageManager — менеджер вставки/редактирования изображений.
 * Совместимо с PHP 8.3: строгие типы, аккуратные проверки.
 */
#[\AllowDynamicProperties]
final class ImageManager extends DataSet
{
    /**
     * @inheritDoc
     */
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);
        $this->setTitle($this->translate('TXT_IMG_MANAGER'));
    }

    /**
     * @inheritDoc
     */
    public function createDataDescription(): DataDescription
    {
        $dd = parent::createDataDescription();

        // Конфигурируем список выравнивания, если поле существует
        if ($fd = $dd->getFieldDescriptionByName('align')) {
            $fd->loadAvailableValues(
                [
                    ['id' => 'bottom', 'value' => $this->translate('TXT_ALIGN_BOTTOM')],
                    ['id' => 'middle', 'value' => $this->translate('TXT_ALIGN_MIDDLE')],
                    ['id' => 'top',    'value' => $this->translate('TXT_ALIGN_TOP')],
                    ['id' => 'left',   'value' => $this->translate('TXT_ALIGN_LEFT')],
                    ['id' => 'right',  'value' => $this->translate('TXT_ALIGN_RIGHT')],
                ],
                'id',
                'value'
            );
        }

        // Тулбар (если определён конфигом)
        if ($toolbars = $this->createToolbar()) {
            $this->addToolbar($toolbars);
        }

        return $dd;
    }

    /**
     * Основное состояние — просто подготовка компонента.
     */
    protected function main(): void
    {
        parent::prepare();
    }
}
