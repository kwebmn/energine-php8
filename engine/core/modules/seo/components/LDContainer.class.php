<?php
declare(strict_types=1);

final class LDContainer extends DBWorker
{
    private static ?self $instance = null;

    /** @var array<string, mixed> */
    private array $container = [];

    public static function getInstance(): self
    {
        if (!isset(self::$instance)) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    public function __construct()
    {
        parent::__construct();

        $logo = [
            '@context'  => 'https://schema.org',
            '@type'     => 'Organization',
            'url'       => 'https://www.agronom.info',
            'logo'      => 'https://www.agronom.info/images/default/logo.svg',
            'legalName' => 'Агроном Инфо',
        ];

        $this->addLD('logo', $logo);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function addLD(string $name, array $data): void
    {
        $this->container[$name] = $data;
    }

    /**
     * @return array<int, array{ld_id:string, ld_body:string}>
     */
    public function getLD(): array
    {
        $result = [];

        foreach ($this->container as $key => $row) {
            $result[] = [
                'ld_id'  => (string)$key,
                'ld_body'=> json_encode($row, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '{}',
            ];
        }

        return $result;
    }
}
