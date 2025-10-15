<?php
/**
 * @file
 * Filter
 *
 * It contains the definition to:
 * @code
class Filter;
 * @endcode
 *
 * @author
 * @version 2.0.0 (PHP 8-compatible, safer string handling)
 */

/**
 * Filters.
 *
 * @code
class Filter;
 * @endcode
 */
class Filter extends BaseObject
{
    /**
     * Filter tag name.
     * @var string
     */
    public const TAG_NAME = 'filter';

    /** @var DOMDocument */
    private $doc;

    /** @var FilterField[] */
    private array $fields = [];

    /** @var array */
    private array $properties = [];

    /**
     * Полная карта операторов (UI и генерация условий).
     * ВНИМАНИЕ: строки condition используются как шаблоны и не должны мутироваться глобально.
     *
     * @var array<string, array{title:string,type:array,condition:string}>
     */
    private array $map;

    /**
     * Сырые данные фильтра (как пришли извне).
     * Ожидаемый формат:
     * [
     *   'condition' => 'like'|'='|'between'|...,
     *   '<table>' => [ '<field>' => [<value>|[v1,v2]] ]
     * ]
     * @var array|null
     */
    private ?array $data = null;

    /**
     * Текущее имя оператора (из $map).
     * @var string|false
     */
    private $condition = false;

    public function __construct()
    {
        $stringTypes = [
            FieldDescription::FIELD_TYPE_STRING,
            FieldDescription::FIELD_TYPE_SELECT,
            FieldDescription::FIELD_TYPE_TEXT,
            FieldDescription::FIELD_TYPE_HTML_BLOCK,
            FieldDescription::FIELD_TYPE_VALUE,
            FieldDescription::FIELD_TYPE_PHONE,
            FieldDescription::FIELD_TYPE_EMAIL,
            FieldDescription::FIELD_TYPE_CODE,
        ];
        $numericTypes = [
            FieldDescription::FIELD_TYPE_INT,
            FieldDescription::FIELD_TYPE_FLOAT,
        ];
        $dateTypes = [
            FieldDescription::FIELD_TYPE_DATETIME,
            FieldDescription::FIELD_TYPE_DATE,
        ];

        $this->map = [
            'like' => [
                'title' => DBWorker::_translate('TXT_FILTER_SIGN_CONTAINS'),
                'type' => $stringTypes,
                'condition' => "LIKE '%%%s%%'",
            ],
            'notlike' => [
                'title' => DBWorker::_translate('TXT_FILTER_SIGN_NOT_CONTAINS'),
                'type' => $stringTypes,
                'condition' => "NOT LIKE '%%%s%%'",
            ],
            '=' => [
                'title' => '=',
                'type' => array_merge($stringTypes, $numericTypes, $dateTypes),
                'condition' => "= '%s'",
            ],
            '!=' => [
                'title' => '!=',
                'type' => array_merge($stringTypes, $numericTypes, $dateTypes),
                'condition' => "!= '%s'",
            ],
            '<' => [
                'title' => '<',
                'type' => array_merge($dateTypes, $numericTypes),
                'condition' => "<'%s'",
            ],
            '>' => [
                'title' => '>',
                'type' => array_merge($dateTypes, $numericTypes),
                'condition' => ">'%s'",
            ],
            'between' => [
                'title' => DBWorker::_translate('TXT_FILTER_SIGN_BETWEEN'),
                'type' => array_merge($dateTypes, $numericTypes),
                'condition' => "BETWEEN '%s' AND '%s'",
            ],
            'checked' => [
                'title' => DBWorker::_translate('TXT_FILTER_SIGN_CHECKED'),
                'type' => [FieldDescription::FIELD_TYPE_BOOL],
                'condition' => '= 1',
            ],
            'unchecked' => [
                // сохраняем исторический ключ перевода
                'title' => DBWorker::_translate('TXT_FILTER_SIGN_UNCHEKED'),
                'type' => [FieldDescription::FIELD_TYPE_BOOL],
                'condition' => '!=1',
            ],
        ];

        // Сохранение обратной совместимости: поддерживаем автозагрузку данных из $_POST['filter']
        if (isset($_POST[self::TAG_NAME]) && !empty($_POST[self::TAG_NAME])) {
            $this->setData($_POST[self::TAG_NAME]);
        }
    }

