<?php

declare(strict_types=1);

/**
 * DocumentController, ITransformer, IDocument.
 *
 * Контроллер подготавливает окружение, запускает построение документа
 * и превращает XML в нужный формат (HTML/XSLT, JSON или диагностический XML).
 */
class DocumentController extends BaseObject
{
    /** Рендер в HTML (XSLT). */
    public const TRANSFORM_HTML = 'html';
    /** Диагностический XML (debug). */
    public const TRANSFORM_DEBUG_XML = 'debug';
    /** XML со структурой layout/content без исполнения компонентов. */
    public const TRANSFORM_STRUCTURE_XML = 'struct';
    /** JSON-ответ. */
    public const TRANSFORM_JSON = 'json';
    /** Пустая трансформация (зарезервировано). */
    public const TRANSFORM_EMPTY = 'empty';

    /** Текущий трансформер (ленивая инициализация). */
    private static ?ITransformer $transformer = null;

    /**
     * Определяет требуемый режим представления.
     * Приоритеты:
     *  1) site.asXML => debug XML всегда
     *  2) X-Requested-With: XMLHttpRequest ИЛИ Accept: application/json => JSON
     *  3) Accept: application/xml|text/xml => debug XML
     *  4) (debug) заголовок X-Debug-Format: xml|struct|json, либо ?format=
     *  5) по умолчанию — HTML
     */
    public function getViewMode()
    {
        $result = self::TRANSFORM_HTML;

        if (isset($_GET[self::TRANSFORM_DEBUG_XML]) &&
            $this->getConfigValue('site.debug') ||
            $this->getConfigValue('site.asXML')
        ) {
            $result = self::TRANSFORM_DEBUG_XML;
        }
        elseif (isset($_GET[self::TRANSFORM_HTML]))
        {
            $result = self::TRANSFORM_HTML;
        }
        elseif (isset($_GET[self::TRANSFORM_STRUCTURE_XML]))
        {
            $result = self::TRANSFORM_STRUCTURE_XML;
        }
        elseif (isset($_GET[self::TRANSFORM_JSON]) ||
            (isset($_SERVER['HTTP_X_REQUEST']) &&
                (strtolower($_SERVER['HTTP_X_REQUEST']) ==
                    self::TRANSFORM_JSON))
        ) {
            $result = self::TRANSFORM_JSON;
        }

        return $result;
    }
    /**
     * Точка входа:
     *  - выставляет язык,
     *  - собирает документ,
     *  - отрабатывает IRQ/SystemException,
     *  - выполняет трансформацию и отдаёт ответ.
     */
    public function run(): void
    {
        // Устанавливаем текущий язык из Request
        $language = E()->getLanguage();
        $language->setCurrent($language->getIDByAbbr(E()->getRequest()->getLang(), true));

        try
        {
            $document = E()->getDocument();
            $document->loadComponents();
            $document->runComponents();

            // Контроль «непрожёванных» сегментов URL
            $pathLen  = count(E()->getRequest()->getPath());
            $usedLen  = E()->getRequest()->getUsedSegments();
            if ($pathLen !== $usedLen)
            {
                throw new SystemException('ERR_404', SystemException::ERR_404, (string)E()->getRequest()->getURI());
            }

            $document->build();
        }
        catch (IRQ $int)
        {
            // Режим STRUCTURE: отдаём разметку layout/content без выполнения компонентов
            $document = E()->PageStructureDocument;
            if ($l = $int->getLayoutBlock())
            {
                $document->setLayout($l);
            }
            $document->setContent($int->getContentBlock());
            $document->build();
        }
        catch (SystemException $e)
        {
            $document = E()->ErrorDocument;
            $document->attachException($e);
            $document->build();
        }

        E()->getResponse()->write($this->transform($document));
    }

    /**
     * Возвращает (лениво) подходящий трансформер под текущий view-mode.
     */
    public function getTransformer(): ITransformer
    {
        if (!self::$transformer)
        {
            $vm = $this->getViewMode();

            self::$transformer = match ($vm)
            {
                self::TRANSFORM_JSON          => new JSONTransformer(),
                self::TRANSFORM_DEBUG_XML,
                self::TRANSFORM_STRUCTURE_XML => new XMLTransformer(),
                default                       => new XSLTTransformer(),
            };
        }
        return self::$transformer;
    }

    /**
     * Выполняет трансформацию DOM-документа в целевой формат.
     */
    private function transform(IDocument $document): string
    {
        $transformer = $this->getTransformer();
        $transformer->setDocument($document->getResult());
        return (string)$transformer->transform();
    }
}

/**
 * Интерфейс трансформеров вывода.
 */
interface ITransformer
{
    /**
     * Выполнить трансформацию установленного документа в строку ответа.
     * @return string
     */
    public function transform(): string;

    /**
     * Установить исходный DOM-документ для трансформации.
     */
    public function setDocument(DOMDocument $document): void;

    /**
     * Задать имя (путь) файла трансформации.
     * Для XSLT — файл стилей; для прочих трансформеров может игнорироваться.
     */
    public function setFileName(string $transformerFilename, bool $isAbsolutePath = false): void;
}

/**
 * Интерфейс документа страницы.
 */
interface IDocument
{
    /** Построить DOM-документ результата. */
    public function build(): void;

    /** Получить готовый DOM-документ. */
    public function getResult(): DOMDocument;
}
