<?php
declare(strict_types=1);

/**
 * Tag editor (PHP 8.3, strict types, BC-preserved).
 *
 * Поведение сохранено: фильтрация по tag_id из state, методы getTagIds/getTags
 * отвечают JSON через JSONCustomBuilder. Разобрана и нормализована обработка
 * списков значений через TagManager::TAG_SEPARATOR.
 */
final class TagEditor extends Grid
{
    /**
     * @inheritDoc
     */
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);
        $this->setTableName(TagManager::TAG_TABLENAME);
    }

    /**
     * Главный список: применяет фильтр по tag_id (если он задан в state).
     */
    protected function main(): void
    {
        parent::main();
        $params = (array) $this->getStateParams(true);

        if (!empty($params['tag_id']) && is_string($params['tag_id'])) {
            $decoded = urldecode($params['tag_id']);
            $this->setProperty('tag_id', $decoded);
            $ids = $this->parseIdsFromSeparatedList($decoded);
            if ($ids !== []) {
                $this->addFilterCondition([TagManager::TAG_TABLENAME . '.tag_id' => $ids]);
            }
        }
    }

    /**
     * RAW-данные: также поддерживает фильтр по tag_id из state.
     */
    protected function getRawData()
    {
        $params = (array) $this->getStateParams(true);
        if (!empty($params['tag_id']) && is_string($params['tag_id'])) {
            $ids = $this->parseIdsFromSeparatedList(urldecode($params['tag_id']));
            if ($ids !== []) {
                $this->addFilterCondition([TagManager::TAG_TABLENAME . '.tag_id' => $ids]);
            }
        }
        parent::getRawData();
    }

    /**
     * Вернуть ID тегов по строке тегов (через TAG_SEPARATOR). Ответ — JSON {data:[...]}.
     * Нормализует теги: trim + tolower (UTF-8).
     */
    protected function getTagIds(): void
    {
        $builder = new JSONCustomBuilder();
        $this->setBuilder($builder);

        $tags = $this->parseTagsFromSeparatedList($_REQUEST['tags'] ?? '');

        $response = [];
        foreach ($tags as $tag) {
            $tagItem = TagManager::getID($tag);
            if (!$tagItem) {
                $tagId = TagManager::insert($tag);
            } else {
                // ожидается массив вида [id => name]; берём первый ключ
                $keys = array_keys((array) $tagItem);
                $tagId = isset($keys[0]) ? (int) $keys[0] : 0;
            }
            if ($tagId) {
                $response[] = (int) $tagId;
            }
        }

        $builder->setProperties(['data' => $response]);
    }

    /**
     * Вернуть список тегов по списку их ID (через TAG_SEPARATOR). Ответ — JSON {data:[...]}.
     */
    protected function getTags(): void
    {
        $builder = new JSONCustomBuilder();
        $this->setBuilder($builder);

        $ids = $this->parseIdsFromSeparatedList($_REQUEST['tag_id'] ?? '');

        $tags = [];
        if ($ids !== []) {
            $found = TagManager::getTags($ids);
            if ($found) {
                // TagManager::getTags может вернуть map id=>name; превратим в list значений
                $tags = array_values((array) $found);
            }
        }

        $builder->setProperties(['data' => $tags]);
    }

    /* ========================= Helpers ========================= */

    /**
     * Разобрать строку идентификаторов, разделённых TAG_SEPARATOR, в массив уникальных >0 int.
     *
     * @param string|null $raw
     * @return int[]
     */
    private function parseIdsFromSeparatedList(?string $raw): array
    {
        if (!is_string($raw) || $raw === '') {
            return [];
        }
        $parts = explode(TagManager::TAG_SEPARATOR, $raw);
        $out = [];
        foreach ($parts as $p) {
            $p = trim($p);
            if ($p === '') {
                continue;
            }
            $v = (int) $p;
            if ($v > 0) {
                $out[$v] = $v; // через ключ исключаем дубликаты
            }
        }
        return array_values($out);
    }

    /**
     * Разобрать строку тегов, разделённых TAG_SEPARATOR, в массив уникальных нормализованных строк.
     * Нормализация: trim + нижний регистр (UTF-8).
     *
     * @param string|null $raw
     * @return string[]
     */
    private function parseTagsFromSeparatedList(?string $raw): array
    {
        if (!is_string($raw) || $raw === '') {
            return [];
        }
        $parts = explode(TagManager::TAG_SEPARATOR, $raw);
        $out = [];
        foreach ($parts as $p) {
            $t = trim($p);
            if ($t === '') {
                continue;
            }
            $t = mb_strtolower($t, 'UTF-8');
            $out[$t] = $t; // исключаем дубликаты
        }
        return array_values($out);
    }
}