    /**
     * Явно установить данные фильтра (предпочтительно вместо чтения из $_POST).
     *
     * @param array $data
     * @return void
     * @throws SystemException
     */
    public function setData(array $data): void
    {
        if (!isset($data['condition']) || !in_array($data['condition'], array_keys($this->map), true)) {
            throw new SystemException('ERR_BAD_FILTER_DATA', SystemException::ERR_CRITICAL, $data);
        }
        $this->condition = $data['condition'];        
        unset($data['condition']);
        $this->data = $data;
    }

    /**
     * Применить фильтр к гриду.
     *
     * @param Grid $grid
     * @throws SystemException
     */
    public function apply(Grid $grid): void
    {
        
        if (!$this->data) {
            return;
        }

        $dbh = E()->getDB();
        $pdo = $dbh->getPDO();

        $tableName = key($this->data);
        $fieldName = key($this->data[$tableName]);
        $values = $this->normalizeValues($this->data[$tableName][$fieldName]);
        
        if (
            !$dbh->tableExists($tableName) ||
            !($tableInfo = $dbh->getColumnsInfo($tableName)) ||
            !isset($tableInfo[$fieldName])
        ) {
            throw new SystemException('ERR_BAD_FILTER_DATA', SystemException::ERR_CRITICAL, $tableName);
        }

        // FK-поле?
        if (is_array($tableInfo[$fieldName]['key'])) {
            $this->applyForeignKeyFilter($grid, $dbh, $tableInfo[$fieldName]['key'], $values);
            return;
        }

        // Обычное поле
        $fdType = FieldDescription::convertType(
            $tableInfo[$fieldName]['type'],
            $fieldName,
            $tableInfo[$fieldName]['length'],
            $tableInfo[$fieldName]
        );

        $operator = $this->condition;

        // LIKE неприменим к датам — деградируем в '=' / '!=' как в оригинале
        if (in_array($operator, ['like', 'notlike'], true) &&
            in_array($fdType, [FieldDescription::FIELD_TYPE_DATE, FieldDescription::FIELD_TYPE_DATETIME], true)
        ) {
            $operator = ($operator === 'like') ? '=' : '!=';
        }

        // Нормализация и валидация набора значений под конкретный оператор
        $this->validateOperatorValues($operator, $values);

        // Имя поля для SQL
        $qualifiedField = ($tableName ? ($tableName . '.') : '') . $fieldName;
        $isDateType = in_array($fdType, [FieldDescription::FIELD_TYPE_DATETIME, FieldDescription::FIELD_TYPE_DATE], true);
        if ($fdType === FieldDescription::FIELD_TYPE_DATETIME) {
            // Сравниваем только по дате (как в оригинале)
            $qualifiedField = 'DATE(' . $qualifiedField . ')';
        }

        // Получаем локальную копию шаблона (НЕ мутируя $this->map)
        $pattern = $this->map[$operator]['condition'];
        if ($isDateType) {
            // Встроим оборачивание в DATE() только в ЛОКАЛЬНЫЙ шаблон
            $pattern = str_replace("'%s'", "DATE('%s')", $pattern);
        }

        // Санитизация значений: экранирование для SQL и спецсимволов LIKE
        $safeValues = $this->sanitizeValuesForPattern($values, $fdType, $operator, $pdo);

        // Финальная строка условия
        $conditionSql = $qualifiedField . ' ' . vsprintf($pattern, $safeValues) . ' ';

        // Для LIKE-операторов добавим ESCAPE, чтобы экранирование \ работало предсказуемо
        if (in_array($operator, ['like', 'notlike'], true)) {
            $conditionSql .= "ESCAPE '\\\\' ";
        }

        
        $grid->addFilterCondition($conditionSql);
    }

