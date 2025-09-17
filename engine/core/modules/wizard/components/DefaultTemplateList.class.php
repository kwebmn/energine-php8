<?php
declare(strict_types=1);
final class DefaultTemplateList extends DBDataSet
{
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);
        $this->setTableName('DefaultTemplateTableName');
    }

    protected function defineParams(): array
    {
        return array_merge(
            parent::defineParams(),
            [
                'active' => true,
            ]
        );
    }
}
