<?php
declare(strict_types=1);

/**
 * Метаданные одного поля (тип, режим, свойства, доступные значения и т.п.).
 * Совместимо со старым кодом и XML-контрактом.
 */
class FieldDescription extends DBWorker implements \Iterator
{
    /* ===== Константы визуальных типов ===== */
    public const EMPTY_FIELD_NAME   = 'DUMMY';

    public const FIELD_TYPE_STRING  = 'string';
    public const FIELD_TYPE_TEXT    = 'text';
    public const FIELD_TYPE_CODE    = 'code';
    public const FIELD_TYPE_PWD     = 'password';
    public const FIELD_TYPE_EMAIL   = 'email';
    public const FIELD_TYPE_CAPTCHA = 'captcha';
    public const FIELD_TYPE_PHONE   = 'phone';
    public const FIELD_TYPE_INT     = 'integer';
    public const FIELD_TYPE_FLOAT   = 'float';
    public const FIELD_TYPE_FILE    = 'file';
    public const FIELD_TYPE_THUMB   = 'thumb';
    public const FIELD_TYPE_BOOL    = 'boolean';
    public const FIELD_TYPE_HTML_BLOCK = 'htmlblock';
    public const FIELD_TYPE_SELECT  = 'select';
    public const FIELD_TYPE_MULTI   = 'multi';
    public const FIELD_TYPE_VALUE   = 'value';
    public const FIELD_TYPE_DATETIME= 'datetime';
    public const FIELD_TYPE_DATE    = 'date';
    public const FIELD_TYPE_TIME    = 'time';
    public const FIELD_TYPE_HIDDEN  = 'hidden';
    public const FIELD_TYPE_INFO    = 'info';
    public const FIELD_TYPE_CUSTOM  = 'custom';
    public const FIELD_TYPE_TAB     = 'tab';
    public const FIELD_TYPE_VIDEO   = 'video';
    public const FIELD_TYPE_MEDIA   = 'media';
    public const FIELD_TYPE_TEXTBOX_LIST = 'textbox';
    public const FIELD_TYPE_SMAP_SELECTOR = 'smap';

    /* ===== Режимы отображения ===== */
    public const FIELD_MODE_NONE = 0;
    public const FIELD_MODE_READ = 1;
    public const FIELD_MODE_EDIT = 2;
    public const FIELD_MODE_FC   = 3;

    /* ===== Свойства ===== */

    /** Имя поля. */
    private string $name;

    /** Системное имя (может включать table[field]). */
    private string $systemName;

    /** Визуальный тип (одна из констант выше). */
    private ?string $type = null;

    /** Системный тип (из БД). */
    private ?string $systemType = null;

    /** Режим (см. константы FIELD_MODE_*). */
    private int $mode = self::FIELD_MODE_EDIT;

    /** Права (если не заданы — наследуются извне). */
    private ?int $rights = null;

    /** Мультиязычность. */
    private bool $isMultilanguage = false;

    /**
     * Длина поля. По историческим причинам может быть числом или true
     * (для типов без фиксированной длины).
     */
    private int|bool $length = true;

    /** Доступные значения для select/multi. */
    private ?array $availableValues = null;

    /** Доп. свойства: name => value. */
    private array $additionalProperties = [];

    /** Те же свойства с ключами в нижнем регистре (быстрый поиск без учета регистра). */
    private array $additionalPropertiesLower = [];

    /* ===== Итератор по доп. свойствам ===== */

    /** Кэш имён свойств для итератора. */
    private array $additionalPropertiesNames = [];

    /** Текущий индекс итератора. */
    private int $propertiesIndex = 0;

    /* ===== Конструктор ===== */

    public function __construct(string $name = self::EMPTY_FIELD_NAME)
    {
        parent::__construct();
        $this->name       = $name;
        $this->systemName = $name;

        // Значение заголовка по умолчанию: FIELD_<name>
        if ($name !== self::EMPTY_FIELD_NAME) {
            $this->setProperty('title', 'FIELD_' . $name);
        }
    }

    /* ===== Загрузка метаданных ===== */

    /** Загрузить описание из массива (как DBA::getColumnsInfo()). Возвращает true (BC). */
    public function loadArray(array $fieldInfo): bool
    {
        foreach ($fieldInfo as $propName => $propValue) {
            switch ($propName) {
                case 'type':
                    $this->setSystemType((string)$propValue);
                    break;
                case 'length':
                    $this->setLength((int)$propValue);
                    break;
                case 'mode':
                    $this->setMode((int)$propValue);
                    break;
                case 'isMultilanguage':
                    $this->isMultilanguage = true;
                    break;
                default:
                    $this->setProperty((string)$propName, $propValue);
            }
        }

        if (isset($fieldInfo['index']) && $fieldInfo['index'] === 'PRI') {
            $this->setType(self::FIELD_TYPE_HIDDEN);
        }
        return true;
    }

