<?php
declare(strict_types=1);

/**
 * Navigation manager.
 * It shows the list of child pages and pages in the same level.
 */
final class NavigationMenu extends DataSet
{
    /**
     * Массив ID для фильтрации или true (без фильтра).
     */
    private array|bool $filteredIDs = true;

    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);
    }

    /**
     * Добавлен параметр 'tags' для ограничения выборки по тегам.
     */
    protected function defineParams(): array
    {
        return array_merge(
            parent::defineParams(),
            [
                'tags' => '',
            ]
        );
    }

    protected function createDataDescription(): DataDescription
    {
        $result = new DataDescription();

        foreach (['Id', 'Pid', 'Name', 'Segment', 'Redirect'] as $fieldName) {
            $fd = new FieldDescription($fieldName);
            if (in_array($fieldName, ['Id', 'Pid'], true)) {
                $fd->setType(FieldDescription::FIELD_TYPE_INT);
            } else {
                $fd->setType(FieldDescription::FIELD_TYPE_STRING);
            }
            if ($fieldName === 'Id') {
                $fd->setProperty('key', 1);
            }
            $result->addFieldDescription($fd);
        }

        return $result;
    }

    /**
     * Накладываем ограничения по тегам (если заданы).
     */
    protected function loadData(): array
    {
        $sitemap = E()->getMap();
        $data = $sitemap->getInfo();

        $this->filteredIDs = true;
        $tags = (string)$this->getParam('tags');

        if ($tags !== '') {
            $this->filteredIDs = TagManager::getFilter($tags, 'share_sitemap_tags');
        }

        if (!is_array($data) || empty($data)) {
            return [];
        }

        if (empty($this->filteredIDs)) {
            return [];
        }

        foreach ($data as $key => $value) {
            // Пропускаем, если фильтр задан и текущий ключ не входит в него
            if ($this->filteredIDs !== true && !in_array($key, $this->filteredIDs, true)) {
                unset($data[$key]);
                continue;
            }

            // Не показываем раздел по умолчанию
            if ($key == $sitemap->getDefault()) {
                unset($data[$key]);
                continue;
            }

            $data[$key]['Id']       = $key;
            $data[$key]['Segment']  = $sitemap->getURLByID($key);
            $data[$key]['Name']     = $value['Name'];
            $data[$key]['Redirect'] = Response::prepareRedirectURL($value['RedirectUrl']);
        }

        return $data;
    }

    protected function createBuilder(): AbstractBuilder
    {
        // Полное дерево может пригодиться (как и в исходнике), но фактически строим по выборке ниже
        $treeData = [];

        $map = E()->getMap();
        $currentId = $this->document->getID();
        $parents = $map->getParents($currentId);

        // Если текущий узел не первого уровня — соберём детей всех его прямых предков
        if (!empty($parents) && is_array($parents)) {
            $ancestorID = (int)array_key_first($parents);

            foreach ($parents as $nodeID => $node) {
                $nodeID = (int)$nodeID;

                $nodeChilds = $this->dbh->select(
                    'SELECT s.smap_id, s.smap_pid
                       FROM share_sitemap s
                       LEFT JOIN share_sitemap_translation st ON s.smap_id = st.smap_id
                      WHERE s.smap_pid = %s
                        AND st.smap_is_disabled = 0
                        AND st.lang_id = %s
                   ORDER BY s.smap_order_num ASC',
                    $nodeID,
                    (int)E()->getLanguage()->getCurrent()
                );

                if (is_array($nodeChilds)) {
                    // как в оригинале: для прямых потомков "предка" делаем корневой уровень (pid=false)
                    $nodeChilds = array_map(
                        function (array $n) use ($ancestorID): array {
                            if ((int)$n['smap_pid'] === $ancestorID) {
                                $n['smap_pid'] = false; // сохраняем оригинальную семантику
                            }
                            return $n;
                        },
                        $nodeChilds
                    );

                    $treeData = array_merge($treeData, $nodeChilds);
                }
            }
        }

        // Если у текущего есть предки — берём его прямых детей
        if (!empty($parents)) {
            $childs = $this->dbh->select(
                'share_sitemap',
                ['smap_id', 'smap_pid'],
                ['smap_pid' => $currentId],
                ['smap_order_num' => QAL::ASC]
            );
        } else {
            // Если текущий — первый уровень, берём дочерние разделы и делаем их корневыми (pid=NULL)
            $childs = $this->dbh->select(
                'SELECT smap_id, NULL AS smap_pid
                   FROM share_sitemap
                  WHERE smap_pid = %s
               ORDER BY smap_order_num',
                $currentId
            );
        }

        if (is_array($childs)) {
            $treeData = array_merge($treeData, $childs);
        }

        $tree = TreeConverter::convert($treeData, 'smap_id', 'smap_pid');

        $builder = new TreeBuilder();
        $builder->setTree($tree);

        return $builder;
    }
}
