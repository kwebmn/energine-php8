<?php

declare(strict_types=1);

/**
 * Extended Saver.
 *
 * Расширяет Saver:
 *  - определяет имя главной таблицы и её PK из DataDescription;
 *  - после сохранения синхронизирует теги (TagManager);
 *  - «прикрепляет» загруженные файлы и фильтр-данные по текущей сессии к созданной/обновлённой записи.
 */
class ExtendedSaver extends Saver
{
    /** @var string|null Имя PK колонки главной таблицы. */
    private ?string $pk = null;

    /** @var string|null Имя главной таблицы. */
    private ?string $mainTableName = null;

    /**
     * Устанавливает DataDescription и извлекает главную таблицу и её PK.
     */
    public function setDataDescription(DataDescription $dd): void
    {
        parent::setDataDescription($dd);

        foreach ($dd as $fieldName => $fieldInfo)
        {
            if ($fieldInfo->getPropertyValue('key') === true)
            {
                $this->pk            = (string)$fieldName;
                $this->mainTableName = (string)$fieldInfo->getPropertyValue('tableName');
                break;
            }
        }
    }

    /**
     * Имя главной таблицы.
     *
     * @throws SystemException Если имя таблицы не определено.
     */
    protected function getTableName(): string
    {
        if (!$this->mainTableName)
        {
            throw new SystemException('ERR_DEV_NO_TABLE_NAME', SystemException::ERR_DEVELOPER);
        }
        return $this->mainTableName;
    }

    /**
     * Имя PK.
     *
     * @throws SystemException Если PK не определён.
     */
    protected function getPK(): string
    {
        if (!$this->pk)
        {
            throw new SystemException('ERR_DEV_NO_PRIMARY_KEY', SystemException::ERR_DEVELOPER);
        }
        return $this->pk;
    }

    /**
     * Сохранение + постобработка (теги, _uploads, _filter_data).
     *
     * @return mixed id при INSERT, true/PK при UPDATE; false при ошибке
     * @throws SystemException
     */
    public function save(): mixed
    {
        $result = parent::save();

        // Определим ID сущности
        $pkName = $this->getPK();
        $table  = $this->getTableName();

        $entityID = ($this->getMode() === QAL::INSERT)
            ? (int)$result
            : (int)($this->getData()?->getFieldByName($pkName)?->getRowData(0) ?? 0);

        // Сохранение тегов (если доступны DD и Data)
        $dd = $this->getDataDescription();
        $data = $this->getData();
        if ($entityID && $dd && $data)
        {
            $tm = new TagManager($dd, $data, $table);
            $tm->save($entityID);
        }

        // --- Привязка загруженных файлов из *_uploads (pk = NULL -> pk = entityID) по session_id
        if ($result && $this->dbh->tableExists($table . AttachmentManager::ATTACH_TABLE_SUFFIX))
        {
            // Совместимость: если parent::save() вернул не int, возьмём $entityID или POST-фоллбек
            $id = is_int($result)
                ? $result
                : ($entityID ?: (int)($_POST[$table][$pkName] ?? 0));

            if ($id)
            {
                $this->dbh->modify(
                    QAL::UPDATE,
                    $table . AttachmentManager::ATTACH_TABLE_SUFFIX,
                    [$pkName => $id],
                    [$pkName => null, 'session_id' => session_id()]
                );
            }
        }

        // --- Привязка записей из *_filter_data (target_id = NULL -> target_id = entityID) по session_id
        if ($result && $this->dbh->tableExists($table . FilterManager::FILTER_DATA_TABLE_SUFFIX))
        {
            $id = is_int($result)
                ? $result
                : ($entityID ?: (int)($_POST[$table][$pkName] ?? 0));

            if ($id)
            {
                $this->dbh->modify(
                    QAL::UPDATE,
                    $table . FilterManager::FILTER_DATA_TABLE_SUFFIX,
                    ['target_id' => $id],
                    ['target_id' => null, 'session_id' => session_id()]
                );
            }
        }

        return $result;
    }
}
