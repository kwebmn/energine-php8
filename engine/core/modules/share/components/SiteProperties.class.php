<?php
declare(strict_types=1);

/**
 * Информация о текущем сайте.
 */
class SiteProperties extends Component
{
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);
    }

    /**
     * Параметры: id — имя свойства текущего сайта, которое нужно вывести.
     */
    protected function defineParams(): array
    {
        return array_merge(
            parent::defineParams(),
            [
                'id' => false,
            ]
        );
    }

    /**
     * Строит компонент: выводит значение свойства текущего сайта как текст внутри корневого узла.
     * Всегда возвращает DOMDocument (для совместимости с сигнатурой Component::build()).
     */
    public function build(): DOMDocument
    {
        $result = parent::build();

        $paramId = (string)$this->getParam('id');
        if ($paramId === '') {
            return $result;
        }

        try {
            $site = E()->getSiteManager()->getCurrentSite();
            if (!is_object($site)) {
                return $result;
            }

            $value = null;

            // Прямой доступ к публичному свойству
            if (property_exists($site, $paramId)) {
                /** @var mixed $tmp */
                $tmp = $site->{$paramId};
                $value = $tmp;
            } else {
                // Попытка через геттер вида getXxx()
                $method = 'get' . str_replace(' ', '', ucwords(str_replace(['-', '_'], ' ', $paramId)));
                if (method_exists($site, $method)) {
                    /** @var mixed $tmp */
                    $tmp = $site->{$method}();
                    $value = $tmp;
                } else {
                    // На случай магии __get попробуем доступ; перехватываем любые ошибки
                    try {
                        /** @var mixed $tmp */
                        $tmp = $site->{$paramId};
                        $value = $tmp;
                    } catch (\Throwable $e) {
                        // игнорируем, оставляем $value = null
                    }
                }
            }

            if ($value !== null && $value !== '' && $value !== false) {
                $result->documentElement->appendChild(
                    $result->createTextNode((string)$value)
                );
            }
        } catch (\Throwable $e) {
            // Тихо возвращаем пустой DOM компонента
        }

        return $result;
    }
}
