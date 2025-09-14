<?php
declare(strict_types=1);

/**
 * Site map (структура разделов сайта).
 *
 * Совместимо с существующим окружением:
 *  - DBWorker/QAL
 *  - TreeNode/TreeNodeList
 *  - утилиты convertDBResult(), convertFieldNames(), simplifyDBResult()
 *
 * Основные методы:
 *  - __construct(int $siteID)
 *  - getDefault(): int
 *  - getURLByID(int $smapID): string
 *  - getIDByURI(array $segments): int
 *  - getDocumentRights(int $docID, array|int|false $groups = false): int
 *  - getChilds(int $smapID, bool $returnAsTreeNodeList = false): array|TreeNodeList
 *  - getDescendants(int $smapID): array
 *  - getParent(int $smapID): int|false
 *  - getParents(int $smapID): array
 *  - getDocumentInfo(int $id): array
 *  - getTree(): TreeNodeList
 *  - getInfo(): array
 */
final class Sitemap extends DBWorker
{
    /** @var TreeNodeList */
    private TreeNodeList $tree;

    /** @var array<int,array> Информация по разделам (кэш) */
    private array $info = [];

    /** @var int ID дефолтной страницы (корня) */
    private int $defaultID;

    /** Мета-данные сайта по умолчанию (подставляются, если у страницы нет своих) */
    private ?string $defaultMetaKeywords = null;
    private ?string $defaultMetaDescription = null;
    private ?string $defaultMetaRobots = null;

    /** @var int текущий язык */
    private int $langID;

    /** @var array<int,array<int,int>> Кэш прав: [smap_id][group_id] = ACCESS_* */
    private array $cacheAccessLevels = [];

    /** @var int текущий сайт */
    private int $siteID;

