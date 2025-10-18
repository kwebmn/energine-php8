<?php

declare(strict_types=1);

/**
 * Site editor.
 */
class SiteEditor extends Grid
{
    /**
     * @inheritDoc
     */
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);
        $this->setTableName('share_sites');
        $this->setSaver(new SiteSaver());
    }

    protected function registerModals(): array
    {
        return array_merge(
            parent::registerModals(),
            [
                'reset' => function (SiteEditor $editor): Component {
                    $editor->getRequest()->shiftPath(1);

                    return $editor->activateModalComponent('dEditor', 'share', 'DivisionEditor');
                },
                'domains' => function (SiteEditor $editor, array $stateParams): Component {
                    if (isset($stateParams['site_id']))
                    {
                        $editor->getRequest()->shiftPath(2);
                        $params = ['siteID' => $stateParams['site_id']];
                    }
                    else
                    {
                        $editor->getRequest()->shiftPath(1);
                        $params = [];
                    }

                    return $editor->activateModalComponent('domainEditor', 'share', 'DomainEditor', $params);
                },
                'properties' => function (SiteEditor $editor, array $stateParams): Component {
                    $params = [];

                    if (isset($stateParams['site_id']))
                    {
                        $editor->getRequest()->shiftPath(2);
                        $params['siteID'] = $stateParams['site_id'];
                    }

                    return $editor->activateModalComponent(
                        'propertiesEditor',
                        'share',
                        'SitePropertiesEditor',
                        $params ?: null
                    );
                },
            ]
        );
    }

    /**
     * @inheritDoc
     */
    protected function getConfig(): ComponentConfig
    {
        if (!$this->config)
        {
            $this->config = new SiteEditorConfig(
                $this->getParam('config'),
                static::class,
                $this->module
            );
        }
        return $this->config;
    }

    /**
     * @inheritDoc
     */
    protected function prepare(): void
    {
        parent::prepare();

        if (!in_array($this->getState(), ['add', 'edit'], true))
        {
            return;
        }

        // Вкладка "Домены"
        $fdTab = new FieldDescription('domains');
        $fdTab->setType(FieldDescription::FIELD_TYPE_TAB);
        $fdTab->setProperty('title', $this->translate('TAB_DOMAINS'));
        $this->getDataDescription()->addFieldDescription($fdTab);

        $fieldTab = new Field('domains');
        $state = $this->getState();
        $pkVal = ($state !== 'add')
            ? (string)$this->getData()->getFieldByName($this->getPK())->getRowData(0)
            : '';
        $tabURL = $pkVal . '/domains/';
        $fieldTab->setData($tabURL, true);
        $this->getData()->addField($fieldTab);

        // Селект с папками сайта
        $fdFolder = $this->getDataDescription()->getFieldOrNull('site_folder')
            ?: $this->getDataDescription()->getFieldDescriptionByName('site_folder'); // BC
        if ($fdFolder instanceof FieldDescription)
        {
            $fdFolder->setType(FieldDescription::FIELD_TYPE_SELECT);
            $fdFolder->loadAvailableValues($this->loadFoldersData(), 'key', 'value');
        }

        // Если сайт по умолчанию — делаем флаг только для чтения
        $siteIsDefaultField = $this->getData()->getFieldByName('site_is_default');
        if ($siteIsDefaultField && (int)$siteIsDefaultField->getRowData(0) === 1)
        {
            $fdDefault = $this->getDataDescription()->getFieldOrNull('site_is_default')
                ?: $this->getDataDescription()->getFieldDescriptionByName('site_is_default');
            if ($fdDefault instanceof FieldDescription)
            {
                $fdDefault->setMode(FieldDescription::FIELD_MODE_READ);
            }
        }

        // Поле "tags" (строка, без pattern)
        $fdTags = new FieldDescription('tags');
        $fdTags->setType(FieldDescription::FIELD_TYPE_STRING);
        $fdTags->removeProperty('pattern');
        $this->getDataDescription()->addFieldDescription($fdTags);

        if ($state === 'add')
        {
            // Значения по умолчанию
            $this->getData()->getFieldByName('site_is_active')?->setData(1, true);
            $this->getData()->getFieldByName('site_is_indexed')?->setData(1, true);

            // Возможность копировать структуру другого сайта
            $fdCopy = new FieldDescription('copy_site_structure');
            $fdCopy->setType(FieldDescription::FIELD_TYPE_SELECT);
            $rows = $this->dbh->selectRequest(
                'SELECT ss.site_id, site_name
                   FROM share_sites ss
                   LEFT JOIN share_sites_translation sst ON ss.site_id = sst.site_id
                  WHERE lang_id = %s',
                $this->document->getLang()
            );
            $fdCopy->loadAvailableValues($rows, 'site_id', 'site_name');
            $this->getDataDescription()->addFieldDescription($fdCopy);
        }
        else
        {
            // PK — readonly
            $pkFD = $this->getDataDescription()->getFieldOrNull($this->getPK())
                ?: $this->getDataDescription()->getFieldDescriptionByName($this->getPK());
            if ($pkFD instanceof FieldDescription)
            {
                $pkFD->setType(FieldDescription::FIELD_TYPE_HIDDEN)
                    ->setMode(FieldDescription::FIELD_MODE_READ);
            }

            // TagManager: сформировать описание/поле для тегов
            $tm = new TagManager($this->getDataDescription(), $this->getData(), $this->getTableName());
            $tm->createFieldDescription();
            $tm->createField();
        }
    }

    /**
     * Доп. свойства сайта.
     */
    /**
     * @inheritDoc
     */
    public function build(): DOMDocument
    {
        if ($modal = $this->getActiveModalComponent())
        {
            return $modal->build();
        }

        return parent::build();
    }

    /**
     * Загрузка данных о папках в поле site_folder.
     *
     * @return array<int, array{key:string,value:string}>
     */
    private function loadFoldersData(): array
    {
        $result = [];
        $base = SITE_DIR . '/modules/';

        foreach (glob($base . '*', GLOB_ONLYDIR) ?: [] as $folderPath)
        {
            $folder = str_replace($base, '', $folderPath);
            $result[] = ['key' => $folder, 'value' => $folder];
        }

        return $result;
    }

    /**
     * Переход на сайт.
     *
     * @throws SystemException 'ERR_BAD_URL'
     */
    protected function go(): void
    {
        [$siteID] = $this->getStateParams();

        $url = $this->dbh->getScalar(
            'SELECT CONCAT(domain_protocol, "://", domain_host, ":", domain_port, domain_root) AS url
               FROM share_domains
               LEFT JOIN share_domain2site USING (domain_id)
              WHERE site_id = %s
              LIMIT 1',
            $siteID
        );

        if (!$url)
        {
            throw new SystemException(
                'ERR_BAD_URL',
                SystemException::ERR_CRITICAL,
                $this->dbh->getLastRequest()
            );
        }

        E()->getResponse()->setRedirect((string)$url);
    }
}
