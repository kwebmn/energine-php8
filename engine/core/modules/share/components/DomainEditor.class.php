<?php

declare(strict_types=1);

class DomainEditor extends Grid
{
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);
        $this->setTableName('share_domains');

        $filter = ' (domain_id NOT IN (SELECT domain_id FROM share_domain2site)) ';
        $siteID = $this->getParam('siteID');
        if ($siteID)
        {
            $filter .= ' OR (domain_id IN (SELECT domain_id FROM share_domain2site WHERE site_id = ' . (int)$siteID . '))';
        }
        $this->setFilter($filter);
    }

    protected function prepare(): void
    {
        parent::prepare();

        if (!in_array($this->getState(), ['add', 'edit'], true))
        {
            return;
        }

        $fdProtocol = $this->getDataDescription()->getFieldOrNull('domain_protocol')
            ?: $this->getDataDescription()->getFieldDescriptionByName('domain_protocol');
        if ($fdProtocol instanceof FieldDescription)
        {
            $fdProtocol->setType(FieldDescription::FIELD_TYPE_SELECT);
            $fdProtocol->loadAvailableValues(
                [
                    ['key' => 'http',  'value' => 'http://'],
                    ['key' => 'https', 'value' => 'https://'],
                ],
                'key',
                'value'
            );
        }

        if ($this->getState() === 'add')
        {
            $this->getData()->getFieldByName('domain_port')?->setData(80, true);
            $this->getData()->getFieldByName('domain_root')?->setData('/', true);
        }
    }

    protected function defineParams(): array
    {
        return array_merge(
            parent::defineParams(),
            ['siteID' => false]
        );
    }

    /**
     * Проверяем корректность `domain_root` и передаём дальше.
     * @return mixed
     */
    protected function saveData() // ← убран : bool
    {
        $table = $this->getTableName();
        if (isset($_POST[$table]['domain_root']) && $_POST[$table]['domain_root'] !== '')
        {
            if (substr($_POST[$table]['domain_root'], -1) !== '/')
            {
                $_POST[$table]['domain_root'] .= '/';
            }
        }
        return parent::saveData(); // у Grid это строка (и/или mixed)
    }
}
