<?php
declare(strict_types=1);

class TranslationList extends DataSet
{
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);

        $this->document->addTranslation('TXT_COPYRIGHT', $this);
    }
}