    /** Загрузить описание из XML. Возвращает true (BC). */
    public function loadXML(\SimpleXMLElement $fieldInfo): bool
    {
        foreach ($fieldInfo->attributes() as $attrName => $attrValue) {
            $attrName  = (string)$attrName;
            $attrValue = (string)$attrValue;

            switch ($attrName) {
                case 'name':
                    $this->name = $attrValue;
                    break;

                case 'type':
                    $this->setSystemType($attrValue);
                    if (
                        $this->getType() === self::FIELD_TYPE_SELECT &&
                        !empty($fieldInfo->options->option)
                    ) {
                        $this->loadAvailableXMLValues($fieldInfo->options->option);
                    }
                    break;

                case 'length':
                    $this->setLength((int)$attrValue);
                    break;

                case 'mode':
                    $this->setMode((int)$attrValue);
                    break;

                default:
                    $this->setProperty($attrName, $attrValue);
            }
        }
        return true;
    }

    /* ===== Базовые геттеры/сеттеры ===== */

    public function getName(): string
    {
        return $this->name;
    }

    public function setSystemName(string $systemName): void
    {
        $this->systemName = $systemName;
    }

    /** @return int|bool */
    public function getLength()
    {
        return $this->length;
    }

    public function setLength(int $length): self
    {
        $this->length = $length;
        return $this;
    }

    public function getSystemName(): string
    {
        return $this->systemName;
    }

