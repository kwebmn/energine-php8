<?php
declare(strict_types=1);

use Psr\Container\ContainerInterface;

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

if (!function_exists('container')) {
    /**
     * Получить общий DI-контейнер (PHP-DI).
     *
     * @throws \RuntimeException если контейнер недоступен
     */
    function container(): ContainerInterface {
        if (class_exists('\Registry') && method_exists('\Registry', 'getContainer')) {
            $c = \Registry::getContainer();
            if ($c instanceof ContainerInterface) {
                return $c;
            }
        }

        $reg = function_exists('E') ? E() : null;
        if ($reg instanceof \Registry && method_exists($reg, 'getContainerInstance')) {
            $c = $reg->getContainerInstance();
            if ($c instanceof ContainerInterface) {
                return $c;
            }
        }

        throw new \RuntimeException('DI container недоступен. Убедитесь, что bootstrap инициализировал PHP-DI.');
    }
}
