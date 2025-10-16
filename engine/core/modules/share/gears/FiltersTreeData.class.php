<?php

declare(strict_types=1);

class FiltersTreeData extends DBWorker
{
    private string $filterDataTableName;
    private string $tableName;

    /** @var array<int|string, array<int>>  filter_id => [target_id, ...] */
    private static array $filterData = [];

    /** @var array<int|string, array<int>> текущее состояние после setFilters()/setMerge() */
    private array $filterCurrent = [];

    /** @var array<int|string, bool> список игнорируемых (кастомных) фильтров */
    private array $ignoreFilters = [];

    /** @var array<int, mixed> накопленные произвольные фильтры (если используются) */
    private array $customFilters = [];

    /** @var array<int|string> фильтры для пересечения */
    private array $setFilters = [];

    /** @var array<int|string> фильтры для объединения */
    private array $setMerge = [];

    public function __construct(string $tableName)
    {
        parent::__construct();
        $this->tableName = $tableName;
        $this->filterDataTableName = $tableName . '_filter_data';
        $this->buildFilterData();
    }

    /**
     * Строит (или берёт из кэша) полное дерево фильтров.
     */
    public function buildFilterData(): bool
    {
        if (!empty(self::$filterData))
        {
            return true;
        }

        $cacheKey = 'filters.tree.' . $this->tableName;
        $ttl      = $this->resolveTtl();
        $psrCache = (function_exists('E') && E()->__isset('psrCache')) ? E()->psrCache : null;

        if ($psrCache && method_exists($psrCache, 'get'))
        {
            try
            {
                $cachedTree = $psrCache->get($cacheKey, function ($item) use ($ttl)
                {
                    if (method_exists($item, 'expiresAfter'))
                    {
                        $item->expiresAfter($ttl);
                    }
                    if (method_exists($item, 'tag'))
                    {
                        $item->tag(['filters', 'filters.' . $this->tableName]);
                    }

                    return $this->loadFilterDataFromDB();
                });

                if (is_array($cachedTree))
                {
                    self::$filterData = $cachedTree;
                    return true;
                }
            }
            catch (\Throwable)
            {
                // В случае проблем с PSR-кешем продолжим с fallback-ами ниже
            }
        }

        if ($psrCache && method_exists($psrCache, 'getItem'))
        {
            try
            {
                $item = $psrCache->getItem($cacheKey);
                if ($item->isHit())
                {
                    $cachedTree = $item->get();
                    if (is_array($cachedTree))
                    {
                        self::$filterData = $cachedTree;
                        return true;
                    }
                }
            }
            catch (\Throwable)
            {
                // Переходим к пересборке данных ниже
            }
        }

        self::$filterData = $this->loadFilterDataFromDB();

        if (!empty(self::$filterData) && $psrCache && method_exists($psrCache, 'getItem'))
        {
            try
            {
                $item = $psrCache->getItem($cacheKey);
                $item->set(self::$filterData);
                if ($ttl > 0)
                {
                    $item->expiresAfter($ttl);
                }
                if (method_exists($item, 'tag'))
                {
                    $item->tag(['filters', 'filters.' . $this->tableName]);
                }
                $psrCache->save($item);
            }
            catch (\Throwable)
            {
                // Тихо игнорируем проблемы сохранения
            }
        }

        return true;
    }

    private function resolveTtl(): int
    {
        $ttl = BaseObject::_getConfigValue('site.cache_default_ttl');
        if (!is_numeric($ttl) || (int)$ttl <= 0)
        {
            $ttl = BaseObject::_getConfigValue('site.apcu_ttl', 3600);
        }

        $ttl = (int)$ttl;
        return $ttl > 0 ? $ttl : 3600;
    }

    /**
     * Загружает дерево фильтров напрямую из БД.
     *
     * @return array<int|string, array<int>>
     */
    private function loadFilterDataFromDB(): array
    {
        $data = [];

        $res = $this->dbh->select(
            $this->filterDataTableName,
            ['filter_id', 'target_id']
        );

        if (is_array($res) && !empty($res))
        {
            foreach ($res as $row)
            {
                $filterId = (int)$row['filter_id'];
                $targetId = (int)$row['target_id'];
                if (!isset($data[$filterId]))
                {
                    $data[$filterId] = [];
                }
                if (!in_array($targetId, $data[$filterId], true))
                {
                    $data[$filterId][] = $targetId;
                }
            }
        }

        return $data;
    }

    /**
     * Сбрасывает текущее состояние на полное дерево.
     */
    public function prepare(): void
    {
        $this->filterCurrent = self::$filterData;
    }

    /**
     * Пересечение двух наборов ID.
     *
     * @param array<int> $filter1
     * @param array<int> $filter2
     * @return array<int>
     */
    public function intersect(array $filter1, array $filter2): array
    {
        if (empty($filter1) || empty($filter2))
        {
            return [];
        }
        return $this->nuno_array_intersect($filter1, $filter2);
    }