    /** Установить визуальный тип и сопутствующие свойства (pattern, message и т.п.). */
    public function setType(string $type): self
    {
        $this->type = $type;
        $this->setProperty('sort', 0);

        switch ($this->type) {
            case self::FIELD_TYPE_PWD:
                $this->setProperty('pattern', '/^.+$/');
                $this->setProperty('message', 'MSG_FIELD_IS_NOT_NULL');
                break;

            case self::FIELD_TYPE_HIDDEN:
                // без изменений
                break;

            case self::FIELD_TYPE_EMAIL:
                $nullable = $this->getPropertyValue('nullable');
                $this->setProperty(
                    'pattern',
                    ($nullable === false || is_null($nullable))
                        ? '/^(([^()<>@,;:\\\".\[\] ]+)|("[^"\\\\\r]*"))((\.[^()<>@,;:\\\".\[\] ]+)|(\."[^"\\\\\r]*"))*@(([a-z0-9][a-z0-9\-]+)*[a-z0-9]+\.)+[a-z]{2,}$/i'
                        : '/^((([^()<>@,;:\\\".\[\] ]+)|("[^"\\\\\r]*"))((\.[^()<>@,;:\\\".\[\] ]+)|(\."[^"\\\\\r]*"))*@(([a-z0-9][a-z0-9\-]+)*[a-z0-9]+\.)+[a-z]{2,})?$/i'
                );
                $this->setProperty('sort', 1);
                $this->setProperty('message', 'MSG_BAD_EMAIL_FORMAT');
                break;

            case self::FIELD_TYPE_PHONE:
                $nullable = $this->getPropertyValue('nullable');
                $this->setProperty(
                    'pattern',
                    ($nullable === false || is_null($nullable))
                        ? '/^[0-9\(\)\+\-\. ]{5,25}$/'
                        : '/^([0-9\(\)\+\-\. ]{5,25})?$/'
                );
                $this->setProperty('sort', 1);
                $this->setProperty('message', 'MSG_BAD_PHONE_FORMAT');
                break;

            case self::FIELD_TYPE_FILE:
            case self::FIELD_TYPE_VIDEO:
                if ($this->getPropertyValue('nullable') === false) {
                    $this->setProperty('pattern', '/^.+$/');
                    $this->setProperty('message', 'MSG_FILE_IS_NOT_NULL');
                }
                $this->length = true;
                break;

            case self::FIELD_TYPE_STRING:
                $this->setProperty('sort', 1);
                if ($this->getPropertyValue('nullable') === false || is_null($this->getPropertyValue('nullable'))) {
                    $this->setProperty('pattern', '/^.+$/');
                    $this->setProperty('message', 'MSG_FIELD_IS_NOT_NULL');
                } else {
                    $this->removeProperty('pattern');
                    $this->removeProperty('message');
                }
                break;

            case self::FIELD_TYPE_FLOAT:
                $this->length = 10;
                $nullable = $this->getPropertyValue('nullable');
                $re = ($nullable === false || is_null($nullable))
                    ? '/^[0-9,\.]{1,' . $this->length . '}$/'
                    : '/^[0-9,\.]{0,' . $this->length . '}$/';
                $this->setProperty('sort', 1);
                $this->setProperty('pattern', $re);
                $this->setProperty('message', 'MSG_BAD_FLOAT_FORMAT');
                break;

            case self::FIELD_TYPE_BOOL:
                $this->length = true;
                $this->setProperty('outputFormat', '%s');
                $this->setProperty('sort', 1);
                break;

            case self::FIELD_TYPE_CAPTCHA:
                $this->setProperty('customField', 'customField');
                break;

            case self::FIELD_TYPE_SELECT:
                $this->length = true;
                break;

            case self::FIELD_TYPE_INT:
                if (!$this->getPropertyValue('key')) {
                    $nullable = $this->getPropertyValue('nullable');
                    if ($nullable === false) {
                        $re = '/^\d{1,7}$/';
                        $msg = 'MSG_BAD_INT_FORMAT_OR_NULL';
                    } else {
                        $re = '/^\d{0,7}$/';
                        $msg = 'MSG_BAD_INT_FORMAT';
                    }
                    $this->setProperty('sort', 1);
                    $this->setProperty('pattern', $re);
                    $this->setProperty('message', $msg);
                }
                break;

            case self::FIELD_TYPE_TEXT:
            case self::FIELD_TYPE_HTML_BLOCK:
            case self::FIELD_TYPE_CODE:
                if ($this->getPropertyValue('nullable') === false || is_null($this->getPropertyValue('nullable'))) {
                    $this->setProperty('pattern', '/^.+$/m');
                    $this->setProperty('message', 'MSG_FIELD_IS_NOT_NULL');
                }
                $this->length = true;
                break;

            case self::FIELD_TYPE_DATETIME:
                $nullable = $this->getPropertyValue('nullable');
                $re = ($nullable === false)
                    ? '/^\d{4}-\d{1,2}-\d{1,2}T\d{1,2}:\d{1,2}(:\d{1,2})?$/'
                    : '/^(\d{4}-\d{1,2}-\d{1,2}T\d{1,2}:\d{1,2}(:\d{1,2})?)?$/';
                $this->setProperty('sort', 1);
                $this->setProperty('pattern', $re);
                $this->setProperty('outputFormat', '%Y-%m-%d %H:%M');
                $this->setProperty('message', 'MSG_WRONG_DATETIME_FORMAT');
                $this->length = true;
                break;

            case self::FIELD_TYPE_TIME:
                $re = '/^\d{1,2}:\d{1,2}(:\d{1,2})?$/';
                $this->setProperty('pattern', $re);
                $this->setProperty('message', 'MSG_WRONG_TIME_FORMAT');
                $this->setProperty('sort', 1);
                $this->setProperty('outputFormat', '%H:%M:%S');
                $this->length = true;
                break;

            case self::FIELD_TYPE_DATE:
                $nullable = $this->getPropertyValue('nullable');
                $re = ($nullable === false)
                    ? '/^\d{4}\-\d{1,2}\-\d{1,2}$/'
                    : '/^(\d{4}\-\d{1,2}\-\d{1,2})?$/';
                $this->setProperty('sort', 1);
                $this->setProperty('pattern', $re);
                $this->setProperty('outputFormat', '%Y-%m-%d');
                $this->setProperty('message', 'MSG_WRONG_DATE_FORMAT');
                $this->length = true;
                break;

            case self::FIELD_TYPE_TEXTBOX_LIST:
            case self::FIELD_TYPE_CUSTOM:
                if ($this->getPropertyValue('nullable') === false) {
                    $this->setProperty('pattern', '/^.+$/');
                    $this->setProperty('message', 'MSG_FIELD_IS_NOT_NULL');
                }
                break;

            default:
                // как есть
                break;
        }

        return $this;
    }

    /** Текущий визуальный тип (может быть null до инициализации). */
    public function getType()
    {
        return $this->type;
    }

    /** Установить системный тип и автоматически вычислить визуальный. */
    public function setSystemType(string $systemType): void
    {
        $this->systemType = $systemType;
        $this->setType(self::convertType($systemType, $this->name, $this->length, $this->additionalProperties));
    }

    public function getSystemType()
    {
        return $this->systemType;
    }

    public function setMode(int $mode): self
    {
        $this->mode = $mode;
        return $this;
    }

    public function getMode(): int
    {
        return $this->mode;
    }

