<?php
declare(strict_types=1);

namespace App\Bridge\Http;

use Symfony\Component\HttpFoundation\Request as SRequest;

final class LegacyRequest {
    private ?string $langAbbr = null;
    private ?int    $langId   = null;

    public function __construct(private SRequest $req) {}

    public static function fromGlobals(): self {
        return new self(SRequest::createFromGlobals());
    }

    /* ===== Совместимость со старым API ===== */

    // ВАЖНО: старый код ожидал от getURI() МАССИВ сегментов
    // PHP нечувствителен к регистру в именах методов, поэтому getUri() == getURI()
    public function getUri(): array { return $this->getUriSegments(); }

    // Если где-то нужен строковый путь — есть getPath()
    public function getPath(): string { return $this->req->getPathInfo(); }

    public function getMethod(): string { return $this->req->getMethod(); }
    public function getQueryString(): ?string { return $this->req->getQueryString(); }
    public function isAjax(): bool { return $this->req->isXmlHttpRequest(); }
    public function getIp(): string { return $this->req->getClientIp() ?? ''; }

    public function getParam(string $name, mixed $default = null): mixed {
        return $this->req->request->all()[$name]
            ?? $this->req->query->all()[$name]
            ?? $this->req->attributes->get($name, $default);
    }
    public function getHeader(string $name, mixed $default = null): mixed { return $this->req->headers->get($name, $default); }
    public function getCookie(string $name, mixed $default = null): mixed { return $this->req->cookies->get($name, $default); }
    public function getFiles(): array { return $this->req->files->all(); }

    /**
     * Аббревиатура языка (uk/ru/…).
     * Источники приоритетом: 1) первый сегмент пути, 2) _locale, 3) ?lang, 4) cookie lang,
     * 5) Accept-Language, 6) Language::getDefault()/config i18n.default_locale/'uk'.
     * При первом вызове синхронизирует E()->getLanguage()->setCurrent($id).
     */
    public function getLang(): string {
        if ($this->langAbbr !== null) return $this->langAbbr;

        $candidates = [];

        // 1) первый сегмент пути
        $seg0 = $this->firstPathSegment();
        if ($seg0 !== '') $candidates[] = $seg0;

        // 2) _locale
        $loc = (string)($this->req->attributes->get('_locale') ?? '');
        if ($loc !== '') $candidates[] = $loc;

        // 3) ?lang
        $qLang = (string)($this->req->query->get('lang') ?? '');
        if ($qLang !== '') $candidates[] = $qLang;

        // 4) cookie lang
        $cLang = (string)($this->req->cookies->get('lang') ?? '');
        if ($cLang !== '') $candidates[] = $cLang;

        // 5) Accept-Language
        $al = (string)($this->req->headers->get('Accept-Language') ?? '');
        foreach ($this->parseAcceptLanguage($al) as $alCode) { $candidates[] = $alCode; }

        $supported = $this->getSupportedLangs(); // abbr => id
        $chosenAbbr = null;
        foreach ($candidates as $cand) {
            $abbr = $this->normalizeAbbr($cand);
            if ($abbr !== '' && isset($supported[$abbr])) { $chosenAbbr = $abbr; break; }
        }
        if ($chosenAbbr === null) $chosenAbbr = $this->getDefaultAbbr($supported);

        $this->langAbbr = $chosenAbbr;
        $this->langId   = $supported[$chosenAbbr] ?? null;

        if ($this->langId !== null) {
            try { \E()->getLanguage()->setCurrent($this->langId); }
            catch (\Throwable $e) { \E()->logger?->warning('Cannot set current language', ['id'=>$this->langId,'e'=>$e->getMessage()]); }
        }

        return $this->langAbbr;
    }

    /** ID языка; лениво инициализируется через getLang() */
    public function getLangID(): int {
        if ($this->langId === null) $this->getLang();
        if ($this->langId === null) {
            try { $id = \E()->getLanguage()->getCurrent(); if (is_int($id)) $this->langId = $id; } catch (\Throwable) {}
        }
        return $this->langId ?? 0;
    }

    /* ===== Новые удобные методы ===== */

    /** Массив сегментов URI: ['news','item','123'] */
    public function getUriSegments(): array {
        $path = $this->req->getPathInfo();
        $segments = array_values(array_filter(explode('/', trim($path, '/')), 'strlen'));
        return $segments;
    }

    /** Оригинальный объект Symfony Request (на случай, если вдруг нужен) */
    public function raw(): SRequest { return $this->req; }

    /* ===== Helpers ===== */

    private function firstPathSegment(): string {
        $segs = $this->getUriSegments();
        return $segs[0] ?? '';
    }

    private function getSupportedLangs(): array {
        $map = [];
        try {
            $langs = \E()->getLanguage()->getLanguages(); // [id => ['lang_abbr'=>..., ...], ...]
            foreach ($langs as $id => $info) {
                $abbr = isset($info['lang_abbr']) ? $this->normalizeAbbr((string)$info['lang_abbr']) : '';
                if ($abbr !== '') $map[$abbr] = (int)$id;
            }
        } catch (\Throwable $e) {
            \E()->logger?->warning('Language service unavailable', ['e'=>$e->getMessage()]);
        }
        return $map;
    }

    private function getDefaultAbbr(array $supported): string {
        try {
            $defId = \E()->getLanguage()->getDefault();
            if (is_int($defId)) {
                $abbr = $this->normalizeAbbr((string)\E()->getLanguage()->getAbbrByID($defId));
                if ($abbr !== '') return $abbr;
            }
        } catch (\Throwable) {}
        $cfg = 'uk';
        try {
            $cfgVal = (string)(\E()->getConfigValue('i18n.default_locale') ?? '');
            if ($cfgVal !== '') $cfg = $this->normalizeAbbr($cfgVal);
        } catch (\Throwable) {}
        if (!isset($supported[$cfg]) && !empty($supported)) $cfg = array_key_first($supported);
        return $cfg ?: 'uk';
    }

    private function normalizeAbbr(string $s): string {
        $s = trim($s);
        if ($s === '') return '';
        $s = str_replace('_', '-', $s);
        $s = explode(',', $s)[0];
        $s = strtolower($s);
        $s = explode('-', $s)[0]; // берём двухбуквенный код
        return $s;
    }

    private function parseAcceptLanguage(string $header): array {
        if ($header === '') return [];
        $out = [];
        foreach (explode(',', $header) as $part) {
            $part = trim($part);
            if ($part === '') continue;
            [$val, $q] = array_pad(explode(';q=', $part, 2), 2, '1');
            $abbr = $this->normalizeAbbr($val);
            $qv   = (float)$q;
            if ($abbr !== '') $out[$abbr] = max($out[$abbr] ?? 0, $qv);
        }
        arsort($out, SORT_NUMERIC);
        return array_keys($out);
    }
}
