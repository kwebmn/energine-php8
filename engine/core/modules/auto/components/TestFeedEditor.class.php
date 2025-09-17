<?php
/**
 * Test feed editor component.
 *
 * Handles CRUD operations for the `auto_test` table.
 *
 * @version 68326f5
 */
class TestFeedEditor extends ExtendedFeedEditor
{
    /**
     * Instance of division selector component created on demand.
     *
     * @var Component|null
     */
    private ?Component $divisionEditor = null;

    /**
     * Construct test feed editor.
     *
     * @param string     $name   Имя компонента.
     * @param string     $module Имя модуля.
     * @param array|null $params Параметры компонента.
     */
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);
        $this->setTableName('auto_test');
    }

    /**
     * Build component output.
     *
     * @return DOMDocument Построенный DOM-документ.
     */
    public function build(): DOMDocument {
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

    /**
     * Load dataset with additional smap identifier on add state.
     *
     * @return array|false|null Загруженные данные.
     */
    public function loadData(): array|false|null
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

    /**
     * Display site map selector for choosing division.
     */
    protected function showSmapSelector() {
        $this->request->shiftPath(1);
        $this->divisionEditor = ComponentManager::createBlockFromDescription(
            ComponentManager::getDescriptionFromFile('core/modules/apps/templates/content/site_div_selector.container.xml'));
        $this->divisionEditor->run();
    }

    /**
     * Describe dataset fields.
     *
     * @return DataDescription Описание полей данных.
     */
    protected function createDataDescription(): DataDescription {
        $dd = LinkingEditor::createDataDescription();
        if (in_array($this->getState(), array('add', 'edit'))) {
            $dd->getFieldDescriptionByName('smap_id')->setType(FieldDescription::FIELD_TYPE_SMAP_SELECTOR);
        }
        return $dd;
    }

    /**
     * Fill site map names for editing state.
     */
    protected function edit(): void {
        parent::edit();
        $smapField = $this->getData()->getFieldByName('smap_id');

        for ($i = 0; $i < sizeof(E()->getLanguage()->getLanguages()); $i++) {
            $smapField->setRowProperty($i, 'smap_name', $this->dbh->getScalar(
                'SELECT CONCAT(site_name, ":", smap_name) as smap_name FROM share_sitemap sm LEFT JOIN share_sitemap_translation smt USING(smap_id) LEFT JOIN share_sites_translation s ON (s.site_id = sm.site_id) AND (s.lang_id = %s) WHERE sm.smap_id = %s AND smt.lang_id= %1$s', $this->document->getLang(), $smapField->getRowData(0)
            ));

        }
    }


    /**
     * Create data for saving.
     *
     * @return Data Подготовленные данные.
     */
    protected function createData(): Data
    {
        return LinkingEditor::createData();
    }

    /**
     * Save dataset via linking editor.
     *
     * @return mixed Результат сохранения.
     */
    protected function saveData()
    {
        return LinkingEditor::saveData();
    }
}