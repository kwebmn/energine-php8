<?php
namespace App\Image;

use League\Glide\Server;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

final class ImageService
{
    private const MAX_W = 2560;
    private const MAX_H = 2560;
    private const MAX_PIXELS = 4000000;
    private const ALLOWED_FIT = ['crop','max','contain','cover','fill','inside','outside'];
    private const ALLOWED_FM = ['jpeg','png','webp','avif'];

    public function __construct(private Server $glide, private UrlSigner $signer, private array $cfg = [])
    {
    }

    public function render(Request $req, string $path, array $params): Response
    {
        $this->lazyGc();

        try {
            $normalized = $this->normalize($params);
        } catch (\Throwable $e) {
            return new Response('Bad request', 400);
        }

        if (str_contains($path, '..') || preg_match('#^https?://#i', $path)) {
            return new Response('Not found', 404);
        }

        // verify signature except debug mode
        $debug = (bool) (E()->getConfigValue('site.debug') ?? false);
        if (!$debug && ($this->cfg['sign_key'] ?? '') !== '') {
            $sig = $params['s'] ?? '';
            if ($sig === '' || !$this->signer->verify($req->getMethod(), $req->getPathInfo(), $normalized, $sig)) {
                return new Response('Forbidden', 403);
            }
        }

        unset($normalized['s']);

        try {
            $response = $this->glide->getImageResponse($path, $normalized);
        } catch (\Throwable $e) {
            return new Response('Not found', 404);
        }

        $response->headers->set('Cache-Control', 'public, max-age=31536000, immutable');
        return $response;
    }

    private function lazyGc(): void
    {
        $cache = $this->cfg['cache'] ?? null;
        $maxAge = (int)($this->cfg['cache_max_age'] ?? 0);
        $interval = (int)($this->cfg['gc_interval'] ?? 0);
        if (!$cache || $maxAge <= 0 || $interval <= 0) {
            return;
        }

        $tsFile = rtrim($cache, '/').'/'.'.gc_timestamp';
        $now = time();
        $last = is_file($tsFile) ? (int)@file_get_contents($tsFile) : 0;
        if ($now - $last < $interval) {
            return;
        }

        $it = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($cache, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($it as $file) {
            if (!$file->isFile()) {
                continue;
            }
            if ($file->getPathname() === $tsFile) {
                continue;
            }
            if ($now - $file->getMTime() >= $maxAge) {
                @unlink($file->getPathname());
            }
        }
        @file_put_contents($tsFile, (string)$now);
    }

    private function normalize(array $params): array
    {
        $w = isset($params['w']) ? (int)$params['w'] : null;
        $h = isset($params['h']) ? (int)$params['h'] : null;
        $fit = $params['fit'] ?? ($this->cfg['defaults']['fit'] ?? 'max');
        $q = isset($params['q']) ? (int)$params['q'] : ($this->cfg['defaults']['q'] ?? 80);
        $fm = $params['fm'] ?? null;
        $dpr = isset($params['dpr']) ? (int)$params['dpr'] : 1;

        if ($dpr < 1 || $dpr > 3) {
            $dpr = 1;
        }

        if ($w) {
            $w = min($w * $dpr, self::MAX_W);
        }
        if ($h) {
            $h = min($h * $dpr, self::MAX_H);
        }
        if ($w && $h && $w * $h > self::MAX_PIXELS) {
            throw new \InvalidArgumentException('too big');
        }

        if (!in_array($fit, self::ALLOWED_FIT, true)) {
            throw new \InvalidArgumentException('bad fit');
        }
        if ($fm && !in_array($fm, self::ALLOWED_FM, true)) {
            throw new \InvalidArgumentException('bad fm');
        }
        $q = max(40, min(95, $q));

        $out = [];
        if ($w) { $out['w'] = $w; }
        if ($h) { $out['h'] = $h; }
        $out['fit'] = $fit;
        $out['q'] = $q;
        if ($fm) { $out['fm'] = $fm; }
        if ($dpr > 1) { $out['dpr'] = $dpr; }
        if (isset($params['s'])) { $out['s'] = (string)$params['s']; }
        return $out;
    }
}
