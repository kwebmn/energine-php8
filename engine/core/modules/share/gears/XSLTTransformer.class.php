<?php

declare(strict_types=1);

/**
 * XSLT transformer with detailed libxml/XSLT errors.
 *
 * В DEV (DEBUG=true) бросает RuntimeException с полным текстом ошибок,
 * Whoops красиво отрисует страницу/JSON. В PROD — SystemException с деталями.
 */
class XSLTTransformer extends BaseObject implements ITransformer
{
    /**
     * Директория, где лежат XSLT-трансформеры сайта.
     * Пример: /site/modules/{folder}/transformers/
     */
    public const MAIN_TRANSFORMER_DIR = '/modules/%s/transformers/';

    /** @var string Полный путь к XSLT-файлу */
    private string $fileName = '';

    /** @var DOMDocument|null Входной XML-документ */
    private ?DOMDocument $document = null;

    /** @var string Active UI framework */
    private string $uiFramework;

    public function __construct()
    {
        $this->uiFramework = $this->getUiFramework();
        $this->setFileName((string)$this->getConfigValue('document.transformer'));
    }

    /**
     * Установить имя XSLT-файла.
     *
     * @param string $transformerFilename Имя файла (относительно папки сайта) или абсолютный путь.
     * @param bool   $isAbsolutePath      Если true — трактовать как абсолютный путь.
     *
     * @throws SystemException
     */
    public function setFileName(string $transformerFilename, bool $isAbsolutePath = false): void
    {
        if (!$isAbsolutePath)
        {
            $transformerFilename = $this->maybeApplyUiSuffix($transformerFilename);
        }

        $resolvedFilename = $this->resolveTransformerPath($transformerFilename, $isAbsolutePath);

        if (!is_file($resolvedFilename))
        {
            throw new SystemException(
                'ERR_DEV_NO_MAIN_TRANSFORMER',
                SystemException::ERR_DEVELOPER,
                $resolvedFilename
            );
        }

        $this->fileName = $resolvedFilename;
    }

    private function resolveTransformerPath(string $transformerFilename, bool $isAbsolutePath = false): string
    {
        if ($isAbsolutePath)
        {
            return $transformerFilename;
        }

        $siteFolder = E()->getSiteManager()->getCurrentSite()->folder;

        return sprintf(
            SITE_DIR . self::MAIN_TRANSFORMER_DIR,
            $siteFolder
        ) . $transformerFilename;
    }

    private function maybeApplyUiSuffix(string $transformerFilename): string
    {
        if ($this->uiFramework !== 'mdbootstrap')
        {
            return $transformerFilename;
        }

        if (str_ends_with($transformerFilename, '_md.xslt'))
        {
            return $transformerFilename;
        }

        if (!str_ends_with($transformerFilename, '.xslt'))
        {
            return $transformerFilename;
        }

        $candidate = substr($transformerFilename, 0, -5) . '_md.xslt';
        $resolved = $this->resolveTransformerPath($candidate);

        if (is_file($resolved))
        {
            return $candidate;
        }

        return $transformerFilename;
    }

    /**
     * Установить входной документ для трансформации.
     */
    public function setDocument(DOMDocument $document): void
    {
        $this->document = $document;
    }

