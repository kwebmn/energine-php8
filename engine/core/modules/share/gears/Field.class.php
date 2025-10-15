<?php

declare(strict_types=1);

/**
 * Колонка табличных данных.
 * Хранит значения по строкам и дополнительные свойства по строкам.
 */
class Field extends BaseObject implements \Iterator
{
    /** Имя поля (колонки). */
    private string $name;

    /** Значения строк этого поля. */
    private array $data = [];

    /**
     * Доп. свойства строк: [rowIndex => [propName => propValue]]
     * Используется для рендера/метаданных.
     */
    private array $properties = [];

    /** Права на поле (если не заданы — берутся из FieldDescription). */
    private ?int $rights = null;

    /** Текущий индекс для итератора. */
    private int $currentIndex = 0;

    public function __construct(string $name)
    {
        $this->name = $name;
    }

    /** Имя поля. */
    public function getName(): string
    {
        return $this->name;
    }

    /**
     * Задать данные колонки.
     * - $data может быть скаляром или массивом значений.
     * - $setForAll = true:
     *   * если уже есть строки — размножаем $data на текущую длину;
     *   * если строк нет и $data скаляр — заполняем по количеству языков (legacy-поведение).
     */
    public function setData(mixed $data, bool $setForAll = false): self
    {
        if ($setForAll && $this->getRowCount() > 0)
        {
            $data = array_fill(0, $this->getRowCount(), $data);
        }
        elseif ($setForAll && $this->getRowCount() === 0 && !is_array($data))
        {
            $rowData    = $data;
            $data       = [];
            $langsCount = count(E()->getLanguage()->getLanguages());
            for ($i = 0; $i < $langsCount; $i++)
            {
                $data[$i] = $rowData;
            }
        }
        elseif (!is_array($data))
        {
            $data = [$data];
        }

        // Делаем индексы плотными (0..N-1)
        $this->data = array_values($data);
        return $this;
    }

    /** Все значения колонки. */
    public function getData(): array
    {
        return $this->data;
    }

    /** Значение по индексу строки (или null). */
    public function getRowData(int $rowIndex): mixed
    {
        return $this->data[$rowIndex] ?? null;
    }

    /**
     * Удалить значение строки.
     * Индексы и свойства реиндексируются, чтобы не было «дыр».
     */
    public function removeRowData(int $rowIndex): void
    {
        if (isset($this->data[$rowIndex]))
        {
            unset($this->data[$rowIndex]);
            $this->data = array_values($this->data);
        }
        if (isset($this->properties[$rowIndex]))
        {
            unset($this->properties[$rowIndex]);
            $this->properties = array_values($this->properties);
        }
    }

    /**
     * Добавить значение строки.
     * $toEnd=false — вставить в начало.
     */
    public function addRowData(mixed $data, bool $toEnd = true): void
    {
        if ($toEnd)
        {
            $this->data[] = $data;
        }
        else
        {
            array_unshift($this->data, $data);
            // свойства не сдвигаем автоматически — это ответственность вызывающей стороны
        }
    }

    /**
     * Установить значение в строке.
     * Возвращает true (legacy-семантика метода — bool).
     */
    public function setRowData(int $rowIndex, mixed $newData): bool
    {
        $this->data[$rowIndex] = $newData;
        return true;
    }

    /** Задать права на поле. */
    public function setRights(int $rights): void
    {
        $this->rights = $rights;
    }

    /**
     * Получить права.
     * Может вернуть null, если явно не задано (наследуется извне).
     * Тип не указываем жёстко для совместимости со старым кодом.
     */
    public function getRights()
    {
        return $this->rights;
    }

    /** Количество строк. */
    public function getRowCount(): int
    {
        return count($this->data);
    }

    /** Задать доп. свойство для строки. */
    public function setRowProperty(int $index, string $propertyName, mixed $propertyValue): void
    {
        if (!isset($this->properties[$index]))
        {
            $this->properties[$index] = [];
        }
        $this->properties[$index][$propertyName] = $propertyValue;
    }

    /**
     * Получить доп. свойство строки.
     * Возвращает значение или false, если нет (BC-поведение).
     */
    public function getRowProperty(int $index, string $propertyName): mixed
    {
        return $this->properties[$index][$propertyName] ?? false;
    }

    /**
     * Все доп. свойства строки.
     * Возвращает массив или false, если нет (BC-поведение).
     */
    public function getRowProperties(int $index): mixed
    {
        return (!empty($this->properties[$index])) ? $this->properties[$index] : false;
    }

    /* ===== Реализация \Iterator ===== */

    public function rewind(): void
    {
        $this->currentIndex = 0;
    }

    public function current(): mixed
    {
        return $this->data[$this->currentIndex] ?? null;
    }

    public function key(): mixed
    {
        return $this->currentIndex;
    }

    public function next(): void
    {
        $this->currentIndex++;
    }

    public function valid(): bool
    {
        return $this->currentIndex < $this->getRowCount();
    }
}
