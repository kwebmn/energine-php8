<?php
declare(strict_types=1);

/**
 * Utilities (PHP 8.3):
 * inspect(), splitDate(), stop(), simple_log(), dump_log(), ddump_log(),
 * simplifyDBResult(), inverseDBResult(), convertDBResult(), convertFieldNames(),
 * arrayPush(), array_push_before(), array_push_after(),
 * file_get_contents_stripped(), str_replace_opt(),
 * withLibxml(), file_snippet().
 */

/* --------------------------------------------------------------------------
 * ВСПОМОГАТЕЛЬНОЕ: определение каталога логов и запись
 * -------------------------------------------------------------------------- */
if (!function_exists('_utils_fs_call')) {
    /**
     * Выполнить файловую операцию, превратив предупреждения в ErrorException.
     *
     * @return array{0:mixed,1:?string} [результат, сообщение об ошибке]
     */
    function _utils_fs_call(callable $operation): array {
        $result = null;
        $error  = null;

        set_error_handler(static function (int $severity, string $message, string $file = '', int $line = 0): bool {
            throw new \ErrorException($message, 0, $severity, $file, $line);
        });

        try {
            $result = $operation();
        } catch (\ErrorException $e) {
            $result = false;
            $error  = $e->getMessage();
        } finally {
            restore_error_handler();
        }

        return [$result, $error];
    }
}

/* --------------------------------------------------------------------------
 * ВСПОМОГАТЕЛЬНОЕ: определение каталога логов и запись
 * -------------------------------------------------------------------------- */
if (!function_exists('_utils_log_dir')) {
    function _utils_log_dir(): string {
        // 1) Конфиг, если доступен

        $cfgDir = null;
        if (class_exists('BaseObject') && method_exists('BaseObject', '_getConfigValue')) {
            $cfgDir = BaseObject::_getConfigValue('paths.log_dir');
        }
        $dir = is_string($cfgDir) && $cfgDir !== '' ? $cfgDir : null;

        // 2) ENV
        if (!$dir) {
            $env = getenv('APP_LOG_DIR');
            if (is_string($env) && $env !== '') {
                $dir = $env;
            }
        }

        // 3) var/log рядом с документ-рутом
        if (!$dir && defined('HTDOCS_DIR')) {
            $dir = rtrim(HTDOCS_DIR, DIRECTORY_SEPARATOR) . '/var/log';
        }

        // 4) локальная папка logs (совместимость)
        if (!$dir) {
            $dir = getcwd() . '/logs';
        }
        if (!is_dir($dir)) {
            [$created, $error] = _utils_fs_call(static fn(): bool => mkdir($dir, 0775, true));
            if ($created === false && !is_dir($dir)) {
                $details = $error ? ': ' . $error : '';
                throw new \RuntimeException(sprintf('Unable to create log directory "%s"%s', $dir, $details));
            }
        }
        return $dir;
    }
}

