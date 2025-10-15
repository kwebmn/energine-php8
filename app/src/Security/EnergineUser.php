<?php

declare(strict_types=1);

namespace App\Security;

use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * Immutable security user that is backed by Energine's legacy user tables.
 */
final class EnergineUser implements UserInterface, PasswordAuthenticatedUserInterface
{
    /**
     * @param array<int>           $groupIds   Legacy group identifiers assigned to the user
     * @param array<int, string>   $roles      Roles granted to the user (will be normalised internally)
     * @param array<string, mixed> $attributes Additional raw data fetched from the legacy storage
     */
    public function __construct(
        private readonly int $id,
        private readonly string $username,
        private readonly string $passwordHash,
        private readonly bool $active,
        array $roles,
        private readonly array $groupIds,
        private readonly array $attributes = [],
    ) {
        $this->roles = $this->normaliseRoles($roles);
    }

    /** @var array<int, string> */
    private array $roles;

    public function getId(): int
    {
        return $this->id;
    }

    public function isActive(): bool
    {
        return $this->active;
    }

    /**
     * @return array<int>
     */
    public function getGroupIds(): array
    {
        return $this->groupIds;
    }

    /**
     * @return array<string, mixed>
     */
    public function getAttributes(): array
    {
        return $this->attributes;
    }

    public function getUserIdentifier(): string
    {
        return $this->username;
    }

    public function getUsername(): string
    {
        return $this->username;
    }

    /**
     * @return array<int, string>
     */
    public function getRoles(): array
    {
        return $this->roles;
    }

    public function getPassword(): string
    {
        return $this->passwordHash;
    }

    public function eraseCredentials(): void
    {
        // No sensitive temporary data is stored on the user object.
    }

    /**
     * @param array<int, string> $roles
     *
     * @return array<int, string>
     */
    private function normaliseRoles(array $roles): array
    {
        $normalised = [];
        foreach ($roles as $role) {
            $role = strtoupper((string) $role);
            if ($role === '') {
                continue;
            }

            if (!str_starts_with($role, 'ROLE_')) {
                $role = 'ROLE_' . $role;
            }

            $normalised[$role] = $role;
        }

        return array_values($normalised);
    }
}
