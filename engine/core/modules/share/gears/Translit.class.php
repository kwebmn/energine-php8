<?php
declare(strict_types=1);

/**
 * Сервис транслитерации RU/UK → LAT и подготовки slug'ов.
 *
 * Поведение настраивается через опции:
 * - softSignMode: 'y' (как было) | 'drop' (удалять Ь/ь)
 * - khSimplify: true (как было: kh → h в ряде позиций) | false
 * - initialJToY: true (в начале слова j → y) | false
 * - normalize: true (если есть intl, нормализует Unicode NFC) | false
 */
final class Translit
{
    /** Исходные кириллические символы (RU+UK). */
    private const CYR = [
        'Щ','Ш','Ч','Ц','Ю','Я','Ж','А','Б','В','Г','Д','Е','Ё','З','И','Й','К','Л','М','Н','О','П','Р','С','Т','У','Ф','Х','Ь','Ы','Ъ','Э','Є','Ї','І',
        'щ','ш','ч','ц','ю','я','ж','а','б','в','г','д','е','ё','з','и','й','к','л','м','н','о','п','р','с','т','у','ф','х','ь','ы','ъ','э','є','ї','і',
    ];

    /** Базовые соответствия на латиницу (совместимые с прежней логикой). */
    private const LAT = [
        'Shh','Sh','Ch','C','Ju','Ja','Zh','A','B','V','G','D','Je','Jo','Z','I','J','K','L','M','N','O','P','R','S','T','U','F','Kh','Y','Y','','E','Je','Ji','I',
        'shh','sh','ch','c','ju','ja','zh','a','b','v','g','d','je','jo','z','i','j','k','l','m','n','o','p','r','s','t','u','f','kh','y','y','','e','je','ji','i',
    ];

    private function __construct() {}

    /**
     * Транслитерация строки.
     *
     * @param string $string Входная строка (UTF-8).
     * @param string $wordSeparator Разделитель слов (например, "-"). Пусто — не вставлять.
     * @param bool   $clean Ужесточить к URL: tolower + выкинуть всё, кроме [a-z0-9 _ и разделителя].
     * @param array{
     *   softSignMode?: 'y'|'drop',
     *   khSimplify?: bool,
     *   initialJToY?: bool,
     *   normalize?: bool
     * } $options Поведение.
     */
    public static function transliterate(
        string $string,
        string $wordSeparator = '',
        bool $clean = false,
        array $options = []
    ): string {
        $opts = array_merge([
            'softSignMode' => 'y',     // 'y' (как было) | 'drop'
            'khSimplify'   => true,    // true = kh→h в оговорённых позициях
            'initialJToY'  => true,    // true = начальное j → y
            'normalize'    => false,   // true = Unicode NFC при наличии intl
        ], $options);

        // 0) Нормализация (если доступно).
        if ($opts['normalize'] && class_exists('\Normalizer')) {
            /** @noinspection PhpFullyQualifiedNameUsageInspection */
            $string = \Normalizer::normalize($string, \Normalizer::FORM_C) ?? $string;
        }

        // 1) Базовая табличная замена (быстро и предсказуемо).
        $map = self::buildMap($opts['softSignMode']);
        $string = strtr($string, $map);

        // 2) Постобработка: je/j после согласной, kh-смягчение, начальное j → y.
        //   Согласные латиницы (ASCII), как и в твоём исходнике.
        $cons = 'qwrtpsdfghklzxcvbnmQWRTPSDFGHKLZXCVBNM';

        // (...)[jJ]e → ...e
        $string = (string)preg_replace(
            "/([{$cons}]+)[jJ]e/u",
            '$1e',
            $string
        );

        // (...)[jJ] → ...y
        $string = (string)preg_replace(
            "/([{$cons}]+)[jJ]/u",
            '$1y',
            $string
        );

        if (!empty($opts['initialJToY'])) {
            // Начальное j/J в слове → y/Y
            $string = (string)preg_replace('/\bj/u', 'y', $string);
            $string = (string)preg_replace('/\bJ/u', 'Y', $string);
        }

        if (!empty($opts['khSimplify'])) {
            // Гласные (ASCII) + Kh → h; начальное Kh → H/h
            $vowels = 'eyuioaEYUIOA';
            $string = (string)preg_replace("/([{$vowels}]+)[Kk]h/u", '$1h', $string);
            $string = (string)preg_replace('/^kh/u', 'h', $string);
            $string = (string)preg_replace('/^Kh/u', 'H', $string);
        }

        $string = trim($string);

        // 3) Работа с разделителем слов.
        if ($wordSeparator !== '') {
            $sepQuoted = preg_quote($wordSeparator, '/');

            // Заменяем любые пробельные последовательности на разделитель.
            $string = (string)preg_replace('/\s+/u', $wordSeparator, $string);

            // Схлопываем подряд идущие разделители в один.
            $string = (string)preg_replace('/(?:' . $sepQuoted . ')+/u', $wordSeparator, $string);

            // Убираем разделители по краям.
            $string = (string)preg_replace('/^' . $sepQuoted . '+|' . $sepQuoted . '+$/u', '', $string);
        }

        // 4) Жёсткая очистка для URL.
        if ($clean) {
            $string = mb_strtolower($string, 'UTF-8');

            // Разрешаем: латиницу/цифры/подчёркивание + текущий разделитель.
            $allowed = '_';
            if ($wordSeparator !== '' && !ctype_alnum($wordSeparator)) {
                // Добавляем разделитель в класс разрешённых символов.
                $allowed .= preg_quote($wordSeparator, '/');
            }

            $string = (string)preg_replace('/[^a-z0-9' . $allowed . ']+/u', '', $string);

            // Схлопываем повтор разделителя (на случай, если осталось что-то лишнее).
            if ($wordSeparator !== '') {
                $sepQuoted = preg_quote($wordSeparator, '/');
                $string = (string)preg_replace('/(?:' . $sepQuoted . ')+/u', $wordSeparator, $string);
                $string = trim($string, $wordSeparator);
            }

            // Для дефиса дополнительно схлопнем цепочки.
            if ($wordSeparator === '-') {
                $string = (string)preg_replace('/-+/u', '-', $string);
            }
        }

        return $string;
    }

    /**
     * Готовый помощник для slug/URL-сегмента.
     * (Оптимальные значения по умолчанию для SEO.)
     */
    public static function asURLSegment(string $string, string $wordSeparator = '-'): string
    {
        return self::transliterate(
            $string,
            $wordSeparator,
            true,
            [
                'softSignMode' => 'drop', // чаще ожидаемое поведение для слага
                'khSimplify'   => true,
                'initialJToY'  => true,
                'normalize'    => true,
            ]
        );
    }

    /**
     * Собирает карту замен с учётом режима ь/Ь.
     *
     * @param 'y'|'drop' $softSignMode
     * @return array<string,string>
     */
    private static function buildMap(string $softSignMode): array
    {
        $map = array_combine(self::CYR, self::LAT);
        if ($map === false) {
            // На всякий — не должен сработать, длины массивов равны.
            return [];
        }

        if ($softSignMode === 'drop') {
            $map['Ь'] = '';
            $map['ь'] = '';
        }
        // 'Ъ/ъ' уже пустые в базовой карте.

        return $map;
    }
}
