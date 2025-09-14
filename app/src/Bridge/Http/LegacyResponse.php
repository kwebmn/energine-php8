<?php
declare(strict_types=1);

namespace App\Bridge\Http;

use Symfony\Component\HttpFoundation\Response as SResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class LegacyResponse {
    private SResponse $resp;

    public function __construct(?SResponse $resp = null) {
        $this->resp = $resp ?? new SResponse();
    }

    public function setHeader(string $name, string $value, bool $replace = true): void {
        $this->resp->headers->set($name, $value, !$replace ? false : true);
    }
    public function addHeader(string $name, string $value): void {
        $this->resp->headers->set($name, $value, false);
    }
    public function setStatus(int $code): void { $this->resp->setStatusCode($code); }

    public function setBody(string $content): void { $this->resp->setContent($content); }
    public function appendBody(string $content): void { $this->resp->setContent(($this->resp->getContent() ?? '').$content); }

    public function json(mixed $data, int $status = 200): void {
        $this->resp->setStatusCode($status);
        $this->resp->headers->set('Content-Type', 'application/json; charset=utf-8');
        $this->resp->setContent(json_encode($data, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES));
    }

    public function redirect(string $url, int $status = 302): void {
        $this->resp->headers->set('Location', $url);
        $this->resp->setStatusCode($status);
        $this->resp->setContent('');
    }

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

    public function clear(): void { $this->resp = new SResponse(); }
    public function commit(): void { $this->resp->send(); }
    public function raw(): SResponse { return $this->resp; }
}