    /**
     * Является ли фильтр «кастомным».
     * Логика совместима с оригиналом.
     */
    public function isCustomFilter(int|string $filter): bool
    {
        if (isset($this->ignoreFilters[$filter]))
        {
            return true;
        }
        $c = substr((string) $filter, 0, 1);
        // Если первый символ нечисловой или это '0' — считаем кастомным
        return !(intval($c) > 0);
    }

    /**
     * Установка фильтров для последовательного пересечения.
     *
     * @param array<int|string> $filters
     */
    public function setFilters(array $filters): self
    {
        $this->setFilters = $filters;

        if (!empty($filters))
        {
            // Базовый набор — значения первого фильтра (если он существует)
            $first = reset($filters);
            $currentFilter = isset($this->filterCurrent[$first]) ? $this->filterCurrent[$first] : [];

            // Пересечение с остальными фильтрами
            foreach (array_slice($filters, 1) as $f)
            {
                if (isset($this->filterCurrent[$f]))
                {
                    $currentFilter = $this->nuno_array_intersect($currentFilter, $this->filterCurrent[$f]);
                }
            }

            // Ограничиваем каждый фильтр текущей маской пересечения
            foreach ($this->filterCurrent as $filterId => $filterData)
            {
                $this->filterCurrent[$filterId] = $this->nuno_array_intersect($filterData, $currentFilter);
            }
        }

        return $this;
    }

    /**
     * Установка фильтров для объединения (merge), затем применяем как маску для каждого фильтра.
     *
     * @param array<int|string> $filters
     */
    public function setMerge(array $filters): self
    {
        $this->setMerge = $filters;

        if (empty($filters))
        {
            return $this;
        }

        $currentFilter = [];
        foreach ($filters as $f)
        {
            if (isset($this->filterCurrent[$f]))
            {
                $currentFilter = $this->speed_array_merge($this->filterCurrent[$f], $currentFilter);
            }
            else
            {
                // Если хотя бы один из указанных фильтров отсутствует — сливаемся с пустотой
                $currentFilter = $currentFilter; // no-op; поведение как в оригинале
            }
        }

        foreach ($this->filterCurrent as $filterId => $filterData)
        {
            $this->filterCurrent[$filterId] = $this->nuno_array_intersect($filterData, $currentFilter);
        }

        return $this;
    }

    public function getCount(int|string $filterId): int
    {
        return isset($this->filterCurrent[$filterId]) ? count($this->filterCurrent[$filterId]) : 0;
    }

    public function getCountAll(int|string $filterId): int
    {
        return isset(self::$filterData[$filterId]) ? count(self::$filterData[$filterId]) : 0;
    }

    /**
     * Вернёт ID для конкретного фильтра или суммарный список для setMerge/setFilters (без unique — как в оригинале).
     *
     * @return array<int>
     */
    public function getIds(int|string|null $filterId = null): array
    {
        if ($filterId !== null)
        {
            return $this->filterCurrent[$filterId] ?? [];
        }

        $arr = [];

        if (!empty($this->setMerge))
        {
            foreach ($this->setMerge as $row)
            {
                if (isset($this->filterCurrent[$row]))
                {
                    $arr = array_merge($arr, $this->filterCurrent[$row]);
                }
            }
        }

        if (!empty($this->setFilters))
        {
            foreach ($this->setFilters as $row)
            {
                if (isset($this->filterCurrent[$row]))
                {
                    $arr = array_merge($arr, $this->filterCurrent[$row]);
                }
            }
        }

        return $arr;
    }

    /**
     * Быстрый merge $array1 + элементы $array2 в конец.
     *
     * @param array<int> $array1
     * @param array<int> $array2
     * @return array<int>
     */
    private function speed_array_merge(array $array1, array $array2): array
    {
        foreach ($array2 as $i)
        {
            $array1[] = $i;
        }
        return $array1;
    }

    /**
     * Пересечение массивов по значениям (без учёта ключей).
     *
     * @param array<int> $array1
     * @param array<int> $array2
     * @return array<int>
     */
    private function nuno_array_intersect(array $array1, array $array2): array
    {
        if (empty($array1) || empty($array2))
        {
            return [];
        }

        $a1 = [];
        foreach ($array1 as $value)
        {
            $a1[$value] = true; // храним как set
        }

        $a2 = [];
        foreach ($array2 as $value)
        {
            $a2[$value] = true;
        }

        foreach ($a1 as $value => $_)
        {
            if (!isset($a2[$value]))
            {
                unset($a1[$value]);
            }
        }

        return array_keys($a1);
    }

    /**
     * Зарегистрировать фильтр как «кастомный/игнорируемый».
     */
    public function registerCustomFilter(int|string $filterId): void
    {
        $this->ignoreFilters[$filterId] = true;
    }

    /**
     * Добавить произвольный фильтр (если используется на проекте).
     */
    public function addCustomFilter(mixed $filter): void
    {
        $this->customFilters[] = $filter;
    }
}
