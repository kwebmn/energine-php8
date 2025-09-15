<?php

declare(strict_types=1);
class Testfeed extends DBDataSet
{
    public function __construct($name, $module, array $params = null)
    {
        parent::__construct($name, $module, $params);
        $this->setTableName('auto_Testfeed');
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