    public function setRights(int $rights): void
    {
        $this->rights = $rights;
    }

    /** Может вернуть null, если права явно не задавались (BC). */
    public function getRights()
    {
        return $this->rights;
    }

    /* ===== Работа со свойствами ===== */

    /**
     * Установить свойство. Значения title/message/tabName и конструкции вида trans(...)
     * автоматически переводятся через translate().
     */
    public function setProperty(string $name, mixed $value): self
    {
        if (in_array($name, ['title', 'message', 'tabName'], true)) {
            $value = $this->translate((string)$value);
        } elseif (is_scalar($value) && str_contains((string)$value, 'trans(')) {
            $value = $this->translate(str_replace(['trans', '(', ')'], '', (string)$value));
        }

        $lc = strtolower($name);
        $this->additionalProperties[$name]      = $value;
        $this->additionalPropertiesLower[$lc]   = $value;
        return $this;
    }

    /** Удалить свойство. */
    public function removeProperty(string $name): self
    {
        $lc = strtolower($name);
        unset($this->additionalProperties[$name], $this->additionalPropertiesLower[$lc]);
        return $this;
    }

    /** Список имён свойств. */
    public function getPropertyNames(): array
    {
        return array_keys($this->additionalProperties);
    }

    /** Значение свойства (ищет без учёта регистра). Может вернуть null. */
    public function getPropertyValue(string $name)
    {
        $lc = strtolower($name);
        if (array_key_exists($lc, $this->additionalPropertiesLower)) {
            return $this->additionalPropertiesLower[$lc];
        }
        return $this->additionalProperties[$name] ?? null;
    }

    /* ===== Преобразование типов ===== */

    /**
     * Конвертация системного типа БД в визуальный тип.
     * Учитывает имя поля (суффиксы *_email, *_phone, *_img, *_file, *_video),
     * длину и свойства (напр., внешний ключ -> select/multi).
     */
    public static function convertType($systemType, $name, $length = 1, $props = []): string
    {
        switch ($systemType) {
            case DBA::COLTYPE_STRING:
                if (str_contains($name, '_password')) {
                    return self::FIELD_TYPE_PWD;
                } elseif (str_contains($name, '_email')) {
                    return self::FIELD_TYPE_EMAIL;
                } elseif (str_contains($name, '_phone')) {
                    return self::FIELD_TYPE_PHONE;
                } elseif (str_contains($name, '_file') || str_contains($name, '_img')) {
                    return self::FIELD_TYPE_FILE;
                } elseif (str_contains($name, '_video')) {
                    return self::FIELD_TYPE_VIDEO;
                }
                return self::FIELD_TYPE_STRING;

            case DBA::COLTYPE_FLOAT:
                return self::FIELD_TYPE_FLOAT;

            case DBA::COLTYPE_INTEGER:
                if ($length == 1) {
                    return str_contains($name, '_info') ? self::FIELD_TYPE_INFO : self::FIELD_TYPE_BOOL;
                }
                if (isset($props['key']) && is_array($props['key'])) {
                    return (str_contains($name, '_multi')) ? self::FIELD_TYPE_MULTI : self::FIELD_TYPE_SELECT;
                }
                return self::FIELD_TYPE_INT;

            case DBA::COLTYPE_TEXT:
                if (str_contains($name, '_rtf')) {
                    return self::FIELD_TYPE_HTML_BLOCK;
                }
                if (str_contains($name, '_code')) {
                    return self::FIELD_TYPE_CODE;
                }
                return self::FIELD_TYPE_TEXT;

            case DBA::COLTYPE_DATETIME:
            case DBA::COLTYPE_TIMESTAMP:
                return self::FIELD_TYPE_DATETIME;

            case DBA::COLTYPE_TIME:
                return self::FIELD_TYPE_TIME;

            case DBA::COLTYPE_DATE:
                return self::FIELD_TYPE_DATE;

            default:
                return (string)$systemType;
        }
    }

    /* ===== Слияние описаний (конфиг ∩ БД) ===== */

