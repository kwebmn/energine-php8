<?php

/**
 * @file
 * OGObject.
 *
 * Class for Open Graph metadata building.
 *
 * @author
 * @version 2.0.0
 */

/**
 * Generates a list of OpenGraph properties. Обычно вызывается из Document.
 */
class OGObject extends BaseObject
{
    /** Ширина изображения по умолчанию. */
    public const DEFAULT_WIDTH  = 640;
    /** Высота изображения по умолчанию. */
    public const DEFAULT_HEIGHT = 360;

    /** @var array[] Список изображений: [ [url, width, height], ... ] */
    private $images = [];

    /**
     * Данные видео-объекта.
     * Ключи: url, duration (секунды), type (og-type, напр. video.other), mime, width, height
     * @var array
     */
    private $video = [];

    /** @var string og:title */
    private $title = '';

    /** @var string og:description */
    private $description = '';

    /** @var string og:url */
    private $url = '';

    /**
     * Добавить изображение.
     */
    public function addImage($imageURL, $width = self::DEFAULT_WIDTH, $height = self::DEFAULT_HEIGHT)
    {
        $this->images[] = [
            'url'    => $imageURL,
            'width'  => (int)$width ?: self::DEFAULT_WIDTH,
            'height' => (int)$height ?: self::DEFAULT_HEIGHT,
        ];
    }

    /**
     * Задать единственное изображение (с заменой списка).
     */
    public function setImage($imageURL, $width = self::DEFAULT_WIDTH, $height = self::DEFAULT_HEIGHT)
    {
        $this->images = [[
            'url'    => $imageURL,
            'width'  => (int)$width ?: self::DEFAULT_WIDTH,
            'height' => (int)$height ?: self::DEFAULT_HEIGHT,
        ]];
    }

    /**
     * Заголовок страницы (og:title).
     */
    public function setTitle($title)
    {
        $this->title = strip_tags((string)$title);
    }

