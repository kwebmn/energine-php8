<?php
declare(strict_types=1);

/**
 * JSON Transformer (PHP 8+).
 * Достаёт JSON из XML-документа (<* id="result">), валидирует и возвращает строку.
 * Выставляет корректный Content-Type и даёт понятные ошибки в DEV/PROD.
 */
final class JSONTransformer implements ITransformer
{
    /** @var DOMDocument|null */
    private ?DOMDocument $document = null;

    /**
     * Устанавливает XML-документ-источник.
     */
    public function setDocument(DOMDocument $document): void
    {
        $this->document = $document;
    }

    /**
     * Совместимость с интерфейсом. Для JSON не требуется XSLT-файл.
     */
    public function setFileName($transformerFilename, $isAbsolutePath = false): void
    {
        // noop
    }

    /**
     * Возвращает JSON-строку и выставляет заголовок Content-Type.
     *
     * @throws \SystemException
     */
    public function transform(): string
    {
        if (!$this->document instanceof DOMDocument) {
            throw new \SystemException('ERR_DEV_NO_DOCUMENT', \SystemException::ERR_DEVELOPER);
        }

        // Ищем элемент с id="result".
        // getElementById() работает только для атрибутов типа ID, поэтому делаем XPath-фолбэк.
        $node = $this->document->getElementById('result') ?: $this->findByIdXPath('result');
        if (!$node) {
            throw new \SystemException(
                'ERR_BAD_OPERATION_RESULT',
                \SystemException::ERR_CRITICAL,
                'Element with id="result" not found in XML.'
            );
        }

        // Берём текст (учтёт CDATA)
        $json = trim($node->textContent ?? '');


        if ($json === '') {
            throw new \SystemException(
                'ERR_BAD_OPERATION_RESULT',
                \SystemException::ERR_CRITICAL,
                'Empty JSON payload in element id="result".'
            );
        }

        // Срезаем возможный BOM
        $json = preg_replace('/^\xEF\xBB\xBF/', '', $json) ?? $json;

        // Валидируем JSON
        if (function_exists('json_validate')) {
            if (!json_validate($json)) {
                $this->throwBadJson($json);
            }
        } else {
            json_decode($json);
            if (json_last_error() !== JSON_ERROR_NONE) {
                $this->throwBadJson($json);
            }
        }

        // «Красивый» JSON в DEV или при document.pretty_json=true
        $prettyFlag = (bool)\BaseObject::_getConfigValue('document.pretty_json', false);
        $isDebug    = (defined('DEBUG') && DEBUG) || filter_var(getenv('APP_DEBUG') ?: '0', FILTER_VALIDATE_BOOL);
        if ($prettyFlag || $isDebug) {
            $decoded = json_decode($json, false, 512, JSON_THROW_ON_ERROR);
            $json    = json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }

        // Заголовок
        E()->getResponse()->setHeader('Content-Type', 'application/json; charset=UTF-8', false);

        return $json;
    }

    /**
     * XPath-фолбэк для поиска элемента по id.
     */
    private function findByIdXPath(string $id): ?DOMElement
    {
        $xp = new \DOMXPath($this->document);
        $n  = $xp->query(sprintf('//*[@id=%s]', json_encode($id)));
        return ($n && $n->length) ? $n->item(0) : null;
    }

    /**
     * Сформировать и бросить понятную ошибку о некорректном JSON.
     *
     * @throws \SystemException
     */
    private function throwBadJson(string $json): void
    {
        $snippet = mb_substr($json, 0, 500);
        $detail  = function_exists('json_last_error_msg') ? json_last_error_msg() : 'Invalid JSON';
        $msg     = "Invalid JSON payload: {$detail}. Snippet: {$snippet}";

        if (isset(E()->logger)) {
            E()->logger->error($msg, ['component' => 'json-transformer']);
        }

        throw new \SystemException('ERR_BAD_JSON', \SystemException::ERR_DEVELOPER, $msg);
    }
}
