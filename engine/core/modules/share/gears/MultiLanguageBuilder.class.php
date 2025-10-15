<?php

declare(strict_types=1);

/**
 * Builder for multilingual components.
 */
class MultiLanguageBuilder extends AbstractBuilder
{
    // Можно и убрать — оставил для совместимости с исходником.
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * @copydoc AbstractBuilder::run
     */
    protected function run(): void
    {
        $langService = E()->getLanguage();
        $languagesMap = $langService->getLanguages();

        $domRecordset = $this->result->createElement('recordset');
        $this->result->appendChild($domRecordset);

        $records     = []; // [$pk => DOMElement[]]
        $correlation = []; // [$rowIndex => $pk]

        // Есть данные (режим списка / редактирования)
        if ($this->data && !$this->data->isEmpty())
        {
            foreach ($this->dataDescription as $fieldName => $fieldInfo)
            {
                /** @var Field|false $fieldData */
                $fieldData = $this->data->getFieldByName($fieldName);

                // 1) Первичный ключ
                if ($fieldInfo->getPropertyValue('key') === true)
                {
                    if (!$fieldData instanceof Field)
                    {
                        // Без PK дальше собрать запись невозможно
                        continue;
                    }
                    $fieldInfo->setProperty('tabName', $this->translate('TXT_PROPERTIES'));

                    for ($i = 0, $n = $fieldData->getRowCount(); $i < $n; $i++)
                    {
                        $rowData = $fieldData->getRowData($i);
                        $index   = ($rowData === null) ? 0 : $rowData;

                        $correlation[$i] = $index;

                        if (!isset($records[$index]))
                        {
                            $records[$index] = [];
                        }

                        $records[$index][] = $this->createField(
                            $fieldName,
                            $fieldInfo,
                            $rowData,
                            $fieldData->getRowProperties($i)
                        );
                    }
                    continue;
                }

                // 2) Мультиязычное поле
                if ($fieldInfo->isMultilanguage())
                {
                    if (!$fieldData instanceof Field)
                    {
                        continue;
                    }

                    /** @var Field|false $langField */
                    $langField = $this->data->getFieldByName('lang_id');
                    if (!$langField instanceof Field)
                    {
                        continue;
                    }

                    foreach ($fieldData->getData() as $rowIndex => $value)
                    {
                        if (!array_key_exists($rowIndex, $correlation))
                        {
                            // Нет привязки к PK — пропускаем (PK должен идти первым)
                            continue;
                        }

                        $langID = $langField->getRowData($rowIndex);

                        $fieldInfo->setProperty('language', $langID);
                        $fieldInfo->setProperty('languageOrder', (int)($languagesMap[$langID]['lang_order_num'] ?? 0));
                        $fieldInfo->setProperty('languageAbbr', $langService->getAbbrByID($langID));
                        $langName = $langService->getNameByID($langID);
                        if (is_string($langName) && $langName !== '')
                        {
                            if (function_exists('mb_strtoupper') && function_exists('mb_convert_case') && function_exists('mb_strtolower'))
                            {
                                $upper = mb_strtoupper($langName, 'UTF-8');
                                if ($upper === $langName)
                                {
                                    $langName = mb_convert_case(mb_strtolower($langName, 'UTF-8'), MB_CASE_TITLE, 'UTF-8');
                                }
                            }
                            else
                            {
                                $upper = strtoupper($langName);
                                if ($upper === $langName)
                                {
                                    $langName = ucwords(strtolower($langName));
                                }
                            }
                        }

                        $fieldInfo->setProperty('tabName', $langName);

                        $records[$correlation[$rowIndex]][] = $this->createField(
                            $fieldName,
                            $fieldInfo,
                            $value,
                            $fieldData->getRowProperties($rowIndex)
                        );
                    }
                    continue;
                }

                // 3) Прочие (не languageID) поля
                if ($fieldInfo->getPropertyValue('languageID'))
                {
                    continue;
                }

                // array_flip вернёт [$pk => $rowIndex]
                $mapPkToRow = array_flip($correlation);

                $i = 0;
                foreach ($mapPkToRow as $pk => $rowIndex)
                {
                    $fieldValue    = false;
                    $dataProperties = ($fieldData instanceof Field)
                        ? $fieldData->getRowProperties($rowIndex)
                        : false;

                    // SELECT / MULTI → собираем options
                    if (in_array(
                        $fieldInfo->getType(),
                        [FieldDescription::FIELD_TYPE_MULTI, FieldDescription::FIELD_TYPE_SELECT],
                        true
                    ))
                    {
                        if ($this->data && $fieldData instanceof Field)
                        {
                            if ($fieldInfo->getType() === FieldDescription::FIELD_TYPE_SELECT)
                            {
                                $optData = [$fieldData->getRowData($i)];
                            }
                            else
                            {
                                $optData = $fieldData->getRowData($i);
                            }
                        }
                        else
                        {
                            $optData = false;
                        }
                        $fieldValue = $this->createOptions($fieldInfo, $optData);
                    }
                    // Обычное поле → берём значение из строки
                    elseif ($this->data && $fieldData instanceof Field)
                    {
                        $fieldValue = $fieldData->getRowData($rowIndex);
                    }

                    if ($fieldInfo->getPropertyValue('tabName') === null)
                    {
                        $fieldInfo->setProperty('tabName', $this->translate('TXT_PROPERTIES'));
                    }
                    else
                    {
                        // Явно фиксируем значение, если было в конфиге
                        $fieldInfo->setProperty('tabName', $fieldInfo->getPropertyValue('tabName'));
                    }

                    $records[$pk][] = $this->createField(
                        $fieldName,
                        $fieldInfo,
                        $fieldValue,
                        $dataProperties
                    );
                    $i++;
                }
            }

            // Сбор DOM
            foreach ($records as $fields)
            {
                $domRecord = $this->result->createElement('record');
                foreach ($fields as $fieldNode)
                {
                    $domRecord->appendChild($fieldNode);
                }
                $domRecordset->appendChild($domRecord);
            }

            return;
        }

        // Нет данных (режим вставки)
        $domRecord = $this->result->createElement('record');

        foreach ($this->dataDescription as $fieldName => $fieldInfo)
        {
            if ($fieldInfo->isMultilanguage())
            {
                foreach (array_keys($langService->getLanguages()) as $langID)
                {
                    $fieldInfo->setProperty('language', $langID);
                    $fieldInfo->setProperty('tabName', $langService->getNameByID($langID));
                    $domRecord->appendChild($this->createField($fieldName, $fieldInfo, ''));
                }
                continue;
            }

            if ($fieldInfo->getPropertyValue('languageID'))
            {
                continue;
            }

            if (in_array(
                $fieldInfo->getType(),
                [FieldDescription::FIELD_TYPE_MULTI, FieldDescription::FIELD_TYPE_SELECT],
                true
            ))
            {
                $fieldValue = $this->createOptions($fieldInfo);
            }
            else
            {
                $fieldValue = false;
            }

            if ($fieldInfo->getPropertyValue('tabName') === null)
            {
                $fieldInfo->setProperty('tabName', $this->translate('TXT_PROPERTIES'));
            }
            else
            {
                $fieldInfo->setProperty('tabName', $fieldInfo->getPropertyValue('tabName'));
            }

            $domRecord->appendChild($this->createField($fieldName, $fieldInfo, $fieldValue));
        }

        $domRecordset->setAttribute('empty', $this->translate('MSG_EMPTY_RECORDSET'));
        $domRecordset->appendChild($domRecord);
    }
}
