<?php

declare(strict_types=1);

interface DataProviderInterface
{
    /**
     * Return a raw array representation of the data description.
     *
     * The resulting array must follow the shape produced by DB drivers in the
     * legacy implementation (\Energine\Core\Database\DB::getColumnsInfo()).
     *
     * @return array<string, array<string, mixed>>
     */
    public function getDataDescription(): array;

    /**
     * Fetch data according to the provided options.
     */
    public function fetchData(QueryOptions $options): array;

    /**
     * Apply post processing over the fetched data.
     *
     * @param array<int, array<string, mixed>> $data
     */
    public function modifyData(array $data, DataDescription $description): array;
}
