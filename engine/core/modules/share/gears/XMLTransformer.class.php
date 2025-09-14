<?php
declare(strict_types=1);

/**
 * XML Transformer (PHP 8.3-ready).
 * Возвращает исходный XML документа как строку и выставляет корректный Content-Type.
 * При ошибках формирует подробное сообщение (в DEV — RuntimeException, в PROD — SystemException).
 */
final class XMLTransformer implements ITransformer
{
    /** @var DOMDocument|null */
    private ?DOMDocument $document = null;

    /**
     * Установить документ для вывода.
     */
    public function setDocument(DOMDocument $document): void
    {
        $this->document = $document;
    }

    /**
     * Для совместимости с ITransformer — не используется.
     */
    public function setFileName($transformerFilename, $isAbsolutePath = false): void
    {
        // Ничего не делаем: для "сырого" XML файл XSLT не требуется.
    }

    /**
     * Вернуть XML как строку и выставить заголовок.
     *
     * @throws \RuntimeException|\SystemException
     */
    public function transform(): string
    {
        if (!$this->document instanceof DOMDocument) {
            throw new \SystemException('ERR_DEV_NO_DOCUMENT', \SystemException::ERR_DEVELOPER);
        }

        // Контент-тайп: по умолчанию application/xml; можно переопределить в конфиге.
        $contentType = \BaseObject::_getConfigValue('document.xml_content_type', 'application/xml; charset=UTF-8');
        E()->getResponse()->setHeader('Content-Type', $contentType, false);

        // Красивое форматирование в DEV (или если включено явно в конфиге)
        $pretty = (bool) (\BaseObject::_getConfigValue('document.pretty_xml', false)
            ?: ((defined('DEBUG') && DEBUG) || filter_var(getenv('APP_DEBUG') ?: '0', FILTER_VALIDATE_BOOL)));

        $prevUseInternal = libxml_use_internal_errors(true);
        $this->document->encoding = 'UTF-8';
        $this->document->formatOutput = $pretty;
        if ($pretty) {
            // чтобы форматирование работало предсказуемо
            $this->document->preserveWhiteSpace = false;
        }

        $xml = $this->document->saveXML();
        $errors = libxml_get_errors();
        libxml_clear_errors();
        libxml_use_internal_errors($prevUseInternal);

        if ($xml === false || !empty($errors)) {
            $msg = $this->formatLibxmlErrors('XML serialization error', $errors);

            // Логируем, если есть Monolog
            if (isset(E()->logger)) {
                E()->logger->error($msg, ['component' => 'xml-transformer']);
            }

            $isDebug = (defined('DEBUG') && DEBUG)
                || filter_var(getenv('APP_DEBUG') ?: '0', FILTER_VALIDATE_BOOL);

            if ($isDebug) {
                throw new \RuntimeException($msg);
            }
            throw new \SystemException('ERR_XML_SERIALIZE: ' . $msg, \SystemException::ERR_DEVELOPER);
        }

        return trim($xml);
    }

    /**
     * Упаковать libxml-ошибки в человекочитаемую строку.
     *
     * @param string         $title
     * @param \LibXMLError[] $errors
     */
    private function formatLibxmlErrors(string $title, array $errors): string
    {
        if (!$errors) {
            return $title;
        }
        $lines = [$title . ':'];
        foreach ($errors as $e) {
            if (!$e instanceof \LibXMLError) {
                $lines[] = (string) $e;
                continue;
            }
            $level = match ($e->level) {
                LIBXML_ERR_FATAL   => 'FATAL',
                LIBXML_ERR_ERROR   => 'ERROR',
                LIBXML_ERR_WARNING => 'WARN',
                default            => 'INFO',
            };
            $file = $e->file ?: '-';
            $lines[] = sprintf('[%s] %s at %s:%d', $level, trim($e->message), $file, (int) $e->line);
        }
        return implode("\n", $lines);
    }
}
