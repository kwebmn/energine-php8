<?php
declare(strict_types=1);

/**
 * Language editor (редактор языков).
 * Совместимо с PHP 8.3. Безопасные обращения к полям/данным,
 * единственный язык по умолчанию, валидация lang_abbr.
 */
final class LanguageEditor extends Grid
{
    /**
     * @copydoc Grid::__construct
     */
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);
        $this->setTableName('share_languages');
        $this->setTitle($this->translate('TXT_LANGUAGE_EDITOR'));
    }

    /**
     * @copydoc Grid::createDataDescription
     *
     * Добавляем паттерн и сообщение об ошибке для lang_abbr: две маленькие латинские буквы.
     */
    protected function createDataDescription(): DataDescription
    {
        $dd = parent::createDataDescription();

        if ($this->getType() !== self::COMPONENT_TYPE_LIST) {
            if ($fd = $dd->getFieldDescriptionByName('lang_abbr')) {
                $fd->setProperty('pattern', '/^[a-z]{2}$/');
                $fd->setProperty('message', 'MSG_BAD_LANG_ABBR');
            }
        }

        return $dd;
    }

    /**
     * @copydoc Grid::add
     *
     * При создании нового языка не даём возможности сделать его дефолтным.
     */
    protected function add(): void
    {
        // фиксируем стейт для корректной подстановки конфигурации формы
        $this->getConfig()->setCurrentState('add');

        parent::add();

        if ($fd = $this->getDataDescription()->getFieldDescriptionByName('lang_default')) {
            $fd->setType(FieldDescription::FIELD_TYPE_HIDDEN);
        }

        // На всякий случай нормализуем значение по умолчанию в Data
        if ($f = $this->getData()->getFieldByName('lang_default')) {
            $f->setData('0', true); // single-value
        }
    }

    /**
     * @copydoc Grid::build
     *
     * В форме редактирования, если язык по умолчанию — чекбокс делаем read-only.
     */
    public function build() : DOMDocument
    {
        if ($this->getType() === self::COMPONENT_TYPE_FORM_ALTER) {
            $f = $this->getData()->getFieldByName('lang_default');
            if ($f && ($f->getRowData(0) === true || $f->getRowData(0) === '1' || $f->getRowData(0) === 1)) {
                if ($fd = $this->getDataDescription()->getFieldDescriptionByName('lang_default')) {
                    $fd->setMode(FieldDescription::FIELD_MODE_READ);
                }
            }
        }

        return parent::build();
    }

    /**
     * @copydoc Grid::loadData
     *
     * Нормализуем POST-данные для сохранения.
     */
    public function loadData(): array|false|null
    {
        $result = parent::loadData();

        // Если идёт сохранение — приводим abbr к lowercase
        if ($this->getState() === 'save' && is_array($result) && isset($result[0])) {
            if (array_key_exists('lang_abbr', $result[0]) && is_string($result[0]['lang_abbr'])) {
                $result[0]['lang_abbr'] = strtolower($result[0]['lang_abbr']);
            }
        }

        return $result;
    }

    /**
     * @copydoc Grid::deleteData
     *
     * Запрещаем удалять текущий язык интерфейса и язык по умолчанию.
     */
    public function deleteData(int|string $id): void
    {
        $currentLangId = (int)$this->document->getLang();
        $defaultLangId = (int)E()->getLanguage()->getDefault();

        if ($currentLangId === $id || $defaultLangId === $id) {
            throw new SystemException('ERR_CANT_DELETE', SystemException::ERR_CRITICAL);
        }

        parent::deleteData($id);
    }

    /**
     * @copydoc Grid::saveData
     *
     * Гарантируем единственный язык по умолчанию.
     * При добавлении — принудительно сбрасываем lang_default=0.
     * При отмеченном "по умолчанию" — снимаем признак у всех остальных в одной транзакции.
     */
    protected function saveData()
    {
        $table = $this->getTableName();
        $pk    = $this->getPK();

        // 1) Если это добавление — не даём сделать default
        if (
            isset($_POST[$table][$pk]) &&
            empty($_POST[$table][$pk])
        ) {
            $_POST[$table]['lang_default'] = '0';
        }

        // 2) Если это сохранение "по умолчанию", очистим признак у остальных
        $isDefaultRequested = isset($_POST[$table]['lang_default']) && $_POST[$table]['lang_default'] !== '0';

        if ($isDefaultRequested) {
            // ВНИМАНИЕ: Grid::save() уже открыл транзакцию — мы внутри неё.
            // Снимаем default со всех перед сохранением текущей записи.
            $this->dbh->modify(QAL::UPDATE, $table, ['lang_default' => null]);
        }

        // 3) Сохраняем саму запись
        $result = parent::saveData();

        // 4) Получаем итоговый ID языка
        $langID = is_int($result)
            ? $result
            : (int)($_POST[$table][$pk] ?? 0);

        // 5) Если это было добавление — создаём "тени" переводов во всех *_translation таблицах,
        //    копируя с default языка.
        if ($this->saver && $this->saver->getMode() === QAL::INSERT && $langID > 0) {
            $defaultLangID = (int)E()->getLanguage()->getDefault();

            // SHOW TABLES LIKE "%_translation"
            $translationTables = $this->dbh->selectRequest('SHOW TABLES LIKE "%_translation"');
            if ($translationTables) {
                foreach ($translationTables as $row) {
                    $tableName = current($row);
                    if (!is_string($tableName) || $tableName === '') {
                        continue;
                    }

                    // Столбцы таблицы
                    $cols = array_keys($this->dbh->getColumnsInfo($tableName));
                    if (empty($cols) || $cols[0] !== 'smap_id' && $cols[0] !== 'lang_id') {
                        // Формат таблицы не стандартный — пропустим безопасно
                        continue;
                    }

                    // Подменяем значение lang_id во второй колонке
                    // (обычно порядок: smap_id, lang_id, ... )
                    $colsForSelect = $cols;
                    // Нельзя просто заменить в массиве имена — используем селект со вставкой, подставив $langID
                    // Пример: INSERT INTO tbl SELECT smap_id, {langID}, col3, col4 FROM tbl WHERE lang_id = {default}
                    $selectParts = [];
                    foreach ($cols as $i => $colName) {
                        if ($colName === 'lang_id') {
                            $selectParts[] = (string)$langID;
                        } else {
                            $selectParts[] = $colName;
                        }
                    }

                    $sql = sprintf(
                        'INSERT INTO %1$s (%2$s) SELECT %3$s FROM %1$s WHERE lang_id = %4$d',
                        $tableName,
                        implode(',', $cols),
                        implode(',', $selectParts),
                        $defaultLangID
                    );
                    $this->dbh->select($sql);
                }
            }
        }

        return $langID;
    }
}
