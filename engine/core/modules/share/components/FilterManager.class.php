<?php

declare(strict_types=1);

use Energine\Core\ExtraManager\ExtraManagerInterface;

class FilterManager extends DBWorker implements ExtraManagerInterface
{
    public const FILTER_TABLE_SUFFIX = '_filter';
    public const FILTER_DATA_TABLE_SUFFIX = '_filter_data';

    /** @var array<string,mixed> */
    private array $context = [];

    private bool $isActive = false;

    private ?string $currentTableName = null;

    private ?string $filterTableName = null;

    public function setContext(array $context): void
    {
        $this->context = $context;
    }

    public function supports(string $tableName, DataDescription $dataDescription): bool
    {
        if (($this->context['state'] ?? null) === 'filtersTree')
        {
            return false;
        }

        $this->currentTableName = $tableName;
        $this->filterTableName  = $tableName . self::FILTER_TABLE_SUFFIX;
        $this->isActive         = (bool)$this->dbh->tableExists($this->filterTableName);

        return $this->isActive;
    }

    public function addFieldDescription(DataDescription $dataDescription): void
    {
        if (!$this->isActive)
        {
            return;
        }

        $fd = $dataDescription->getFieldDescriptionByName('filtersTree');
        if (!$fd)
        {
            $fd = new FieldDescription('filtersTree');
            $dataDescription->addFieldDescription($fd);
        }

        $fd->setType(FieldDescription::FIELD_TYPE_TAB);
        $fd->setProperty('title', $this->translate('TAB_FILTERS'));
        $fd->setProperty('tableName', $this->filterTableName);
    }

    public function addField(Data $data, string $tableName, ?string $recordId = null): void
    {
        if (!$this->isActive)
        {
            return;
        }

        $field = $data->getFieldByName('filtersTree');
        if ($field === false)
        {
            $field = new Field('filtersTree');
            $data->addField($field);
        }

        $prefix = ($recordId !== null && $recordId !== '') ? $recordId . '/' : '';
        $field->setData($prefix . 'filtersTree/', true);
    }

    public function build(\DOMDocument $document): void
    {
        // Filters tree uses dedicated component when opened via tab URL.
    }

    private function translate(string $key): string
    {
        $translator = $this->context['translate'] ?? null;
        if (is_callable($translator))
        {
            try
            {
                /** @var callable $translator */
                return (string)$translator($key);
            }
            catch (\Throwable)
            {
                // fallback below
            }
        }

        return self::_translate($key);
    }
}
