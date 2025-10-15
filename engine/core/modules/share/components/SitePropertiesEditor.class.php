<?php

declare(strict_types=1);

/**
 * Site properties editor.
 */
class SitePropertiesEditor extends Grid
{
    /**
     * @copydoc Grid::__construct
     */
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);

        $this->setTableName('share_sites_properties');
        $this->setSaver(new SitePropertiesSaver());

        // Если открыт редактор свойств конкретного сайта — показываем его свойства + дефолтные
        $siteId = $params['siteID'] ?? null;
        if ($siteId !== null && $siteId !== '')
        {
            $this->addFilterCondition(
                'site_id = ' . (int)$siteId . ' OR site_id IS NULL'
            );
        }
    }

    /**
     * @inheritDoc
     */
    protected function createDataDescription(): DataDescription
    {
        $dd = parent::createDataDescription();

        if (in_array($this->getState(), ['add', 'edit'], true))
        {
            // site_id в формах не редактируется напрямую
            if ($fdSite = $dd->getFieldDescriptionByName('site_id'))
            {
                $fdSite->setType(FieldDescription::FIELD_TYPE_HIDDEN);
            }

            // prop_name нельзя менять при редактировании
            if ($this->getState() === 'edit')
            {
                if ($fdName = $dd->getFieldDescriptionByName('prop_name'))
                {
                    $fdName->setMode(FieldDescription::FIELD_MODE_READ);
                }
            }
        }

        return $dd;
    }

    /**
     * @inheritDoc
     */
    protected function createData(): Data
    {
        $data = parent::createData();

        // При добавлении проставляем site_id из параметров
        if ($this->getState() === 'add')
        {
            if ($fSite = $data->getFieldByName('site_id'))
            {
                $fSite->setData($this->getParam('siteID'), true);
            }
        }

        return $data;
    }

    /**
     * @inheritDoc
     */
    protected function loadData(): array|false|null
    {
        $data = parent::loadData();

        // В getRawData скрываем дефолтную запись, если есть оверрайд для конкретного сайта
        $siteId = $this->getParam('siteID');
        if ($this->getState() === 'getRawData' && $siteId && is_array($data))
        {
            // prop_name => [rowIndex => site_id]
            $props = [];
            foreach ($data as $idx => $row)
            {
                $props[$row['prop_name']][$idx] = (int)($row['site_id'] ?? 0);
            }

            array_walk(
                $props,
                function (array $row) use (&$data, $siteId): void
                {
                    // Если есть и дефолт (0), и запись для текущего сайта — дефолт прячем
                    if (in_array(0, $row, true) && in_array((int)$siteId, $row, true))
                    {
                        $defaultIdx = array_search(0, $row, true);
                        if ($defaultIdx !== false)
                        {
                            unset($data[$defaultIdx]);
                        }
                    }
                }
            );

            // Добавляем признак, что запись дефолтная
            $data = array_map(static function (array $row): array
            {
                $row['prop_is_default'] = is_null($row['site_id']);
                return $row;
            }, $data);
        }

        return $data;
    }

    /**
     * @inheritDoc
     */
    protected function defineParams(): array
    {
        return array_merge(
            parent::defineParams(),
            [
                'siteID' => null,
            ]
        );
    }
}
