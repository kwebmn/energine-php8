<?php

declare(strict_types=1);

class FilterCollection implements \IteratorAggregate
{
    /** @var array<int|string, mixed> */
    private array $conditions = [];

    public function __construct(array $initial = [])
    {
        $this->merge($initial);
    }

    public function add(string $field, mixed $value): void
    {
        $this->conditions[$field] = $value;
    }

    public function push(mixed $value): void
    {
        $this->conditions[] = $value;
    }

    public function merge(array $conditions): void
    {
        foreach ($conditions as $key => $value)
        {
            if (is_int($key))
            {
                $this->conditions[] = $value;
            }
            else
            {
                $this->conditions[$key] = $value;
            }
        }
    }

    public function clear(): void
    {
        $this->conditions = [];
    }

    public function isEmpty(): bool
    {
        return $this->conditions === [];
    }

    /**
     * @return array<int|string, mixed>
     */
    public function all(): array
    {
        return $this->conditions;
    }

    public function getIterator(): \Traversable
    {
        return new \ArrayIterator($this->conditions);
    }
}
