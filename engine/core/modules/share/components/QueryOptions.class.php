<?php

declare(strict_types=1);

class QueryOptions
{
    private ?FilterCollection $filters = null;

    private ?SortCollection $sorting = null;

    private ?int $limit = null;

    private ?int $offset = null;

    public function __construct(
        ?FilterCollection $filters = null,
        ?SortCollection $sorting = null,
        ?int $limit = null,
        ?int $offset = null
    ) {
        $this->filters = $filters;
        $this->sorting = $sorting;
        $this->limit   = $limit;
        $this->offset  = $offset;
    }

    public function getFilters(): FilterCollection
    {
        if (!$this->filters)
        {
            $this->filters = new FilterCollection();
        }

        return $this->filters;
    }

    public function setFilters(FilterCollection $filters): void
    {
        $this->filters = $filters;
    }

    public function getSorting(): SortCollection
    {
        if (!$this->sorting)
        {
            $this->sorting = new SortCollection();
        }

        return $this->sorting;
    }

    public function setSorting(SortCollection $sorting): void
    {
        $this->sorting = $sorting;
    }

    public function getLimit(): ?int
    {
        return $this->limit;
    }

    public function setLimit(?int $limit): void
    {
        $this->limit = $limit;
    }

    public function getOffset(): ?int
    {
        return $this->offset;
    }

    public function setOffset(?int $offset): void
    {
        $this->offset = $offset;
    }

    public function withLimit(?int $limit, ?int $offset = null): self
    {
        $clone = clone $this;
        $clone->limit  = $limit;
        $clone->offset = $offset;

        return $clone;
    }

    public function toArray(): array
    {
        return [
            'filters' => $this->filters?->all() ?? [],
            'sorting' => $this->sorting?->all() ?? [],
            'limit'   => $this->limit,
            'offset'  => $this->offset,
        ];
    }
}
