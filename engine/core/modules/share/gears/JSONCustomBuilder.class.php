<?php

declare(strict_types=1);

/**
 * Custom JSON builder.
 *
 * Упрощённый билдер JSON-ответа.
 * Совместим с PHP 8.3, использует строгие типы и цепочки вызовов.
 */
final class JSONCustomBuilder extends BaseObject implements IBuilder
{
    /**
     * Набор свойств, которые будут отданы в JSON.
     * @var array<string, mixed>
     */
    public array $properties = [];

    /**
     * Подготовка результата: выставляет значения по умолчанию.
     *
     * @return bool Всегда true (для совместимости с интерфейсом IBuilder).
     */
    public function build(): bool
    {
        if (!array_key_exists('result', $this->properties))
        {
            $this->properties['result'] = true;
        }

        if (!array_key_exists('mode', $this->properties))
        {
            $this->properties['mode'] = QAL::SELECT;
        }

        return true;
    }

    /**
     * Установить одно свойство.
     *
     * @param string $propName  Имя свойства.
     * @param mixed  $propValue Значение свойства.
     * @return self
     */
    public function setProperty(string $propName, mixed $propValue): self
    {
        $this->properties[$propName] = $propValue;
        return $this;
    }

    /**
     * Массовая установка свойств.
     *
     * @param array<string, mixed> $properties Пары имя => значение.
     * @return self
     */
    public function setProperties(array $properties): self
    {
        foreach ($properties as $name => $value)
        {
            $this->setProperty((string)$name, $value);
        }
        return $this;
    }

    /**
     * Получить JSON-строку результата.
     *
     * @return string
     */
    public function getResult(): string
    {
        return (string) json_encode(
            $this->properties,
            JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP
        );
        // Примечание: намеренно без JSON_THROW_ON_ERROR для полной совместимости со старым кодом.
    }
}
