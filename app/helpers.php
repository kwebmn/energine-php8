<?php
declare(strict_types=1);

use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;

/**
 * Глобальные хелперы для legacy-кода Energine.
 */
if (!function_exists('container')) {
    /**
     * Получить общий DI-контейнер (PHP-DI).
     *
     * @throws \RuntimeException если контейнер недоступен
     */
    function container(): ContainerInterface {
        if (class_exists('\\Registry') && method_exists('\\Registry', 'getContainer')) {
            $c = \Registry::getContainer();
            if ($c instanceof ContainerInterface) {
                return $c;
            }
        }

        if (class_exists('\\Registry') && method_exists('\\Registry', 'getInstance')) {
            $reg = \Registry::getInstance();
            if (method_exists($reg, 'getContainerInstance')) {
                $c = $reg->getContainerInstance();
                if ($c instanceof ContainerInterface) {
                    return $c;
                }
            }
        }

        throw new \RuntimeException('DI container недоступен. Убедитесь, что bootstrap инициализировал PHP-DI.');
    }
}

if (!function_exists('E')) {
    /**
     * Сервис-локатор реестра.
     *
     * @return \\Registry
     */
    function E() {
        if (function_exists('container')) {
            try {
                $c = container();
                if ($c->has(\Registry::class)) {
                    $registry = $c->get(\Registry::class);
                    if ($registry instanceof \Registry) {
                        return $registry;
                    }
                }
                if ($c->has('registry')) {
                    $registry = $c->get('registry');
                    if ($registry instanceof \Registry) {
                        return $registry;
                    }
                }
            } catch (NotFoundExceptionInterface|ContainerExceptionInterface) {
                // fallback ниже
            } catch (\RuntimeException) {
                // контейнер ещё не доступен — fallback ниже
            }
        }

        if (class_exists('\\Registry') && method_exists('\\Registry', 'getInstance')) {
            return \Registry::getInstance();
        }

        throw new \RuntimeException(
            'Registry недоступен. Проверь classmap в composer.json (core/modules, site/modules, site/kernel).'
        );
    }
}
