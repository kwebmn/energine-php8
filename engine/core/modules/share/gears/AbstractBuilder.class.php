<?php

declare(strict_types=1);

/**
 * Билдер XML-документа на основе метаданных и данных.
 *
 * Класс отвечает только за сборку DOM-дерева:
 *  - Метаданные (DataDescription) описывают поля и их свойства
 *  - Данные (Data) содержат значения
 *  - Конкретные потомки переопределяют run() и собственно наполняют $this->result
 */
abstract class AbstractBuilder extends DBWorker implements IBuilder
{
    /** @var DataDescription|null Описание данных (метаданные) */
    protected ?DataDescription $dataDescription = null;

    /** @var Data|null Данные */
    protected ?Data $data = null;

    /**
     * Результат сборки:
     *  - для XML-билдеров — DOMDocument
     *  - для JSONBuilder — array/строка
     */
    protected $result = null;

    public function __construct()
    {
        parent::__construct();
    }

    /** Установить метаданные. */
    public function setDataDescription(DataDescription $dataDescription)
    {
        $this->dataDescription = $dataDescription;
    }

    /** Установить данные. */
    public function setData(Data $data)
    {
        $this->data = $data;
    }

    /**
     * Построить DOMDocument.
     *
     * @return bool true — документ собран
     * @throws SystemException Если не заданы метаданные или не создан корневой элемент
     */
    public function build(): bool
    {
        if (!$this->dataDescription instanceof DataDescription)
        {
            throw new SystemException('ERR_DEV_NO_DATA_DESCRIPTION', SystemException::ERR_DEVELOPER);
        }

        $this->result = new DOMDocument('1.0', 'UTF-8');
        // Читаемый вывод — только в режиме отладки
        $this->result->formatOutput = (bool)$this->getConfigValue('site.debug', 0);
        $this->result->preserveWhiteSpace = false;

        // Конкретная реализация должна создать корневой элемент и наполнить документ
        $this->run();

        if (!$this->result->documentElement)
        {
            throw new SystemException('ERR_DEV_BUILDER_NO_ROOT', SystemException::ERR_DEVELOPER);
        }

        return true;
    }

    /**
     * Получить корневой узел результата (для XML-билдеров).
     * JSONBuilder переопределяет этот метод и возвращает строку JSON.
     *
     * @return DOMNode|null
     */
    public function getResult(): mixed
    {
        return ($this->result instanceof DOMDocument) ? $this->result->documentElement : null;
    }

    /**
     * Хук для потомков: наполнение $this->result.
     * Должен создать корневой элемент и построить содержимое.
     */
    protected function run()
    {
        // Пустая реализация — потомок обязан переопределить.
    }

