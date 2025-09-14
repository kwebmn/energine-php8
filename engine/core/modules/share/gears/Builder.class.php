<?php
declare(strict_types=1);

/**
 * Build XML-document.
 */
class Builder extends AbstractBuilder
{
    /** @var string Заголовок набора записей (для tabName по умолчанию) */
    protected string $title;

    public function __construct(string $title = '')
    {
        parent::__construct();
        $this->title = $title;
    }

    /**
     * @copydoc AbstractBuilder::run
     */
    protected function run(): void
    {
        /** @var DOMDocument $doc */
        $doc = $this->result;

        $dom_recordSet = $doc->createElement('recordset');
        if ($this->title !== '') {
            $dom_recordSet->setAttribute('title', $this->title);
        }
        $doc->appendChild($dom_recordSet);

        // Определяем пустоту/количество строк
        $hasData  = ($this->data instanceof Data) && !$this->data->isEmpty();
        $rowCount = $hasData ? (int)$this->data->getRowCount() : 0;

        if ($rowCount === 0) {
            // Сообщение об отсутствии данных на уровне recordset
            $dom_recordSet->setAttribute('empty', $this->translate('MSG_EMPTY_RECORDSET'));
        }
        $dom_recordSet->setAttribute('rows', (string)$rowCount);

        // BC: если пусто — всё равно строим один <record> как каркас
        $iterations = max(1, $rowCount);

        for ($i = 0; $i < $iterations; $i++) {
            $dom_record = $doc->createElement('record');

            // ВАЖНО для XSLT: при пустом наборе помечаем сам <record>
            if ($rowCount === 0 && $i === 0) {
                $dom_record->setAttribute('empty', $this->translate('MSG_EMPTY_RECORDSET'));
            }

            foreach ($this->dataDescription as $fieldName => $fieldInfo) {
                // tabName по умолчанию — через props, НЕ мутируем FieldDescription
                $fieldProps = [];
                if ($fieldInfo->getPropertyValue('tabName') === null && $this->title !== '') {
                    $fieldProps['tabName'] = $this->title;
                }

                $fieldValue = false;

                // MULTI/SELECT → собираем <options>
                if (in_array(
                    $fieldInfo->getType(),
                    [FieldDescription::FIELD_TYPE_MULTI, FieldDescription::FIELD_TYPE_SELECT],
                    true
                )) {
                    $f = $hasData ? $this->data->getFieldByName($fieldName) : null;
                    if ($f) {
                        $dataForOpts = ($fieldInfo->getType() == FieldDescription::FIELD_TYPE_SELECT)
                            ? [$f->getRowData($i)]
                            : $f->getRowData($i);
                    } else {
                        $dataForOpts = false;
                    }
                    $fieldValue = $this->createOptions($fieldInfo, $dataForOpts);
                }
                // Обычные поля: берём значение и props строки
                elseif ($hasData) {
                    $f = $this->data->getFieldByName($fieldName);
                    if ($f) {
                        // Мержим props из DataField, если есть
                        $rowProps = $f->getRowProperties($i);
                        if (is_array($rowProps) && $rowProps) {
                            $fieldProps = $fieldProps ? ($fieldProps + $rowProps) : $rowProps;
                        }
                        $fieldValue = $f->getRowData($i);
                    }
                }

                $dom_field = $this->createField(
                    $fieldName,
                    $fieldInfo,
                    $fieldValue,
                    $fieldProps ?: false
                );
                $dom_record->appendChild($dom_field);
            }

            $dom_recordSet->appendChild($dom_record);
        }
    }
}
