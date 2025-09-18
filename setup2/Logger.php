<?php

declare(strict_types=1);

namespace Setup2;

use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;

final class Logger
{
    private LoggerInterface $logger;

    public function __construct(?LoggerInterface $logger = null)
    {
        $this->logger = $logger ?? new NullLogger();
    }

    public function info(string $message): void
    {
        $this->logger->info($message);
    }

    public function error(string $message): void
    {
        $this->logger->error($message);
    }
}
