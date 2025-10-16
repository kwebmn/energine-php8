<?php

declare(strict_types=1);

/**
 * Базовый компонент страницы.
 * Совместим с PHP 8.3, строгие типы, аккуратные сигнатуры и комментарии.
 */
class Component extends DBWorker implements IBlock
{
    /** Имя состояния по умолчанию. */
    public const DEFAULT_STATE_NAME = 'main';

    /** DOM-документ для сборки результата. */
    protected DOMDocument $doc;

    /** Текущий HTTP-запрос. */
    protected Request $request;

    /** Параметры компонента. */
    protected array $params;

    /** Документ страницы. */
    public Document $document;

    /** Модуль, к которому относится компонент. */
    protected string $module;

    /** Объект ответа. */
    protected Response $response;

    /** Требуемый уровень прав для текущего состояния. */
    private int $rights;

    /** Имя компонента. */
    private string $name;

    /** Признак активности компонента. */
    private bool $enabled = true;

    /**
     * Реестр модальных состояний для компонента.
     *
     * @var array<string, callable|array>
     */
    private ?array $modalRegistry = null;

    /** Текущий активный модальный блок/компонент (если состояние модальное). */
    private ?IBlock $activeModalComponent = null;

    /**
     * Параметры состояния (из URI/конфига).
     * null — если параметров нет.
     *
     * @var array<string,mixed>|null
     */
    private ?array $stateParams = null;

    /** Произвольные свойства компонента (будут выведены как атрибуты корневого XML-узла). */
    private array $properties = [];

    /** Список ошибок работы компонента (не используется, оставлено для совместимости). */
    private array $errors = [];

    /** Имя текущего состояния. */
    private string $state = self::DEFAULT_STATE_NAME;

    /** Построитель результата. */
    protected ?IBuilder $builder = null;

    /** Конфигурация компонента. */
    protected ?ComponentConfig $config = null;

    /**
     * @param string     $name   Имя компонента.
     * @param string     $module Имя модуля.
     * @param array|null $params Параметры компонента.
     */
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct();

        $this->name     = $name;
        $this->module   = $module;
        $this->document = E()->getDocument();
        $this->params   = $this->defineParams();

        if (is_array($params))
        {
            foreach ($params as $pName => $pValue)
            {
                $this->setParam($pName, $pValue);
            }
        }

        $this->rights   = (int)$this->getParam('rights');
        $this->response = E()->getResponse();
        $this->request  = E()->getRequest();

        // DOM-документ результата
        $this->doc = new DOMDocument('1.0', 'UTF-8');

        // Регистрация в менеджере компонентов документа
        $this->document->componentManager->register($this);

        // Атрибуты шаблонов
        $template = $this->request->getPath(Request::PATH_TEMPLATE, true);
        $this->setProperty('template', $template);
        $this->setProperty(
            'single_template',
            $this->document->getProperty('single')
                ? $template
                : ($template . 'single/' . $this->getName() . '/')
        );

        // Определяем состояние
        $this->determineState();

