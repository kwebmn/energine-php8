<?php

class TestfeedFeed extends ExtendedFeed
{
    public function __construct($name, $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);
        $this->setTableName('auto_Testfeed');   
    }

    protected function defineParams() : array
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
