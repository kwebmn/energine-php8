<?php

declare(strict_types=1);

/**
 * Event handler mixin: даёт хуки до/после этапов жизненного цикла компонента.
 *
 * Механика:
 *  - Вызовы eSomething(...) автоматически маппятся на onSomething(...), если он определён в классе-хосте.
 *  - Для run(): вызываются eBefore<State>State() и e<State>State() (если обработчики есть).
 *
 * @version 68326f5
 */
trait EventHandler
{
    /**
     * Define parameters with event hooks.
     *
     * @return array Массив параметров компонента.
     */
    protected function defineParams(): array
    {
        $base = parent::defineParams();
        $new  = $this->eDefineParams();

        if (!is_array($base))
        {
            $base = [];
        }
        if (!is_array($new))
        {
            $new = [];
        }

        return array_merge($base, $new);
    }

    /**
     * Load data description with event hooks.
     *
     * @return array|false|null Описание данных или {@c null/false}, если описание недоступно.
     */
    protected function loadDataDescription(): array|false|null
    {
        $this->eBeforeLoadMetaData();
        $result = parent::loadDataDescription();
        $this->eLoadMetaData($result);

        return $result;
    }

    /**
     * Create data description with event hooks.
     *
     * @return DataDescription Сформированное описание данных.
     */
    protected function createDataDescription(): DataDescription
    {
        $this->eBeforeCreateDataDescription();
        $dataDescription = parent::createDataDescription();
        $this->eCreateDataDescription($dataDescription);

        return $dataDescription;
    }

    /**
     * Create data with event hooks.
     *
     * @return Data Сформированные данные.
     */
    protected function createData(): Data
    {
        $this->eBeforeCreateData();
        $data = parent::createData();
        $this->eCreateData($data);

        return $data;
    }

    /**
     * Load data with event hooks.
     *
     * @return array|false|null Загруженные данные или {@c null/false}, если данных нет.
     */
    protected function loadData(): array|false|null
    {
        $this->eBeforeLoadData();
        $result = parent::loadData();
        $this->eLoadData($result);

        return $result;
    }

    /**
     * Prepare with event hooks.
     */
    protected function prepare(): void
    {
        $this->eBeforePrepare();
        parent::prepare();
        $this->ePrepare();
    }

    /**
     * Run with state-specific event hooks.
     */
    public function run(): void
    {
        $state = method_exists($this, 'getState') ? (string)$this->getState() : '';
        $beforeMethod = 'eBefore' . ucfirst($state) . 'State';
        $afterMethod  = 'e' . ucfirst($state) . 'State';

        // Вызовы попадут в __call(), если соответствующих методов нет
        $this->$beforeMethod();
        parent::run();
        $this->$afterMethod();
    }

    /**
     * Magic call: eXxx(...) → onXxx(...)
     *
     * @param string $name Имя вызываемого метода.
     * @param array  $args Аргументы вызова.
     *
     * @throws SystemException 'ERR_NO_METHOD'
     * @return mixed Результат вызова обработчика.
     */
    public function __call(string $name, array $args): mixed
    {
        // Разрешаем только e*-вызовы как псевдо-события
        if ($name !== '' && $name[0] === 'e')
        {
            $eventName = 'on' . ucfirst(substr($name, 1));
            if (is_callable([$this, $eventName]))
            {
                return $this->$eventName(...$args);
            }
            // Отсутствие обработчика onXxx — это норма: просто ничего не делаем
            return null;
        }

        // Прочие несуществующие методы — это ошибка разработчика
        throw new SystemException('ERR_NO_METHOD', SystemException::ERR_DEVELOPER, $name);
    }
}
