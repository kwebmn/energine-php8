<?php

declare(strict_types=1);

/**
 * Список страниц/подразделов.
 *
 * Упрощённая и хорошо прокомментированная версия PageList.
 * Сохраняет исходное поведение:
 *  - выбор набора страниц (дети/потомки/все/по id),
 *  - рекурсивная выдача в виде дерева,
 *  - фильтрация по тегам,
 *  - добавление виртуальных полей (Redirect/Site),
 *  - подключение менеджеров вложений и тегов.
 */
class PageList extends DataSet
{
    /** Текущая страница. */
    public const CURRENT_PAGE = 'current';
    /** Родитель текущей страницы. */
    public const PARENT_PAGE  = 'parent';
    /** Все страницы сайта. */
    public const ALL_PAGES    = 'all';

    /**
     * @inheritDoc
     */
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);

        $this->setType(self::COMPONENT_TYPE_LIST);
        $this->addTranslation('TXT_HOME');

        // Нормализуем параметр site: 'default' → id сайта по умолчанию, 'current' → id текущего сайта
        $siteParam = $this->getParam('site');
        if ($siteParam === 'default')
        {
            $this->setParam('site', E()->getSiteManager()->getDefaultSite()->id);
        }
        elseif ($siteParam === 'current')
        {
            $this->setParam('site', E()->getSiteManager()->getCurrentSite()->id);
        }
    }

    /**
     * @inheritDoc
     */
    protected function defineParams(): array
    {
        // Параметры:
        // - tags      : строка тегов для фильтрации
        // - id        : id страницы или одна из констант CURRENT_PAGE | PARENT_PAGE | ALL_PAGES
        // - site      : id сайта (если необходимо явно задать карту)
        // - recursive : рекурсивный режим (дерево)
        return array_merge(
            parent::defineParams(),
            [
                'tags'      => '',
                'id'        => false,
                'site'      => false,
                'recursive' => false,
            ]
        );
    }

    /**
     * Если включён recursive — рендерим деревом.
     */
    protected function createBuilder(): AbstractBuilder
    {
        return $this->getParam('recursive') ? new TreeBuilder() : new SimpleBuilder();
    }

    /**
     * Основное состояние: гарантируем базовое описание полей, добавляем виртуальные поля,
     * подключаем вложения/теги при наличии соответствующих полей.
     */
    protected function main(): void
    {
        parent::main();

        $this->ensureDefaultDataDescription();

        if (($data = $this->getData()) instanceof Data && !$data->isEmpty())
        {
            $this->injectVirtualFieldDescriptionsIfDataNotEmpty();
            $this->attachAttachmentsIfRequested();
            $this->attachTagsIfRequested();
        }
    }

    /**
     * Загрузка данных.
     *
     * @return array|false|null
     */
    protected function loadData(): array|false|null
    {
        // 1) Определяем карту (SiteMap), метод выборки и начальный параметр.
        [$sitemap, $method, $param] = $this->resolveSitemapAndMethod();

        // 2) Получаем «сырой» набор данных из карты.
        $data = is_object($sitemap) ? $sitemap->{$method}($param) : null;

        // 3) Постобработка (фильтры/вирт.поля/дерево).
        if (!empty($data) && is_array($data))
        {
            if ($this->getParam('recursive') && $this->getBuilder() instanceof TreeBuilder)
            {
                // Для TreeBuilder предоставляем полную иерархию потомков текущего узла.
                $this->getBuilder()->setTree($sitemap->getChilds($param, true));
            }

            $hasDescriptionRtf = (bool)$this->getDataDescription()->getFieldDescriptionByName('DescriptionRtf');

            // Фильтрация по тегам (если заданы)
            $allowedIDs = $this->getAllowedIDsByTags();

            // Текущая страница по умолчанию — не выводим (домашняя)
            $defaultId = $sitemap->getDefault();

            foreach ($data as $id => &$row)
            {
                // Отбрасываем узлы не прошедшие фильтр тегов
                if ($allowedIDs !== true && is_array($allowedIDs) && !in_array((int)$id, $allowedIDs, true))
                {
                    unset($data[$id]);
                    continue;
                }
                // Не показываем «домашнюю» страницу
                if ((int)$id === (int)$defaultId)
                {
                    unset($data[$id]);
                    continue;
                }

                // Нормализуем поля для билдера/шаблона
                $row['Id']       = (int)$id;
                $row['Segment']  = $row['Segment'] ?? '';
                $row['Name']     = $row['Name']    ?? '';
                $row['Redirect'] = Response::prepareRedirectURL($row['RedirectUrl'] ?? '');
                $row['Site']     = E()->getSiteManager()->getSiteByID((int)($row['site'] ?? 0))->base ?? '';

                if ($hasDescriptionRtf)
                {
                    $row['DescriptionRtf'] = $row['DescriptionRtf'] ?? '';
                }
            }
            unset($row);
        }
        else
        {
            // Пусто — безопасно откатываемся на простой билдер
            $this->setBuilder(new SimpleBuilder());
        }

        return $data;
    }

    /* =========================================================
     * Вспомогательные методы
     * ========================================================= */

    /**
     * Убедиться, что описание данных заполнено «дефолтным» набором,
     * если конфиг его не предоставил.
     */
    private function ensureDefaultDataDescription(): void
    {
        if ($this->getDataDescription()->isEmpty())
        {
            $xml = new SimpleXMLElement(
                '<fields>
                    <field name="Id" type="integer" key="1"/>
                    <field name="Pid" type="integer"/>
                    <field name="Name" type="string"/>
                    <field name="Segment" type="string"/>
                    <field name="DescriptionRtf" type="string"/>
                    <field name="Icon" type="string"/>
                 </fields>'
            );
            $this->getDataDescription()->loadXML($xml);
        }
    }

    /**
     * Если есть реальные данные — добавляем определения виртуальных полей.
     * (Redirect и Site заполняются в loadData)
     */
    private function injectVirtualFieldDescriptionsIfDataNotEmpty(): void
    {
        foreach (['Site', 'Redirect'] as $name)
        {
            if (!$this->getDataDescription()->getFieldDescriptionByName($name))
            {
                $fd = new FieldDescription($name);
                $fd->setType(FieldDescription::FIELD_TYPE_STRING);
                $this->getDataDescription()->addFieldDescription($fd);
            }
        }
    }

    /**
     * Подключить поддержку «вложений», если в описании данных присутствует поле attachments.
     */
    private function attachAttachmentsIfRequested(): void
    {
        if (!$this->getDataDescription()->getFieldDescriptionByName('attachments'))
        {
            return;
        }

        $am = new AttachmentManager($this->getDataDescription(), $this->getData(), 'share_sitemap');
        $am->createFieldDescription();

        if (($idField = $this->getData()->getFieldByName('Id')) instanceof Field)
        {
            // Пробрасываем значения smap_id из текущего набора
            $am->createField('smap_id', true, $idField->getData());
        }
    }

    /**
     * Подключить поддержку «тегов», если в описании данных присутствует поле tags.
     */
    private function attachTagsIfRequested(): void
    {
        if (!$this->getDataDescription()->getFieldDescriptionByName('tags'))
        {
            return;
        }

        $tm = new TagManager($this->getDataDescription(), $this->getData(), 'share_sitemap');
        $tm->createFieldDescription();
        $tm->createField();
    }

    /**
     * Вернуть список допустимых ID страниц по заданным тегам, либо true если фильтрация не требуется.
     *
     * @return array|true
     */
    private function getAllowedIDsByTags(): array|true
    {
        $tags = (string)$this->getParam('tags');
        if ($tags === '')
        {
            return true; // фильтр не задан
        }
        // Таблица связки тегов страниц
        return TagManager::getFilter($tags, 'share_sitemap_tags');
    }

    /**
     * Вычислить карту сайта, метод выборки и исходный параметр на основе параметров компонента.
     *
     * @return array{0:object,1:string,2:mixed} [$sitemap, $method, $param]
     */
    private function resolveSitemapAndMethod(): array
    {
        $sitemap = E()->getMap(); // карта по умолчанию (текущий сайт)
        $method  = $this->getParam('recursive') ? 'getDescendants' : 'getChilds';
        $idParam = $this->getParam('id');

        switch ($idParam)
        {
            case self::PARENT_PAGE:
                // Соседи текущей страницы: берём родителя, далее children(parent)
                $param = $sitemap->getParent($this->document->getID());
                break;

            case self::CURRENT_PAGE:
                // Дети текущей страницы
                $param = $this->document->getID();
                break;

            case self::ALL_PAGES:
                // Все страницы сайта
                $method = 'getInfo';
                $param  = null;

                $siteId  = (int)($this->getParam('site') ?: E()->getSiteManager()->getCurrentSite()->id);
                $sitemap = E()->getMap($siteId);
                break;

            case false:
            case null:
            case 0:
                // Не передан id: берём карту указанного сайта (если задан) и корневую страницу по умолчанию
                if ($this->getParam('site'))
                {
                    $sitemap = E()->getMap((int)$this->getParam('site'));
                }
                $param = $sitemap->getDefault();
                break;

            default:
                // Передан конкретный id: берём карту соответствующего сайта
                $param   = (int)$idParam;
                $siteId  = E()->getSiteManager()->getSiteByPage($param)->id;
                $sitemap = E()->getMap($siteId);
                break;
        }

        return [$sitemap, $method, $param];
    }
}