    /**
     * Создать XML-представление поля.
     *
     * @param string            $fieldName   Имя поля
     * @param FieldDescription  $fieldInfo   Метаданные поля
     * @param mixed             $fieldValue  Значение
     * @param array|false       $fieldProps  Доп. атрибуты для узла <field>
     *
     * @return DOMElement
     */
    protected function createField($fieldName, FieldDescription $fieldInfo, $fieldValue = false, $fieldProps = false)
    {
        /** @var DOMDocument $doc */
        $doc = $this->result;

        $el = $doc->createElement('field');
        $el->setAttribute('name', (string)$fieldName);
        $el->setAttribute('type', (string)$fieldInfo->getType());
        $el->setAttribute('mode', (string)$fieldInfo->getMode());

        // Если длина определена (getLength() возвращает true — значит "любой")
        $length = $fieldInfo->getLength();
        if ($length !== true)
        {
            $el->setAttribute('length', (string)$length);
        }

        // Спец-обработка некоторых типов
        if ($fieldInfo->getType() == FieldDescription::FIELD_TYPE_FILE)
        {
            $this->decorateFileField($el, $fieldInfo, $fieldValue);
        }
        elseif ($fieldInfo->getType() == FieldDescription::FIELD_TYPE_SMAP_SELECTOR && $fieldValue)
        {
            $siteName = E()->getSiteManager()->getSiteByPage($fieldValue)->name;
            $pageName = $this->dbh->getScalar(
                'share_sitemap_translation',
                'smap_name',
                ['smap_id' => $fieldValue, 'lang_id' => E()->getLanguage()->getCurrent()]
            );
            $el->setAttribute('smap_name', $siteName . ' : ' . $pageName);
        }
        elseif ($fieldInfo->getType() == FieldDescription::FIELD_TYPE_CAPTCHA)
        {
            require_once(CORE_DIR . '/modules/share/gears/recaptchalib.php');
            $fieldValue = recaptcha_get_html($this->getConfigValue('recaptcha.public'));
        }
        elseif ($fieldInfo->getType() == FieldDescription::FIELD_TYPE_VALUE && is_array($fieldValue))
        {
            // Оборачиваем значение {id, value} отдельным узлом <value>
            $valueNode = $doc->createElement('value', (string)$fieldValue['value']);
            if (isset($fieldValue['id']))
            {
                $valueNode->setAttribute('id', (string)$fieldValue['id']);
            }
            $fieldValue = $valueNode;
        }

        // Атрибуты из метаданных (не мутируем FieldDescription).
        $skipPropsInRead = ($fieldInfo->getMode() == FieldDescription::FIELD_MODE_READ)
            ? ['message', 'pattern']
            : [];

        foreach ($fieldInfo as $propName => $propValue)
        {
            if (in_array($propName, $skipPropsInRead, true))
            {
                continue;
            }
            if ($propName === 'nullable')
            {
                continue;
            } // обрабатывается ниже по особым правилам
            if (is_array($propValue))
            {
                continue;
            }
            // Не отбрасываем "0"
            if ($propValue !== null && $propValue !== '')
            {
                $el->setAttribute($propName, (string)$propValue);
            }
        }

        // Дополнительные атрибуты
        if (is_array($fieldProps))
        {
            foreach ($fieldProps as $propName => $propValue)
            {
                if ($propName === 'nullable')
                {
                    continue;
                } // обрабатывается ниже
                if (!is_array($propValue))
                {
                    $el->setAttribute($propName, ($propValue === null) ? '' : (string)$propValue);
                }
            }
        }

        // Специальная логика для nullable:
        // - Обязательные поля: всегда nullable="0"
        // - Необязательные поля: nullable="1"
        $nullableProp = $fieldInfo->getPropertyValue('nullable');
        $isOptional = ($nullableProp === true || $nullableProp === 1 || $nullableProp === '1');
        $el->setAttribute('nullable', $isOptional ? '1' : '0');

        // Значение поля
        return $this->buildFieldValue($el, $fieldInfo, $fieldValue);
    }

    /**
     * Построить значение поля и поместить внутрь $el.
     *
     * @return DOMElement
     */
    protected function buildFieldValue(DOMElement $el, FieldDescription $fieldInfo, $fieldValue)
    {
        // 1) Уже готовый DOM-узел
        if ($fieldValue instanceof DOMNode)
        {
            $this->appendNode($el, $fieldValue);
            return $el;
        }

        // 2) Список для текстбокса
        if ($fieldInfo->getType() == FieldDescription::FIELD_TYPE_TEXTBOX_LIST)
        {
            if ($items = $this->createTextBoxItems($fieldValue))
            {
                $this->appendNode($el, $items);
            }
            return $el;
        }

        // 3) Медиа: добавляем метаданные файла, если есть
        if ($fieldInfo->getType() == FieldDescription::FIELD_TYPE_MEDIA && $fieldValue)
        {
            try
            {
                $el->nodeValue = (string)$fieldValue;
                if ($info = E()->FileRepoInfo->analyze($fieldValue))
                {
                    $el->setAttribute('media_type', $info->type);
                    $el->setAttribute('mime', $info->mime);
                }
            }
            catch (SystemException $e)
            {
                // мягко игнорируем: информацию о медиа не смогли определить
            }
            return $el;
        }

        // 4) Обычное текстовое значение (0 и '0' считаем валидным)
        if ($fieldValue !== false && ($fieldValue === 0 || $fieldValue === '0' || !empty($fieldValue)))
        {
            // Дополнительное форматирование дат/времени
            switch ($fieldInfo->getType())
            {
                case FieldDescription::FIELD_TYPE_DATETIME:
                case FieldDescription::FIELD_TYPE_DATE:
                case FieldDescription::FIELD_TYPE_TIME:
                    $el->setAttribute('date', (string)$fieldValue);

                    // Умный дефолт формата по типу, если не задан outputFormat
                    $fmt = $fieldInfo->getPropertyValue('outputFormat');
                    if (!$fmt)
                    {
                        $fmt = match ($fieldInfo->getType())
                        {
                            FieldDescription::FIELD_TYPE_DATE     => '%Y-%m-%d',
                            FieldDescription::FIELD_TYPE_TIME     => '%H:%M',
                            default                               => '%Y-%m-%d %H:%M',
                        };
                    }

                    $fieldValue = self::enFormatDate(
                        $fieldValue,
                        $fmt,
                        $fieldInfo->getType()
                    );
                    break;
                    // Для строк/текста специальных преобразований не делаем:
                    // значения уйдут как есть (DOMText экранирует сам).
            }

            $el->appendChild(new DOMText((string)$fieldValue));
        }

        return $el;
    }

