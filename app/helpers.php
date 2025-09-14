<?php
declare(strict_types=1);

/**
 * Глобальные хелперы для legacy-кода Energine.
 */
if (!function_exists('E')) {
    /**
     * Сервис-локатор реестра.
     * @return \Registry
     */
    function E() {
        if (class_exists('\Registry') && method_exists('\Registry', 'getInstance')) {
            return \Registry::getInstance();
        }
        throw new \RuntimeException(
            'Registry недоступен. Проверь classmap в composer.json (core/modules, site/modules, site/kernel).'
        );
    }
}

if (!function_exists('glide_url')) {
    /**
     * Сформировать подписанный URL для изображения.
     */
    function glide_url(string $path, array $params = []): string {
        $defaults = (array) (E()->getConfigValue('images.defaults') ?? ['fit' => 'max', 'q' => 80]);
        $p = array_filter(array_merge($defaults, $params), static fn($v) => $v !== null && $v !== '');
        ksort($p);
        $key = (string) (E()->getConfigValue('images.sign_key') ?? '');
        $signer = new \App\Image\UrlSigner($key);
        $urlPath = '/img/' . ltrim($path, '/');
        $p['s'] = $signer->sign('GET', $urlPath, $p);
        return $urlPath . '?' . http_build_query($p);
    }
}

if (!function_exists('glide_srcset')) {
    /**
     * Сформировать srcset с подписанными ссылками.
     * @return string готовая строка srcset
     */
    function glide_srcset(string $path, array $widths, array $baseParams = []): string {
        $items = [];
        foreach ($widths as $w) {
            $url = glide_url($path, array_merge($baseParams, ['w' => $w]));
            $items[] = $url . ' ' . $w . 'w';
        }
        return implode(', ', $items);
    }
}