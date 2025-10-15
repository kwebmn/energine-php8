<?php

declare(strict_types=1);

namespace App\Security;

use Doctrine\DBAL\Connection;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\Exception\UserNotFoundException;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\PasswordUpgraderInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Security\Core\User\UserProviderInterface;

/**
 * User provider that reads data from Energine legacy tables.
 */
final class EnergineUserProvider implements UserProviderInterface, PasswordUpgraderInterface
{
    /**
     * @param array<string, mixed> $options
     */
    public function __construct(
        private readonly Connection $connection,
        private readonly EnergineRoleMapper $roleMapper,
        private readonly array $options = [],
    ) {
    }

    public function loadUserByIdentifier(string $identifier): EnergineUser
    {
        $identifier = trim($identifier);
        if ($identifier === '') {
            throw new UserNotFoundException('Empty user identifier given.');
        }

        return $this->doLoadUser(['identifier' => $identifier], $identifier);
    }

    public function refreshUser(UserInterface $user): EnergineUser
    {
        if (!$user instanceof EnergineUser) {
            throw new UnsupportedUserException(sprintf('Instances of %s are not supported.', $user::class));
        }

        return $this->loadUserById($user->getId());
    }

    public function supportsClass(string $class): bool
    {
        return $class === EnergineUser::class;
    }

    public function upgradePassword(PasswordAuthenticatedUserInterface $user, string $newHashedPassword): void
    {
        if (!$user instanceof EnergineUser) {
            throw new UnsupportedUserException(sprintf('Instances of %s are not supported.', $user::class));
        }

        $this->connection->update(
            $this->getUserTable(),
            [$this->getPasswordColumn() => $newHashedPassword],
            [$this->getUserIdColumn() => $user->getId()]
        );
    }

    public function loadUserById(int $userId): EnergineUser
    {
        return $this->doLoadUser(['id' => $userId], (string) $userId);
    }

    /**
     * @param array{id?: int, identifier?: string} $criteria
     */
    private function doLoadUser(array $criteria, string $identifierForException): EnergineUser
    {
        $rows = $this->connection->fetchAllAssociative(
            $this->buildSelectSql($criteria),
            $this->buildSelectParams($criteria)
        );

        $row = $rows[0] ?? null;
        if (!is_array($row)) {
            throw new UserNotFoundException(sprintf('User "%s" could not be found.', $identifierForException));
        }

        $userId = (int) ($row[$this->getUserIdColumn()] ?? 0);
        $username = (string) ($row[$this->getUsernameColumn()] ?? '');
        $passwordHash = (string) ($row[$this->getPasswordColumn()] ?? '');
        $isActive = (bool) ($row[$this->getIsActiveColumn()] ?? true);

        $groupIds = $this->loadGroupIds($userId);
        $roles = $this->roleMapper->mapGroupIds($groupIds, $isActive);

        return new EnergineUser(
            $userId,
            $username,
            $passwordHash,
            $isActive,
            $roles,
            $groupIds,
            $row
        );
    }

    private function getUserTable(): string
    {
        return (string) ($this->options['user_table'] ?? 'user_users');
    }

    private function getUserIdColumn(): string
    {
        return (string) ($this->options['user_id_column'] ?? 'u_id');
    }

    private function getUsernameColumn(): string
    {
        return (string) ($this->options['username_column'] ?? 'u_name');
    }

    private function getPasswordColumn(): string
    {
        return (string) ($this->options['password_column'] ?? 'u_password');
    }

    private function getIsActiveColumn(): string
    {
        return (string) ($this->options['is_active_column'] ?? 'u_is_active');
    }

    private function getGroupLinkTable(): string
    {
        return (string) ($this->options['group_link_table'] ?? 'user_user_groups');
    }

    private function getGroupUserColumn(): string
    {
        return (string) ($this->options['group_user_column'] ?? 'u_id');
    }

    private function getGroupColumn(): string
    {
        return (string) ($this->options['group_column'] ?? 'group_id');
    }

    /**
     * @param array{id?: int, identifier?: string} $criteria
     */
    private function buildSelectSql(array $criteria): string
    {
        $columns = $this->options['select_columns'] ?? null;
        if (!is_array($columns) || $columns === []) {
            $columns = [
                $this->getUserIdColumn(),
                $this->getUsernameColumn(),
                $this->getPasswordColumn(),
                $this->getIsActiveColumn(),
            ];
        }

        $columnList = implode(', ', array_unique($columns));
        $table = $this->getUserTable();

        if (isset($criteria['id'])) {
            $where = sprintf('%s = :id', $this->getUserIdColumn());
        } else {
            $where = sprintf('%s = :identifier', $this->getUsernameColumn());
        }

        return sprintf('SELECT %s FROM %s WHERE %s LIMIT 1', $columnList, $table, $where);
    }

    /**
     * @param array{id?: int, identifier?: string} $criteria
     *
     * @return array<string, mixed>
     */
    private function buildSelectParams(array $criteria): array
    {
        if (isset($criteria['id'])) {
            return ['id' => (int) $criteria['id']];
        }

        return ['identifier' => (string) $criteria['identifier']];
    }

    /**
     * @return array<int>
     */
    private function loadGroupIds(int $userId): array
    {
        if ($userId <= 0) {
            return [];
        }

        $rows = $this->connection->fetchAllAssociative(
            sprintf(
                'SELECT %s FROM %s WHERE %s = :userId',
                $this->getGroupColumn(),
                $this->getGroupLinkTable(),
                $this->getGroupUserColumn()
            ),
            ['userId' => $userId]
        );

        $groupIds = [];
        foreach ($rows as $row) {
            if (isset($row[$this->getGroupColumn()])) {
                $groupIds[] = (int) $row[$this->getGroupColumn()];
            }
        }

        return array_values(array_unique($groupIds));
    }
}
