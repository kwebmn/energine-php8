<?php

declare(strict_types=1);
class TestfeedEditor extends Grid
{
    public function __construct($name, $module, array $params = null)
    {
        parent::__construct($name, $module, $params);
        $this->setTableName('auto_Testfeed');
    }

}