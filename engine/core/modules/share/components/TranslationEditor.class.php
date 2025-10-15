<?php

declare(strict_types=1);

/**
 * Translation editor.
 */
class TranslationEditor extends Grid
{
    /**
     * @copydoc Grid::__construct
     */
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);
        $this->setTableName('share_lang_tags');
        $this->setOrder(['ltag_name' => QAL::ASC]);
    }

    /**
     * При добавлении/редактировании поле со значением тега делаем обычным текстом.
     */
    protected function prepare(): void
    {
        parent::prepare();

        if (in_array($this->getState(), ['add', 'edit'], true))
        {
            $dd = $this->getDataDescription();
            if ($dd)
            {
                $fd = $dd->getFieldDescriptionByName('ltag_value_rtf');
                if ($fd instanceof FieldDescription)
                {
                    $fd->setType(FieldDescription::FIELD_TYPE_TEXT);
                }
            }
        }
    }

    /**
     * Перед сохранением нормализуем имя тега и значения переводов.
     *
     * @return mixed
     */
    protected function saveData(): mixed
    {
        // Нормализация имени тега: trim + upper
        $mainTable = $this->getTableName();
        if (
            isset($_POST[$mainTable], $_POST[$mainTable]['ltag_name'])
        ) {
            $name = $_POST[$mainTable]['ltag_name'];
            if (!is_string($name))
            {
                $name = (string)$name;
            }
            $_POST[$mainTable]['ltag_name'] = strtoupper(trim($name));
        }

        // Нормализация переводов: trim (полезно при выводе в JS)
        $trTable = $this->getTranslationTableName();
        $languages = array_keys(E()->getLanguage()->getLanguages());
        foreach ($languages as $langID)
        {
            if (isset($_POST[$trTable][$langID]['ltag_value_rtf']))
            {
                $val = $_POST[$trTable][$langID]['ltag_value_rtf'];
                if (!is_string($val))
                {
                    $val = (string)$val;
                }
                $_POST[$trTable][$langID]['ltag_value_rtf'] = trim($val);
            }
        }

        $result = parent::saveData();

        // Инвалидируем кеш переводов (если включён)
        $cache = E()->getCache();
        if ($cache && method_exists($cache, 'isEnabled') ? $cache->isEnabled() : true)
        {
            if (method_exists($cache, 'dispose'))
            {
                $cache->dispose(Cache::TRANSLATIONS_KEY);
            }
            elseif (method_exists($cache, 'delete'))
            {
                // на случай другой реализации кеша
                $cache->delete(Cache::TRANSLATIONS_KEY);
            }
        }

        return $result;
    }
}