    /**
     * Обработка фильтра по внешнему ключу:
     * подбираем список id по значению (LIKE/=/... по valueName) и добавляем IN-условие.
     */
    private function applyForeignKeyFilter(Grid $grid, $dbh, array $fk, array $values): void
    {
        $fkTranslationTable = $dbh->getTranslationTablename($fk['tableName']);
        $fkTable = $fkTranslationTable ?: $fk['tableName'];
        $fkKey = $fk['fieldName'];
        $fkValueField = substr($fkKey, 0, strrpos($fkKey, '_')) . '_name';
        $fkTableInfo = $dbh->getColumnsInfo($fkTable);
        if (!isset($fkTableInfo[$fkValueField])) {
            $fkValueField = $fkKey; // fallback: ищем по ключу
        }

        // Собираем тот же шаблон, что и для простых полей
        $operator = $this->condition;
        $pattern = $this->map[$operator]['condition'];

        // Санитизируем значения под строковый поиск (FK value — как правило текст)
        $pdo = $dbh->getPDO();
        $safeValues = $this->sanitizeValuesForPattern($values, FieldDescription::FIELD_TYPE_STRING, $operator, $pdo);

        $where = $fkTable . '.' . $fkValueField . ' ' . vsprintf($pattern, $safeValues) . ' ';
        if (in_array($operator, ['like', 'notlike'], true)) {
            $where .= "ESCAPE '\\\\' ";
        }

        if ($res = $dbh->getColumn($fkTable, $fkKey, $where)) {
            // Передаём IN через массив (как и раньше)
            $grid->addFilterCondition([$fk['tableName'] . '.' . $fk['fieldName'] => $res]);
        } else {
            $grid->addFilterCondition(' FALSE');
        }
    }

    /**
     * Нормализовать входные значения в массив строк.
     *
     * @param mixed $values
     * @return array
     */
    private function normalizeValues($values): array
    {
        if (is_array($values)) {
            return $values;
        }
        return [$values];
    }

    /**
     * Проверить корректность количества значений для оператора.
     *
     * @param string $operator
     * @param array  $values
     * @throws SystemException
     */
    private function validateOperatorValues(string $operator, array $values): void
    {
        $placeholders = substr_count($this->map[$operator]['condition'], '%s');
        if ($operator === 'between') {
            if (count($values) !== 2) {
                throw new SystemException('ERR_BAD_FILTER_DATA', SystemException::ERR_CRITICAL, $values);
            }
        } else {
            if (count($values) < 1 || count($values) > max(1, $placeholders)) {
                throw new SystemException('ERR_BAD_FILTER_DATA', SystemException::ERR_CRITICAL, $values);
            }
        }
    }

    /**
     * Подготовка значений под подстановку в шаблон:
     * - строки/даты: PDO::quote без внешних кавычек, плюс экранирование спецсимволов для LIKE
     * - числа: приведение к строке (оригинальная карта всё равно оборачивает в кавычки)
     *
     * @param array  $values
     * @param string $fdType
     * @param string $operator
     * @param PDO    $pdo
     * @return array
     */
    private function sanitizeValuesForPattern(array $values, string $fdType, string $operator, PDO $pdo): array
    {
        $out = [];
        foreach ($values as $v) {
            // Нормализация дат
            if (in_array($fdType, [FieldDescription::FIELD_TYPE_DATE, FieldDescription::FIELD_TYPE_DATETIME], true)) {
                $ts = strtotime((string)$v);
                $v = ($ts !== false)
                    ? date('Y-m-d', $ts) // так как сравниваем по DATE()
                    : (string)$v;
            }

            // LIKE-поиск — экранируем спецсимволы, чтобы они не работали как шаблон
            if (in_array($operator, ['like', 'notlike'], true)) {
                $v = $this->escapeForLike((string)$v);
            }

            // Строки/даты — безопасно экранируем через PDO::quote и снимаем наружные кавычки,
            // так как шаблон содержит свои.
            if (in_array($fdType, [
                FieldDescription::FIELD_TYPE_STRING,
                FieldDescription::FIELD_TYPE_TEXT,
                FieldDescription::FIELD_TYPE_HTML_BLOCK,
                FieldDescription::FIELD_TYPE_VALUE,
                FieldDescription::FIELD_TYPE_EMAIL,
                FieldDescription::FIELD_TYPE_PHONE,
                FieldDescription::FIELD_TYPE_CODE,
                FieldDescription::FIELD_TYPE_SELECT,
                FieldDescription::FIELD_TYPE_DATE,
                FieldDescription::FIELD_TYPE_DATETIME,
            ], true)) {
                $q = $pdo->quote((string)$v);
                // PDO::quote возвращает строку в одинарных кавычках — удалим их, оставив экранирование внутренних символов
                $q = ($q !== false && strlen($q) >= 2) ? substr($q, 1, -1) : addslashes((string)$v);
                $out[] = $q;
                continue;
            }

            // Числа / bool — приводим к строке
            if ($fdType === FieldDescription::FIELD_TYPE_INT) {
                $out[] = (string)(int)$v;
            } elseif ($fdType === FieldDescription::FIELD_TYPE_FLOAT) {
                $out[] = (string)str_replace(',', '.', (string)$v);
            } elseif ($fdType === FieldDescription::FIELD_TYPE_BOOL) {
                $out[] = ((int)(bool)$v) ? '1' : '0';
            } else {
                // дефолт: как строка, с экранированием
                $q = $pdo->quote((string)$v);
                $out[] = ($q !== false && strlen($q) >= 2) ? substr($q, 1, -1) : addslashes((string)$v);
            }
        }
        return $out;
    }