    /**
     * Выполнить XSLT-трансформацию.
     *
     * @return string HTML/XML результат
     * @throws SystemException|\RuntimeException
     */
    public function transform(): string
    {
        if (!$this->document)
        {
            $this->throwXsltError('XSLT transform error: document is not set', []);
        }

        // Вариант с xslcache (если включён и установлен)
        if (extension_loaded('xslcache') && (int)$this->getConfigValue('document.xslcache') === 1)
        {
            /** @noinspection PhpUndefinedClassInspection */
            $xsltProc = new xsltCache();

            try
            {
                $xsltProc->importStyleSheet($this->fileName);
                $result = $xsltProc->transformToXML($this->document);
            }
            catch (\Throwable $e)
            {
                // В DEV — подробности, в PROD — SystemException
                $this->throwXsltError('XSLT (xslcache) error: ' . $e->getMessage(), []);
            }

            if ($result === false || $result === null)
            {
                $this->throwXsltError('XSLT transform error (xslcache)', []);
            }

            E()->getResponse()->setHeader('Content-Type', 'text/html; charset=UTF-8', false);
            return (string)$result;
        }

        // Обычный XSLTProcessor + детальная диагностика libxml
        $prevUseInternal = libxml_use_internal_errors(true); // перехватываем ошибки

        $xsltDoc = new DOMDocument('1.0', 'UTF-8');
        $loaded  = $xsltDoc->load($this->fileName);
        $loadErrors = libxml_get_errors();
        libxml_clear_errors();

        if (!$loaded || !empty($loadErrors))
        {
            libxml_use_internal_errors($prevUseInternal);
            $this->throwXsltError('XSLT load error', $loadErrors);
        }

        // Важно для корректных относительных import/include в XSLT
        $xsltDoc->documentURI = $this->fileName;

        $proc = new XSLTProcessor();

        $ok = $proc->importStylesheet($xsltDoc);
        $importErrors = libxml_get_errors();
        libxml_clear_errors();

        if (!$ok || !empty($importErrors))
        {
            libxml_use_internal_errors($prevUseInternal);
            $this->throwXsltError('XSLT import error', $importErrors);
        }

        // Выполняем трансформацию
        $method = method_exists($proc, 'transformToXml') ? 'transformToXml' : 'transformToXML';
        $result = $proc->{$method}($this->document);

        $transformErrors = libxml_get_errors();
        libxml_clear_errors();
        libxml_use_internal_errors($prevUseInternal);

        if ($result === false || !empty($transformErrors))
        {
            $this->throwXsltError('XSLT transform error', $transformErrors);
        }

        // Успех — отдаём как HTML
        E()->getResponse()->setHeader('Content-Type', 'text/html; charset=UTF-8', false);
        return (string)$result;
    }

    /**
     * Сформировать понятный текст ошибок libxml и выбросить корректный тип исключения.
     * В DEV — RuntimeException (Whoops красиво покажет),
     * в PROD — SystemException c деталями в сообщении.
     *
     * @param string        $title
     * @param LibXMLError[] $errors
     * @return never
     * @throws \RuntimeException|\SystemException
     */
    private function throwXsltError(string $title, array $errors): never
    {
        $msg = $this->formatLibxmlErrors($title, $errors);

        // Логируем, если есть Monolog
        if (isset(E()->logger))
        {
            E()->logger->error($msg, ['component' => 'xslt', 'xsl' => $this->fileName ?: null]);
        }

        $isDebug = (defined('DEBUG') && DEBUG)
            || filter_var(getenv('APP_DEBUG') ?: '0', FILTER_VALIDATE_BOOL);

        if ($isDebug)
        {
            throw new \RuntimeException($msg);
        }

        throw new \SystemException(
            'ERR_DEV_NOT_WELL_FORMED_XSLT: ' . $msg,
            \SystemException::ERR_DEVELOPER
        );
    }

    /**
     * Превращает массив LibXMLError в читаемую строку.
     */
    private function formatLibxmlErrors(string $title, array $errors): string
    {
        if (!$errors)
        {
            return sprintf('%s (XSL: %s)', $title, $this->fileName ?: '-');
        }

        $lines = [sprintf('%s (XSL: %s):', $title, $this->fileName ?: '-')];

        foreach ($errors as $e)
        {
            if (!$e instanceof \LibXMLError)
            {
                $lines[] = (string)$e;
                continue;
            }
            $level = match ($e->level)
            {
                LIBXML_ERR_FATAL   => 'FATAL',
                LIBXML_ERR_ERROR   => 'ERROR',
                LIBXML_ERR_WARNING => 'WARN',
                default            => 'INFO',
            };
            $file = $e->file ?: (basename($this->fileName ?: '') ?: '-');
            $lines[] = sprintf('[%s] %s at %s:%d', $level, trim($e->message), $file, (int)$e->line);
        }

        return implode("\n", $lines);
    }
}
