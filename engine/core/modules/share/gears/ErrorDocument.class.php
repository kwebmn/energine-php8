<?php

declare(strict_types=1);

/**
 * ErrorDocument — документ для отображения ошибок.
 *
 * Генерирует унифицированный XML с метаданными страницы и блоком <errors>.
 * В режиме JSON (DocumentController::TRANSFORM_JSON) в элемент с id="result"
 * кладётся JSON-строка (её подхватит JSONTransformer).
 */
final class ErrorDocument extends BaseObject implements IDocument
{
    /** @var DOMDocument|null */
    private ?DOMDocument $doc = null;

    /** @var SystemException|null */
    private ?SystemException $e = null;

    /**
     * Прикрепить исключение для отображения.
     */
    public function attachException(SystemException $e): void
    {
        $this->e = $e;
    }

    /**
     * Построить XML-документ ошибки.
     */
    public function build(): void
    {
        // Базовая инициализация
        $this->doc = new DOMDocument('1.0', 'UTF-8');
        $this->doc->formatOutput = false;

        $root = $this->doc->createElement('document');
        $root->setAttribute('debug', (string)$this->getConfigValue('site.debug'));
        $root->setAttribute('url', (string)E()->getRequest()->getURI());
        $this->doc->appendChild($root);

        // Свойства документа (base, folder, lang и т.п.)
        $props = $this->doc->createElement('properties');
        $root->appendChild($props);

        $siteManager = E()->getSiteManager();
        $curSite     = $siteManager->getCurrentSite();

        $baseValue = (string)$curSite->base;
        $propBase = $this->doc->createElement('property', $baseValue);
        $propBase->setAttribute('name', 'base');
        $propBase->setAttribute('value', $baseValue);
        $propBase->setAttribute('static', (string)($this->getConfigValue('site.static') ?: $baseValue));
        $propBase->setAttribute('media', (string)($this->getConfigValue('site.media') ?: $baseValue));
        $propBase->setAttribute('resizer', (string)($this->getConfigValue('site.resizer') ?: ($siteManager->getDefaultSite()->base . 'resizer/')));
        $propBase->setAttribute('folder', (string)$curSite->folder);
        $propBase->setAttribute('default', (string)$siteManager->getDefaultSite()->base);
        $props->appendChild($propBase);

        $lang      = E()->getLanguage();
        $langID    = (int)$lang->getCurrent();
        $langValue = (string)$langID;
        $propLang  = $this->doc->createElement('property', $langValue);
        $propLang->setAttribute('name', 'lang');
        $propLang->setAttribute('value', $langValue);
        $propLang->setAttribute('abbr', (string)E()->getRequest()->getLangSegment());
        $propLang->setAttribute('default', (string)$lang->getDefault());
        $propLang->setAttribute('real_abbr', (string)$lang->getAbbrByID($langID));
        $props->appendChild($propLang);

        $uiValue = $this->getUiFramework();
        $propUi = $this->doc->createElement('property', $uiValue);
        $propUi->setAttribute('name', 'ui');
        $propUi->setAttribute('value', $uiValue);
        $props->appendChild($propUi);

        // Контейнер ошибок
        $errorsNode = $this->doc->createElement('errors');
        // Важно: JSONTransformer в некоторых проектах ищет id="result", где-то — xml:id.
        // Поставим оба атрибута для полной совместимости.
        $errorsNode->setAttribute('xml:id', 'result');
        $errorsNode->setAttribute('id', 'result');
        $root->appendChild($errorsNode);

        // Если исключение не передали — сгенерируем "универсальную" ошибку
        $ex = $this->e ?? new SystemException('ERR_UNEXPECTED', SystemException::ERR_CRITICAL);

        $vm = E()->getController()->getViewMode();

        if ($vm === DocumentController::TRANSFORM_JSON)
        {
            // Исторически: массив ошибок — первый элемент с message, затем customMessages (если есть)
            $errors = [['message' => $ex->getMessage()]];
            $custom = $ex->getCustomMessage();

            if (is_array($custom) && !empty($custom))
            {
                $errors[] = $custom;
            }

            $payload = [
                'result' => false,
                'errors' => $errors,
            ];

            // В JSON-узел кладём строку JSON (её отдаст JSONTransformer)
            $errorsNode->appendChild(
                new DOMText(json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES))
            );
        }
        else
        {
            // XML/HTML представление
            $errorNode = $this->doc->createElement('error');
            $errorsNode->appendChild($errorNode);

            $errorNode->appendChild($this->doc->createElement('message', (string)$ex->getMessage()));
            // Базовые атрибуты
            $errorNode->setAttribute('file', (string)$ex->getFile());
            $errorNode->setAttribute('line', (string)$ex->getLine());

            // Дополнительные сообщения (массивы разворачиваем)
            $custom = $ex->getCustomMessage();
            if (is_array($custom) && !empty($custom))
            {
                foreach ($custom as $message)
                {
                    if (is_array($message))
                    {
                        $message = implode(', ', $message);
                    }
                    $errorNode->appendChild($this->doc->createElement('customMessage', (string)$message));
                }
            }

            // В HTML-режиме можно подменить XSLT-шаблон на спец. страницу ошибки
            if ($vm === DocumentController::TRANSFORM_HTML)
            {
                $transformer = E()->getController()->getTransformer();
                if ($this->getUiFramework() === 'mdbootstrap')
                {
                    try
                    {
                        $transformer->setFileName('error_page_md.xslt');
                    }
                    catch (SystemException $exception)
                    {
                        $transformer->setFileName('error_page.xslt');
                    }
                }
                else
                {
                    $transformer->setFileName('error_page.xslt');
                }
            }

            // В debug-режиме можно добавить trace (опционально, без ломки XSLT)
            $isDebug = (bool)$this->getConfigValue('site.debug');
            if ($isDebug)
            {
                $traceEl = $this->doc->createElement('trace');
                $traceEl->appendChild(
                    $this->doc->createCDATASection($ex->getTraceAsString())
                );
                $errorNode->appendChild($traceEl);
            }
        }
    }

    /**
     * Вернуть собранный XML.
     */
    public function getResult(): DOMDocument
    {
        // На случай, если забыли вызвать build()
        if (!$this->doc instanceof DOMDocument)
        {
            $this->build();
        }
        return $this->doc;
    }
}
