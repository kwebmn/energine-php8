<?php

declare(strict_types=1);

/**
 * @file
 * TextBlock — простой текстовый блок (PHP 8.3-ready).
 *
 * Отдаёт HTML-содержимое по номеру блока (tb_num) и текущему документу (smap_id).
 * Поддерживает «глобальные» блоки (smap_id IS NULL), режим редактирования и WYSIWYG.
 *
 * Параметры:
 *  - num  : номер блока (int|string). Если 0 — блок считается глобальным.
 *  - text : дефолтное содержимое, если записи в БД ещё нет.
 *
 * Свойства:
 *  - editable : пометка для шаблонов/клиента, что блок редактируемый.
 *  - global   : пометка для глобальных блоков (smap_id IS NULL).
 */
final class TextBlock extends DataSet implements SampleTextBlock
{
    /** Имя основной таблицы. */
    private string $tableName = 'share_textblocks';

    /** ID блока (tb_id) или null, если запись не найдена. */
    private ?int $id = null;

    /** HTML-содержимое блока. */
    private string $content = '';

    /** Флаг редактируемости (зависит от документа). */
    private bool $isEditable;

    /**
     * @copydoc DataSet::__construct
     */
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);

        $this->isEditable = $this->document->isEditable();

        if ($this->isEditable)
        {
            // Тексты для тулбара и признак «редактируемый» для фронтенда
            $this->addWYSIWYGTranslations();
            $this->setProperty('editable', 'editable');
        }
    }

    /**
     * Параметры по умолчанию.
     * - num : номер текстового блока (0 = глобальный)
     * - text: дефолтный текст (если блока в БД ещё нет)
     */
    protected function defineParams(): array
    {
        return array_merge(
            parent::defineParams(),
            [
                'num'  => 1,
                'active' => true,
                'text' => false,
            ]
        );
    }

    /**
     * Основное действие: загрузка данных блока и подготовка билдеров.
     */
    protected function main(): void
    {
        $num   = (int)$this->getParam('num');
        $docID = ($num !== 0) ? $this->document->getID() : null;

        if ($docID === null)
        {
            // Глобальный блок (smap_id IS NULL)
            $this->setProperty('global', 'global');
        }

        // SQL с условием для smap_id
        $sql = 'SELECT st.tb_id AS id, stt.tb_content AS content
                  FROM share_textblocks st
             LEFT JOIN share_textblocks_translation stt
                    ON st.tb_id = stt.tb_id AND stt.lang_id = %s
                 WHERE st.smap_id ' . ($docID === null ? 'IS NULL' : '= %s') . ' AND st.tb_num = %s';

        // Собираем параметры
        $params = [$this->document->getLang()];
        if ($docID !== null)
        {
            $params[] = $docID;
        }
        $params[] = $this->getParam('num');

        $res = $this->dbh->selectRequest($sql, ...$params);

        if (is_array($res) && !empty($res))
        {
            $row           = $res[0];
            $this->id      = (int)$row['id'];
            $this->content = (string)($row['content'] ?? '');
        }
        elseif ($this->getParam('text') !== false)
        {
            $this->content = (string)$this->getParam('text');
        }

        $this->setProperty('num', (string)$this->getParam('num'));
        $this->prepare();
    }

    /**
     * Описание данных: единое HTML-поле с именем компонента.
     */
    protected function createDataDescription(): DataDescription
    {
        $dd = new DataDescription();

        $fd = new FieldDescription($this->getName());
        $fd->setType(FieldDescription::FIELD_TYPE_HTML_BLOCK);
        $dd->addFieldDescription($fd);

        return $dd;
    }

    /**
     * Данные: одно поле = содержимое блока.
     */
    protected function createData(): Data
    {
        $data  = new Data();
        $field = new Field($this->getName());
        $field->setData($this->getContent());
        $data->addField($field);

        return $data;
    }

    /** Текущее содержимое блока. */
    protected function getContent(): string
    {
        return $this->content;
    }

    /** Текущий tb_id или null. */
    protected function getID(): ?int
    {
        return $this->id;
    }

    /**
     * JS-описание (WYSIWYG стили и т.п.) только в режиме редактирования.
     * Возвращает DOM-узел <javascript/> или null, если JS не требуется.
     */
    protected function buildJS(): ?\DOMNode
    {
        if (!$this->isEditable)
        {
            return null;
        }

        // может вернуть null или DOMNode — оба варианта валидны для ?DOMNode
        $result = parent::buildJS();

        if ($result instanceof \DOMNode && ($config = E()->getConfigValue('wysiwyg.styles')))
        {
            $var = $this->doc->createElement('variable');
            $var->setAttribute('name', 'wysiwyg_styles');
            $var->setAttribute('type', 'json');

            foreach ($config as $key => $value)
            {
                if (isset($value['caption']))
                {
                    $config[$key]['caption'] = $this->translate($value['caption']);
                }
            }

            $var->appendChild(new \DOMText(json_encode($config)));
            $result->appendChild($var);
        }

        return $result;
    }

    /**
     * Сохранение содержимого блока из POST.
     *
     * Ожидаемые POST-поля:
     *  - num   : номер блока (tb_num)
     *  - data  : HTML содержимое
     *  - ID    : smap_id (может отсутствовать — тогда глобальный блок)
     */
    protected function save(): void
    {
        $this->dbh->beginTransaction();

        $result = '';
        try
        {
            if (!isset($_POST['data'], $_POST['num']))
            {
                throw new SystemException('ERR_DEV_NO_DATA', SystemException::ERR_DEVELOPER);
            }

            $langID = (int)$this->document->getLang();
            $docID  = $_POST['ID'] ?? '';
            $num    = $_POST['num'];

            // Найти/создать базовую запись
            $tbID = $this->getTextBlockID($docID, $num);
            $html = DataSet::cleanupHTML((string)$_POST['data']);

            if (trim($html) !== '')
            {
                if (!$tbID)
                {
                    // Вставка base-строки
                    $tbID = (int)$this->dbh->modify(
                        QAL::INSERT,
                        $this->tableName,
                        ['smap_id' => ($docID === '' ? null : (int)$docID), 'tb_num' => $num]
                    );
                }

                // Обновляем/вставляем перевод
                $t = $this->tableName . '_translation';
                $exists = $this->dbh->select($t, ['tb_id'], ['tb_id' => $tbID, 'lang_id' => $langID]);

                if (is_array($exists))
                {
                    $this->dbh->modify(
                        QAL::UPDATE,
                        $t,
                        ['tb_content' => $html],
                        ['tb_id' => $tbID, 'lang_id' => $langID]
                    );
                }
                elseif ($exists === true)
                {
                    $this->dbh->modify(
                        QAL::INSERT,
                        $t,
                        ['tb_content' => $html, 'tb_id' => $tbID, 'lang_id' => $langID]
                    );
                }

                $result = $html;
            }
            elseif ($tbID)
            {
                // Пустой текст — удаляем запись целиком
                $this->dbh->modify(QAL::DELETE, $this->tableName, null, ['tb_id' => $tbID]);
            }

            $this->dbh->commit();
        }
        catch (\Throwable $e)
        {
            $this->dbh->rollback();
            $result = $e->getMessage();
        }

        $this->response->setHeader('Content-Type', 'application/xml; charset=utf-8');
        $this->response->write($result);
        $this->response->commit();
    }

    /**
     * Получить tb_id по документу и номеру блока.
     */
    private function getTextBlockID(int|string|null $smapID, int|string $num): ?int
    {
        $smapID = ($smapID === '' || $smapID === null) ? null : (int)$smapID;

        $res = $this->dbh->select(
            $this->tableName,
            ['tb_id'],
            ['smap_id' => $smapID, 'tb_num' => $num]
        );

        return is_array($res) ? (int)simplifyDBResult($res, 'tb_id', true) : null;
    }
}

/**
 * Пустой интерфейс-маркер для генерации sample.
 */
interface SampleTextBlock
{
}