    public static function intersect(FieldDescription $configFieldDescription, FieldDescription $dbFieldDescription): FieldDescription
    {
        $type = $configFieldDescription->getType();
        $mode = $configFieldDescription->getMode();

        if (!is_null($av = $configFieldDescription->getAvailableValues())) {
            $dbFieldDescription->setAvailableValues($av);
        }
        if ($dbFieldDescription->getPropertyValue('index') == 'PRI') {
            $dbFieldDescription->setType(self::FIELD_TYPE_HIDDEN);
        }
        if (!is_null($type)) {
            $dbFieldDescription->setProperty('origType', $dbFieldDescription->getType());
            $dbFieldDescription->setType($type);
        }
        if (!is_null($mode)) {
            $dbFieldDescription->setMode((int)$mode);
        }

        $dbFieldDescription->isMultilanguage =
            $configFieldDescription->isMultilanguage || $dbFieldDescription->isMultilanguage();

        $props = array_unique(array_merge(
            $configFieldDescription->getPropertyNames(),
            $dbFieldDescription->getPropertyNames()
        ));

        foreach ($props as $propName) {
            $val = $configFieldDescription->getPropertyValue($propName);
            if (!is_null($val) && !($propName === 'title' && $val === 'FIELD_' . self::EMPTY_FIELD_NAME)) {
                $dbFieldDescription->setProperty($propName, $val);
            }
        }
        return $dbFieldDescription;
    }

    /* ===== Валидация ===== */

    /** Валидация значения по length/pattern. Возвращает true/false. */
    public function validate($data): bool
    {
        // длина
        if (is_int($this->length)) {
            $s = is_scalar($data) ? (string)$data : '';
            if (strlen($s) > $this->length) {
                return false;
            }
        }

        // pattern
        $pattern = $this->getPropertyValue('pattern');
        if ($pattern && is_string($pattern)) {
            $s = is_scalar($data) ? (string)$data : '';
            if (!preg_match($pattern, $s)) {
                return false;
            }
        }

        return true;
    }

    /* ===== Мультиязычность ===== */

    public function isMultilanguage(): bool
    {
        return $this->isMultilanguage;
    }

    public function markMultilanguage(): void
    {
        $this->isMultilanguage = true;
    }

    /* ===== Доступные значения ===== */

    /**
     * Загрузить доступные значения для select/multi из массива строк.
     * Формат каждой строки: [$keyName => key, $valueName => value, ...attrs]
     */
    public function loadAvailableValues($values, $keyName, $valueName): self
    {
        if (is_array($values) && empty($this->availableValues)) {
            $result = [];
            foreach ($values as $row) {
                $key   = $row[$keyName];
                $value = $row[$valueName];

                unset($row[$keyName], $row[$valueName]);

                $result[$key] = [
                    'value'      => $value,
                    'attributes' => (empty($row) ? false : $row),
                ];
            }
            $this->availableValues = $result;
        }
        return $this;
    }

    /** Загрузить доступные значения из XML <options><option ...>..</option></options> */
    private function loadAvailableXMLValues(\SimpleXMLElement $options): void
    {
        $result = [];
        foreach ($options as $option) {
            $optAttributes = [];
            foreach ($option->attributes() as $optAttrName => $optAttrValue) {
                if ((string)$optAttrName !== 'id') {
                    $optAttributes[(string)$optAttrName] = (string)$optAttrValue;
                }
            }
            $result[(int)$option['id']] = [
                'value'      => $this->translate((string)$option),
                'attributes' => $optAttributes,
            ];
        }
        $this->availableValues = $result;
    }

    /** Вернуть доступные значения (по ссылке — BC). */
    public function &getAvailableValues()
    {
        return $this->availableValues;
    }

    public function setAvailableValues($av): self
    {
        $this->availableValues = $av;
        return $this;
    }

    /* ===== Права ===== */

    /**
     * Рассчитать режим поля по правам метода и ограничениям на чтение/запись.
     * Возвращает FIELD_MODE_*.
     */
    public static function computeRights($methodRights, $RORights = null, $FCRights = null): int
    {
        $RORights = is_null($RORights) ? $methodRights : $RORights;
        $FCRights = is_null($FCRights) ? $methodRights : $FCRights;

        if ($methodRights < $RORights) {
            return self::FIELD_MODE_NONE;
        } elseif ($methodRights >= $RORights && $methodRights < $FCRights) {
            return self::FIELD_MODE_READ;
        } else {
            return self::FIELD_MODE_EDIT;
        }
    }

    /* ===== \Iterator по доп. свойствам ===== */

    public function rewind(): void
    {
        $this->additionalPropertiesNames = array_keys($this->additionalProperties);
        $this->propertiesIndex = 0;
    }

    public function current(): mixed
    {
        $k = $this->additionalPropertiesNames[$this->propertiesIndex] ?? null;
        return ($k !== null) ? $this->additionalProperties[$k] : null;
    }

    public function key(): mixed
    {
        return $this->additionalPropertiesNames[$this->propertiesIndex] ?? null;
    }

    public function next(): void
    {
        $this->propertiesIndex++;
    }

    public function valid(): bool
    {
        return isset($this->additionalPropertiesNames[$this->propertiesIndex]);
    }
}
