<?php
declare(strict_types=1);

/**
 * JSONRepoBuilder — билдер JSON-ответа для файлового репозитория.
 * Совместимо с PHP 8.3. Добавлены строгие типы, аккуратная работа с null.
 */
#[\AllowDynamicProperties]
final class JSONRepoBuilder extends JSONBuilder
{
    /**
     * Хлебные крошки: id => title.
     * @var array<int|string,string>
     */
    private array $breadcrumbs = [];

    /**
     * Сборка результата.
     *
     * Формирует структуру:
     * [
     *   'meta'  => [fieldName => {...}],
     *   'data'  => [[field => value, ...], ...],
     *   'breadcrumbs' => [...],
     *   'result' => true,
     *   'mode'   => 'select'
     * ]
     *
     * @throws SystemException 'ERR_DEV_NO_DATA_DESCRIPTION'
     */
    public function build(): bool
    {
        if ($this->dataDescription === false) {
            throw new SystemException('ERR_DEV_NO_DATA_DESCRIPTION', SystemException::ERR_DEVELOPER);
        }

        $out = [
            'meta'         => [],
            'data'         => [],
            'breadcrumbs'  => $this->breadcrumbs,
            'result'       => true,
            'mode'         => 'select',
        ];

        // ------- META -------
        foreach ($this->dataDescription as $fieldName => $fieldInfo) {
            /** @var FieldDescription $fieldInfo */
            $table = (string)$fieldInfo->getPropertyValue('tableName');
            $isKey = (bool)$fieldInfo->getPropertyValue('key') && ((string)$fieldInfo->getPropertyValue('index') === 'PRI');

            $out['meta'][$fieldName] = [
                'title'   => $fieldInfo->getPropertyValue('title'),
                'type'    => $fieldInfo->getType(),
                'key'     => $isKey,
                // Исторически visible всегда true (первичный ключ тоже показываем).
                'visible' => true,
                'name'    => ($table !== '' ? $table : '') . '[' . $fieldName . ']',
                'rights'  => $fieldInfo->getRights(),
                'field'   => $fieldName,
                'sort'    => $fieldInfo->getPropertyValue('sort'),
            ];
        }

        // ------- DATA -------
        if ($this->data instanceof Data && !$this->data->isEmpty()) {
            $rows = $this->data->getRowCount();

            for ($i = 0; $i < $rows; $i++) {
                foreach ($this->dataDescription as $fieldName => $fieldInfo) {
                    /** @var FieldDescription $fieldInfo */
                    $value = null;

                    if ($field = $this->data->getFieldByName($fieldName)) {
                        $value = $field->getRowData($i);
                        if ($value === null) {
                            $value = '';
                        }

                        // Спец-формат для даты публикации
                        if ($fieldName === 'upl_publication_date' && $value !== '') {
                            $value = self::enFormatDate(
                                (string)$value,
                                (string)$fieldInfo->getPropertyValue('outputFormat'),
                                FieldDescription::FIELD_TYPE_DATETIME
                            );
                        }
                    }

                    $out['data'][$i][$fieldName] = $value;
                }
            }
        }

        $this->result = $out;
        return true;
    }

    /**
     * Установить хлебные крошки репозитория.
     *
     * @param array<int|string,string> $repoBreadCrumbs
     */
    public function setBreadcrumbs(array $repoBreadCrumbs): void
    {
        $this->breadcrumbs = $repoBreadCrumbs;
    }
}
