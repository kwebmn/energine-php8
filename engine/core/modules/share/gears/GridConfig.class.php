<?php

declare(strict_types=1);

/**
 * Grid configuration.
 */
class GridConfig extends DataSetConfig
{
    /**
     * @inheritDoc
     */
    public function __construct(mixed $config, string $className, string $moduleName)
    {
        parent::__construct($config, $className, $moduleName);

        // ВАЖНО: паттерны оставлены без изменений для совместимости
        $this->registerState('fkValues', ['/[field]/fk-values/[any]/']);
        $this->registerState('cleanup', ['/cleanup/']);
        $this->registerState('autoCompleteTags', ['/tag-autocomplete/']);
    }
}
