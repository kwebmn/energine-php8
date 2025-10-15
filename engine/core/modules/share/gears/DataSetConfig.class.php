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

        // Сохраняем прежние паттерны
        $this->registerState('source', ['/source/']);
        $this->registerState('imageManager', ['/imagemanager/']);
        $this->registerState('fileLibrary', ['/file-library/', '/file-library/[any]/']);
        $this->registerState('embedPlayer', ['/embed-player/[uplId]/']);
    }
}
