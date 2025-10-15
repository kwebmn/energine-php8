<?php

declare(strict_types=1);

class SortCollection implements \IteratorAggregate
{
    /** @var array<string, string> */
    private array $sorting = [];

    public function __construct(array $initial = [])
    {
        $this->merge($initial);
    }

    public function add(string $field, string $direction): void
    {
        $this->sorting[$field] = $direction;
    }

    public function merge(array $sorting): void
    {
        foreach ($sorting as $field => $direction)
        {
            if (!is_string($field))
            {
                continue;
            }
            $this->sorting[$field] = $direction;
        }
    }

    public function isEmpty(): bool
    {
        return $this->sorting === [];
    }

    /**
     * @return array<string, string>
     */
    public function all(): array
    {
        return $this->sorting;
    }

    public function clear(): void
    {
        $this->sorting = [];
    }

    public function getIterator(): \Traversable
    {
        return new \ArrayIterator($this->sorting);
    }
}
