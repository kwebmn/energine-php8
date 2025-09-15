<?php
declare(strict_types=1);

namespace App\Bridge\Http;

use Symfony\Component\HttpFoundation\Response as SResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Класс LegacyResponse.
 * Обёртка над Symfony Response для совместимости со старым API
 * и удобного управления HTTP-ответом.
 * Использование: $resp = new LegacyResponse(); $resp->setBody('ok'); $resp->commit();
 */
final class LegacyResponse {
    private SResponse $resp;

    /**
     * Создаёт обёртку над ответом Symfony.
     * Если исходный ответ не передан, создаётся новый.
     *
     * @param SResponse|null $resp Исходный объект ответа
     */
    public function __construct(?SResponse $resp = null) {
        $this->resp = $resp ?? new SResponse();
    }

    /**
     * Устанавливает заголовок ответа.
     *
     * @param string $name  Имя заголовка
     * @param string $value Значение заголовка
     * @param bool   $replace Заменять ли существующее значение
     */
    public function setHeader(string $name, string $value, bool $replace = true): void {
        $this->resp->headers->set($name, $value, !$replace ? false : true);
    }

    /**
     * Добавляет заголовок без замены существующего значения.
     *
     * @param string $name  Имя заголовка
     * @param string $value Значение заголовка
     */
    public function addHeader(string $name, string $value): void {
        $this->resp->headers->set($name, $value, false);
    }

    /**
     * Устанавливает статус код ответа.
     *
     * @param int $code HTTP статус
     */
    public function setStatus(int $code): void { $this->resp->setStatusCode($code); }

    /**
     * Задаёт содержимое ответа.
     *
     * @param string $content Тело ответа
     */
    public function setBody(string $content): void { $this->resp->setContent($content); }

    /**
     * Дописывает текст в конец текущего тела ответа.
     *
     * @param string $content Дополнительное содержимое
     */
    public function appendBody(string $content): void { $this->resp->setContent(($this->resp->getContent() ?? '').$content); }

    /**
     * Формирует JSON-ответ.
     *
     * @param mixed $data   Данные для кодирования
     * @param int   $status Код состояния
     */
    public function json(mixed $data, int $status = 200): void {
        $this->resp->setStatusCode($status);
        $this->resp->headers->set('Content-Type', 'application/json; charset=utf-8');
        $this->resp->setContent(json_encode($data, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES));
    }

    /**
     * Выполняет перенаправление на другой URL.
     *
     * @param string $url   Адрес перенаправления
     * @param int    $status Код состояния
     */
    public function redirect(string $url, int $status = 302): void {
        $this->resp->headers->set('Location', $url);
        $this->resp->setStatusCode($status);
        $this->resp->setContent('');
    }

    /**
     * Отправляет файл клиенту.
     *
     * @param string      $path       Путь к файлу
     * @param string|null $downloadAs Имя файла для скачивания
     */
    public function sendFile(string $path, ?string $downloadAs = null): void {
        $r = new StreamedResponse(function () use ($path) {
            $fh = fopen($path, 'rb');
            if ($fh) { fpassthru($fh); fclose($fh); }
        }, 200, [
            'Content-Type'        => mime_content_type($path) ?: 'application/octet-stream',
            'Content-Length'      => (string) filesize($path),
            'Content-Disposition' => $downloadAs
                ? 'attachment; filename="'.basename($downloadAs).'"'
                : 'inline; filename="'.basename($path).'"',
        ]);
        $this->resp = $r;
    }

    /**
     * Сбрасывает состояние ответа.
     */
    public function clear(): void { $this->resp = new SResponse(); }

    /**
     * Отправляет ответ клиенту.
     */
    public function commit(): void { $this->resp->send(); }

    /**
     * Возвращает исходный объект Symfony Response.
     */
    public function raw(): SResponse { return $this->resp; }
}
