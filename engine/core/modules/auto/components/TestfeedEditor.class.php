<?php
declare(strict_types=1);
final class TestfeedEditor extends Grid
{
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);
        $this->setTableName('auto_Testfeed');
    }
}
