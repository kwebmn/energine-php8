<?php
declare(strict_types=1);

class PageInfo extends DataSet
{
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);
    }

    protected function main(): void
    {
        $this->setType(self::COMPONENT_TYPE_LIST);
        $this->setBuilder(new SimpleBuilder());

        $dd = $this->createDataDescription();
        if ($dd->isEmpty()) {
            $dd->load([
                'smap_id' => [
                    'type'  => FieldDescription::FIELD_TYPE_INT,
                    'key'   => true,
                    'index' => 'PRI',
                ],
                'smap_name' => [
                    'type' => FieldDescription::FIELD_TYPE_STRING,
                ],
                'smap_description_rtf' => [
                    'type' => FieldDescription::FIELD_TYPE_HTML_BLOCK,
                ],
            ]);
        }
        $this->setDataDescription($dd);

        $this->js = $this->buildJS();

        $toolbars = $this->createToolbar();
        if (!empty($toolbars)) {
            $this->addToolbar($toolbars);
        }

        $d = new Data();
        $this->setData($d);

        $query = '
            SELECT
                s.smap_id,
                st.smap_name,
                st.smap_description_rtf
            FROM share_sitemap s
            LEFT JOIN share_sitemap_translation st USING (smap_id)
            WHERE (smap_id = %s) AND (lang_id = %s)
            LIMIT 1
        ';

        $data = $this->dbh->select(
            $query,
            (int)$this->document->getID(),
            (int)$this->document->getLang()
        );

        if (is_array($data) && !empty($data)) {
            $d->load($data);
        }

        // Чтобы Data не был пустым (старое поведение)
        $this->getData()->addField(new Field('fake'));

        // Медиавложения страницы
        $m = new AttachmentManager(
            $this->getDataDescription(),
            $this->getData(),
            'share_sitemap'
        );
        $m->createFieldDescription();

        // ВНИМАНИЕ: третий аргумент теперь array|false — передаём условие маппинга
        $m->createField('smap_id', false, ['smap_id' => (int)$this->document->getID()]);
    }
}
