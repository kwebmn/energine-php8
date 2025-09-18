<?php

declare(strict_types=1);

namespace Setup2;

final class ActionResult
{
    public readonly bool $success;

    public readonly string $message;

    /**
     * @var array<mixed>|null
     */
    public readonly ?array $details;

    public readonly ?string $logPointer;

    /**
     * @param array<mixed>|null $details
     */
    public function __construct(bool $success, string $message, ?array $details = null, ?string $logPointer = null)
    {
        $this->success = $success;
        $this->message = $message;
        $this->details = $details;
        $this->logPointer = $logPointer;
    }

    /**
     * @param array<mixed>|null $details
     */
    public static function success(string $message, ?array $details = null, ?string $logPointer = null): self
    {
        return new self(true, $message, $details, $logPointer);
    }

    /**
     * @param array<mixed>|null $details
     */
    public static function failure(string $message, ?array $details = null, ?string $logPointer = null): self
    {
        return new self(false, $message, $details, $logPointer);
    }
}
