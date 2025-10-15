<?php

class DefaultTemplateGrid extends Grid
{
    public function __construct($name, $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);
        $this->setTableName('DefaultTemplateTableName');
    }

}
