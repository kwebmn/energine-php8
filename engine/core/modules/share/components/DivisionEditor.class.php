<?php
declare(strict_types=1);

use DOMDocument;
use DOMNode;

/**
 * Division editor (редактор разделов сайта).
 *
 * Совместимо с PHP 8.3: строгие типы, точные сигнатуры, аккуратные проверки.
 * Логика исходной версии сохранена.
 */
final class DivisionEditor extends Grid implements SampleDivisionEditor
{
    /** Тип шаблона: content. */
    public const TMPL_CONTENT = 'content';
    /** Тип шаблона: layout. */
    public const TMPL_LAYOUT  = 'layout';

    /** Модальные дочерние редакторы (создаются по требованию). */
    private ?Component $siteEditor   = null;
    private ?Component $transEditor  = null;
    protected ?Component $userEditor = null;
    private ?Component $roleEditor   = null;
    private ?Component $langEditor   = null;


    /**
     * Конструктор: настраиваем базовую таблицу и дефолтные параметры.
     */
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);

        $this->setTableName('share_sitemap');
        $this->setTitle($this->translate('TXT_DIVISION_EDITOR'));

        // Для дерева разделов пагинация не нужна
        $this->setParam('recordsPerPage', false);
    }

    /* =========================================================
     * Структура данных / описание полей
     * ========================================================= */

    /**
     * В режиме add/edit подменяем соответствующие описания полей:
     *  - smap_pid показываем как строку (будет отрисовано деревом),
     *  - убираем nullable у smap_name,
     * В режиме списка/сырого вывода корректируем типы и добавляем smap_segment.
     */
    protected function createDataDescription(): DataDescription
    {
        $dd = parent::createDataDescription();

        if (in_array($this->getState(), ['add', 'edit'], true)) {
            if ($fd = $dd->getFieldOrNull('smap_pid')) {
                $fd->setType(FieldDescription::FIELD_TYPE_STRING);
            }
            if ($fd = $dd->getFieldOrNull('smap_name')) {
                $fd->removeProperty('nullable');
            }
        } else {
            if ($this->getType() === self::COMPONENT_TYPE_LIST) {
                if ($fd = $dd->getFieldOrNull('smap_pid')) {
                    $fd->setType(FieldDescription::FIELD_TYPE_INT);
                }
            }
            if ($this->getState() === 'getRawData') {
                $fd = new FieldDescription('smap_segment');
                $fd->setType(FieldDescription::FIELD_TYPE_STRING);
                $fd->setProperty('tableName', $this->getTableName());
                $dd->addFieldDescription($fd);
            }
        }

        return $dd;
    }

    /**
     * Добавляем к строкам getRawData вычисленный URL и (опционально) домен сайта.
     *
     * @return array<array<string, mixed>>|false|null
     */
    protected function loadData(): array|false|null
    {
        $result = parent::loadData();

        if (is_array($result) && $this->getState() === 'getRawData') {
            $params = $this->getStateParams(true);

            $result = array_map(function (array $row) use ($params) {
                $row['smap_segment'] = E()->getMap((int)$params['site_id'])->getURLByID((int)$row['smap_id']);
                if ($this->getDataDescription()->getFieldOrNull('site')) {
                    $row['site'] = E()->getSiteManager()->getSiteByID((int)$params['site_id'])->base;
                }
                return $row;
            }, $result);
        }

        return $result;
    }

    /* =========================================================
     * Построение / Ajax-выдачи
     * ========================================================= */

    /**
     * JSON выдача для дерева разделов (особый билдом JSONDivBuilder).
     */
    protected function getRawData()
    {
        $params = $this->getStateParams(true);
        $this->setFilter(['site_id' => (int)$params['site_id']]);

        $this->setParam('onlyCurrentLang', true);
        $this->getConfig()->setCurrentState(self::DEFAULT_STATE_NAME);

        $builder = new JSONDivBuilder();
        $this->setBuilder($builder);

        $this->setDataDescription($this->createDataDescription());

        $builder->setDocumentId($this->document->getID());
        $builder->setDataDescription($this->getDataDescription());

        $data = $this->createData();
        if ($data instanceof Data) {
            $this->setData($data);
            $builder->setData($this->getData());
        }

        $builder->build();
    }

    /**
     * Дополняем prepare: в формах прокидываем базу сайта в smap_pid.
     */
    protected function prepare(): void
    {
        parent::prepare();

        if (in_array($this->getState(), ['add', 'edit'], true)) {
            $this->addTranslation('ERR_NO_DIV_NAME');

            [$pageID] = $this->getStateParams();
            $site = E()->getSiteManager()->getSiteByPage((int)$pageID);

            $fdPid = $this->getDataDescription()->getFieldOrNull('smap_pid');
            if ($fdPid) {
                $fdPid->setProperty('base', $site->base);
            }
        }
    }

    /**
     * Полный build с поддержкой «дочерних» редакторов (toolbar/переводы/пользователи/роли/языки/сайт/виджеты).
     */
    public function build(): DOMDocument
    {
        switch ($this->getState()) {
            case 'showPageToolbar': {
                /** @var DOMDocument|false $doc */
                $doc = Component::build();
                if ($doc instanceof DOMDocument) {
                    $js = $this->buildJS();
                    if ($js instanceof DOMNode) {
                        $doc->documentElement->appendChild($doc->importNode($js, true));
                    }
                    $toolbars = $this->getToolbar();
                    if (!empty($toolbars)) {
                        foreach ($toolbars as $tb) {
                            $built = $tb->build();
                            if ($built instanceof DOMNode) {
                                $doc->documentElement->appendChild($doc->importNode($built, true));
                            }
                        }
                    }
                    return $doc;
                }
                // fallback — стандартный билд
                return parent::build();
            }
            case 'showTransEditor':
                return $this->transEditor?->build() ?? parent::build();

            case 'showUserEditor':
                return $this->userEditor?->build() ?? parent::build();

            case 'showRoleEditor':
                return $this->roleEditor?->build() ?? parent::build();

            case 'showLangEditor':
                return $this->langEditor?->build() ?? parent::build();

            case 'showSiteEditor':
                return $this->siteEditor?->build() ?? parent::build();

            default:
                return parent::build();
        }
    }

    /* =========================================================
     * CRUD / сохранение / спец-логика разделов
     * ========================================================= */

    /**
     * Сохранение (через DivisionSaver) + возврат URL созданной/обновлённой страницы.
     */
    protected function save()
    {
        $this->setSaver(new DivisionSaver());
        $this->setBuilder(new JSONCustomBuilder());

        $txStarted = $this->dbh->beginTransaction();

        try {
            $result = $this->saveData();

            $mode = is_int($result) ? 'insert' : 'update';
            $id   = is_int($result)
                ? $result
                : (int)($this->getFilter()['smap_id'] ?? 0);

            // Получаем URL страницы:
            if ($mode === 'insert') {
                // новая страница: pid берём из данных сейвера
                /** @var Field $fdPid */
                $fdPid = $this->getSaver()->getData()->getFieldByName('smap_pid');
                $smapPID = (int)$fdPid->getRowData(0);
                $segment = (string)($_POST[$this->getTableName()]['smap_segment'] ?? '');
                $url     = ($segment !== '' ? $segment : '') . '/';

                if ($smapPID) {
                    $siteID = E()->getSiteManager()->getSiteByPage($smapPID)->id;
                    $url    = E()->getMap($siteID)->getURLByID($smapPID) . $url;
                }
            } else {
                // обновление: строим URL по id
                $siteID = E()->getSiteManager()->getSiteByPage($id)->id;
                $url    = E()->getMap($siteID)->getURLByID($id);
            }

            if ($txStarted) {
                $this->dbh->commit();
            }

            /** @var JSONCustomBuilder $b */
            $b = $this->getBuilder();
            $b->setProperty('result', true)
                ->setProperty('mode', $mode)
                ->setProperty('url',  $url);
        } catch (\Throwable $e) {
            if ($txStarted) {
                $this->dbh->rollback();
            }
            throw $e;
        }
    }

    /**
     * Удаление: запрещаем удалять корень/системные узлы (через проверку PID),
     * затем делегируем стандартной логике Grid (переиндексация порядка).
     */
    protected function deleteData(int|string $id): void
    {
        $res = $this->dbh->select('share_sitemap', ['smap_pid'], [$this->getPK() => $id]);
        if (!is_array($res)) {
            throw new SystemException('ERR_DEV_BAD_DATA', SystemException::ERR_CRITICAL);
        }

        $pid = (int)(current($res)['smap_pid'] ?? 0);
        $this->setFilter(['smap_pid' => $pid ?: null]);

        parent::deleteData($id);
    }

    /**
     * Линейное перемещение внутри одного родителя со строгой нормализацией индексов.
     * Меняет местами текущий и соседний, затем пересчитывает smap_order_num = 1..N.
     */
    protected function changeOrder(string $direction): void
    {
        [$id] = $this->getStateParams();
        $id = (int)$id;

        if (!$this->recordExists($id)) {
            throw new SystemException('ERR_404', SystemException::ERR_404);
        }

        // Родитель текущего узла
        $res = $this->dbh->select($this->getTableName(), ['smap_pid'], ['smap_id' => $id]);
        $pid = simplifyDBResult($res, 'smap_pid', true);

        // Все соседи в рамках одного smap_pid
        $query =
            'SELECT smap_id, smap_order_num FROM share_sitemap WHERE smap_pid ' .
            (is_null($pid) ? 'IS NULL' : '= ' . (int)$pid) .
            ' ORDER BY smap_order_num ASC';

        $records = array_values($this->dbh->selectRequest($query) ?? []);

        // Позиция текущего
        $index = array_search($id, array_column($records, 'smap_id'), true);
        if ($index === false) {
            throw new SystemException('ERR_404', SystemException::ERR_404);
        }

        // Целевая позиция
        $swapIndex = ($direction === Grid::DIR_UP) ? $index - 1 : $index + 1;
        if (!isset($records[$swapIndex])) {
            throw new SystemException('ERR_CANT_MOVE', SystemException::ERR_NOTICE);
        }

        // swap
        [$records[$index], $records[$swapIndex]] = [$records[$swapIndex], $records[$index]];

        // Нормализация порядковых номеров
        try {
            $this->dbh->beginTransaction();
            foreach ($records as $i => $row) {
                $this->dbh->modify(
                    QAL::UPDATE,
                    $this->getTableName(),
                    ['smap_order_num' => $i + 1],
                    ['smap_id' => (int)$row['smap_id']]
                );
            }
            $this->dbh->commit();

            $b = new JSONCustomBuilder();
            $b->setProperties([
                'result' => true,
                'dir'    => $direction,
                'nodeID' => (int)$records[$swapIndex]['smap_id'],
            ]);
            $this->setBuilder($b);
        } catch (\Throwable $e) {
            $this->dbh->rollback();
            throw $e;
        }
    }

    /* =========================================================
     * Редакторы/окна: права/переводы/пользователи/роли/языки/сайт/виджеты/файлы
     * ========================================================= */

    /** Построить вкладку прав для всех групп. */
    private function buildRightsTab(int $divisionId): void
    {
        $builder = new Builder($this->getTitle());

        // Все группы
        $groups = convertDBResult(
            $this->dbh->select('user_groups', ['group_id', 'group_name']),
            'group_id'
        );

        $res = [];
        foreach (array_keys($groups) as $groupID) {
            $res[] = ['right_id' => 0, 'group_id' => (int)$groupID];
        }

        // Текущие права по разделу
        $data = $this->dbh->select(
            'share_access_level',
            ['group_id', 'right_id'],
            ['smap_id' => $divisionId]
        );
        $data = is_array($data) ? convertDBResult($data, 'group_id', true) : [];

        // Наполняем Data
        $dataObj = new Data();
        $dataObj->load($res);

        $rightsField = $dataObj->getFieldByName('right_id');
        $groupsField = $dataObj->getFieldByName('group_id');

        for ($i = 0, $n = $dataObj->getRowCount(); $i < $n; $i++) {
            $gid = (int)$groupsField->getRowData($i);
            if (isset($data[$gid])) {
                $rightsField->setRowData($i, $data[$gid]['right_id']);
            }
            $groupsField->setRowProperty($i, 'group_id', $gid);
        }

        // Подмена id → имена
        for ($i = 0, $n = $dataObj->getRowCount(); $i < $n; $i++) {
            $gid = (int)$groupsField->getRowData($i);
            $groupsField->setRowProperty($i, 'group_id', $gid);
            $groupsField->setRowData($i, $groups[$gid]['group_name'] ?? (string)$gid);
        }

        // Описание данных
        $dd = new DataDescription();

        $fd = new FieldDescription('group_id');
        $fd->setSystemType(FieldDescription::FIELD_TYPE_STRING);
        $fd->setMode(FieldDescription::FIELD_MODE_READ);
        $fd->setLength(30);
        $dd->addFieldDescription($fd);

        $fd = new FieldDescription('right_id');
        $fd->setSystemType(FieldDescription::FIELD_TYPE_SELECT);

        $rights = $this->dbh->select('user_group_rights', ['right_id', 'right_const as right_name']) ?? [];
        $rights = array_map(static function (array $row): array {
            $row['right_name'] = DBWorker::_translate('TXT_' . $row['right_name']);
            return $row;
        }, $rights);

        $rights[] = ['right_id' => 0, 'right_name' => $this->translate('TXT_NO_RIGHTS')];

        $fd->loadAvailableValues($rights, 'right_id', 'right_name');
        $dd->addFieldDescription($fd);

        $builder->setDataDescription($dd);
        $builder->setData($dataObj);
        $builder->build();

        // Добавляем таб в общий набор данных (по числу языков)
        $tabField = new Field('page_rights');
        $langs = count(E()->getLanguage()->getLanguages());
        for ($i = 0; $i < $langs; $i++) {
            $tabField->addRowData($builder->getResult());
        }
        $this->getData()->addField($tabField);
    }

    /**
     * Список шаблонов для SELECT (layout/content) с выносом служебных атрибутов.
     *
     * @return array<int, array<string, string>>
     */
    private function loadTemplateData(string $type, string $siteFolder, string|false $oldValue = false): array
    {
        $dirPath = Document::TEMPLATES_DIR . $type . '/';
        $include = SITE_DIR . '/modules/' . $siteFolder . '/templates/' . $type . '.include';

        // Набор путей по include-правилам либо дефолтные маски
        $folders = [];
        if (file_exists($include)) {
            $rules = file($include) ?: [];
            foreach ($rules as $rule) {
                $rule = trim($rule);
                if ($rule !== '') {
                    $folders[] = glob($dirPath . $rule) ?: [];
                }
            }
        } else {
            $folders = [
                glob($dirPath . '*.' . $type . '.xml') ?: [],
                glob($dirPath . $siteFolder . '/*.' . $type . '.xml') ?: [],
            ];
        }

        // Плоский список уникальных файлов
        $map = [];
        foreach ($folders as $chunk) {
            foreach ($chunk as $path) {
                $map[basename($path)] = $path;
            }
        }

        $out = [];
        $dom = new DOMDocument('1.0', 'UTF-8');

        foreach ($map as $path) {
            $relative = str_replace($dirPath, '', $path);
            [$name, $tp] = explode('.', substr(basename($relative), 0, -4), 2);
            $title = $this->translate(strtoupper($tp . '_' . $name));

            $row = ['key' => $relative, 'value' => $title];

            if ($type === self::TMPL_CONTENT && file_exists($full = $dirPath . $relative)) {
                $dom->load($full);
                if ($seg = $dom->documentElement->getAttribute('segment')) {
                    $row['data-segment'] = $seg;
                }
                if ($lay = $dom->documentElement->getAttribute('layout')) {
                    $row['data-layout'] = $lay;
                }
            }

            $out[] = $row;
        }

        // Если старое значение из БД не обнаружено среди вариантов — добавим disabled-опцию
        if ($oldValue && !in_array($dirPath . $oldValue, array_values($map), true)) {
            $out[] = ['key' => $oldValue, 'value' => $oldValue, 'disabled' => 'disabled'];
        }

        // Натуральная сортировка по названию
        usort(
            $out,
            static fn(array $a, array $b): int => strnatcasecmp((string)$a['value'], (string)$b['value'])
        );

        return $out;
    }

    /* =========================================================
     * Состояния add/edit/main/selector
     * ========================================================= */

    protected function add()
    {
        parent::add();

        $ap = $this->getStateParams(true);
        $this->buildRightsTab((int)$ap['pid']);

        // Требуем segment
        if ($fdSeg = $this->getDataDescription()->getFieldOrNull('smap_segment')) {
            $fdSeg->removeProperty('nullable');
        }

        $site    = E()->getSiteManager()->getSiteByPage((int)$ap['pid']);
        $sitemap = E()->getMap($site->id);

        // Проставляем site_id
        $this->getData()->getFieldByName('site_id')->setData($site->id, true);

        // Загрузим списки шаблонов
        foreach ([self::TMPL_CONTENT, self::TMPL_LAYOUT] as $type) {
            if ($fd = $this->getDataDescription()->getFieldOrNull('smap_' . $type)) {
                $fd->setType(FieldDescription::FIELD_TYPE_SELECT);
                $fd->loadAvailableValues($this->loadTemplateData($type, $site->folder), 'key', 'value');
            }
        }

        // Для PID покажем имя и текущий сегмент
        $fdPid   = $this->getData()->getFieldByName('smap_pid');
        $smapSeg = $sitemap->getURLByID((int)$ap['pid']);
        $nameRes = $this->dbh->select(
            $this->getTranslationTableName(),
            ['smap_name'],
            ['smap_id' => (int)$ap['pid'], 'lang_id' => $this->document->getLang()]
        );
        $parentName = !empty($nameRes) ? simplifyDBResult($nameRes, 'smap_name', true) : '';

        $langs = count(E()->getLanguage()->getLanguages());
        for ($i = 0; $i < $langs; $i++) {
            $fdPid->setRowData($i, (int)$ap['pid']);
            $fdPid->setRowProperty($i, 'data_name', $parentName);
            $fdPid->setRowProperty($i, 'segment',   $smapSeg);
        }

        // Теги
        $tm = new TagManager($this->getDataDescription(), $this->getData(), $this->getTableName());
        $tm->createFieldDescription();
        $tm->createField('menu');


    }

    protected function edit()
    {
        // 1) Обязательно фиксируем стейт, чтобы конфиг отдал правильные поля
        $this->getConfig()->setCurrentState('edit');

        // 2) Выполняем базовую подготовку (загрузит Data/DataDescription c join переводов)
        parent::edit();

        // 3) Получаем текущий smap_id из данных
        $smapID = 0;
        if ($fId = $this->getData()->getFieldByName('smap_id')) {
            $smapID = (int)$fId->getRowData(0);

            // ВАЖНО: делаем поле «одиночным», чтобы не дублировалось по числу языков
            $fId->setData($smapID, true);
        }
        // И на всякий случай зафиксируем режим/тип в описании
        if ($fdIdDesc = $this->getDataDescription()->getFieldOrNull('smap_id')) {
            $fdIdDesc->setType(FieldDescription::FIELD_TYPE_HIDDEN)
                ->setMode(FieldDescription::FIELD_MODE_READ);
        }

        // 4) Права на страницу
        if ($smapID > 0) {
            $this->buildRightsTab($smapID);
        }

        // 5) Определяем сайт по странице (надёжнее, чем читать из Data)
        $site = E()->getSiteManager()->getSiteByPage($smapID);

        // site_id тоже не должен размножаться — делаем single
        if ($fSite = $this->getData()->getFieldByName('site_id')) {
            $fSite->setData($site->id, true);
        }

        // 6) Списки шаблонов (с поддержкой «кастомного» старого значения)
        foreach ([self::TMPL_CONTENT, self::TMPL_LAYOUT] as $type) {
            if ($fd = $this->getDataDescription()->getFieldOrNull('smap_' . $type)) {
                $fd->setType(FieldDescription::FIELD_TYPE_SELECT);
                $old = (string)($this->getData()->getFieldByName('smap_' . $type)?->getRowData(0) ?? '');
                $fd->loadAvailableValues($this->loadTemplateData($type, $site->folder, $old), 'key', 'value');
            }
        }


        // 8) Родитель и сегмент (декорация PID под «дерево»)
        if ($fdPidVal = $this->getData()->getFieldByName('smap_pid')) {
            $pidVal = $fdPidVal->getRowData(0);
            if ($pidVal !== null) {
                $seg = E()->getMap($site->id)->getURLByID((int)$pidVal);
                if ($fdSeg = $this->getDataDescription()->getFieldOrNull('smap_segment')) {
                    $fdSeg->removeProperty('nullable');
                }

                $name = simplifyDBResult(
                    $this->dbh->select(
                        $this->getTranslationTableName(),
                        ['smap_name'],
                        [
                            'smap_id' => (int)$pidVal,
                            'lang_id' => $this->document->getLang()
                        ]
                    ),
                    'smap_name',
                    true
                );

                $langs = count(E()->getLanguage()->getLanguages());
                for ($i = 0; $i < $langs; $i++) {
                    $fdPidVal->setRowProperty($i, 'data_name', $name);
                    $fdPidVal->setRowProperty($i, 'segment',   $seg);
                }

                // сам smap_pid уместно тоже зафиксировать как single (без дублирования)
                $fdPidVal->setData((int)$pidVal, true);
            } else {
                // корень — скрываем часть полей
                if ($fdPidDesc = $this->getDataDescription()->getFieldOrNull('smap_pid')) {
                    $fdPidDesc->setMode(FieldDescription::FIELD_MODE_READ)
                        ->setType(FieldDescription::FIELD_TYPE_HIDDEN);
                }
                foreach (['smap_segment', 'smap_redirect_url'] as $name) {
                    if ($fd = $this->getDataDescription()->getFieldOrNull($name)) {
                        $this->getDataDescription()->removeFieldDescription($fd);
                    }
                }
            }
        }

        // 9) Теги
        $tm = new TagManager($this->getDataDescription(), $this->getData(), $this->getTableName());
        $tm->createFieldDescription();
        $tm->createField();

        // 10) Реклама (если активна)
        if (class_exists('AdsManager', false) && AdsManager::isActive()) {
            (new AdsManager())->edit($this->getData(), $this->getDataDescription());
        }
    }

    /**
     * Главный список по сайту (site_id из параметров или текущего сайта).
     */
    protected function main(): void
    {
        parent::main();

        $params = $this->getStateParams(true);
        $siteID = (int)($params['site_id'] ?? E()->getSiteManager()->getCurrentSite()->id);

        $this->setProperty('site', $siteID);
        $this->setFilter(['site_id' => $siteID]);
        $this->addTranslation('TXT_DIVISIONS');
    }

    /**
     * Селектор разделов (тот же main, но без построения таблицы).
     */
    protected function selector(): void
    {
        $this->addTranslation('TXT_DIVISIONS');
        $this->prepare();

        $params = $this->getStateParams(true);
        $siteID = (int)($params['site_id'] ?? E()->getSiteManager()->getCurrentSite()->id);

        $this->setProperty('site', $siteID);
        $this->setFilter(['site_id' => $siteID]);
    }

    /* =========================================================
     * Прочие служебные состояния / Ajax-методы
     * ========================================================= */

    /** Свойства узла (Ajax). */
    protected function getProperties(): void
    {
        $id     = (int)($_POST['id'] ?? 0);
        $langID = (int)($_POST['languageID'] ?? 0);

        if (!$this->recordExists($id)) {
            throw new SystemException('ERR_404', SystemException::ERR_404);
        }

        $sql = 'SELECT st.smap_name, s.smap_pid, s.smap_order_num
                FROM share_sitemap s
                LEFT JOIN share_sitemap_translation st ON s.smap_id = st.smap_id
                WHERE s.smap_id = ' . $id . ' AND st.lang_id = ' . $langID;

        $data = $this->dbh->selectRequest($sql);
        $row  = $data ? current($data) : [];

        $b = new JSONCustomBuilder();
        $b->setProperty('result', true);
        $b->setProperty('data',   $row);
        $this->setBuilder($b);
    }

    /** Информация по шаблонам текущей страницы (Ajax для тулбара). */
    protected function getTemplateInfo(): void
    {
        $res = $this->dbh->select(
            'SELECT smap_layout, smap_content, IF(smap_content_xml<>"", 1,0 ) as modified
             FROM share_sitemap WHERE smap_id = %s',
            $this->document->getID()
        );

        $result = [];
        if (!empty($res)) {
            $row = current($res);

            $contentFile = (string)$row['smap_content'];
            $layoutFile  = (string)$row['smap_layout'];

            [$contentTitle] = explode('.', basename($contentFile));
            [$layoutTitle]  = explode('.', basename($layoutFile));

            $result = [
                'content' => [
                    'title'    => $this->translate('TXT_CONTENT'),
                    'file'     => $contentFile,
                    'name'     => $this->translate('CONTENT_' . $contentTitle),
                    'modified' => ((bool)$row['modified']) ? $this->translate('TXT_CHANGED') : false,
                ],
                'layout'  => [
                    'title' => $this->translate('TXT_LAYOUT'),
                    'file'  => $layoutFile,
                    'name'  => $this->translate('LAYOUT_' . $layoutTitle),
                ],
                'actionSelector' => [
                    'reset'           => $this->translate('TXT_RESET_CONTENT'),
                    'save'            => $this->translate('TXT_SAVE_CONTENT'),
                    'saveTemplate'    => $this->translate('TXT_SAVE_TO_CURRENT_CONTENT'),
                    'saveNewTemplate' => $this->translate('TXT_SAVE_TO_NEW_CONTENT'),
                ],
                'actionSelectorText' => $this->translate('TXT_ACTION_SELECTOR'),
                'saveText'           => $this->translate('BTN_APPLY'),
                'cancelText'         => $this->translate('BTN_CANCEL'),
            ];

            // Возможен откат к шаблону ядра (если текущий — в каталоге сайта)
            if ((dirname($contentFile) !== '.') &&
                file_exists('templates/content/' . basename($contentFile))) {
                $result['actionSelector']['revert'] = $this->translate('TXT_REVERT_CONTENT');
            }
        }

        $b = new JSONCustomBuilder();
        $b->setProperty('result', true);
        $b->setProperty('data',   $result);
        $this->setBuilder($b);
    }

    /** Показать тулбар страницы. */
    protected function showPageToolbar(): void
    {
        if (!$this->getConfig()->getCurrentStateConfig()) {
            throw new SystemException('ERR_DEV_TOOLBAR_MUST_HAVE_CONFIG', SystemException::ERR_DEVELOPER);
        }
        $this->addToolbar($this->createToolbar());
        if ($this->document->isEditable()) {
            $this->getToolbar('main_toolbar')->getControlByID('editMode')->setState(1);
        }
    }

    /** Показ модальных редакторов. */
    protected function showTransEditor(): void
    {
        $this->request->shiftPath(1);
        $this->transEditor = $this->document->componentManager
            ->createComponent('transEditor', 'share', 'TranslationEditor', null);
        $this->transEditor->run();
    }

    protected function showUserEditor(): void
    {
        $this->request->shiftPath(1);
        $this->userEditor = $this->document->componentManager
            ->createComponent('userEditor', 'user', 'UserEditor', null);
        $this->userEditor->run();
    }

    protected function showRoleEditor(): void
    {
        $this->request->shiftPath(1);
        $this->roleEditor = $this->document->componentManager
            ->createComponent('roleEditor', 'user', 'RoleEditor', null);
        $this->roleEditor->run();
    }

    protected function showLangEditor(): void
    {
        $this->request->shiftPath(1);
        $this->langEditor = $this->document->componentManager
            ->createComponent('langEditor', 'share', 'LanguageEditor', null);
        $this->langEditor->run();
    }

    protected function showSiteEditor(): void
    {
        $this->request->shiftPath(1);
        $this->siteEditor = $this->document->componentManager
            ->createComponent('siteEditor', 'share', 'SiteEditor', [
                'config' => 'core/modules/share/config/SiteEditorModal.component.xml'
            ]);
        $this->siteEditor->run();
    }

    protected function fileLibrary(): void
    {
        $this->request->shiftPath(1);
        $this->fileLibrary = $this->document->componentManager
            ->createComponent('filelibrary', 'share', 'FileRepository', [
                'config' => 'core/modules/share/config/FileRepositoryModal.component.xml'
            ]);
        $this->fileLibrary->run();
    }

    /** Сброс изменённых шаблонов у выбранного узла/сайта. */
    protected function resetTemplates(): void
    {
        $ap = $this->getStateParams(true);

        $filter = ['smap_id' => $this->document->getID()];
        if (isset($ap['site_id'])) {
            $filter = ['site_id' => (int)$ap['site_id']];
        } elseif (isset($ap['smap_id'])) {
            $filter = ['smap_id' => (int)$ap['smap_id']];
        }

        $ids = simplifyDBResult(
            $this->dbh->select($this->getTableName(), ['smap_id'], $filter),
            'smap_id'
        );

        $started = $this->dbh->beginTransaction();
        try {
            if (is_array($ids) && !empty($ids)) {
                $this->dbh->modify(
                    QAL::UPDATE,
                    $this->getTableName(),
                    ['smap_content_xml' => '', 'smap_layout_xml' => ''],
                    ['smap_id' => $ids]
                );
            }

            $b = new JSONCustomBuilder();
            $b->setProperty('result', true);
            $this->setBuilder($b);

            if ($started) {
                $this->dbh->commit();
            }
        } catch (\Throwable $e) {
            if ($started) {
                $this->dbh->rollback();
            }
            throw $e;
        }
    }
}

/**
 * Пустой интерфейс-метка (оставлен для совместимости).
 */
interface SampleDivisionEditor {}