    /**
     * Экранирование для LIKE: %, _ и \ → литералы.
     */
    private function escapeForLike(string $s): string
    {
        // Сначала экранируем обратный слеш, затем спец-символы LIKE
        $s = str_replace('\\', '\\\\', $s);
        $s = str_replace(['%', '_'], ['\\%', '\\_'], $s);
        return $s;
    }

    /* ===================== Управление полями ===================== */

    public function attachField(FilterField $field): void
    {
        $field->setIndex(arrayPush($this->fields, $field));
        $field->attach($this);
    }

    /**
     * @throws SystemException
     */
    public function detachField(FilterField $field): void
    {
        if (!isset($this->fields[$field->getIndex()])) {
            throw new SystemException('ERR_DEV_NO_CONTROL_TO_DETACH', SystemException::ERR_DEVELOPER);
        }
        unset($this->fields[$field->getIndex()]);
    }

    /**
     * Построить фильтр из XML-описания.
     *
     * @param SimpleXMLElement $filterDescription
     * @param array|null       $meta
     * @return void
     * @throws SystemException
     */
    public function load(SimpleXMLElement $filterDescription, ?array $meta = null)
    {
        if (empty($filterDescription)) {
            return;
        }
        foreach ($filterDescription->field as $fieldDescription) {
            if (!isset($fieldDescription['name'])) {
                throw new SystemException('ERR_BAD_FILTER_XML', SystemException::ERR_DEVELOPER);
            }
            $name = (string)$fieldDescription['name'];
            $field = new FilterField($name);
            $this->attachField($field);
            $field->load($fieldDescription, (isset($meta[$name]) ? $meta[$name] : null));
        }
    }

    /**
     * @return FilterField[]
     */
    public function getFields(): array
    {
        return $this->fields;
    }

    public function setProperty(string $name, $value): void
    {
        $this->properties[$name] = $value;
    }

    public function getProperty(string $name)
    {
        return $this->properties[$name] ?? null;
    }

    /**
     * Сборка DOM для UI фильтра.
     *
     * @return DOMNode|false
     */
    public function build()
    {
        if (!count($this->fields)) {
            return false;
        }

        $this->translateFields();
        $this->doc = new DOMDocument('1.0', 'UTF-8');

        $filterElem = $this->doc->createElement(self::TAG_NAME);
        $filterElem->setAttribute('title', DBWorker::_translate('TXT_FILTER'));
        $filterElem->setAttribute('apply', DBWorker::_translate('BTN_APPLY_FILTER'));
        $filterElem->setAttribute('reset', DBWorker::_translate('TXT_RESET_FILTER'));

        if (!empty($this->properties)) {
            $props = $this->doc->createElement('properties');
            foreach ($this->properties as $propName => $propValue) {
                $prop = $this->doc->createElement('property');
                $prop->setAttribute('name', $propName);
                $prop->appendChild($this->doc->createTextNode($propValue));
                $props->appendChild($prop);
            }
            $filterElem->appendChild($props);
        }

        // Доступные операторы + типы
        $operatorsNode = $this->doc->createElement('operators');
        foreach ($this->map as $operatorName => $operator) {
            $operatorNode = $this->doc->createElement('operator');
            $operatorNode->setAttribute('title', $operator['title']);
            $operatorNode->setAttribute('name', $operatorName);

            $typesNode = $this->doc->createElement('types');
            foreach ($operator['type'] as $typeName) {
                $typesNode->appendChild($this->doc->createElement('type', $typeName));
            }
            $operatorNode->appendChild($typesNode);
            $operatorsNode->appendChild($operatorNode);
        }
        $filterElem->appendChild($operatorsNode);

        // Поля
        foreach ($this->fields as $field) {
            $filterElem->appendChild($this->doc->importNode($field->build(), true));
        }

        $this->doc->appendChild($filterElem);
        return $this->doc->documentElement;
    }

    private function translateFields(): void
    {
        foreach ($this->fields as $field) {
            $field->translate();
        }
    }
}
