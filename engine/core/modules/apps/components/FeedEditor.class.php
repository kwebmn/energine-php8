<?php
declare(strict_types=1);

/**
 * Feed editor.
 * Creates editors that are controlled from control panel.
 */
class FeedEditor extends LinkingEditor
{
    /**
     * @copydoc LinkingEditor::createDataDescription
     * Для форм поле smap_id выводим как string (read-only).
     */
    protected function createDataDescription() : DataDescription
    {
        $result = parent::createDataDescription();

        if (in_array($this->getType(), [self::COMPONENT_TYPE_FORM_ADD, self::COMPONENT_TYPE_FORM_ALTER], true)) {
            $field = $result->getFieldDescriptionByName('smap_id');
            if ($field) {
                $field->setType(FieldDescription::FIELD_TYPE_STRING);
                $field->setMode(FieldDescription::FIELD_MODE_READ);
            }
        }

        return $result;
    }

    /**
     * @copydoc LinkingEditor::createData
     * Определяем данные для smap_id.
     */
    protected function createData() : Data
    {
        $result = parent::createData();

        if (in_array($this->getType(), [self::COMPONENT_TYPE_FORM_ADD, self::COMPONENT_TYPE_FORM_ALTER], true)) {
            $docId = $this->document->getID();
            $info  = E()->getMap()->getDocumentInfo($docId);
            $field = $result->getFieldByName('smap_id');

            if ($field) {
                $languages = E()->getLanguage()->getLanguages();
                $segment   = E()->getMap()->getURLByID($docId);
                $name      = $info['Name'] ?? '';

                $count = is_countable($languages) ? count($languages) : 0;
                for ($i = 0; $i < $count; $i++) {
                    $field->setRowProperty($i, 'segment', $segment);
                    $field->setRowData($i, $name);
                }
            }
        }

        return $result;
    }

    /**
     * @copydoc LinkingEditor::saveData
     * Выставляем smap_id в текущее значение документа.
     */
    protected function saveData() : mixed
    {
        $table = $this->getTableName();
        if (!isset($_POST[$table]) || !is_array($_POST[$table])) {
            $_POST[$table] = [];
        }
        $_POST[$table]['smap_id'] = $this->document->getID();

        return parent::saveData();
    }

    /**
     * @copydoc LinkingEditor::changeOrder
     */
    protected function changeOrder($direction) : void
    {
        if (!$this->getOrderColumn()) {
            // Если не задана колонка для пользовательской сортировки — на выход.
            throw new SystemException('ERR_NO_ORDER_COLUMN', SystemException::ERR_DEVELOPER);
        }

        $stateParams = $this->getStateParams();
        [$currentID] = $stateParams;

        // Текущий order_num
        $currentOrderNum = $this->dbh->getScalar(
            'SELECT ' . $this->getOrderColumn() .
            ' FROM ' . $this->getTableName() .
            ' WHERE ' . $this->getPK() . ' = %s',
            $currentID
        );

        $orderDirection = ($direction === Grid::DIR_DOWN) ? QAL::ASC : QAL::DESC;

        $baseFilter = $this->getFilter();
        if (!empty($baseFilter)) {
            $baseFilter = ' AND ' . str_replace(
                    'WHERE',
                    '',
                    $this->dbh->buildWhereCondition($this->getFilter())
                );
        } else {
            $baseFilter = ' AND smap_id = ' . (int) $this->document->getID() . ' ';
        }

        // Идентификатор соседней записи
        $request =
            'SELECT ' . $this->getPK() . ' as neighborID, ' .
            $this->getOrderColumn() . ' as neighborOrderNum ' .
            'FROM ' . $this->getTableName() . ' ' .
            'WHERE ' . $this->getOrderColumn() . ' ' . $direction . ' ' . $currentOrderNum . ' ' . $baseFilter .
            'ORDER BY ' . $this->getOrderColumn() . ' ' . $orderDirection . ' LIMIT 1';

        $data = convertDBResult($this->dbh->selectRequest($request), 'neighborID');

        if (!empty($data)) {
            $row = current($data);
            $neighborID       = $row['neighborID'] ?? null;
            $neighborOrderNum = $row['neighborOrderNum'] ?? null;

            if ($neighborID !== null && $neighborOrderNum !== null) {
                $this->dbh->beginTransaction();

                $this->dbh->modify(
                    QAL::UPDATE,
                    $this->getTableName(),
                    [$this->getOrderColumn() => $neighborOrderNum],
                    [$this->getPK() => $currentID]
                );

                $this->dbh->modify(
                    QAL::UPDATE,
                    $this->getTableName(),
                    [$this->getOrderColumn() => $currentOrderNum],
                    [$this->getPK() => $neighborID]
                );

                $this->dbh->commit();
            }
        }

        $b = new JSONCustomBuilder();
        $b->setProperties([
            'result' => true,
            'dir'    => $direction,
        ]);
        $this->setBuilder($b);
    }
}
