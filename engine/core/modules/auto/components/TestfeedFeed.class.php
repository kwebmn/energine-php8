<?php
declare(strict_types=1);
final class TestfeedFeed extends ExtendedFeed
{
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);
        $this->setTableName('auto_Testfeed');
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
