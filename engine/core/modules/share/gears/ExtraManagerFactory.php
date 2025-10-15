<?php

declare(strict_types=1);

namespace Energine\Core\ExtraManager;

use DataDescription;

/**
 * Registry and resolver for optional Grid managers.
 */
class ExtraManagerFactory
{
    /** @var array<string, ExtraManagerInterface> */
    private array $managers = [];

    /**
     * @param iterable<ExtraManagerInterface> $managers
     */
    public function __construct(iterable $managers = [])
    {
        foreach ($managers as $manager)
        {
            if ($manager instanceof ExtraManagerInterface)
            {
                $this->addManager($manager);
            }
        }
    }

    public function addManager(ExtraManagerInterface $manager): void
    {
        $this->managers[$manager::class] = $manager;
    }

    public function removeManager(string $className): void
    {
        $candidates = $this->normalizeCandidates($className);
        foreach (array_keys($this->managers) as $registered)
        {
            if ($this->matches($registered, $candidates))
            {
                unset($this->managers[$registered]);
            }
        }
    }

    /**
     * @param string              $tableName
     * @param DataDescription     $dataDescription
     * @param array<string,mixed> $context          optional context (state, translator, etc.)
     * @param string[]|null       $allowedClassList whitelist (normalized class names)
     *
     * @return ExtraManagerInterface[] fresh manager instances ready for usage
     */
    public function getApplicableManagers(
        string $tableName,
        DataDescription $dataDescription,
        ?array $context = null,
        ?array $allowedClassList = null
    ): array {
        $result = [];
        $allowed = null;
        if ($allowedClassList !== null)
        {
            $allowed = [];
            foreach ($allowedClassList as $item)
            {
                $allowed[] = $this->normalizeCandidates((string)$item);
            }
        }

        foreach ($this->managers as $prototype)
        {
            if ($allowed !== null && !$this->isAllowed($prototype::class, $allowed))
            {
                continue;
            }

            $manager = clone $prototype;
            if (method_exists($manager, 'setContext'))
            {
                $manager->setContext($context ?? []);
            }

            if ($manager->supports($tableName, $dataDescription))
            {
                $result[] = $manager;
            }
        }

        return $result;
    }

    /**
     * @param string $className
     *
     * @return array<int,string>
     */
    private function normalizeCandidates(string $className): array
    {
        $trimmed   = ltrim($className, '\\');
        $lower     = strtolower($trimmed);
        $segments  = explode('\\', $trimmed);
        $shortName = strtolower(end($segments));

        return array_values(array_unique([$lower, $shortName]));
    }

    private function matches(string $registered, array $candidates): bool
    {
        $existing = $this->normalizeCandidates($registered);
        return (bool)array_intersect($existing, $candidates);
    }

    private function isAllowed(string $className, array $allowed): bool
    {
        foreach ($allowed as $candidates)
        {
            if ($this->matches($className, $candidates))
            {
                return true;
            }
        }
        return false;
    }
}
