<?php
declare(strict_types=1);

/**
 * Фильтры: редактор дерева (jsTree-совместимый JSON).
 * Совместим с PHP 8.3. Строгие типы, аккуратные сигнатуры и комментарии.
 */
final class FiltersTreeEditor extends Grid
{
    /**
     * @inheritDoc
     */
    protected function defineParams(): array
    {
        return array_merge(parent::defineParams(), [
            'linkedID'      => false,  // целевой объект (если задан — храним выбор по target_id, иначе по session_id)
            'pk'            => false,  // необязательный PK (оставлено для совместимости)
            'origTableName' => false,  // базовое имя таблицы предметной области
        ]);
    }

    /**
     * @inheritDoc
     */
    protected function main(): void
    {
        parent::main();
    }

    /**
     * Отдаёт узлы дерева в JSON для jsTree.
     *
     * Ожидает $_GET['id']:
     * - "#" или "0" → корень (filter_pid IS NULL)
     * - Иначе — дети указанного filter_id
     *
     * Формат узла: { id, text, children, state:{selected,checked,opened}, icon? }
     */
    public function getTreeNode(): void
    {
        // Значение по умолчанию (корневой «виртуальный» узел, если запросят '#')
        $data = [
            'id'       => '0',
            'text'     => $this->translate('TXT_FEATURES'),
            'children' => true,
            'state'    => [
                'selected' => false,
                'opened'   => true,
            ],
        ];

        try {
            $rawId = $_GET['id'] ?? '#';

            // Если не '#', строим список реальных узлов
            if ($rawId !== '#') {
                // Преобразуем "0" → null (корень), иначе int
                $parentId = ((string)$rawId === '0') ? null : (int)$rawId;

                // Целевой объект, если есть (иначе используем сессию)
                $targetId = (int)($this->getParam('linkedID') ?: 0);

                // Имя «основной» таблицы
                $base = (string)$this->getParam('origTableName');
                if ($base === '') {
                    throw new SystemException('ERR_DEV_BAD_DATA', SystemException::ERR_DEVELOPER);
                }

                // Служебные таблицы по соглашению FilterManager
                $tableTree   = $base . FilterManager::FILTER_TABLE_SUFFIX;                // ..._filters
                $tableData   = $base . FilterManager::FILTER_TABLE_SUFFIX . '_data';     // ..._filters_data
                $tableTrans  = $base . FilterManager::FILTER_TABLE_SUFFIX . '_translation';

                // SQL: список детей parentId с признаком children, выбранности и иконкой
                // ВНИМАНИЕ: parentId может быть NULL → IS NULL
                $wherePid = is_null($parentId) ? 'IS NULL' : '= ' . (int)$parentId;

                $rows = $this->dbh->selectRequest(
                    'SELECT
                        t1.filter_id,
                        t1.filter_pid,
                        st.filter_name,
                        td.target_id,
                        t2.filter_id AS children,
                        t1.filter_img
                     FROM ' . $tableTree . ' t1
                     INNER JOIN ' . $tableTrans . ' st USING(filter_id)
                     LEFT JOIN ' . $tableData . ' td
                        ON (t1.filter_id = td.filter_id AND ' . ($targetId
                        ? ('td.target_id = ' . $targetId)
                        : ('td.session_id = ' . $this->dbh->quote(session_id()))) . ')
                     LEFT JOIN ' . $tableTree . ' t2
                        ON (t1.filter_id = t2.filter_pid)
                     WHERE st.lang_id = %s
                       AND t1.filter_pid ' . $wherePid . '
                     GROUP BY t1.filter_id
                     ORDER BY t1.filter_order_num ASC',
                    E()->getLanguage()->getCurrent()
                );

                if (is_array($rows) && !empty($rows)) {
                    $data = [];
                    foreach ($rows as $row) {
                        $item = [
                            'id'       => (string)$row['filter_id'],
                            'text'     => (string)$row['filter_name'],
                            'state'    => [
                                'selected' => ($row['target_id'] !== null),
                                'checked'  => ($row['target_id'] !== null),
                                // корню детей не открываем по умолчанию
                                'opened'   => ($parentId === null) ? false : false,
                            ],
                            'children' => ($row['children'] !== null),
                        ];

                        if (!empty($row['filter_img'])) {
                            // мини-иконка (32x32, zc=2—кроп)
                            $item['icon'] = '/resizer/w32-h32/' . $row['filter_img'] . '?zc=2';
                        }

                        $data[] = $item;
                    }
                }
            }
        } catch (\Throwable $e) {
            // На проде — тихо отдаём пустой набор, чтобы не ломать UI;
            // при необходимости можно логировать.
            $data = [];
        }

        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    /**
     * @inheritDoc
     */
    protected function loadData(): array|false|null
    {
        $res = parent::loadData();

        // В режиме add — проставим filter_pid из параметров состояния
        if ($this->getState() === 'add' && is_array($res)) {
            $params = $this->getStateParams();
            if (is_array($params) && !empty($params)) {
                $filterPid = (int)($params[0] ?? 0);
                foreach ($res as $i => $row) {
                    $res[$i]['filter_pid'] = $filterPid ?: null;
                }
            }
        }

        return $res;
    }

    /**
     * @inheritDoc
     */
    protected function createDataDescription(): DataDescription
    {
        $dd = parent::createDataDescription();

        // Гарантируем наличие скрытого поля filter_pid
        $fd = $dd->getFieldDescriptionByName('filter_pid');
        if (!$fd) {
            $fd = new FieldDescription('filter_pid');
            $dd->addFieldDescription($fd);
        }
        $fd->setType(FieldDescription::FIELD_TYPE_HIDDEN);

        return $dd;
    }

    /**
     * Поменять порядок записи среди соседей (внутри одного filter_pid).
     *
     * @param string $direction Grid::DIR_UP | Grid::DIR_DOWN
     * @throws SystemException
     */
    protected function changeOrder(string $direction): void
    {
        $this->applyUserFilter();

        if (!$this->getOrderColumn()) {
            throw new SystemException('ERR_NO_ORDER_COLUMN', SystemException::ERR_DEVELOPER);
        }

        // Текущий ID
        [$currentID] = $this->getStateParams();
        $currentID = (int)$currentID;

        // Берём текущий order_num и pid
        $res = $this->dbh->selectRequest(
            'SELECT ' . $this->getOrderColumn() . ' AS ord, filter_pid
               FROM ' . $this->getTableName() . '
              WHERE ' . $this->getPK() . ' = %s',
            $currentID
        );

        if (!is_array($res) || empty($res)) {
            throw new SystemException('ERR_404', SystemException::ERR_404);
        }

        $currentOrderNum = (int)$res[0]['ord'];
        $filterPid       = $res[0]['filter_pid'];
        $pidWhere        = is_null($filterPid) ? 'filter_pid IS NULL' : ('filter_pid = ' . (int)$filterPid);

        // Направление поиска соседа
        $orderDirection = ($direction === Grid::DIR_DOWN) ? QAL::ASC : QAL::DESC;
        $cmpSign        = ($direction === Grid::DIR_DOWN) ? '>' : '<';

        // Базовый фильтр, если задан
        $baseFilter = $this->getFilter();
        $baseFilterSQL = '';
        if (!empty($baseFilter)) {
            // buildWhereCondition возвращает строку с WHERE ... → убираем WHERE
            $baseFilterSQL = ' AND ' . str_replace('WHERE', '', $this->dbh->buildWhereCondition($baseFilter));
        }

        // Находим соседа (строго следующий/предыдущий по порядку в том же pid)
        $sql = sprintf(
            'SELECT %1$s AS neighborID, %2$s AS neighborOrderNum
               FROM %3$s
              WHERE %4$s
                AND %2$s %5$s %6$d
                %7$s
           ORDER BY %2$s %8$s
              LIMIT 1',
            $this->getPK(),
            $this->getOrderColumn(),
            $this->getTableName(),
            $pidWhere,
            $cmpSign,
            $currentOrderNum,
            $baseFilterSQL,
            $orderDirection
        );

        $neighbor = convertDBResult($this->dbh->selectRequest($sql), 'neighborID');

        if ($neighbor) {
            $neighborID       = (int)current($neighbor)['neighborID'];
            $neighborOrderNum = (int)current($neighbor)['neighborOrderNum'];

            $this->dbh->beginTransaction();
            try {
                // Меняем местами порядковые номера
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
            } catch (\Throwable $e) {
                $this->dbh->rollback();
                throw $e;
            }
        }

        $b = new JSONCustomBuilder();
        $b->setProperties([
            'result' => true,
            'dir'    => $direction,
        ]);
        $this->setBuilder($b);
    }

    /**
     * Отметить пункт (привязать фильтр к target_id либо к session_id).
     * Возвращает JSON true.
     */
    public function checkItem(): void
    {
        $tableBase = (string)$this->getParam('origTableName');
        $tableData = $tableBase . FilterManager::FILTER_DATA_TABLE_SUFFIX;

        $filterId = (int)($_POST['id'] ?? 0);
        if ($filterId <= 0 || $tableBase === '') {
            $this->jsonOk(false);
        }

        $linkedId = (int)($this->getParam('linkedID') ?: 0);

        if ($linkedId) {
            // по target_id
            $this->dbh->modify(QAL::DELETE, $tableData, true, [
                'target_id' => $linkedId,
                'filter_id' => $filterId,
            ]);
            $this->dbh->modify(QAL::INSERT, $tableData, [
                'target_id' => $linkedId,
                'filter_id' => $filterId,
            ]);
        } else {
            // по session_id
            $sid = session_id();
            $this->dbh->modify(QAL::DELETE, $tableData, true, [
                'session_id' => $sid,
                'filter_id'  => $filterId,
            ]);
            $this->dbh->modify(QAL::INSERT, $tableData, [
                'session_id' => $sid,
                'filter_id'  => $filterId,
            ]);
        }

        $this->jsonOk(true);
    }

    /**
     * Снять отметку с пункта.
     * Возвращает JSON true.
     */
    public function unCheckItem(): void
    {
        $tableBase = (string)$this->getParam('origTableName');
        $tableData = $tableBase . FilterManager::FILTER_DATA_TABLE_SUFFIX;

        $filterId = (int)($_POST['id'] ?? 0);
        if ($filterId <= 0 || $tableBase === '') {
            $this->jsonOk(false);
        }

        $linkedId = (int)($this->getParam('linkedID') ?: 0);

        if ($linkedId) {
            $this->dbh->modify(QAL::DELETE, $tableData, true, [
                'target_id' => $linkedId,
                'filter_id' => $filterId,
            ]);
        } else {
            $this->dbh->modify(QAL::DELETE, $tableData, true, [
                'session_id' => session_id(),
                'filter_id'  => $filterId,
            ]);
        }

        $this->jsonOk(true);
    }

    /**
     * Быстрый JSON-ответ и завершение выполнения.
     */
    private function jsonOk(bool $ok): void
    {
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode($ok, JSON_UNESCAPED_UNICODE);
        exit;
    }
}
