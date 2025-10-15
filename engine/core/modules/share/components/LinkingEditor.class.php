<?php

declare(strict_types=1);

/**
 * Linking editor.
 */
class LinkingEditor extends Grid
{
    protected bool $isEditable = false;

    /**
     * @copydoc Grid::__construct
     */
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);

        $this->isEditable = (bool) $this->document->isEditable();

        if (!$this->isEditable && ($this->getState() === self::DEFAULT_STATE_NAME))
        {
            $this->disable();
        }
        else
        {
            $this->setProperty('exttype', 'feededitor');

            $cookieName = md5($this->getName());
            if (!in_array($this->getState(), ['up', 'down'], true) && isset($_COOKIE[$cookieName]))
            {
                E()->getResponse()->deleteCookie($cookieName);
            }
        }
    }

    /**
     * @copydoc Grid::defineParams
     * Добавляем параметр — имя связанного компонента.
     */
    protected function defineParams(): array
    {
        return array_merge(
            parent::defineParams(),
            [
                'bind' => false,
            ]
        );
    }

    /**
     * @copydoc Grid::main
     * Убираем всё лишнее.
     */
    protected function main(): void
    {
        $cookieName = md5($this->getName());

        if ($this->getFilter())
        {
            $bind = (string) $this->getParam('bind');
            if ($bind !== '')
            {
                $component = $this->document->componentManager->getBlockByName($bind);
                if ($component)
                {
                    $filter = $component->getFilter();
                    if ($filter !== null && $filter !== '')
                    {
                        E()->getResponse()->addCookie($cookieName, convert_uuencode((string) $filter));
                    }
                }
            }
        }

        $this->addToolbar($this->createToolbar());
        $this->js = $this->buildJS();
    }

    /**
     * @copydoc Grid::changeOrder
     * Читаем фильтры из куки, записанные другим компонентом (Feed).
     */
    protected function changeOrder(string $direction): void
    {
        $cookieName = md5($this->getName());

        if (isset($_COOKIE[$cookieName]))
        {
            $this->setFilter(convert_uudecode($_COOKIE[$cookieName]));
            E()->getResponse()->deleteCookie($cookieName);
        }

        parent::changeOrder($direction);
    }

    /**
     * @copydoc Grid::build
     */
    public function build(): DOMDocument
    {
        $state = $this->getState();
        $param = $this->getParam('bind');

        if ($state === 'main')
        {
            if ($param)
            {
                $this->setProperty('linkedComponent', $param);
            }

            $result = Component::build();

            $component = $param
                ? $this->document->componentManager->getBlockByName($param)
                : null;

            if ($component /* && ($component->getState() != 'view')*/ && $this->isEditable)
            {
                if ($this->js)
                {
                    $result->documentElement->appendChild($result->importNode($this->js, true));
                }

                $result->documentElement->appendChild($result->createElement('recordset'));

                if (($tbs = $this->getToolbar()) && !empty($tbs))
                {
                    foreach ($tbs as $tb)
                    {
                        if ($toolbar = $tb->build())
                        {
                            $result->documentElement->appendChild($result->importNode($toolbar, true));
                        }
                    }
                }
            }
        }
        else
        {
            if ($this->getType() !== self::COMPONENT_TYPE_LIST)
            {
                $this->setProperty('exttype', 'grid');
            }
            $result = parent::build();
        }

        return $result;
    }
}
