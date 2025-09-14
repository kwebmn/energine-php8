<?php
/**
 * @file
 * DivisionSaver (без AdsManager и smap_content_xml)
 */

/**
 * Saver для редактора разделов (share_sitemap).
 */
class DivisionSaver extends ExtendedSaver
{
    /** Основная таблица разделов. */
    private const TABLE = 'share_sitemap';

    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Для корневой страницы убираем поле smap_segment (slug у корня не редактируется).
     *
     * @return bool
     */
    public function validate() : bool
    {
        $data = $this->getData();
        $dd   = $this->getDataDescription();

        if ($data && $dd) {
            $fdPid = $data->getFieldByName('smap_pid');
            if ($fdPid && !$fdPid->getRowData(0)) {
                $fdSegment = $dd->getFieldDescriptionByName('smap_segment');
                if ($fdSegment) {
                    $dd->removeFieldDescription($fdSegment);
                }
            }
        }

        return parent::validate();
    }

    /**
     * Сохраняет раздел, при изменении layout очищает layout-кэш и перезаписывает права.
     *
     * @return mixed
     * @throws SystemException
     */
    public function save() : mixed
    {
        $postedRow    = $_POST[self::TABLE] ?? [];
        $postedSmapId = isset($postedRow['smap_id']) ? (int)$postedRow['smap_id'] : null;
        $isInsert     = ($this->getMode() == QAL::INSERT);

        // Предыдущее состояние шаблонов (нужно только на UPDATE)
        $prev = null;
        if (!$isInsert && $postedSmapId) {
            $prevSel = $this->dbh->select(
                self::TABLE,
                ['smap_layout', 'smap_content'],
                ['smap_id' => $postedSmapId]
            );
            $prev = (is_array($prevSel) && isset($prevSel[0])) ? $prevSel[0] : null;
        }

        // Основное сохранение
        $result = parent::save();

        // Итоговый smap_id
        $smapID = $isInsert
            ? (is_numeric($result) ? (int)$result : null)
            : (($this->getData() && $this->getData()->getFieldByName('smap_id'))
                ? (int)$this->getData()->getFieldByName('smap_id')->getRowData(0)
                : $postedSmapId);

        // Если был UPDATE и layout изменился — очистим кэш layout_xml
        if (!$isInsert && $smapID && $prev) {
            $newLayout = ($this->getData() && $this->getData()->getFieldByName('smap_layout'))
                ? (string)$this->getData()->getFieldByName('smap_layout')->getRowData(0)
                : ($postedRow['smap_layout'] ?? null);

            if ($prev['smap_layout'] !== $newLayout) {
                $this->dbh->modify(
                    QAL::UPDATE,
                    self::TABLE,
                    ['smap_layout_xml' => ''],
                    ['smap_id' => $smapID]
                );
            }
        }

        // Права доступа
        $rights = $_POST['right_id'] ?? null;
        if ($smapID && is_array($rights)) {
            $this->dbh->modify(QAL::DELETE, 'share_access_level', null, ['smap_id' => $smapID]);

            foreach ($rights as $groupID => $rightID) {
                $groupID = (int)$groupID;
                $rightID = (int)$rightID;

                if (defined('ACCESS_NONE') && $rightID === ACCESS_NONE) {
                    continue;
                }

                $this->dbh->modify(
                    QAL::INSERT,
                    'share_access_level',
                    [
                        'smap_id'  => $smapID,
                        'right_id' => $rightID,
                        'group_id' => $groupID,
                    ]
                );
            }
        }

        return $result;
    }
}
