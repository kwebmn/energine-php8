<?php

class JSData extends DataSet
{
    protected function loadData() : array|false|null
    {

        $result =  LDContainer::getInstance()->getLD();
        
        return $result;
    }
}