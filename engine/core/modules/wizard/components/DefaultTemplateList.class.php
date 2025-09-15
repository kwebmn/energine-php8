<?php

declare(strict_types=1);
class DefaultTemplateList extends DBDataSet
{
    public function __construct($name, $module, array $params = null)
    {
        parent::__construct($name, $module, $params);
        $this->setTableName('DefaultTemplateTableName');
    }

    protected function defineParams()
    {
        $result = array_merge(
            parent::defineParams(),
            array(
                'active' => true
            )
        );
        return $result;
    }
}
