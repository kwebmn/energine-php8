<?php

declare(strict_types=1);

/**
 * Управление языками.
 * Совместимо с прежним API (getCurrent, setCurrent, getDefault, getIDByAbbr и т.д.).
 */
final class Language extends DBWorker
{
    /**
     * Текущий язык (ID) или null, если ещё не задан.
     */
    private ?int $current = null;

    /**
     * Набор языков вида: [lang_id => ['lang_abbr'=>..., 'lang_locale'=>..., 'lang_name'=>..., 'lang_default'=>...]]
     * Без ключа lang_id внутри вложенного массива (как и раньше).
     *
     * @var array<int,array<string,mixed>>
     */
    private array $languages = [];

    /**
     * Ключи кеша.
     */
    private const CACHE_KEY = 'langs.all';
    private const CACHE_TAG = 'langs';

    /**
     * @throws SystemException 'ERR_NO_LANG_INFO'
     */
    public function __construct()
    {
        parent::__construct();

        // 1) Попробуем взять из PSR-кеша, если он настроен в bootstrap’е
        $ttl = (int) BaseObject::_getConfigValue('language.cache_ttl', 3600);
        $psr = E()->__isset('psrCache') ? E()->psrCache : null;

        if ($psr && method_exists($psr, 'get'))
        {
            try
            {
                /** @var array<int,array<string,mixed>> $langs */
                $langs = $psr->get(self::CACHE_KEY, function ($item) use ($ttl)
                {
                    if (method_exists($item, 'expiresAfter'))
                    {
                        $item->expiresAfter($ttl);
                    }
                    if (method_exists($item, 'tag'))
                    {
                        $item->tag([self::CACHE_TAG]);
                    }
                    return $this->loadLanguagesFromDB();
                });
                $this->languages = $langs;
            }
            catch (\Throwable)
            {
                // в случае проблем с кешом — просто идём в БД
                $this->languages = $this->loadLanguagesFromDB();
            }
        }
        else
        {
            // 2) Без внешнего кеша — просто загрузим из БД
            $this->languages = $this->loadLanguagesFromDB();
        }

        if (!$this->languages)
        {
            throw new SystemException('ERR_NO_LANG_INFO', SystemException::ERR_CRITICAL, $this->dbh->getLastRequest());
        }
    }

    /**
     * Загрузка языков из БД (как раньше, но с явной типобезопасностью).
     *
     * @return array<int,array<string,mixed>>
     * @throws SystemException
     */
    private function loadLanguagesFromDB(): array
    {
        $out = [];

        // Раньше: select('share_languages', true, null, ['lang_order_num'=>QAL::ASC])
        $rows = $this->dbh->select('share_languages', true, null, ['lang_order_num' => QAL::ASC]);
        if (!is_array($rows))
        {
            throw new SystemException('ERR_NO_LANG_INFO', SystemException::ERR_CRITICAL, $this->dbh->getLastRequest());
        }

        foreach ($rows as $row)
        {
            if (!isset($row['lang_id']))
            {
                // пропустим бракованные строки
                continue;
            }
            $id = (int)$row['lang_id'];
            unset($row['lang_id']);
            $out[$id] = $row; // как и раньше: без ключа lang_id внутри
        }

        return $out;
    }

    /**
     * Текущий язык (ID) — может быть null, пока не установлен.
     */
    public function getCurrent(): ?int
    {
        return $this->current;
    }

    /**
     * Установить текущий язык.
     *
     * @throws SystemException 'ERR_404' если такого языка нет.
     */
    public function setCurrent(int $currentLangID): bool
    {
        $ok = false;
        foreach ($this->languages as $langID => $langInfo)
        {
            if ($langID === $currentLangID)
            {
                // setlocale может вернуть false — игнорируем молча, чтобы не рушить логику
                if (!empty($langInfo['lang_locale']))
                {
                    @setlocale(LC_ALL, (string)$langInfo['lang_locale']);
                }
                $ok = true;
                break;
            }
        }

        if (!$ok)
        {
            throw new SystemException('ERR_404', SystemException::ERR_LANG, $currentLangID);
        }

        $this->current = $currentLangID;
        return true;
    }

    /**
     * ID языка по умолчанию.
     *
     * @throws SystemException 'ERR_NO_DEFAULT_LANG'
     */
    public function getDefault(): int
    {
        foreach ($this->languages as $langID => $langInfo)
        {
            if ((int)($langInfo['lang_default'] ?? 0) === 1)
            {
                return (int)$langID;
            }
        }
        throw new SystemException('ERR_NO_DEFAULT_LANG', SystemException::ERR_CRITICAL);
    }

    /**
     * Получить ID по аббревиатуре (uk, ru, en и т.п.).
     * Если $useDefaultIfEmpty=true и $abbr пуст — вернёт ID языка по умолчанию.
     */
    public function getIDByAbbr(string $abbr, bool $useDefaultIfEmpty = false)
    {
        if ($abbr === '' && $useDefaultIfEmpty)
        {
            return $this->getDefault();
        }
        foreach ($this->languages as $langID => $langInfo)
        {
            if (isset($langInfo['lang_abbr']) && $langInfo['lang_abbr'] === $abbr)
            {
                return (int)$langID;
            }
        }
        return false;
    }

    /**
     * Аббревиатура языка по его ID.
     *
     * @throws SystemException 'ERR_BAD_LANG_ID'
     */
    public function getAbbrByID(int $id): string
    {
        if (isset($this->languages[$id]) && isset($this->languages[$id]['lang_abbr']))
        {
            return (string)$this->languages[$id]['lang_abbr'];
        }
        throw new SystemException('ERR_BAD_LANG_ID', SystemException::ERR_LANG, $id);
    }

    /**
     * Название языка по ID.
     *
     * @throws SystemException 'ERR_BAD_LANG_ID'
     */
    public function getNameByID(int $id): string
    {
        if (isset($this->languages[$id]) && isset($this->languages[$id]['lang_name']))
        {
            return (string)$this->languages[$id]['lang_name'];
        }
        throw new SystemException('ERR_BAD_LANG_ID', SystemException::ERR_LANG, $id);
    }

    /**
     * Все языки системы (как раньше).
     *
     * @return array<int,array<string,mixed>>
     */
    public function getLanguages(): array
    {
        return $this->languages;
    }

    /**
     * Есть ли язык с данным ID?
     */
    public function isValidLangID(int|string|null $id): bool
    {
        return array_key_exists($id, $this->languages);
    }

    /**
     * Есть ли язык с данной аббревиатурой?
     */
    public function isValidLangAbbr(string $abbr): bool
    {
        foreach ($this->languages as $langInfo)
        {
            if (isset($langInfo['lang_abbr']) && $langInfo['lang_abbr'] === $abbr)
            {
                return true;
            }
        }
        return false;
    }

    /**
     * Хелпер: получить всю запись языка по ID (необязательная, может быть полезна).
     * Вернёт null, если не найден.
     */
    public function getInfoByID(int $id): ?array
    {
        return $this->languages[$id] ?? null;
    }
}