    /**
     * Спец-обработка поля-файла: быстрые загрузки, плейлисты, secure-флаг.
     */
    private function decorateFileField(DOMElement $el, FieldDescription $fieldInfo, $fieldValue): void
    {
        // Кнопки «очистить/быстрая загрузка» доступны только при наличии прав и режиме редактирования
        if (E()->getDocument()->getRights() > ACCESS_READ
            && $fieldInfo->getMode() != FieldDescription::FIELD_MODE_READ)
        {
            E()->getDocument()->addTranslation('TXT_CLEAR');
            E()->getDocument()->addTranslation('BTN_QUICK_UPLOAD');

            $quickPath  = $this->getConfigValue('repositories.quick_upload_path', 'uploads/public');
            $quickPid   = $this->dbh->getScalar('SELECT upl_id FROM share_uploads WHERE upl_path=%s LIMIT 1', $quickPath);

            if ($quickPid)
            {
                $el->setAttribute('quickUploadPath', $quickPath);
                $el->setAttribute('quickUploadPid', (string)$quickPid);
                $el->setAttribute('quickUploadEnabled', '1');
            }
        }

        if ($fieldValue)
        {
            // Репозиторий может быть secure
            $repoPath = E()->FileRepoInfo->getRepositoryRoot($fieldValue);
            $isSecure = (bool) E()->getConfigValue('repositories.ftp.' . $repoPath . '.secure', 0);
            $el->setAttribute('secure', $isSecure ? '1' : '0');

            // Сформируем плейлист для видео, если анализатор его знает
            try
            {
                if ($info = E()->FileRepoInfo->analyze($fieldValue))
                {
                    $el->setAttribute('media_type', $info->type);
                    $el->setAttribute('mime', $info->mime);

                    $base = pathinfo($fieldValue, PATHINFO_DIRNAME) . '/' . pathinfo($fieldValue, PATHINFO_FILENAME);
                    $playlist = [];
                    if (!empty($info->is_mp4))
                    {
                        $playlist[] = $base . '.mp4';
                    }
                    if (!empty($info->is_webm))
                    {
                        $playlist[] = $base . '.webm';
                    }
                    if (!empty($info->is_flv))
                    {
                        $playlist[] = $base . '.flv';
                    }

                    if ($playlist)
                    {
                        $el->setAttribute('playlist', implode(',', $playlist));
                    }
                }
            }
            catch (SystemException $e)
            {
                // мягко игнорируем
            }
        }
    }

    /** Безопасно добавить дочерний DOM-узел (с импортом при необходимости). */
    private function appendNode(DOMElement $parent, DOMNode $child): void
    {
        try
        {
            $parent->appendChild($child);
        }
        catch (Exception $e)
        {
            /** @var DOMDocument $doc */
            $doc = $this->result;
            $parent->appendChild($doc->importNode($child, true));
        }
    }

