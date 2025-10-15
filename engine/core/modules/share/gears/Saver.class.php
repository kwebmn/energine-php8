<?php

declare(strict_types=1);

/**
 * Data saver into database.
 */
class Saver extends DBWorker
{
    /** @var string[] Список полей с ошибками (в человекочитаемом виде). */
    private array $errors = [];

    /** @var mixed Условие для UPDATE/UPSERT (как в QAL::select/modify). */
    private mixed $filter = null;

    /** @var string Режим сохранения (QAL::INSERT | QAL::UPDATE). */
    private string $mode = QAL::INSERT;

    /** @var DataDescription|null */
    protected ?DataDescription $dataDescription = null;

    /** @var Data|null */
    protected ?Data $data = null;

    /** @var mixed Результат сохранения (id/true/false). */
    private mixed $result = false;

    public function __construct()
    {
        parent::__construct();
    }

    // -------- Data / Description --------

    public function setDataDescription(DataDescription $dataDescription): void
    {
        $this->dataDescription = $dataDescription;
    }

    public function getDataDescription(): ?DataDescription
    {
        return $this->dataDescription;
    }

    public function setData(Data $data): void
    {
        $this->data = $data;
    }

    public function getData(): ?Data
    {
        return $this->data;
    }

    // -------- Mode / Filter --------

    public function setMode(string $mode): void
    {
        $this->mode = $mode;
    }

    public function getMode(): string
    {
        return $this->mode;
    }

    public function setFilter(mixed $filter): void
    {
        $this->filter = $filter;
    }

    public function getFilter(): mixed
    {
        return $this->filter;
    }

    // -------- Validation --------

    /**
     * Проверка данных перед сохранением.
     *
     * @throws SystemException
     */
    public function validate(): bool
    {
        $this->errors = [];

        if (!$this->getData() || !$this->getDataDescription())
        {
            throw new SystemException('ERR_DEV_BAD_DATA', SystemException::ERR_DEVELOPER);
        }

        $dd = $this->getDataDescription();
        $data = $this->getData();

        foreach ($dd as $fieldName => $fieldDescription)
        {
            $fieldData = $data->getFieldByName($fieldName);

            // Поля, которые не валидируем (bool/file/captcha/lang_id/custom/nullable)
            if (
                $fieldDescription->getType() == FieldDescription::FIELD_TYPE_BOOL ||
                $fieldDescription->getType() == FieldDescription::FIELD_TYPE_FILE ||
                $fieldDescription->getType() == FieldDescription::FIELD_TYPE_CAPTCHA ||
                $fieldName === 'lang_id' ||
                $fieldDescription->getPropertyValue('customField') !== null ||
                $fieldDescription->getPropertyValue('nullable')
            ) {
                continue;
            }

            // Нет данных для обязательного поля
            if ($fieldData === false && $fieldName !== 'lang_id')
            {
                $this->addError($fieldName);
                continue;
            }

            // Валидация значений по строкам
            if ($fieldData !== false)
            {
                for ($i = 0, $cnt = $fieldData->getRowCount(); $i < $cnt; $i++)
                {
                    if (!$fieldDescription->validate($fieldData->getRowData($i)))
                    {
                        $this->addError($fieldName);
                        break; // фиксируем первую ошибку по полю, идём дальше
                    }
                }
            }
        }

        return empty($this->errors);
    }

    public function getErrors(): array
    {
        return $this->errors;
    }

    public function addError(string $fieldName): void
    {
        $this->errors[] = $this->translate('FIELD_' . $fieldName);
    }

    // -------- Persist --------

