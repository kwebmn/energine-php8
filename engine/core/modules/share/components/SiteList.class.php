<?php
declare(strict_types=1);

/**
 * Site list.
 */
class SiteList extends DataSet
{
    /**
     * @copydoc DataSet::__construct
     */
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);
        $this->setType(self::COMPONENT_TYPE_LIST);
    }

    /**
     * Добавлены теги, количество принудительно сброшено.
     */
    protected function defineParams(): array
    {
        return array_merge(
            parent::defineParams(),
            [
                'tags'           => '',
                'recordsPerPage' => false,
            ]
        );
    }

    /**
     * Загружаем данные из SiteManager c учётом фильтра по тегам.
     */
    protected function loadData(): array|false|null
    {
        $result = [];
        $filteredIDs = true;

        $tags = (string)$this->getParam('tags');
        if ($tags !== '') {
            $filteredIDs = TagManager::getFilter($tags, 'share_sites_tags');
        }

        if (empty($filteredIDs)) {
            return [];
        }

        foreach (E()->getSiteManager() as $siteID => $site) {
            // Если включён фильтр и текущий сайт не в нём — пропускаем
            if ($filteredIDs !== true && !in_array($siteID, $filteredIDs, true)) {
                continue;
            }

            $protocol = (string)($site->protocol ?? 'http');
            $host     = (string)($site->host ?? '');
            $port     = (int)($site->port ?? 80);
            $root     = (string)($site->root ?? '/');

            $url = $protocol . '://' . $host . (($port != 80) ? ':' . $port : '') . $root;

            $result[] = [
                'site_id'   => (int)$site->id,
                'site_name' => (string)$site->name,
                'site_host' => $url,
            ];
        }

        return $result;
    }
}