    /** Проверка: содержит ли формат час/мин/сек (для strftime/date). */
    private static function formatHasTime(string $format, bool $isStrftime): bool
    {
        if ($isStrftime)
        {
            // %H,%I,%k,%l — часы; %M — минуты; %S — секунды; %R/%T/%X — готовые время-форматы
            return (bool)preg_match('/%(H|I|k|l|M|S|R|T|X)/', $format);
        }
        // date(): H,G,h,g — часы; i — минуты; s — секунды; u/v — микро/миллисекунды
        return (bool)preg_match('/[HhGgi suv]/', $format);
    }

    /**
     * «Человеческое» форматирование даты/времени с псевдо-модификаторами.
     * %E, %f, %o, %q — специальные режимы.
     */
    public static function enFormatDate($date, $format = 'Y-m-d H:i', $type = FieldDescription::FIELD_TYPE_DATE)
    {
        if (!$date)
        {
            return '';
        }

        $ts = strtotime((string)$date);

        // Спец-форматы
        if (in_array($format, ['%E', '%f', '%o', '%q'], true))
        {
            $result = '';
            $today            = strtotime('midnight');
            $tomorrow         = strtotime('midnight +1 day');
            $dayAfterTomorrow = strtotime('midnight +2 day');
            $tomorrowPlus3    = strtotime('midnight +3 day');
            $yesterday        = strtotime('midnight -1 day');
            $beforeYesterday  = strtotime('midnight -2 day');

            switch ($format)
            {
                case '%E':
                    if ($ts >= $today && $ts < $tomorrow)
                    {
                        $result .= date('H:i', $ts);
                    }
                    elseif ($ts < $today && $ts >= $yesterday)
                    {
                        $result .= date('H:i', $ts);
                    }
                    elseif ($ts < $yesterday && $ts >= $beforeYesterday)
                    {
                        $result .= date('H:i', $ts);
                    }
                    elseif ($ts >= $tomorrow && $ts < $dayAfterTomorrow)
                    {
                        $result .= date('H:i', $ts);
                    }
                    elseif ($ts >= $dayAfterTomorrow && $ts < $tomorrowPlus3)
                    {
                        $result .= date('H:i', $ts);
                    }
                    else
                    {
                        $w = (int)date('w', $ts);
                        if ($w === 0)
                        {
                            $w = 7;
                        }
                        $result .= DBWorker::_translate('TXT_WEEKDAY_SHORT_' . $w);
                    }
                    $result .= ', ' . date('j', $ts) . ' ' . DBWorker::_translate('TXT_MONTH_' . date('n', $ts));
                    if (date('Y', $ts) != date('Y'))
                    {
                        $result .= ' ' . date('Y', $ts);
                    }
                    // %E уже содержит время → больше не добавляем
                    return $result;

                case '%f':
                    $w = (int)date('w', $ts);
                    if ($w === 0)
                    {
                        $w = 7;
                    }
                    $result .= DBWorker::_translate('TXT_WEEKDAY_' . $w) . ', ' .
                        date('j', $ts) . ' ' . DBWorker::_translate('TXT_MONTH_' . date('n', $ts));
                    if (date('Y', $ts) != date('Y'))
                    {
                        $result .= ' ' . date('Y', $ts);
                    }
                    break;

                case '%o':
                    if ($ts >= $today && $ts < $tomorrow)
                    {
                        $result .= DBWorker::_translate('TXT_TODAY') . ', ';
                    }
                    $result .= date('j', $ts) . ' ' . DBWorker::_translate('TXT_MONTH_' . date('n', $ts));
                    if (date('Y', $ts) != date('Y'))
                    {
                        $result .= ' ' . date('Y', $ts);
                    }
                    break;

                case '%q':
                    $result .= date('j', $ts) . ' ' . DBWorker::_translate('TXT_MONTH_' . date('n', $ts));
                    if (date('Y', $ts) != date('Y'))
                    {
                        $result .= ' ' . date('Y', $ts);
                    }
                    break;
            }

            // Для спец-форматов без времени — добавляем ТОЛЬКО если тип «временной»
            if (in_array($type, [
                FieldDescription::FIELD_TYPE_DATETIME,
                FieldDescription::FIELD_TYPE_TIME,
                FieldDescription::FIELD_TYPE_HIDDEN
            ], true))
            {
                $result .= ', ' . date('G', $ts) . ':' . date('i', $ts);
            }
            return $result;
        }

        // Обычные форматы
        $isStrftime = is_string($format) && str_contains((string)$format, '%');
        $out = $isStrftime
            ? self::customStrftime((string)$format, $ts)
            : date((string)$format, $ts);

        if ($out === '' || $out === false)
        {
            $out = (string)$date;
        }

        // Дописываем время только если формат НЕ содержит часов/минут/секунд
        $hasTime = self::formatHasTime((string)$format, $isStrftime);
        if (in_array($type, [
                FieldDescription::FIELD_TYPE_DATETIME,
                FieldDescription::FIELD_TYPE_TIME,
                FieldDescription::FIELD_TYPE_HIDDEN
            ], true) && !$hasTime)
        {
            $out .= ', ' . date('G', $ts) . ':' . date('i', $ts);
        }

        return $out;
    }

