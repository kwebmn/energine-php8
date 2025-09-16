<?php
declare(strict_types=1);

/**
 * Хлебные крошки.
 *
 * Показывает путь от корня сайта до текущей страницы и, при необходимости,
 * добавляет дополнительные крошки из других компонентов.
 */
final class BreadCrumbs extends DataSet
{
    /**
     * Дополнительные элементы, которые могут добавить другие компоненты.
     * Каждый элемент: ['Id' => int|string, 'Name' => string, 'Segment' => string, 'Title' => string|null]
     *
     * @var array<int, array{Id:int|string,Name:string,Segment:string,Title?:string}>
     */
    private array $additionalCrumbs = [];

    /**
     * @inheritDoc
     */
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);

        // Компонент — список.
        $this->setType(self::COMPONENT_TYPE_LIST);

        // Имя текущего сайта — может понадобиться XSLT/шаблону.
        $this->setProperty('site', E()->getSiteManager()->getCurrentSite()->name);
    }

    /**
     * Всегда используем простой билдер.
     *
     * @return AbstractBuilder
     */
    protected function createBuilder(): AbstractBuilder
    {
        return new SimpleBuilder();
    }

    /**
     * Описание данных для шаблона.
     */
    protected function createDataDescription(): DataDescription
    {
        $dd = new DataDescription();

        // В Id допускаем как int, так и string → безопаснее STRING
        $f = new FieldDescription('Id');
        $f->setType(FieldDescription::FIELD_TYPE_STRING);
        $f->setProperty('key', true);
        $dd->addFieldDescription($f);

        $f = new FieldDescription('Name');
        $f->setType(FieldDescription::FIELD_TYPE_STRING);
        $dd->addFieldDescription($f);

        $f = new FieldDescription('Segment');
        $f->setType(FieldDescription::FIELD_TYPE_STRING);
        $dd->addFieldDescription($f);

        $f = new FieldDescription('Title');
        $f->setType(FieldDescription::FIELD_TYPE_STRING);
        $dd->addFieldDescription($f);

        return $dd;
    }

    /**
     * Загружаем путь до текущего документа + опциональные дополнительные крошки.
     *
     * @return array<int, array{Id:int|string,Name:string,Segment:string,Title?:string}>|false
     */
    protected function loadData() : array|false|null
    {
        $sitemap   = E()->getMap();
        $currentId = $this->document->getID();

        $result = [];

        // Родители текущего документа (обычно от корня к листу).
        $parents = (array)$sitemap->getParents($currentId);
        foreach ($parents as $id => $info) {
            $result[] = [
                'Id'      => $id,
                'Name'    => strip_tags((string)($info['Name'] ?? '')),
                'Segment' => (string)($info['Segment'] ?? ''),
                'Title'   => (string)($info['HtmlTitle'] ?? ''),
            ];
        }

        // Сам текущий документ — последним.
        $docInfo = (array)$sitemap->getDocumentInfo($currentId);
        $result[] = [
            'Id'      => $currentId,
            'Name'    => strip_tags((string)($docInfo['Name'] ?? '')),
            'Segment' => (string)$sitemap->getURLByID($currentId),
            'Title'   => (string)($docInfo['HtmlTitle'] ?? ''),
        ];

        // Дополнительные крошки от других компонентов (если есть).
        if (!empty($this->additionalCrumbs)) {
            $result = array_merge($result, $this->additionalCrumbs);
        }

        // Вставляем ссылку на главную страницу (если это не она).
        $defaultId = $sitemap->getDefault();
        if ($currentId !== $defaultId) {
            $first = $result[0] ?? null;
            if (!$first || (isset($first['Id']) && (string)$first['Id'] !== (string)$defaultId)) {
                $home = (array)$sitemap->getDocumentInfo($defaultId);
                array_unshift($result, [
                    'Id'      => $defaultId,
                    'Name'    => strip_tags((string)($home['Name'] ?? '')),
                    'Segment' => '', // Корень сайта
                    'Title'   => (string)($home['HtmlTitle'] ?? ''),
                ]);
            }
        }

        return $result;
    }

    /**
     * Добавить дополнительную крошку.
     *
     * Если придут пустые значения — они будут переданы в шаблон как есть.
     * Шаблон может решить, скрывать такую крошку или использовать её для
     * превращения предыдущей крошки в ссылку (как в исходной логике).
     *
     * @param int|string $smapID
     * @param string     $smapName
     * @param string     $smapSegment
     * @param string     $title       Необязательный заголовок (HtmlTitle)
     */
    public function addCrumb(int|string $smapID = '', string $smapName = '', string $smapSegment = '', string $title = ''): void
    {
        $crumb = [
            'Id'      => $smapID,
            'Name'    => $smapName,
            'Segment' => $smapSegment,
        ];
        if ($title !== '') {
            $crumb['Title'] = $title;
        }
        $this->additionalCrumbs[] = $crumb;
    }

    /**
     * Полностью заменить набор крошек готовыми данными.
     *
     * @param array<int, array{Id:int|string,Name:string,Segment:string,Title?:string}> $data
     */
    public function replaceData(array $data): void
    {
        $d = new Data();
        $d->load($data);
        $this->setData($d);
    }

    /**
     * Обрезать N элементов с конца списка дополнительных крошек.
     *
     * @param int $indexFromEnd Сколько элементов удалить с конца (>=1)
     */
    public function removeCrumb(int $indexFromEnd): void
    {
        if ($indexFromEnd <= 0) {
            return;
        }
        $count = count($this->additionalCrumbs);
        $keep  = max(0, $count - $indexFromEnd);
        $this->additionalCrumbs = array_slice($this->additionalCrumbs, 0, $keep);
    }
}
