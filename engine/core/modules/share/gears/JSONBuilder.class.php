<?php
declare(strict_types=1);

/**
 * Формирует данные в формате JSON (для AJAX).
 */
class JSONBuilder extends AbstractBuilder
{
    /**
     * Пагинатор.
     */
    private ?Pager $pager = null;

    /**
     * Список ошибок (зарезервировано для совместимости).
     */
    private array $errors = [];

    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Собирает результирующий массив (meta + data) и сохраняет его во внутреннем свойстве.
     *
     * @return bool
     * @throws SystemException
     */
    public function build(): bool
    {
        if (!$this->dataDescription) {
            throw new SystemException('ERR_DEV_NO_DATA_DESCRIPTION', SystemException::ERR_DEVELOPER);
        }

        $out = [
            'meta' => [],
            'data' => [],
        ];

        // meta
        foreach ($this->dataDescription as $fieldName => $fieldInfo) {
            $out['meta'][$fieldName] = [
                'title'   => $fieldInfo->getPropertyValue('title'),
                'type'    => $fieldInfo->getType(),
                'key'     => (bool)$fieldInfo->getPropertyValue('key') &&
                    ((string)$fieldInfo->getPropertyValue('index') === 'PRI'),
                'visible' => true,
                'name'    => (string)($fieldInfo->getPropertyValue('tableName') ?? '') . '[' . $fieldName . ']',
                'rights'  => $fieldInfo->getRights(),
                'field'   => $fieldName,
                'sort'    => $fieldInfo->getPropertyValue('sort'),
            ];
        }

        // data

        if ($this->data instanceof Data && !$this->data->isEmpty()) {
            $rows = $this->data->getRowCount();

            for ($i = 0; $i < $rows; $i++) {
                foreach ($this->dataDescription as $fieldName => $fieldInfo) {
                    $value = '';
                    $type  = $fieldInfo->getType();

                    if ($f = $this->data->getFieldByName($fieldName)) {
                        $value = $f->getRowData($i);

                        switch ($type) {

                            case FieldDescription::FIELD_TYPE_DATETIME:
                            case FieldDescription::FIELD_TYPE_DATE:
                            case FieldDescription::FIELD_TYPE_TIME:
                                if (!empty($value)) {
                                    $value = self::enFormatDate(
                                        (string)$value,
                                        (string)$fieldInfo->getPropertyValue('outputFormat'),
                                        $type
                                    );
                                }
                                break;

                            case FieldDescription::FIELD_TYPE_SELECT:
                                $avail = $fieldInfo->getAvailableValues();
                                if (isset($avail[$value])) {
                                    $value = $avail[$value]['value'];
                                }
                                break;

                            case FieldDescription::FIELD_TYPE_MULTI:
                                if (is_array($value) && !empty($value)) {
                                    $labels = [];
                                    $avail  = $fieldInfo->getAvailableValues();
                                    foreach ($value as $val) {
                                        if (isset($avail[$val])) {
                                            $labels[] = $avail[$val]['value'];
                                        }
                                    }
                                    $value = implode(', ', $labels);
                                }
                                break;



                            default:
                                // как есть
                                break;
                        }

                        if ($value === null) {
                            $value = '';
                        }
                    }

                    $out['data'][$i][$fieldName] = $value;
                }
            }
        }

        $out['result'] = true;
        $out['mode']   = 'select';

        // сохраняем как "результат" билдера; для JSONBuilder это массив
        $this->result = $out;

        return true;
    }

    /**
     * Возвращает JSON-строку результата.
     */
    public function getResult(): string
    {
        $result = is_array($this->result) ? $this->result : [];

        if ($this->pager instanceof Pager) {
            $result['pager'] = [
                'current' => $this->pager->getCurrentPage(),
                'count'   => $this->pager->getNumPages(),
                'records' => $this->translate('TXT_TOTAL') . ': ' . $this->pager->getRecordsCount(),
            ];
        }

        return json_encode($result, JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP);
    }

    /**
     * Возвращает JSON со списком ошибок (для совместимости).
     */
    public function getErrors(): string
    {
        return json_encode($this->errors, JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP);
    }

    /**
     * Устанавливает пагинатор.
     */
    public function setPager(Pager $pager): void
    {
        $this->pager = $pager;
    }
}