    /**
     * Замена strftime через date() (совместимо с PHP 8+).
     */
    public static function customStrftime($format, $timestamp = null)
    {
        if ($timestamp === null)
        {
            $timestamp = time();
        }

        $map = [
            '%a' => date('D', $timestamp),
            '%A' => date('l', $timestamp),
            '%d' => date('d', $timestamp),
            '%e' => date('j', $timestamp),
            '%m' => date('m', $timestamp),
            '%b' => date('M', $timestamp),
            '%B' => date('F', $timestamp),
            '%y' => date('y', $timestamp),
            '%Y' => date('Y', $timestamp),
            '%H' => date('H', $timestamp),
            '%I' => date('h', $timestamp),
            '%M' => date('i', $timestamp),
            '%S' => date('s', $timestamp),
            '%p' => date('A', $timestamp),
            '%z' => date('O', $timestamp),
            '%Z' => date('T', $timestamp),
            '%j' => date('z', $timestamp) + 1,
            '%U' => date('W', $timestamp), // NB: ближе к ISO-неделе, а не к настоящему %U
            '%w' => date('w', $timestamp),
            '%c' => date('Y-m-d H:i:s', $timestamp),
            '%x' => date('Y-m-d', $timestamp),
            '%X' => date('H:i:s', $timestamp),
        ];

        return strtr((string)$format, $map);
    }

    /**
     * Набор <option> для поля SELECT/MULTI.
     */
    protected function createOptions(FieldDescription $fieldInfo, $data = false)
    {
        /** @var DOMDocument $doc */
        $doc = $this->result;
        $optionsEl = $doc->createElement('options');

        $available = $fieldInfo->getAvailableValues();
        if (is_array($available))
        {
            foreach ($available as $key => $opt)
            {
                $val = isset($opt['value']) ? (string)$opt['value'] : '';

                $optEl = $doc->createElement('option');
                $optEl->appendChild(new DOMText($val));
                $optEl->setAttribute('id', (string)$key);

                if (!empty($opt['attributes']) && is_array($opt['attributes']))
                {
                    foreach ($opt['attributes'] as $attrName => $attrValue)
                    {
                        $optEl->setAttribute($attrName, (string)$attrValue);
                    }
                }

                // Для мультиселекта отмечаем выбранные значения
                if (is_array($data) && in_array($key, $data, true))
                {
                    $optEl->setAttribute('selected', 'selected');
                }

                $optionsEl->appendChild($optEl);
            }
        }

        return $optionsEl;
    }

    /**
     * Список элементов для типа TEXTBOX_LIST.
     */
    protected function createTextBoxItems($data = [])
    {
        if ($data === false)
        {
            return false;
        }
        if (!is_array($data))
        {
            $data = [$data];
        }
        if (empty($data))
        {
            return false;
        }

        /** @var DOMDocument $doc */
        $doc = $this->result;

        $itemsEl = $doc->createElement('items');
        foreach ($data as $id => $val)
        {
            $itemEl = $doc->createElement('item', (string)$val);
            $itemEl->setAttribute('id', (string)$id);
            $itemsEl->appendChild($itemEl);
        }
        return $itemsEl;
    }

    /**
     * Исправление URL (безопаснее и предсказуемее).
     */
    protected function fixUrl($url)
    {
        return str_replace('%2F', '/', rawurlencode((string)$url));
    }
}
