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

    /** Cached toggle for the refactored XSLT stack. */
    private ?bool $refactorEnabled = null;

    /**
     * Resolve the final stylesheet path based on the feature flag.
     */
    private function resolveStylesheetPath(bool $refactorEnabled): string
    {
        if ($refactorEnabled) {
            return $this->fileName;
        }

        $legacyCandidate = preg_replace('/\.xslt$/i', '.legacy.xslt', $this->fileName);
        if (is_string($legacyCandidate) && $legacyCandidate !== $this->fileName && is_file($legacyCandidate)) {
            return $legacyCandidate;
        }

        return $this->fileName;
    }

    /**
     * Determine whether the refactored templates should be active.
     */
    private function isRefactorEnabled(): bool
    {
        if ($this->refactorEnabled !== null) {
            return $this->refactorEnabled;
        }

        $env = getenv('XSL_REFACTOR');
        if ($env !== false && $env !== '') {
            $this->refactorEnabled = filter_var($env, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
        }

        if ($this->refactorEnabled === null) {
            $cfg = $this->getConfigValue('features.xsl_refactor');
            if ($cfg === null) {
                $this->refactorEnabled = true;
            } elseif (is_bool($cfg)) {
                $this->refactorEnabled = $cfg;
            } else {
                $this->refactorEnabled = filter_var((string)$cfg, FILTER_VALIDATE_BOOL) ?? true;
            }
        }

        return $this->refactorEnabled;
    }

    public function __construct()
    {
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
        if (!$isAbsolutePath) {
            $siteFolder = E()->getSiteManager()->getCurrentSite()->folder;
            $transformerFilename = sprintf(
                    SITE_DIR . self::MAIN_TRANSFORMER_DIR,
                    $siteFolder
                ) . $transformerFilename;
        }

        if (!is_file($transformerFilename)) {
            throw new SystemException(
                'ERR_DEV_NO_MAIN_TRANSFORMER',
                SystemException::ERR_DEVELOPER,
                $transformerFilename
            );
        }

        $this->fileName = $transformerFilename;
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
        if (!$this->document) {
            $this->throwXsltError('XSLT transform error: document is not set', []);
        }

        $refactorEnabled = $this->isRefactorEnabled();
        $stylesheetPath  = $this->resolveStylesheetPath($refactorEnabled);

        // Вариант с xslcache (если включён и установлен)
        if (extension_loaded('xslcache') && (int)$this->getConfigValue('document.xslcache') === 1) {
            /** @noinspection PhpUndefinedClassInspection */
            $xsltProc = new xsltCache();

            try {
                $xsltProc->importStyleSheet($stylesheetPath);
                if (method_exists($xsltProc, 'setParameter')) {
                    $xsltProc->setParameter('', 'refactor-enabled', $refactorEnabled ? '1' : '0');
                }
                $result = $xsltProc->transformToXML($this->document);
            } catch (\Throwable $e) {
                // В DEV — подробности, в PROD — SystemException
                $this->throwXsltError('XSLT (xslcache) error: ' . $e->getMessage(), []);
            }

            if ($result === false || $result === null) {
                $this->throwXsltError('XSLT transform error (xslcache)', []);
            }

            E()->getResponse()->setHeader('Content-Type', 'text/html; charset=UTF-8', false);
            return (string)$result;
        }

        // Обычный XSLTProcessor + детальная диагностика libxml
        $prevUseInternal = libxml_use_internal_errors(true); // перехватываем ошибки

        $xsltDoc = new DOMDocument('1.0', 'UTF-8');
        $loaded  = $xsltDoc->load($stylesheetPath);
        $loadErrors = libxml_get_errors();
        libxml_clear_errors();

        if (!$loaded || !empty($loadErrors)) {
            libxml_use_internal_errors($prevUseInternal);
            $this->throwXsltError('XSLT load error', $loadErrors);
        }

        // Важно для корректных относительных import/include в XSLT
        $xsltDoc->documentURI = $stylesheetPath;

        $proc = new XSLTProcessor();

        $ok = $proc->importStylesheet($xsltDoc);
        $importErrors = libxml_get_errors();
        libxml_clear_errors();

        if (!$ok || !empty($importErrors)) {
            libxml_use_internal_errors($prevUseInternal);
            $this->throwXsltError('XSLT import error', $importErrors);
        }

        $proc->setParameter('', 'refactor-enabled', $refactorEnabled ? '1' : '0');

        // Выполняем трансформацию
        $method = method_exists($proc, 'transformToXml') ? 'transformToXml' : 'transformToXML';
        $result = $proc->{$method}($this->document);

        $transformErrors = libxml_get_errors();
        libxml_clear_errors();
        libxml_use_internal_errors($prevUseInternal);

        if ($result === false || !empty($transformErrors)) {
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
        if (isset(E()->logger)) {
            E()->logger->error($msg, ['component' => 'xslt', 'xsl' => $this->fileName ?: null]);
        }

        $isDebug = (defined('DEBUG') && DEBUG)
            || filter_var(getenv('APP_DEBUG') ?: '0', FILTER_VALIDATE_BOOL);

        if ($isDebug) {
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
        if (!$errors) {
            return sprintf('%s (XSL: %s)', $title, $this->fileName ?: '-');
        }

        $lines = [sprintf('%s (XSL: %s):', $title, $this->fileName ?: '-')];

        foreach ($errors as $e) {
            if (!$e instanceof \LibXMLError) {
                $lines[] = (string)$e;
                continue;
            }
            $level = match ($e->level) {
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