        // Определяем sample (по интерфейсу вида SampleFoo → sample="Foo")
        $ifs = class_implements($this) ?: [];
        foreach ($ifs as $iname)
        {
            if (strtolower(substr($iname, 0, 6)) === 'sample')
            {
                $this->setProperty('sample', substr($iname, 6));
                break;
            }
        }
    }

    /**
     * Компонент активен?
     */
    final protected function isActive(): bool
    {
        return (bool)$this->params['active'];
    }

    /**
     * Конфигурация компонента (ленивая инициализация).
     */
    protected function getConfig(): ComponentConfig
    {
        if (!$this->config)
        {
            $this->config = new ComponentConfig(
                (string)$this->getParam('config'),
                get_class($this),
                $this->module
            );
        }
        return $this->config;
    }

    /**
     * Установить билдер результата.
     */
    final protected function setBuilder(IBuilder $builder): void
    {
        $this->builder = $builder;
    }

    /**
     * Получить билдер результата.
     */
    final protected function getBuilder(): ?IBuilder
    {
        return $this->builder;
    }

    /**
     * Список параметров по умолчанию.
     *
     * @return array{state:string,rights:int,config:bool,active:bool}
     */
    protected function defineParams(): array
    {
        return [
            'state'  => $this->state,
            'rights' => $this->document->getRights(),
            'config' => false,
            'active' => false,
        ];
    }

    /**
     * Установить значение параметра (если параметр определён).
     *
     * @throws SystemException
     */
    protected function setParam(string $name, mixed $value): void
    {
        if (!array_key_exists($name, $this->params))
        {
            throw new SystemException('ERR_DEV_NO_PARAM', SystemException::ERR_DEVELOPER, $name);
        }

        if ($name === 'active')
        {
            $value = (bool)$value;
        }

        // Пустые значения игнорируем, кроме явного false
        if ($value !== null && ($value !== '' || $value === false))
        {
            if (is_scalar($value))
            {
                // Поддержка формата "a|b|c"
                $parts = explode('|', (string)$value);
                $this->params[$name] = (count($parts) === 1) ? current($parts) : $parts;
            }
            elseif (is_array($value))
            {
                $this->params[$name] = $value;
            }
            else
            {
                $this->params[$name] = $value;
            }
        }
    }

    /**
     * Получить значение параметра (или null, если не определён).
     */
    final protected function getParam(string $name): mixed
    {
        return $this->params[$name] ?? null;
    }

    /**
     * Определить текущее состояние (из URL/конфига/POST).
     *
     * @throws SystemException
     */
    private function determineState(): void
    {
        // 1) Значение из параметров (по умолчанию — DEFAULT_STATE_NAME)
        $this->state = (string)$this->getParam('state');

        // 2) Если компонент активный — состояние берём из конфигурации по URI
        if ($this->isActive())
        {
            if ($this->getConfig()->isEmpty())
            {
                throw new SystemException(
                    'ERR_DEV_NO_COMPONENT_CONFIG',
                    SystemException::ERR_DEVELOPER,
                    $this->getName()
                );
            }

            $action = $this->getConfig()->getActionByURI(
                $this->request->getPath(Request::PATH_ACTION, true)
            );
            if ($action !== false)
            {
                $this->state       = (string)$action['name'];
                $this->stateParams = $action['params'] ?? null;
            }
        }
        // 3) Иначе — можно переопределить состояние через POST[..][state]
        elseif (isset($_POST[$this->getName()]['state']))
        {
            $this->state = (string)$_POST[$this->getName()]['state'];
        }

        // 4) Применяем параметры/права из конфигурации текущего состояния
        if (!$this->getConfig()->isEmpty())
        {
            $this->getConfig()->setCurrentState($this->getState());
            $sc = $this->getConfig()->getCurrentStateConfig() ?? [];

            if (isset($sc['rights']))
            {
                $this->rights = (int)$sc['rights'];
            }

            if ($csp = $this->getConfig()->getCurrentStateParams())
            {
                $this->stateParams = $this->stateParams
                    ? array_merge($this->stateParams, $csp)
                    : $csp;
            }
        }
    }

    /**
     * Текущее состояние.
     */
    final public function getState(): string
    {
        return $this->state;
    }

    /**
     * Уровень прав текущего состояния.
     */
    final public function getCurrentStateRights(): int
    {
        return (int)$this->rights;
    }

    /**
     * Имя компонента.
     */
    final public function getName(): string
    {
        return $this->name;
    }

    /**
     * Имя модуля, к которому относится компонент.
     */
    final public function getModule(): string
    {
        return $this->module;
    }

    /**
     * Запуск метода текущего состояния.
     *
     * @throws SystemException
     */
    public function run(): void
    {
        $this->clearActiveModalComponent();

        $params = $this->getStateParams() ?: [];

        if ($this->handleModalState($this->getState()))
        {
            return;
        }

        // Приоритет у методов с суффиксом "State"
        $methodState = $this->getState() . 'State';
        if (method_exists($this, $methodState))
        {
            call_user_func_array([$this, $methodState], $params);
            return;
        }

        if (method_exists($this, $this->getState()))
        {
            call_user_func_array([$this, $this->getState()], $params);
            return;
        }

        throw new SystemException(
            'ERR_DEV_NO_ACTION',
            SystemException::ERR_DEVELOPER,
            [$this->getState(), $this->getName()]
        );
    }

    /**
     * Действие по умолчанию: подготовка данных.
     */
    protected function main(): void
    {
        $this->prepare();
    }

    /**
     * Подготовка данных (переопределяется в наследниках).
     */
    protected function prepare(): void
    {
        // no-op
    }

    /** Отключить компонент. */
    final public function disable(): void
    {
        $this->enabled = false;
    }

    /** Включить компонент. */
    final public function enable(): void
    {
        $this->enabled = true;
    }

    /**
     * Компонент включён?
     */
    final public function enabled(): bool
    {
        return $this->enabled;
    }

    /**
     * Установить/обновить произвольное свойство.
     */
    final protected function setProperty(string $propName, mixed $propValue): void
    {
        $this->properties[$propName] = $propValue;
    }

    /**
     * Получить свойство (или false, если не задано — сохранена старая семантика).
     */
    final protected function getProperty(string $propName): mixed
    {
        return $this->properties[$propName] ?? false;
    }

    /**
     * Удалить свойство.
     */
    final protected function removeProperty(string $propName): void
    {
        unset($this->properties[$propName]);
    }

    /**
     * Построить результат компонента в виде DOMDocument.
     */
    public function build(): DOMDocument
    {
        if ($modal = $this->getActiveModalComponent())
        {
            return $modal->build();
        }

        $root = $this->doc->createElement('component');
        $root->setAttribute('name', $this->getName());
        $root->setAttribute('module', $this->module);
        $root->setAttribute('componentAction', $this->getState());
        $root->setAttribute('class', get_class($this));

        foreach ($this->properties as $propName => $propValue)
        {
            $root->setAttribute($propName, (string)$propValue);
        }

        // Если билдер есть и успешно собрал результат — подключаем его вывод
        if ($this->getBuilder() && $this->getBuilder()->build())
        {
            $builderResult = $this->getBuilder()->getResult();

            if ($builderResult instanceof DOMNode)
            {
                $root->appendChild($this->doc->importNode($builderResult, true));
            }
            else
            {
                $node = $this->doc->createElement('result', (string)$builderResult);
                $node->setAttribute('xml:id', 'result');
                $root->appendChild($node);
            }
        }

        $this->doc->appendChild($root);
        return $this->doc;
    }

    /**
     * Параметры текущего состояния.
     *
     * @param bool $returnAsAssocArray Если true — вернуть ассоциативный массив, иначе — list.
     * @return array<int|string,mixed>|null
     */
    public function getStateParams(bool $returnAsAssocArray = false): ?array
    {
        if (!$returnAsAssocArray && $this->stateParams !== null)
        {
            return array_values($this->stateParams);
        }
        return $this->stateParams;
    }

    /**
     * Установить параметр состояния (удобно при динамическом создании компонента).
     */
    public function setStateParam(string $paramName, mixed $paramValue): void
    {
        if ($this->stateParams === null)
        {
            $this->stateParams = [];
        }
        $this->stateParams[$paramName] = $paramValue;
    }

    /**
     * Карта URI-паттернов для модальных состояний.
     *
     * Потомки могут вернуть массив вида
     * `['stateName' => ['/pattern/', '/another/']]` либо
     * `['stateName' => ['patterns' => [...], 'rights' => 3]]`, чтобы
     * `ComponentConfig` автоматически зарегистрировал необходимые состояния.
     *
     * @return array<string, array<int, string>|array{patterns: array<int, string>, rights?: int}>
     */
    public static function getModalRoutePatterns(): array
    {
        return [];
    }

    /**
     * Переопределяемый метод регистрации модальных состояний.
     *
     * @return array<string, callable|array>
     */
    protected function registerModals(): array
    {
        return [];
    }

    /** Получить текущий HTTP-запрос. */
    final protected function getRequest(): Request
    {
        return $this->request;
    }

    /** Установить активный модальный блок/компонент. */
    final protected function setActiveModalComponent(IBlock $component): void
    {
        $this->activeModalComponent = $component;
    }

    /** Возвращает активный модальный блок/компонент (если есть). */
    final protected function getActiveModalComponent(): ?IBlock
    {
        return $this->activeModalComponent;
    }

    /** Сбросить активный модальный компонент. */
    final protected function clearActiveModalComponent(): void
    {
        $this->activeModalComponent = null;
    }

    /** Создать, запустить и сделать активным модальный компонент. */
    final protected function activateModalComponent(
        string $name,
        string $module,
        string $class,
        ?array $params = null
    ): Component {
        $component = $this->document->componentManager->createComponent($name, $module, $class, $params);
        $component->run();
        $this->setActiveModalComponent($component);

        return $component;
    }

    /** Получить нормализованный реестр модальных состояний. */
    private function getModalRegistry(): array
    {
        if ($this->modalRegistry === null)
        {
            $registry = $this->registerModals();
            $this->modalRegistry = is_array($registry) ? $registry : [];
        }

        return $this->modalRegistry;
    }

    /** Проверить и обработать модальное состояние. */
    private function handleModalState(string $state): bool
    {
        $registry = $this->getModalRegistry();

        if (!array_key_exists($state, $registry))
        {
            return false;
        }

        $stateParams = $this->getStateParams(true) ?? [];
        $definition = $registry[$state];

        if (is_callable($definition))
        {
            $component = $definition($this, $stateParams);

            if (!$component instanceof IBlock)
            {
                throw new SystemException('ERR_DEV_BAD_DATA', SystemException::ERR_DEVELOPER, $state);
            }

            if ($this->getActiveModalComponent() !== $component)
            {
                $component->run();
                $this->setActiveModalComponent($component);
            }

            return true;
        }

        if (!is_array($definition) || !isset($definition['class']))
        {
            throw new SystemException('ERR_DEV_BAD_DATA', SystemException::ERR_DEVELOPER, $state);
        }

        $name = $definition['name'] ?? $state;
        $module = $definition['module'] ?? $this->module;
        $params = $definition['params'] ?? null;

        if (is_callable($params))
        {
            $params = $params($this, $stateParams);
        }

        if ($params !== null && !is_array($params))
        {
            $params = (array)$params;
        }

        /** @var Component $component */
        $component = $this->document->componentManager->createComponent($name, $module, $definition['class'], $params);

        if (isset($definition['configure']) && is_callable($definition['configure']))
        {
            $definition['configure']($this, $component, $stateParams);
        }

        $component->run();
        $this->setActiveModalComponent($component);

        return true;
    }
}

/**
 * Интерфейс билдера результата компонента.
 */
interface IBuilder
{
    /**
     * Получить результат сборки (DOMNode|string|array…).
     */
    public function getResult(): mixed;

    /**
     * Выполнить сборку результата.
     */
    public function build(): bool;
}