    /**
     * Описание (og:description).
     */
    public function setDescription($description)
    {
        // Нормализуем, чтобы не «просочились» HTML-теги/сущности
        $text = html_entity_decode((string)$description, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $this->description = strip_tags($text);
    }

    /**
     * Канонический URL страницы (og:url).
     */
    public function setUrl($url)
    {
        $this->url = (string)$url;
    }

    /**
     * Задать видео-объект.
     *
     * @param string      $url       Относительный путь файла (будет префиксован site.media/base)
     * @param string|int  $duration  Длительность: "mm:ss", "hh:mm:ss" или число секунд
     * @param string      $mime      MIME, напр. "video/mp4"
     * @param int         $width     Ширина кадра
     * @param int         $height    Высота кадра
     * @param string      $type      og:type страницы, по умолчанию "video.other"
     */
    public function setVideo($url, $duration, $mime, $width = self::DEFAULT_WIDTH, $height = self::DEFAULT_HEIGHT, $type = 'video.other')
    {
        $this->video = [
            'url'      => (string)$url,
            'duration' => $this->parseDuration($duration),
            'type'     => $type ?: 'video.other',
            'mime'     => (string)$mime,
            'width'    => (int)$width ?: self::DEFAULT_WIDTH,
            'height'   => (int)$height ?: self::DEFAULT_HEIGHT,
        ];
    }

    /**
     * Построить DOM-элемент с OG-свойствами.
     *
     * @return DOMElement <og>...</og>
     */
    public function build()
    {
        // Заголовок по умолчанию — из Document
        if ($this->title === '')
        {
            $docTitle = E()->getDocument()->getProperty('title');
            if ($docTitle)
            {
                $this->setTitle($docTitle);
            }
        }

        $doc    = new DOMDocument('1.0', 'UTF-8');
        $result = $doc->createElement('og');

        // title
        if ($this->title !== '')
        {
            $this->appendProperty($doc, $result, 'title', $this->title);
        }

        // description
        if ($this->description !== '')
        {
            $this->appendProperty($doc, $result, 'description', $this->description);
        }

        // url (если задан)
        if ($this->url !== '')
        {
            $this->appendProperty($doc, $result, 'url', $this->url);
        }

        // Изображения
        if (!empty($this->images))
        {
            foreach ($this->images as $img)
            {
                $imgUrl = $this->resolveImageUrl($img['url'], $img['width'], $img['height']);
                $this->appendProperty($doc, $result, 'image', $imgUrl);
                $this->appendProperty($doc, $result, 'image:width', (string)$img['width']);
                $this->appendProperty($doc, $result, 'image:height', (string)$img['height']);
            }
        }

        // Видео
        $pageType = 'website';
        if (!empty($this->video))
        {
            $mediaBase = $this->getConfigValue('site.media');
            if (!$mediaBase)
            {
                $mediaBase = E()->getSiteManager()->getDefaultSite()->base;
            }
            $videoUrl = $this->isAbsoluteUrl($this->video['url'])
                ? $this->video['url']
                : $mediaBase . ltrim($this->video['url'], '/');

            $this->appendProperty($doc, $result, 'video', $videoUrl);
            $this->appendProperty($doc, $result, 'video:width', (string)$this->video['width']);
            $this->appendProperty($doc, $result, 'video:height', (string)$this->video['height']);
            // Совместимость: оставим как раньше plain "duration"
            if ($this->video['duration'] !== '')
            {
                $this->appendProperty($doc, $result, 'duration', (string)$this->video['duration']);
                // И современный вариант:
                $this->appendProperty($doc, $result, 'video:duration', (string)$this->video['duration']);
            }
            // MIME типа видео
            $this->appendProperty($doc, $result, 'video:type', $this->video['mime']);

            // Тип OG-страницы, если есть видео — используем его
            $pageType = $this->video['type'] ?: 'video.other';
        }

        // Тип страницы (og:type). Ровно ОДИН раз.
        $this->appendProperty($doc, $result, 'type', $pageType);

        return $result;
    }

    /* ========================= ВНУТРЕННИЕ ПОМОЩНИКИ ========================= */

    /**
     * Добавляет <property name="...">value</property> в корневой узел.
     */
    private function appendProperty(DOMDocument $doc, DOMElement $root, $name, $value)
    {
        if ($value === null || $value === '')
        {
            return;
        }
        $prop = $doc->createElement('property');
        $prop->setAttribute('name', $name);
        $prop->appendChild($doc->createTextNode((string)$value));
        $root->appendChild($prop);
    }

    /**
     * Собирает URL изображения.
     * - Если URL абсолютный — возвращаем как есть.
     * - Иначе прокачиваем через resizer: {resizer}/w{W}-h{H}/{path}?preview.jpg
     */
    private function resolveImageUrl($path, $width, $height)
    {
        if ($this->isAbsoluteUrl($path))
        {
            return $path;
        }

        $resizer = $this->getConfigValue('site.resizer');
        if (!$resizer)
        {
            $resizer = E()->getSiteManager()->getDefaultSite()->base . 'resizer/';
        }

        $path = ltrim($path, '/');
        return $resizer . 'w' . (int)$width . '-h' . (int)$height . '/' . $path . '?preview.jpg';
    }

    /**
     * Проверка на абсолютный URL.
     */
    private function isAbsoluteUrl($url)
    {
        // http://, https://, //cdn... или другой протокол
        return (bool)preg_match('~^(?:[a-z][a-z0-9+.\-]*:)?//|^[a-z][a-z0-9+.\-]*:~i', (string)$url);
    }

    /**
     * Парсинг длительности: "hh:mm:ss", "mm:ss" или секунды числом.
     * Возвращает строку секунд либо пустую строку, если не удалось распарсить.
     */
    private function parseDuration($duration)
    {
        if ($duration === null || $duration === '')
        {
            return '';
        }

        if (is_numeric($duration))
        {
            return (string)max(0, (int)$duration);
        }

        $parts = array_map('trim', explode(':', (string)$duration));
        $parts = array_map('intval', $parts);

        if (count($parts) === 2)
        {
            // mm:ss
            list($m, $s) = $parts;
            return (string)max(0, $m * 60 + $s);
        }
        if (count($parts) === 3)
        {
            // hh:mm:ss
            list($h, $m, $s) = $parts;
            return (string)max(0, $h * 3600 + $m * 60 + $s);
        }

        return '';
    }
}
