<?php

declare(strict_types=1);

namespace App\Security;

use Symfony\Component\Security\Core\Authentication\AuthenticationManagerInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;

/**
 * Minimal authentication manager that trusts the provided token.
 *
 * It allows us to bootstrap the AuthorizationChecker without introducing
 * the full-fledged firewall stack during the migration period.
 */
final class NullAuthenticationManager implements AuthenticationManagerInterface
{
    public function authenticate(TokenInterface $token): TokenInterface
    {
        return $token;
    }
}
