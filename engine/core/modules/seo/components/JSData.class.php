<?php

declare(strict_types=1);
class JSData extends DataSet
{
    public function loadData() : array|false|null
    {

        $result =  LDContainer::getInstance()->getLD();
        
        return $result;
    }
}