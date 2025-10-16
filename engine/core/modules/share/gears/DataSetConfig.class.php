<?php

declare(strict_types=1);

/**
 * DataSet configuration (PHP 8.x).
 *
 * Наследует базовую логику ComponentConfig и регистрирует дополнительные
 * состояния с прежними паттернами URI.
 */
class DataSetConfig extends ComponentConfig
{
    /**
     * @param mixed  $config     Путь к файлу конфига, сам SimpleXMLElement или false
     * @param string $className  Имя класса компонента
     * @param string $moduleName Имя модуля
     *
     * @throws SystemException
     */
    public function __construct(mixed $config, string $className, string $moduleName)
    {
        parent::__construct($config, $className, $moduleName);

        if (class_exists($className) && is_subclass_of($className, Component::class))
        {
            foreach ($className::getModalRoutePatterns() as $state => $definition)
            {
                $patterns = $definition;
                $rights   = false;

                if (is_array($definition) && array_key_exists('patterns', $definition))
                {
                    $patterns = $definition['patterns'];
                    $rights   = $definition['rights'] ?? false;
                }

                if (!is_array($patterns))
                {
                    $patterns = [$patterns];
                }

                $this->registerState($state, $patterns, $rights);
            }
        }

        $this->registerState('embedPlayer', ['/embed-player/[uplId]/']);
    }
}
