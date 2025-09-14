<?php
declare(strict_types=1);

/**
 * Store the component name that should be removed (disabled).
 * Used to show/hide components depending on user rights.
 */
class Remover extends Component
{
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);
    }

    /**
     * Добавлен параметр componentName (имя компонента) и флаг force.
     */
    protected function defineParams(): array
    {
        return array_merge(
            parent::defineParams(),
            [
                'componentName' => false,
                'force'         => false,
            ]
        );
    }

    /**
     * Деактивирует целевой компонент по правилам доступа.
     */
    protected function main(): void
    {
        $componentName = (string)$this->getParam('componentName');
        if ($componentName === '') {
            return;
        }

        // Ищем целевой блок по имени
        $component = $this->document->componentManager->getBlockByName($componentName);
        if (!$component) {
            return;
        }

        $rights     = (int)$this->document->getRights();
        $isEditable = (bool)$this->document->isEditable();
        $force      = (bool)$this->getParam('force');

        // Логика исходника:
        // - Если force=1 и у пользователя ACCESS_FULL и документ НЕ в режиме редактирования — дизейблим.
        // - Иначе, если права меньше ACCESS_FULL — дизейблим.
        if (($force && $rights === ACCESS_FULL && !$isEditable) || ($rights !== ACCESS_FULL)) {
            $component->disable();
        }
    }
}
