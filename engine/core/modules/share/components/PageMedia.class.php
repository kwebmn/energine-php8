<?php
declare(strict_types=1);

/**
 * Show media container on the page with media files attached to the current page.
 */
class PageMedia extends DataSet
{
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);
    }

    // Выводит галерею
    protected function main(): void
    {
        $this->prepare();

        // Поле добавлено, чтобы Data не был пустым
        $this->getData()->addField(new Field('fake'));

        $m = new AttachmentManager(
            $this->getDataDescription(),
            $this->getData(),
            'share_sitemap'
        );
        $m->createFieldDescription();

        // Третий аргумент — условие маппинга (array|false), а не число
        $m->createField('smap_id', false, ['smap_id' => (int)$this->document->getID()]);
    }
}