    /**
     * @param int $siteID
     * @throws SystemException
     */
    public function __construct(int $siteID)
    {
        parent::__construct();

        $this->siteID = $siteID;
        $this->langID = (int)E()->getLanguage()->getCurrent();

        // Группы текущего пользователя
        $userGroups = array_map('intval', E()->getAUser()->getGroups());

        // 1) Тянем список доступных разделов (id/pid) для построения дерева
        $res = $this->dbh->select(
            'SELECT s.smap_id, s.smap_pid
               FROM share_sitemap s
               LEFT JOIN share_sitemap_translation st ON st.smap_id = s.smap_id
              WHERE st.smap_is_disabled = 0
                AND s.site_id = %s
                AND st.lang_id = %s
                AND s.smap_id IN (
                    SELECT smap_id
                      FROM share_access_level
                     WHERE group_id IN (' . implode(',', $userGroups) . ')
                )
              ORDER BY s.smap_order_num',
            $this->siteID,
            $this->langID
        );

        $idsRows = is_array($res) ? $res : []; // QAL иногда возвращает true — нормализуем
        $smapIds = array_map(static fn($r) => (int)$r['smap_id'], $idsRows);

        // 2) Кэш прав доступа (если нет разделов — матрица пустая)
        if ($smapIds) {
            $rightsMatrix = $this->dbh->select('share_access_level', true, ['smap_id' => $smapIds]);
            if (!is_array($rightsMatrix)) {
                throw new SystemException('ERR_404', SystemException::ERR_404);
            }
            // Инициализация прав по умолчанию
            foreach ($smapIds as $sid) {
                foreach ($userGroups as $gid) {
                    $this->cacheAccessLevels[$sid][$gid] = ACCESS_NONE;
                }
            }
            // Заполнение из БД
            foreach ($rightsMatrix as $row) {
                $sid = (int)$row['smap_id'];
                $gid = (int)$row['group_id'];
                $rid = (int)$row['right_id'];
                $this->cacheAccessLevels[$sid][$gid] = $rid;
            }
        }

        // 3) Строим дерево
        $this->tree = TreeConverter::convert($idsRows, 'smap_id', 'smap_pid');

        // 4) Дефолтная страница и дефолтные site-meta
        $res = $this->dbh->select('
            SELECT s.smap_id,
                   ss.site_meta_keywords,
                   ss.site_meta_description,
                   sss.site_meta_robots
              FROM share_sitemap s
              LEFT JOIN share_sites_translation ss ON ss.site_id = s.site_id
              LEFT JOIN share_sites            sss ON sss.site_id = s.site_id
             WHERE ss.site_id = %s
               AND ss.lang_id = %s
               AND s.smap_pid IS NULL
             LIMIT 1
        ', $this->siteID, $this->langID);

        if (!is_array($res) || !$res) {
            throw new SystemException('ERR_NO_TRANSLATION', SystemException::ERR_CRITICAL, $this->dbh->getLastRequest());
        }
        $row = $res[0];
        $this->defaultID              = (int)$row['smap_id'];
        $this->defaultMetaKeywords    = $row['site_meta_keywords'] ?? null;
        $this->defaultMetaDescription = $row['site_meta_description'] ?? null;
        $this->defaultMetaRobots      = $row['site_meta_robots'] ?? null;

        // 5) Подтянем подробную информацию по всем узлам дерева единоразово
        $allIds = array_keys($this->tree->asList());
        if ($allIds) {
            $this->getSitemapData($allIds);
        }
    }

    /**
     * ID сайта по ID страницы.
     */
    public static function getSiteID(int $pageID): mixed
    {
        return simplifyDBResult(
            E()->getDB()->select('share_sitemap', 'site_id', ['smap_id' => $pageID]),
            'site_id',
            true
        );
    }

    /**
     * Подтянуть информацию по разделам (если ещё не в кэше).
     *
     * @param int|int[] $id
     * @return array<int,array>
     */
    private function getSitemapData(int|array $id): array
    {
        $needIds = array_map('intval', (array)$id);
        $needIds = array_values(array_diff($needIds, array_keys($this->info)));
        if (!$needIds) {
            // уже всё есть
            return array_intersect_key($this->info, array_flip((array)$id));
        }

        $idsSql = implode(',', $needIds);
        $rows = $this->dbh->select(
            'SELECT s.smap_id,
                    s.smap_pid,
                    s.site_id                           AS site,
                    s.smap_segment                      AS Segment,
                    s.smap_meta_robots,
                    st.smap_name,
                    s.smap_redirect_url,
                    st.smap_description_rtf,
                    st.smap_html_title,
                    st.smap_meta_keywords,
                    st.smap_meta_description
               FROM share_sitemap s
               LEFT JOIN share_sitemap_translation st
                      ON st.smap_id = s.smap_id
                     AND st.lang_id = %s
              WHERE s.site_id = %s
                AND s.smap_id IN (' . $idsSql . ')',
            $this->langID,
            $this->siteID
        );

        if (!is_array($rows)) {
            return [];
        }

        $mapped = convertDBResult($rows, 'smap_id', true); // key = smap_id
        // Подготовим каждую запись
        $prepared = array_map([$this, 'preparePageInfo'], $mapped);
        // Кэшируем
        $this->info += $prepared;

        // Вернём только запрошенные
        return array_intersect_key($this->info, array_flip((array)$id));
    }

    /**
     * Нормализация полей страницы (camelCase + дефолтные meta).
     */
    private function preparePageInfo(array $current): array
    {
        $result = convertFieldNames($current, 'smap');

        if (!isset($result['Pid'])) {
            // в convertFieldNames поле pid станет 'Pid'
            $result['Pid'] = $current['smap_pid'] ?? null;
        }

        if (!array_key_exists('MetaKeywords', $result) || $result['MetaKeywords'] === null) {
            $result['MetaKeywords'] = $this->defaultMetaKeywords;
        }
        if (!array_key_exists('MetaDescription', $result) || $result['MetaDescription'] === null) {
            $result['MetaDescription'] = $this->defaultMetaDescription;
        }
        if (!array_key_exists('MetaRobots', $result) || !$result['MetaRobots']) {
            $result['MetaRobots'] = $this->defaultMetaRobots;
        }

        return $result;
    }

    /**
     * ID дефолтной страницы.
     */
    public function getDefault(): int
    {
        return $this->defaultID;
    }

    /**
     * Собрать URL (сегменты) по ID раздела.
     */
    public function getURLByID(int|string $smapID): string
    {
        $segments = [];
        $node = $this->tree->getNodeById($smapID);

        if ($node !== null) {
            $parents = array_reverse(array_keys($node->getParents()->asList(false)));
            foreach ($parents as $pid) {
                if (isset($this->info[$pid]) && !empty($this->info[$pid]['Segment'])) {
                    $segments[] = $this->info[$pid]['Segment'];
                } else {
                    $info = $this->getDocumentInfo($pid);
                    $segments[] = (string)($info['Segment'] ?? '');
                }
            }
        }

        $cur = $this->getDocumentInfo($smapID);
        $segments[] = (string)($cur['Segment'] ?? '');
        $segments = array_values(array_filter($segments, static fn($s) => $s !== ''));

        return $segments ? implode('/', $segments) . '/' : '';
    }

    /**
     * Найти ID раздела по массиву сегментов URI.
     * Возвращает default, если сегменты пусты или путь не найден целиком.
     */
    public function getIDByURI(array $segments): int
    {
        $request = E()->getRequest();
        $id = $this->getDefault();

        if (empty($segments)) {
            return $id;
        }

        foreach ($segments as $i => $segment) {
            $found = false;

            foreach ($this->info as $pageID => $pageInfo) {
                if ((string)$segment === (string)($pageInfo['Segment'] ?? '')
                    && (int)$id === (int)($pageInfo['Pid'] ?? -1)) {
                    $id = (int)$pageID;
                    $request->setPathOffset($i + 1);
                    $found = true;
                    break;
                }
            }

            if (!$found) {
                break;
            }
        }

        return $id;
    }

    /**
     * Права на документ (максимальные среди групп).
     */
    public function getDocumentRights(int $docID, array|int|false $groups = false): int
    {
        $groupList = match (true) {
            $groups === false => E()->getAUser()->getGroups(),
            is_int($groups)   => [$groups],
            default           => array_values(array_map('intval', $groups)),
        };

        $groupMap = array_combine($groupList, $groupList);

        $result = ACCESS_NONE;
        if (isset($this->cacheAccessLevels[$docID])) {
            $result = max(array_intersect_key($this->cacheAccessLevels[$docID], $groupMap) ?: [ACCESS_NONE]);
        }

        return (int)$result;
    }

    /**
     * Дочерние разделы.
     *
     * @return array|TreeNodeList
     */
    public function getChilds(int $smapID, bool $returnAsTreeNodeList = false): array|TreeNodeList
    {
        $node = $this->tree->getNodeById($smapID);
        if (!$node) {
            return $returnAsTreeNodeList ? new TreeNodeList() : [];
        }

        if ($returnAsTreeNodeList) {
            return $node->getChildren();
        }

        $ids = array_keys($node->getChildren()->asList(false));
        return $this->buildPagesMap($ids);
    }

    /**
     * Все потомки.
     */
    public function getDescendants(int $smapID): array
    {
        $node = $this->tree->getNodeById($smapID);
        if (!$node) {
            return [];
        }
        $ids = array_keys($node->getChildren()->asList());
        return $this->buildPagesMap($ids);
    }

    /**
     * Родитель.
     *
     * @return int|false
     */
    public function getParent(int $smapID): int|false
    {
        $node = $this->tree->getNodeById($smapID);
        if ($node === null) {
            return false;
        }
        $parents = $node->getParents()->asList(false);
        return $parents ? (int)key($parents) : false;
    }

    /**
     * Все родители (карта страниц снизу вверх).
     */
    public function getParents(int $smapID): array
    {
        $node = $this->tree->getNodeById($smapID);
        if ($node === null) {
            return [];
        }
        $ids = array_reverse(array_keys($node->getParents()->asList(false)));
        return $this->buildPagesMap($ids);
    }

    /**
     * Построить карту страниц по ID.
     *
     * @param int[] $ids
     * @return array<int,array>
     */
    private function buildPagesMap(array $ids): array
    {
        $result = [];
        foreach ($ids as $id) {
            $id = (int)$id;
            $info = $this->getDocumentInfo($id);
            $info['Segment'] = $this->getURLByID($id);
            $result[$id] = $info;
        }
        return $result;
    }

    /**
     * Информация о документе (из кэша; при отсутствии — подгружается).
     */
    public function getDocumentInfo(int|string $id): array
    {
        if (!isset($this->info[$id])) {
            $fetched = $this->getSitemapData($id);
            if (isset($fetched[$id])) {
                return $fetched[$id];
            }
            // На всякий случай — пустышка
            return [
                'Pid'              => null,
                'Segment'          => '',
                'MetaKeywords'     => $this->defaultMetaKeywords,
                'MetaDescription'  => $this->defaultMetaDescription,
                'MetaRobots'       => $this->defaultMetaRobots,
            ];
        }
        return $this->info[$id];
    }

    /**
     * Дерево разделов.
     */
    public function getTree(): TreeNodeList
    {
        return $this->tree;
    }

    /**
     * Плоская информация по разделам (кэш).
     *
     * @return array<int,array>
     */
    public function getInfo(): array
    {
        return $this->info;
    }
}
