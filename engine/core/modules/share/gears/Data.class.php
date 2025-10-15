<?php

declare(strict_types=1);

/**
 * Data — простая табличная структура (колонки = поля).
 * Поддерживает загрузку набора строк или набора колонок.
 * Совместима с legacy-функцией inverseDBResult(), если она определена.
 */
class Data extends BaseObject
{
    /** @var array<string, Field> Колонки по имени. */
    private array $fields = [];

    /** Кол-во колонок (кеш). */
    private int $length = 0;

    /** Кол-во строк (кеш). */
    private int $rows = 0;

    /**
     * Загрузка данных.
     * - Если есть inverseDBResult(), используем её (legacy-поведение).
     * - Иначе:
     *   * массив списков (list) трактуем как строки → конвертируем в колонки;
     *   * ассоциативный массив трактуем как колонки.
     */
    public function load(array $data): void
    {
        if ($data === [])
        {
            return;
        }

        if (function_exists('inverseDBResult'))
        {
            $data = inverseDBResult($data);
        }
        elseif (array_is_list($data))
        {
            $data = $this->rowsToColumns($data);
        }

        foreach ($data as $name => $values)
        {
            $field = $this->getFieldByName((string)$name);
            if ($field === false)
            {
                $field = new Field((string)$name);
                $this->addField($field);
            }
            $field->setData(is_array($values) ? array_values($values) : [$values]);
        }

        $this->ensureAligned();
    }

    /**
     * Добавить строку (значения передаются только для нужных полей).
     * Отсутствующие поля дополняются null.
     */
    public function addRow(array $rowData): void
    {
        foreach ($rowData as $name => $value)
        {
            $field = $this->getFieldByName((string)$name);
            if ($field !== false)
            {
                $field->addRowData($value);
            }
        }
        $this->ensureAligned();
    }

    /** Удалить строку по индексу во всех полях. */
    public function removeRow(int $rowIndex): void
    {
        foreach ($this->fields as $field)
        {
            $field->removeRowData($rowIndex);
        }
        $this->ensureAligned();
    }

    /**
     * Изменить значения в строке (для переданных полей).
     * Возвращает результат последнего изменения (как и в legacy).
     */
    public function changeRow(int $rowIndex, array $rowData): bool
    {
        $result = false;
        foreach ($rowData as $name => $value)
        {
            $field = $this->getFieldByName((string)$name);
            if ($field !== false)
            {
                $result = $field->setRowData($rowIndex, $value);
            }
        }
        return $result;
    }

    /** Добавить колонку. */
    public function addField(Field $field): void
    {
        $this->fields[$field->getName()] = $field;
        $this->length++;
        $this->ensureAligned();
    }

    /** Удалить колонку. */
    public function removeField(Field $field): void
    {
        $name = $field->getName();
        if (isset($this->fields[$name]))
        {
            unset($this->fields[$name]);
            $this->length--;
            $this->rows = $this->length > 0 ? $this->firstField()->getRowCount() : 0;
        }
    }

    /**
     * Получить колонку по имени.
     * @return Field|false
     */
    public function getFieldByName(string $name): Field|false
    {
        return $this->fields[$name] ?? false;
    }

    /** Все колонки. */
    public function getFields(): array
    {
        return $this->fields;
    }

    /** Кол-во колонок. */
    public function getLength(): int
    {
        return $this->length;
    }

    /** Есть ли колонки. */
    public function isEmpty(): bool
    {
        return $this->fields === [];
    }

    /** Кол-во строк (по первой колонке). */
    public function getRowCount(): int
    {
        if ($this->length > 0)
        {
            $this->rows = $this->firstField()->getRowCount();
        }
        else
        {
            $this->rows = 0;
        }
        return $this->rows;
    }

    /**
     * Экспорт в массив.
     * - $groupedByFields = true  → ['field' => [v1, v2, ...], ...]
     * - $groupedByFields = false → [ ['f1'=>..,'f2'=>..], ... ]
     */
    public function asArray(bool $groupedByFields = false): array
    {
        $columns = [];
        foreach ($this->fields as $name => $field)
        {
            $columns[$name] = $field->getData();
        }
        if ($groupedByFields)
        {
            return $columns;
        }

        $rows = $this->getRowCount();
        $names = array_keys($this->fields);
        $out = [];
        for ($i = 0; $i < $rows; $i++)
        {
            $row = [];
            foreach ($names as $n)
            {
                $row[$n] = $columns[$n][$i] ?? null;
            }
            $out[$i] = $row;
        }
        return $out;
    }

    /* ===== Внутреннее ===== */

    /** Выравнивает длину всех колонок и делает индексы плотными. */
    private function ensureAligned(): void
    {
        $max = 0;
        foreach ($this->fields as $f)
        {
            $max = max($max, $f->getRowCount());
        }
        foreach ($this->fields as $f)
        {
            $data = array_values($f->getData());
            if (count($data) < $max)
            {
                $data = array_pad($data, $max, null);
            }
            $f->setData($data);
        }
        $this->rows = $this->length > 0 ? $max : 0;
    }

    /** Конвертирует список строк в набор колонок. */
    private function rowsToColumns(array $rows): array
    {
        $names = [];
        foreach ($rows as $r)
        {
            if (is_array($r))
            {
                foreach ($r as $k => $_)
                {
                    $names[$k] = true;
                }
            }
        }
        $cols = [];
        foreach (array_keys($names) as $n)
        {
            $cols[$n] = [];
        }
        foreach ($rows as $r)
        {
            $r = (array)$r;
            foreach ($cols as $n => $_)
            {
                $cols[$n][] = $r[$n] ?? null;
            }
        }
        return $cols;
    }

    /** Первая колонка (когда колонок > 0). */
    private function firstField(): Field
    {
        /** @var Field $first */
        $first = reset($this->fields);
        return $first;
    }
}