if (!function_exists('_utils_log_write')) {
    function _utils_log_write(string $file, string $content, bool $append = true): void {
        $path = rtrim(_utils_log_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . ltrim($file, DIRECTORY_SEPARATOR);
        $flags = $append ? FILE_APPEND : 0;
        [$written, $writeError] = _utils_fs_call(static fn() => file_put_contents($path, $content, $flags));
        if ($written === false) {
            $details = $writeError ? ': ' . $writeError : '';
            throw new \RuntimeException(sprintf('Unable to write log file "%s"%s', $path, $details));
        }

        if (is_file($path)) {
            [$chmodOk, $chmodError] = _utils_fs_call(static fn(): bool => chmod($path, 0664));
            if ($chmodOk === false && $chmodError) {
                error_log(sprintf('Failed to chmod log file "%s": %s', $path, $chmodError));
            }
        }
    }
}

/* --------------------------------------------------------------------------
 * ОТЛАДОЧНЫЕ ХЕЛПЕРЫ
 * -------------------------------------------------------------------------- */

/**
 * Распечатка переменных в HTML/CLI.
 */
function inspect(...$args): void {
    $buf = '';
    foreach ($args as $a) {
        ob_start();
        var_dump($a);
        $buf .= rtrim((string)ob_get_clean()) . "\n";
    }

    if (PHP_SAPI !== 'cli') {
        // HTML-вывод (экранируем)
        echo '<pre style="margin:1rem;padding:1rem;background:#fafafa;border:1px solid #eee;border-radius:8px;overflow:auto">';
        echo htmlspecialchars($buf, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        echo '</pre>';
    } else {
        // CLI
        echo PHP_EOL, $buf, PHP_EOL;
    }
}

/**
 * Прерывание выполнения с выводом значений.
 */
function stop(...$args): void {
    inspect(...$args);
    exit(1);
}

/**
 * Разбор даты на части (безопаснее, чем старый split).
 */
function splitDate(string $date): array {
    $dt = false;
    try {
        // Попробуем умный парсер
        $ts = strtotime($date);
        if ($ts !== false) {
            $dt = new DateTimeImmutable('@' . $ts);
            // Приведём к локальной TZ
            $dt = $dt->setTimezone(new DateTimeZone(date_default_timezone_get()));
        }
    } catch (\Throwable) {
        $dt = false;
    }

    if (!$dt) {
        // Fallback на старый формат
        $timeInfo = ['','',''];
        $dateInfo = ['','',''];
        $dateArray = explode(' ', $date);
        if (is_array($dateArray)) {
            $dateInfo = explode('-', $dateArray[0]);
            if (isset($dateArray[1])) $timeInfo = explode(':', $dateArray[1]);
        }
        return [
            'year'  => (string)($dateInfo[0] ?? ''),
            'month' => (string)($dateInfo[1] ?? ''),
            'day'   => (string)($dateInfo[2] ?? ''),
            'time'  => ['h' => (string)($timeInfo[0] ?? ''), 'm' => (string)($timeInfo[1] ?? ''), 's' => (string)($timeInfo[2] ?? '')],
        ];
    }

    return [
        'year'  => $dt->format('Y'),
        'month' => $dt->format('m'),
        'day'   => $dt->format('d'),
        'time'  => ['h' => $dt->format('H'), 'm' => $dt->format('i'), 's' => $dt->format('s')],
    ];
}

/**
 * Простой лог (одна строка).
 */
function simple_log(string $var): void {
    $line = str_replace("\n", ' ', $var) . "\n";
    _utils_log_write('simple.log', $line, true);
}

/**
 * Подробный лог var_dump() с таймштампом (в конец файла по умолчанию).
 */
function dump_log(mixed $var, bool $append = false): void {
    $t = microtime(true);
    $micro = sprintf('%06d', (int)(($t - floor($t)) * 1_000_000));
    $date = (new DateTimeImmutable())->format("Y-m-d H:i:s.{$micro}");

    ob_start();
    var_dump($var);
    $data = (string)ob_get_clean();

    $msg = "\ndate: {$date}\n\n{$data}\n";
    _utils_log_write('debug.log', $msg, $append);
}

/**
 * Записать несколько значений (var_export) и завершить с выдачей ответа.
 * Поведение совместимо с прежним ddump_log().
 */
function ddump_log(mixed ...$args): void {
    $date = (new DateTimeImmutable())->format('Y-m-d H:i:s');
    $parts = [];
    foreach ($args as $arg) {
        $parts[] = var_export($arg, true);
    }
    $msg = "\ndate: {$date}\n\n" . implode("\n", $parts) . "\n";
    _utils_log_write('debug.log', $msg, false); // перезапись как раньше
    // попытаться отдать ответ, как было
    if (function_exists('E')) {
        try {
            E()->getResponse()->commit();
        } catch (\Throwable) {
            // игнор
        }
    }
    exit(1);
}

/* --------------------------------------------------------------------------
 * УТИЛИТЫ ДЛЯ РЕЗУЛЬТАТОВ БД/МАССИВОВ
 * -------------------------------------------------------------------------- */

/**
 * Выбрать одно поле из результата SELECT.
 */
function simplifyDBResult(mixed $dbResult, string $fieldName, bool $singleRow = false): mixed {
    $result = [];
    $key = strtolower($fieldName);

    if (is_array($dbResult) && !empty($dbResult)) {
        if ($singleRow) {
            // безопасный доступ
            return $dbResult[0][$key] ?? null;
        }
        foreach ($dbResult as $row) {
            if (is_array($row) && array_key_exists($key, $row)) {
                $result[] = $row[$key];
            }
        }
    }
    return $result;
}

/**
 * Транспонирование двумерного массива.
 */
function inverseDBResult(array $dbResult): array {
    $result = [];
    foreach ($dbResult as $row) {
        if (!is_array($row)) { continue; }
        foreach ($row as $fieldName => $fieldValue) {
            $result[$fieldName][] = $fieldValue;
        }
    }
    return $result;
}

/**
 * Конвертация результата SELECT в map по PK (или двумерный map по составному ключу).
 *
 * @throws SystemException
 */
function convertDBResult(mixed $dbResult, mixed $pkName, bool $deletePK = false): array {
    $result = [];
    if (!is_array($dbResult) || empty($dbResult)) {
        return $result;
    }

    // Простой ключ
    if (is_string($pkName)) {
        foreach ($dbResult as $row) {
            if (!is_array($row) || !array_key_exists($pkName, $row)) {
                if (class_exists('SystemException')) {
                    throw new SystemException('ERR_DEV_BAD_DATA', SystemException::ERR_DEVELOPER);
                }
                throw new \RuntimeException('ERR_DEV_BAD_DATA');
            }
            $id = $row[$pkName];
            $result[$id] = $row;
            if ($deletePK) {
                unset($result[$id][$pkName]);
            }
        }
        return $result;
    }

    // Составной ключ [k1, k2]
    if (is_array($pkName) && count($pkName) === 2) {
        [$k1, $k2] = $pkName;
        foreach ($dbResult as $row) {
            if (!is_array($row) || !array_key_exists($k1, $row) || !array_key_exists($k2, $row)) {
                continue;
            }
            $result[$row[$k1]][$row[$k2]] = $row;
            if ($deletePK) {
                unset($result[$row[$k1]][$row[$k2]][$k1], $result[$row[$k1]][$row[$k2]][$k2]);
            }
        }
    }

    return $result;
}

/**
 * Преобразовать имена полей: snake_case → camelCase, с удалением префикса.
 */
function convertFieldNames(array $fields, string $prefix = ''): array {
    $result = [];
    foreach ($fields as $fieldName => $fieldValue) {
        $name = $fieldName;
        if ($prefix !== '' && str_starts_with($name, $prefix)) {
            $name = substr($name, strlen($prefix));
        }
        $name = preg_replace_callback('/_(\w)/', static fn($m) => strtoupper($m[1]), $name);
        $result[$name] = $fieldValue;
    }
    return $result;
}

/**
 * Вставить элемент в конец массива с автоматическим числовым ключом (или заданным).
 */
function arrayPush(array &$array, mixed $var, int|string $key = null): int|string {
    if ($key === null) {
        // найдём макс. числовой ключ
        $numericKeys = array_filter(array_keys($array), static fn($k) => is_int($k));
        $newkey = empty($numericKeys) ? 0 : (max($numericKeys) + 1);
    } else {
        $newkey = $key;
    }
    $array[$newkey] = $var;
    return $newkey;
}

/**
 * Вставка перед позицией/ключом.
 */
function array_push_before(array $array, mixed $var, int|string $pos): array {
    $var = is_array($var) ? $var : [$var];

    if (is_int($pos)) {
        return array_merge(
            array_slice($array, 0, $pos),
            $var,
            array_slice($array, $pos)
        );
    }

    $result = [];
    foreach ($array as $key => $value) {
        if ($key === $pos) {
            $result = array_merge($result, $var);
        }
        $result[$key] = $value;
    }
    return $result;
}

/**
 * Вставка после позиции/ключа.
 */
function array_push_after(array $src, mixed $in, int|string $pos): array {
    $in = is_array($in) ? $in : [$in];
    if (is_int($pos)) {
        return array_merge(array_slice($src, 0, $pos + 1), $in, array_slice($src, $pos + 1));
    }
    $R = [];
    foreach ($src as $k => $v) {
        $R[$k] = $v;
        if ($k === $pos) {
            $R = array_merge($R, $in);
        }
    }
    return $R;
}

/**
 * Прочитать файл и обрезать пробелы/слэши.
 */
function file_get_contents_stripped(string $fileName): string {
    if (!is_file($fileName)) return '';
    return stripslashes(trim((string)file_get_contents($fileName)));
}

/**
 * Быстрая замена одиночного символа (совместимость с оригиналом).
 */
function str_replace_opt(string $from, string $to, string $src): string {
    // Если подали 1 символ — самый быстрый путь
    if (strlen($from) === 1 && strlen($to) === 1) {
        // strtr быстрее ручного цикла
        return strtr($src, [$from => $to]);
    }
    // fallback
    return str_replace($from, $to, $src);
}

/* --------------------------------------------------------------------------
 * XML/XSLT ОБЁРТКИ (для красивых ошибок через Whoops)
 * -------------------------------------------------------------------------- */

/**
 * Выполнить $op с включённым буфером libxml-ошибок.
 * При ошибках бросает RuntimeException с перечнем libxml-проблем и сниппетом файла.
 */
function withLibxml(callable $op, string $context = 'XML/XSLT error', ?string $fileHint = null): mixed {
    $prev = libxml_use_internal_errors(true);
    libxml_clear_errors();

    $result = $op();

    $errors = libxml_get_errors();
    libxml_clear_errors();
    libxml_use_internal_errors($prev);

    if ($errors) {
        // Возьмём первую «существенную» ошибку для сниппета
        $primary = null;
        foreach ($errors as $e) {
            if ($e->level >= LIBXML_ERR_ERROR) { $primary = $e; break; }
        }
        $primary = $primary ?: $errors[0];

        $lines = [];
        foreach ($errors as $e) {
            $lines[] = trim(sprintf(
                '[libxml:%d] %s (file: %s; line: %d; col: %d)',
                $e->level,
                rtrim($e->message),
                $e->file ?: ($fileHint ?: '-'),
                (int)$e->line,
                (int)$e->column
            ));
        }

        $snippet = '';
        $srcFile = $primary->file ?: $fileHint;
        $srcLine = (int)$primary->line;
        if ($srcFile && is_file($srcFile) && $srcLine > 0) {
            $snippet = "\n\n--- snippet: {$srcFile}:{$srcLine} ---\n" . file_snippet($srcFile, $srcLine, 4);
        }

        throw new \RuntimeException($context . ":\n" . implode("\n", $lines) . $snippet);
    }

    // Некоторые DOM/XSLT функции возвращают false/null без явных ошибок — считаем это фейлом
    if ($result === false || $result === null) {
        throw new \RuntimeException($context . ': operation returned false/null');
    }

    return $result;
}

/**
 * Вернуть фрагмент файла вокруг указанной строки.
 */
function file_snippet(string $path, int $line, int $radius = 3): string {
    $out = '';
    [$lines, $error] = _utils_fs_call(static fn() => file($path, FILE_IGNORE_NEW_LINES));
    if (!is_array($lines)) {
        if ($error) {
            error_log(sprintf('Unable to read snippet from "%s": %s', $path, $error));
        }
        return $out;
    }
    $i0 = max(1, $line - $radius);
    $i1 = min(count($lines), $line + $radius);
    for ($i = $i0; $i <= $i1; $i++) {
        $prefix = ($i === $line) ? '>> ' : '   ';
        $out .= sprintf("%s%5d | %s\n", $prefix, $i, $lines[$i - 1]);
    }
    return $out;
}
