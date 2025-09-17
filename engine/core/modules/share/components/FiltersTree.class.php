<?php
declare(strict_types=1);

class FiltersTree extends DataSet
{
    private array $tree = [];
    private array $filters = [];
    private array $targetIds = [];

    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);
    }

    private function resolveBaseTable(): ?string
    {
        $base = (string)$this->getParam('tableName');
        // валидное имя таблицы: буква/подчёркивание, далее буквы/цифры/подчёркивания
        if ($base === '' || !preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $base)) {
            return null;
        }
        return $base;
    }

    protected function loadData(): array
    {
        return $this->getFilters();
    }

    public function getFiltersChilds(int $filterId): array
    {
        $base = $this->resolveBaseTable();
        if ($base === null) return [];

        $tableName      = $base . FilterManager::FILTER_TABLE_SUFFIX;
        $tableNameTrans = $tableName . '_translation';
        $langId         = (int)E()->getLanguage()->getCurrent();

        $rows = $this->dbh->select(
            'SELECT filter_id, filter_pid, filter_name
               FROM ' . $tableName . ' INNER JOIN ' . $tableNameTrans . ' USING(filter_id)
              WHERE lang_id = %s AND filter_pid = %s
           ORDER BY filter_order_num ASC',
            $langId,
            $filterId
        );

        if (!is_array($rows) || !$rows) return [];
        foreach ($rows as $row) {
            $children = $this->getFiltersChilds((int)$row['filter_id']);
            if (!empty($children)) $rows = array_merge($rows, $children);
        }
        return $rows;
    }

    public function getFilters(): array
    {
        $base = $this->resolveBaseTable();
        if ($base === null) return [];

        $tableName      = $base . FilterManager::FILTER_TABLE_SUFFIX;
        $tableNameData  = $tableName . '_data';
        $tableNameTrans = $tableName . '_translation';
        $langId         = (int)E()->getLanguage()->getCurrent();

        $const = $this->getParam('const');
        if (is_string($const) && $const !== '') {
            $rows = $this->dbh->select(
                'SELECT filter_id, filter_pid, filter_name, filter_seo_url
                   FROM ' . $tableName . ' INNER JOIN ' . $tableNameTrans . ' USING(filter_id)
                  WHERE lang_id = %s AND filter_system_name = %s
               ORDER BY filter_order_num ASC',
                $langId,
                $const
            );
            if (!is_array($rows) || !$rows) return [];
            foreach ($rows as $row) {
                $children = $this->getFiltersChilds((int)$row['filter_id']);
                if (!empty($children)) $rows = array_merge($rows, $children);
            }
            return $rows;
        }

        $rows = $this->dbh->select(
            'SELECT filter_id, filter_pid, filter_name
               FROM ' . $tableName . ' INNER JOIN ' . $tableNameTrans . ' USING(filter_id)
               LEFT JOIN ' . $tableNameData . ' td USING(filter_id)
              WHERE lang_id = %s
           ORDER BY filter_order_num ASC',
            $langId
        );

        return is_array($rows) ? $rows : [];
    }

    protected function defineParams(): array
    {
        return array_merge(
            parent::defineParams(),
            [
                'tableName'    => true,
                'linked'       => true,
                'filter_field' => true,
                'const'        => false,
            ]
        );
    }

    protected function createBuilder(): AbstractBuilder
    {
        $builder = new TreeBuilder();
        $tree = TreeConverter::convert($this->getFilters(), 'filter_id', 'filter_pid');
        $builder->setTree($tree);
        return $builder;
    }
}
