<?php

class DefaultTemplateFeed extends ExtendedFeed
{
    public function __construct($name, $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);
        $this->setTableName('DefaultTemplateTableName');
    }

    protected function defineParams(): array
    {
        $result = array_merge(
            parent::defineParams(),
            [
                'active' => true
            ]
        );
        return $result;
    }

}
