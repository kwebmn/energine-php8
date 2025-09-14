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
        $this->registerState('fkEditor', ['/[field]-[class]/crud/[any]/']);
        $this->registerState('fkValues', ['/[field]/fk-values/[any]/']);
        $this->registerState('put', ['/put/']);
        $this->registerState('upload', ['/upload/']);
        $this->registerState('cleanup', ['/cleanup/']);
        $this->registerState('attachments', ['/attachments/[any]/', '/[id]/attachments/[any]/']);
        $this->registerState('tags', ['/tags/[any]/', '/[id]/tags/[any]/']);
        $this->registerState('autoCompleteTags', ['/tag-autocomplete/']);
        $this->registerState('filtersTreeEditor', ['/filtersTree/[any]/', '/[id]/filtersTree/[any]/']);
        $this->registerState('adminAccessEditor', ['/adminAccess/[any]/', '/[id]/adminAccess/[any]/']);
        $this->registerState('userAccessEditor', ['/userAccess/[any]/', '/[id]/userAccess/[any]/']);
        $this->registerState('keyAccessEditor', ['/keyAccess/[any]/', '/[id]/keyAccess/[any]/']);
    }
}
