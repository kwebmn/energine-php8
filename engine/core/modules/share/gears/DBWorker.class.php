<?php
declare(strict_types=1);

/**
 * Предок для классов, работающих с БД.
 * Дает $this->dbh (QAL) и утилиты перевода/дат.
 */
abstract class DBWorker extends BaseObject
{
    /**
     * Ссылка на QAL из реестра.
     * @var QAL
     */
    protected $dbh;

    /**
     * Подготовленный запрос на получение перевода (лениво инициализируется).
     * @var PDOStatement|null
     */
    private static ?PDOStatement $findTranslationSQL = null;

    /**
     * Кеш переводов в памяти: ["{$langId}:{$CONST}" => "Перевод"].
     * @var array<string,string>
     */
    private static array $translationsCache = [];

    public function __construct()
    {
        $this->dbh = E()->getDB();
        // Ленивая инициализация prepared statement (на всякий случай оставим и здесь)
        if (self::$findTranslationSQL === null) {
            self::prepareTranslationStatement();
        }
    }

    /**
     * Ленивая подготовка PDOStatement для переводов.
     */
    private static function prepareTranslationStatement(): void
    {
        try {
            $pdo = E()->getDB()->getPDO();
            self::$findTranslationSQL = $pdo->prepare(
                'SELECT trans.ltag_value_rtf AS translation
                   FROM share_lang_tags ltag
                   LEFT JOIN share_lang_tags_translation trans ON trans.ltag_id = ltag.ltag_id
                  WHERE ltag.ltag_name = ? AND trans.lang_id = ?
                  LIMIT 1'
            );
        } catch (Throwable $e) {
            // Если PDO недоступен, оставим null: _translate вернет исходную константу
            self::$findTranslationSQL = null;
        }
    }

    /**
     * Получить перевод текстовой константы.
     * Возвращает исходную константу (UPPERCASE), если перевода нет/ошибка.
     */
    public static function _translate(string $const, ?int $langId = null): string
    {
        if ($const === '') {
            return '';
        }

        $key = strtoupper($const);
        $langId = $langId ?? (int) E()->getLanguage()->getCurrent();
        $cacheKey = $langId . ':' . $key;

        // 1) Памятный кеш
        if (isset(self::$translationsCache[$cacheKey])) {
            return self::$translationsCache[$cacheKey];
        }

        // 2) PSR-кеш (если есть)
        $psrCache = E()->__isset('psrCache') ? E()->psrCache : null;
        $ttl = (int) (BaseObject::_getConfigValue('i18n.cache_ttl', 3600));

        if ($psrCache && method_exists($psrCache, 'get')) {
            try {
                /** @var string $value */
                $value = $psrCache->get('i18n.' . md5($cacheKey), function ($item) use ($key, $langId, $ttl) {
                    if (method_exists($item, 'expiresAfter')) {
                        $item->expiresAfter($ttl);
                    }
                    if (method_exists($item, 'tag')) {
                        // если это TagAware — пометим
                        $item->tag(['i18n', 'i18n_' . $langId]);
                    }
                    return DBWorker::fetchTranslation($key, $langId);
                });
                self::$translationsCache[$cacheKey] = $value;
                return $value;
            } catch (Throwable $e) {
                // Падаем обратно на БД/память
            }
        }

        // 3) Без внешнего кеша — запрос в БД
        $value = self::fetchTranslation($key, $langId);
        self::$translationsCache[$cacheKey] = $value;

        return $value;
    }

    /**
     * Непосредственно достаёт перевод из БД (или возвращает исходную константу).
     */
    private static function fetchTranslation(string $key, int $langId): string
    {
        if (self::$findTranslationSQL === null) {
            self::prepareTranslationStatement();
        }
        $stmt = self::$findTranslationSQL;
        if (!$stmt) {
            return $key;
        }

        try {
            $ok = $stmt->execute([$key, $langId]);
            if ($ok) {
                $val = $stmt->fetchColumn();
                $stmt->closeCursor();
                return ($val !== false && $val !== null && $val !== '') ? (string)$val : $key;
            }
        } catch (Throwable $e) {
            // тихо возвращаем исходную константу — пусть UI живёт
        }
        return $key;
    }

    /**
     * "1 января 2024" в текущей локали (через таблицу переводов месяцев, как было).
     */
    public static function _dateToString(int $year, int $month, int $day): string
    {
        // Константы ожидаются вида TXT_MONTH_1..12
        return $day . ' ' . self::_translate('TXT_MONTH_' . $month) . ' ' . $year;
    }

    /**
     * Обёртка для вызова перевода из наследников.
     */
    public function translate(string $const, ?int $langID = null): string
    {
        return self::_translate($const, $langID);
    }

    /**
     * Обёртка "дата в строку" из наследников.
     *
     * @param string $date   строка даты; по умолчанию — формат "%d-%d-%d" (Y-m-d)
     * @param string $format sscanf-формат (например "%d-%d-%d")
     */
    public function dateToString(string $date, string $format = '%d-%d-%d'): string
    {
        // В исходном коде здесь было "list($year, $month, $day) = sscanf(...)"
        // Защитимся от невалидного ввода:
        $year = $month = $day = 0;
        sscanf($date, $format, $year, $month, $day);
        return self::_dateToString((int)$year, (int)$month, (int)$day);
    }
}
