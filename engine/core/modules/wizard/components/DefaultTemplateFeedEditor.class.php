<?php

class DefaultTemplateFeedEditor extends ExtendedFeedEditor
{
    public function __construct($name, $module, array $params = null)
    {
        parent::__construct($name, $module, $params); 
        $this->setTableName('DefaultTemplateTableName');
    }

    public function build() {
        switch ($this->getState()) {
            case 'showSmapSelector':
                $result = $this->divisionEditor->build();
                break;

            default:
                $result = parent::build();
                break;
        }
        return $result;
    }

    public function loadData()
    {
        $res = parent::loadData();
        if ($this->getState() == 'add')
        {

            if (sizeof($res) > 0 and is_array($res))
                foreach ($res as $key => $row)
                {
                    $res[$key]['smap_id'] = $this->document->getID();
                }
        }
        return $res;
    }

    protected function showSmapSelector() {
        $this->request->shiftPath(1);
        $this->divisionEditor = ComponentManager::createBlockFromDescription(
            ComponentManager::getDescriptionFromFile('core/modules/apps/templates/content/site_div_selector.container.xml'));
        $this->divisionEditor->run();
    }

    protected function createDataDescription() {
        $dd = LinkingEditor::createDataDescription();
        if (in_array($this->getState(), array('add', 'edit'))) {
            $dd->getFieldDescriptionByName('smap_id')->setType(FieldDescription::FIELD_TYPE_SMAP_SELECTOR);
        }
        return $dd;
    }

    protected function edit() {
        parent::edit();
        $smapField = $this->getData()->getFieldByName('smap_id');

        for ($i = 0; $i < sizeof(E()->getLanguage()->getLanguages()); $i++) {
            $smapField->setRowProperty($i, 'smap_name', $this->dbh->getScalar(
                'SELECT CONCAT(site_name, ":", smap_name) as smap_name FROM share_sitemap sm LEFT JOIN share_sitemap_translation smt USING(smap_id) LEFT JOIN share_sites_translation s ON (s.site_id = sm.site_id) AND (s.lang_id = %s) WHERE sm.smap_id = %s AND smt.lang_id= %1$s', $this->document->getLang(), $smapField->getRowData(0)
            ));

        }
    }


    protected function createData() {
        return LinkingEditor::createData();
    }

    protected function saveData() {
        return LinkingEditor::saveData();
    }
}