<?php

declare(strict_types=1);

/**
 * ExtendedFeed
 *
 * Расширенный список.
 */
class ExtendedFeed extends Feed
{
    /**
     * @copydoc Feed::defineParams
     */
    #[\Override]
    protected function defineParams(): array
    {
        // Опция inline-редактирования по умолчанию включена
        return array_merge(
            parent::defineParams(),
            [
                'editable' => true,
            ]
        );
    }

    /**
     * @copydoc DBDataSet::createDataDescription
     */
    #[\Override]
    protected function createDataDescription(): DataDescription
    {
        $res = DBDataSet::createDataDescription();

        if (!$res->getFieldDescriptionByName('smap_id'))
        {
            $f = new FieldDescription('smap_id');
            $f->setType(FieldDescription::FIELD_TYPE_INT)
                ->setProperty('tableName', $this->getTableName());
            $res->addFieldDescription($f);
        }

        if (!$res->getFieldDescriptionByName('category'))
        {
            $f = new FieldDescription('category');
            $f->setType(FieldDescription::FIELD_TYPE_STRING);
            $res->addFieldDescription($f);
        }

        return $res;
    }

    /**
     * @copydoc Feed::loadDataDescription
     */
    #[\Override]
    protected function loadDataDescription(): array|false|null
    {
        $res = parent::loadDataDescription();
        if (isset($res['smap_id']))
        {
            $res['smap_id']['key'] = false;
        }
        return $res;
    }

    /**
     * @copydoc Feed::createData
     */
    #[\Override]
    protected function createData(): Data
    {
        $res = parent::createData();

        // Убедимся, что поле category существует, если есть данные
        $categoryField = $res->getFieldByName('category');
        if (!$res->isEmpty() && !$categoryField)
        {
            $categoryField = new Field('category');
            $res->addField($categoryField);
        }

        // Заполним category из карты сайта, если присутствует smap_id
        if ($f = $res->getFieldByName('smap_id'))
        {
            // На случай, если данных не было, но smap_id есть — добавим поле
            if (!$categoryField)
            {
                $categoryField = new Field('category');
                $res->addField($categoryField);
            }

            $map = E()->getMap();
            foreach ($f as $i => $row)
            {
                $catInfo = $map->getDocumentInfo($row);
                $categoryField->setRowData($i, $catInfo['Name'] ?? null);
                $categoryField->setRowProperty($i, 'url', $map->getURLByID($row));
            }
        }

        return $res;
    }

    /**
     * @copydoc Feed::main
     */
    #[\Override]
    protected function main(): void
    {
        parent::main();

        $m = new AttachmentManager(
            $this->getDataDescription(),
            $this->getData(),
            $this->getTableName()
        );
        $m->createFieldDescription();
        $m->createField($this->getPK(), true);

        $m = new TagManager(
            $this->getDataDescription(),
            $this->getData(),
            $this->getTableName()
        );
        $m->createFieldDescription();
        $m->createField();
    }

    /**
     * @copydoc Feed::view
     */
    #[\Override]
    protected function view(): void
    {
        $this->addFilterCondition(['smap_id' => $this->document->getID()]);

        // Важно: вызываем базовую реализацию DBDataSet, как в исходнике
        DBDataSet::view();

        $this->addTranslation('BTN_RETURN_LIST');

        $am = new AttachmentManager(
            $this->getDataDescription(),
            $this->getData(),
            $this->getTableName(),
            true
        );
        $am->createFieldDescription();
        $am->createField();
    }
}
