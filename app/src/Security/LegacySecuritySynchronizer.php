<?php

declare(strict_types=1);

namespace App\Security;

use RuntimeException;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\UsernamePasswordToken;
use Symfony\Component\Security\Core\Exception\UserNotFoundException;

/**
 * Synchronises the legacy AuthUser session with Symfony's token storage.
 */
final class LegacySecuritySynchronizer
{
    public function __construct(
        private readonly TokenStorageInterface $tokenStorage,
        private readonly EnergineUserProvider $userProvider,
        private readonly string $firewallName = 'legacy',
    ) {
    }

    public function synchronise(): void
    {
        $authUser = $this->resolveAuthUser();
        if (!$authUser instanceof \AuthUser || !$authUser->isAuthenticated()) {
            $this->clearToken();
            return;
        }

        $legacyId = $authUser->getID();
        if ($this->isTokenAlreadyInitialised($legacyId)) {
            return;
        }

        $identifier = $this->resolveIdentifier($authUser);
        try {
            $user = $this->userProvider->loadUserByIdentifier($identifier);
        } catch (UserNotFoundException $e) {
            if ($legacyId !== null) {
                $user = $this->userProvider->loadUserById((int) $legacyId);
            } else {
                throw $e;
            }
        }

        $token = new UsernamePasswordToken($user, $this->firewallName, $user->getRoles());
        $this->tokenStorage->setToken($token);
    }

    private function clearToken(): void
    {
        $token = $this->tokenStorage->getToken();
        if ($token instanceof UsernamePasswordToken && $token->getFirewallName() === $this->firewallName) {
            $this->tokenStorage->setToken(null);
        }
    }

    private function isTokenAlreadyInitialised(?int $legacyId): bool
    {
        $token = $this->tokenStorage->getToken();
        if (!$token instanceof UsernamePasswordToken || $token->getFirewallName() !== $this->firewallName) {
            return false;
        }

        $user = $token->getUser();
        if (!$user instanceof EnergineUser) {
            return false;
        }

        return $legacyId !== null && $user->getId() === $legacyId;
    }

    private function resolveIdentifier(\AuthUser $authUser): string
    {
        $identifier = (string) ($authUser->getValue('u_name') ?: '');
        if ($identifier !== '') {
            return $identifier;
        }

        if ($authUser->getID() !== null) {
            return (string) $authUser->getID();
        }

        throw new RuntimeException('Unable to resolve identifier for legacy AuthUser instance.');
    }

    private function resolveAuthUser(): ?\AuthUser
    {
        if (!class_exists('\\AuthUser')) {
            return null;
        }

        try {
            if (class_exists('\\Registry') && method_exists('\\Registry', 'getInstance')) {
                $registry = \Registry::getInstance();
                if (method_exists($registry, 'getAUser')) {
                    $user = $registry->getAUser();
                    if ($user instanceof \AuthUser) {
                        return $user;
                    }
                }
            }
        } catch (\Throwable) {
            // Fall back to manual instantiation below.
        }

        try {
            return new \AuthUser();
        } catch (\Throwable) {
            return null;
        }
    }
}
