<?php
declare(strict_types=1);

/**
 * Описание набора полей (метаданные).
 * Хранит коллекцию FieldDescription и позволяет загружать их из БД или XML.
 */
class DataDescription extends BaseObject implements \Iterator
{
    /** Добавить поле после указанного. */
    public const FIELD_POSITION_AFTER  = 'after';
    /** (Зарезервировано) Добавить поле перед указанным. */
    public const FIELD_POSITION_BEFORE = 'before';

    /** @var array<string, FieldDescription> Коллекция описаний по имени поля. */
    private array $fieldDescriptions = [];

    /** Текущий индекс итератора. */
    private int $currentIndex = 0;

    /** Кэш имён полей для итератора (обновляется в rewind). */
    private array $iterKeys = [];

    /* ========= Загрузка ========= */

    /**
     * Загрузить описания колонок из массива (как из DBA::getColumnsInfo()).
     * Формат: ['fieldName' => ['type'=>..,'length'=>..,'mode'=>.., ...], ...]
     */
    public function load(array $columnsInfo): void
    {
        foreach ($columnsInfo as $columnName => $columnInfo) {
            $fd = new FieldDescription((string)$columnName);
            $fd->loadArray((array)$columnInfo);
            $this->addFieldDescription($fd);
        }
    }

    /**
     * Загрузить описания из XML:
     * <data>
     *   <field name="..." type="..." ... />
     * </data>
     */
    public function loadXML(\SimpleXMLElement $xmlDescr): void
    {
        if (empty($xmlDescr)) {
            return;
        }
        foreach ($xmlDescr->field as $fieldXml) {
            $fd = new FieldDescription();
            $fd->loadXML($fieldXml);
            $this->addFieldDescription($fd);
        }
    }

    /* ========= Мутации ========= */

    /**
     * Добавить описание поля.
     * $location='after' + $targetFDName — вставка после указанного поля (через array_push_after()).
     * По умолчанию — добавить в конец (по ключу).
     */
    public function addFieldDescription(
        FieldDescription $fieldDescription,
        string $location = 'bottom',
        ?string $targetFDName = null
    ): void {
        $name = $fieldDescription->getName();

        if (
            $location === self::FIELD_POSITION_AFTER
            && $targetFDName !== null
            && array_key_exists($targetFDName, $this->fieldDescriptions)
        ) {
            // ожидается глобальный helper array_push_after(array $arr, array $insert, string $afterKey): array
            $this->fieldDescriptions = array_push_after(
                $this->fieldDescriptions,
                [$name => $fieldDescription],
                $targetFDName
            );
        } else {
            $this->fieldDescriptions[$name] = $fieldDescription;
        }
    }

    /** Удалить описание поля. */
    public function removeFieldDescription(FieldDescription $fieldDescription): void
    {
        unset($this->fieldDescriptions[$fieldDescription->getName()]);
    }

    /* ========= Доступ ========= */

    /**
     * Получить описание по имени (BC: возвращает FieldDescription|false).
     * Для нового кода удобнее hasField()/getFieldOrNull().
     *
     * @return FieldDescription|false
     */
    public function getFieldDescriptionByName(string $name): FieldDescription|false
    {
        return $this->fieldDescriptions[$name] ?? false;
    }

    /**
     * Удобный проверяющий геттер (новый метод; совместим со старым кодом).
     */
    public function hasField(string $name): bool
    {
        return isset($this->fieldDescriptions[$name]);
    }

    /**
     * Удобный null-геттер (новый метод; совместим со старым кодом).
     */
    public function getFieldOrNull(string $name): ?FieldDescription
    {
        return $this->fieldDescriptions[$name] ?? null;
    }

    /**
     * Вернуть описания по типу/типам (принимает строку или массив строк).
     * @param string|array $types
     * @return array<string, FieldDescription>
     */
    public function getFieldDescriptionsByType(string|array $types): array
    {
        $types = is_array($types) ? $types : [$types];
        $out = [];
        foreach ($this->fieldDescriptions as $name => $fd) {
            if (in_array($fd->getType(), $types, true)) {
                $out[$name] = $fd;
            }
        }
        return $out;
    }

    /** Список имён полей. */
    public function getFieldDescriptionList(): array
    {
        return array_keys($this->fieldDescriptions);
    }

    /** Пусто ли описание. */
    public function isEmpty(): bool
    {
        return $this->fieldDescriptions === [];
    }

    /**
     * Пересечь текущее описание с другим (обычно: конфиг ∩ БД).
     * - Если текущее пустое — вернуть другое.
     * - Иначе для каждого нашего поля:
     *   * если в другом есть описание — пересечь через FieldDescription::intersect(...)
     *   * иначе пометить поле как customField (не сохранять в БД)
     */
    public function intersect(DataDescription $otherDataDescr): DataDescription
    {
        if ($this->isEmpty()) {
            return $otherDataDescr;
        }

        foreach ($this->fieldDescriptions as $name => $fd) {
            $other = $otherDataDescr->getFieldDescriptionByName($name);
            if ($other instanceof FieldDescription) {
                $this->fieldDescriptions[$name] = FieldDescription::intersect($fd, $other);
            } else {
                $this->fieldDescriptions[$name]->setProperty('customField', 'customField');
            }
        }
        return $this;
    }

    /* ========= \Iterator ========= */

    public function rewind(): void
    {
        $this->iterKeys = array_keys($this->fieldDescriptions);
        $this->currentIndex = 0;
    }

    public function current(): mixed
    {
        $key = $this->iterKeys[$this->currentIndex] ?? null;
        return ($key !== null) ? $this->fieldDescriptions[$key] : null;
    }

    public function key(): mixed
    {
        return $this->iterKeys[$this->currentIndex] ?? null;
    }

    public function next(): void
    {
        $this->currentIndex++;
    }

    public function valid(): bool
    {
        return isset($this->iterKeys[$this->currentIndex]);
    }
}