    /**
     * Сохранение данных согласно DataDescription.
     *
     * @return mixed id при INSERT, true/PK при UPDATE; false при ошибке
     * @throws SystemException
     */
    public function save(): mixed
    {
        if (!$this->dataDescription || !$this->data)
        {
            throw new SystemException('ERR_DEV_BAD_DATA', SystemException::ERR_DEVELOPER);
        }
        if ($this->mode === QAL::UPDATE && empty($this->filter))
        {
            // Защита от массового апдейта без условия
            throw new SystemException('ERR_DEV_BAD_FILTER', SystemException::ERR_DEVELOPER);
        }

        $data = [];         // данные для основной и i18n-таблиц
        $m2mData = false;   // данные для M2M (false по исторической семантике)

        // Предзаполним структуру M2M, если есть мультиполя
        $m2mFDs = $this->dataDescription->getFieldDescriptionsByType(FieldDescription::FIELD_TYPE_MULTI);
        if (!empty($m2mFDs))
        {
            foreach ($m2mFDs as $fieldInfo)
            {
                if ($fieldInfo->getPropertyValue('customField') === null)
                {
                    // ключ формата ['table' => ..., 'pk' => ...] или аналогичный
                    [$m2mTableName, $m2mPKName] = array_values($fieldInfo->getPropertyValue('key'));
                    $m2mData[$m2mTableName]['pk'] = $m2mPKName;
                }
            }
        }

        $mainTableName = null;
        $pkName = null;

        // Разбор данных по строкам
        for ($i = 0, $rows = $this->data->getRowCount(); $i < $rows; $i++)
        {
            foreach ($this->dataDescription as $fieldName => $fieldInfo)
            {
                // исключаем поля без соответствия в БД
                if ($fieldInfo->getPropertyValue('customField') !== null)
                {
                    continue;
                }
                $field = $this->data->getFieldByName($fieldName);
                if (!$field)
                {
                    continue;
                }

                $fieldValue = $field->getRowData($i);

                // Очистка HTML-блоков
                if ($fieldInfo->getType() == FieldDescription::FIELD_TYPE_HTML_BLOCK)
                {
                    $fieldValue = DataSet::cleanupHTML($fieldValue);
                }

                // Немультиязычные, не-PK, не languageId
                if (
                    $fieldInfo->isMultilanguage() == false &&
                    $fieldInfo->getPropertyValue('key') !== true &&
                    $fieldInfo->getPropertyValue('languageID') == false
                ) {
                    switch ($fieldInfo->getType())
                    {
                        case FieldDescription::FIELD_TYPE_FLOAT:
                            if (is_string($fieldValue))
                            {
                                $fieldValue = str_replace(',', '.', $fieldValue);
                            }
                            break;

                        case FieldDescription::FIELD_TYPE_MULTI:
                            // MULTI — фиктивное поле: значения идут в M2M, а в основную таблицу пишем пустую строку
                            $m2mValues = is_array($fieldValue) ? $fieldValue : [];
                            $fieldValue = '';

                            // Определяем M2M: таблицу и её колонки
                            [$m2mTableName, $m2mPKName] = array_values($fieldInfo->getPropertyValue('key'));
                            $m2mInfo = $this->dbh->getColumnsInfo($m2mTableName);
                            unset($m2mInfo[$m2mPKName]); // убираем PK, остаётся внешняя колонка
                            foreach ($m2mValues as $val)
                            {
                                $m2mData[$m2mTableName]['pk'] = $m2mPKName;
                                $m2mData[$m2mTableName][key($m2mInfo)][] = $val;
                            }
                            unset($m2mValues, $m2mPKName, $m2mInfo, $m2mTableName);
                            break;
                    }

                    $data[$fieldInfo->getPropertyValue('tableName')][$fieldName] = $fieldValue;
                }
                // Мультиязычные или требующие languageID
                elseif ($fieldInfo->isMultilanguage() || $fieldInfo->getPropertyValue('languageID'))
                {
                    $langId = $this->data->getFieldByName('lang_id')->getRowData($i);
                    $data[$fieldInfo->getPropertyValue('tableName')][$langId][$fieldName] = $fieldValue;
                }
                // PK
                elseif ($fieldInfo->getPropertyValue('key') === true)
                {
                    $pkName = $fieldName;
                    $mainTableName = $fieldInfo->getPropertyValue('tableName');
                }
            }
        }

        // Контроль наличия главной таблицы/PK, если требуется
        if ($this->mode === QAL::INSERT && (empty($mainTableName) || empty($pkName)))
        {
            throw new SystemException('ERR_DEV_NO_PRIMARY_KEY', SystemException::ERR_DEVELOPER);
        }

        $result = null;

        // Попробуем транзакцию, если драйвер её поддерживает
        $txBegun = false;
        if (is_object($this->dbh) && method_exists($this->dbh, 'begin'))
        {
            $this->dbh->begin();
            $txBegun = true;
        }

        try
        {
            if ($this->mode === QAL::INSERT)
            {
                // INSERT в главную таблицу
                $data[$mainTableName] = $data[$mainTableName] ?? [];
                $id = $this->dbh->modify(QAL::INSERT, $mainTableName, $data[$mainTableName]);
                unset($data[$mainTableName]);

                // INSERT в i18n-таблицы (добавляем lang_id!)
                foreach ($data as $tableName => $langRow)
                {
                    foreach ($langRow as $langID => $row)
                    {
                        $row[$pkName]   = $id;
                        $row['lang_id'] = $langID;
                        $this->dbh->modify(QAL::INSERT, $tableName, $row);
                    }
                }
                $result = $id;
            }
            else
            {
                // UPDATE главной таблицы (если есть данные)
                if (isset($data[$mainTableName]))
                {
                    $this->dbh->modify(QAL::UPDATE, $mainTableName, $data[$mainTableName], $this->getFilter());
                    unset($data[$mainTableName]);
                }

                // i18n-таблицы: INSERT или UPDATE
                foreach ($data as $tableName => $langRow)
                {
                    foreach ($langRow as $langID => $row)
                    {
                        try
                        {
                            $this->dbh->modify(QAL::INSERT, $tableName, array_merge($row, $this->getFilter(), ['lang_id' => $langID]));
                        }
                        catch (Exception $e)
                        {
                            $this->dbh->modify(QAL::UPDATE, $tableName, $row, array_merge($this->getFilter(), ['lang_id' => $langID]));
                        }
                    }
                }

                if (!empty($pkName) && $this->data?->getFieldByName($pkName))
                {
                    $result = $this->data->getFieldByName($pkName)->getRowData(0);
                }
                else
                {
                    $result = true;
                }
            }

            // Обновление M2M связей
            if (is_array($m2mData) && is_numeric($result))
            {
                foreach ($m2mData as $tableName => $m2mInfo)
                {
                    $this->dbh->modify(QAL::DELETE, $tableName, null, [$m2mInfo['pk'] => $result]);
                }
                foreach ($m2mData as $tableName => $m2mInfo)
                {
                    $pk = $m2mInfo['pk'];
                    unset($m2mInfo['pk']);
                    if ($m2mInfo)
                    {
                        $fkName = key($m2mInfo);
                        foreach (current($m2mInfo) as $fieldValue)
                        {
                            $this->dbh->modify(QAL::INSERT_IGNORE, $tableName, [$fkName => $fieldValue, $pk => $result]);
                        }
                    }
                }
            }

            if ($txBegun && method_exists($this->dbh, 'commit'))
            {
                $this->dbh->commit();
            }
        }
        catch (\Throwable $e)
        {
            if ($txBegun && method_exists($this->dbh, 'rollback'))
            {
                $this->dbh->rollback();
            }
            throw $e;
        }

        return ($this->result = $result);
    }

    public function getResult(): mixed
    {
        return $this->result;
    }
}
