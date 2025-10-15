<?php

declare(strict_types=1);

namespace App\Security;

/**
 * Maps Energine user groups to Symfony Security roles.
 */
final class EnergineRoleMapper
{
    /**
     * @param array<int|string, string|array<int, string>> $groupRoleMap   Mapping of group IDs to role names
     * @param array<int, string>                           $activeDefaults Default roles for active users
     * @param array<int, string>                           $inactiveDefaults Default roles for inactive users
     */
    public function __construct(
        private readonly array $groupRoleMap = [1 => 'ROLE_ADMIN'],
        private readonly array $activeDefaults = ['ROLE_USER', 'ROLE_AUTHENTICATED'],
        private readonly array $inactiveDefaults = ['ROLE_GUEST'],
        private readonly string $groupRolePrefix = 'ROLE_GROUP_',
    ) {
    }

    /**
     * @param array<int> $groupIds
     *
     * @return array<int, string>
     */
    public function mapGroupIds(array $groupIds, bool $isActive): array
    {
        $roles = $isActive ? $this->activeDefaults : $this->inactiveDefaults;

        foreach ($groupIds as $groupId) {
            $key = (string) $groupId;
            if (array_key_exists($groupId, $this->groupRoleMap)) {
                $roles = array_merge($roles, $this->normaliseRoles($this->groupRoleMap[$groupId]));
                continue;
            }
            if (array_key_exists($key, $this->groupRoleMap)) {
                $roles = array_merge($roles, $this->normaliseRoles($this->groupRoleMap[$key]));
                continue;
            }

            $roles[] = $this->groupRolePrefix . strtoupper((string) $groupId);
        }

        return $this->normaliseRoles($roles);
    }

    /**
     * @param string|array<int, string> $roles
     *
     * @return array<int, string>
     */
    private function normaliseRoles(string|array $roles): array
    {
        $roles = (array) $roles;
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
