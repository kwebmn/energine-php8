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