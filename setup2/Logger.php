<?php

declare(strict_types=1);

namespace Setup2;

use Stringable;

final class Logger
{
    private const DEFAULT_LOG_FILE = __DIR__ . '/setup.log';
    private const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

    private string $logFile;

    private bool $duplicateToStdout;

    public function __construct(?string $logFile = null, bool $duplicateToStdout = false)
    {
        $this->logFile = $logFile ?? self::DEFAULT_LOG_FILE;
        $this->duplicateToStdout = $duplicateToStdout && in_array(\PHP_SAPI, ['cli', 'phpdbg'], true);
        $directory = dirname($this->logFile);

        if (!is_dir($directory)) {
            @mkdir($directory, 0o777, true);
        }
    }

    public function info(string $message, array $context = []): void
    {
        $this->log('INFO', $message, $context);
    }

    public function error(string $message, array $context = []): void
    {
        $this->log('ERROR', $message, $context);
    }

    public function debug(string $message, array $context = []): void
    {
        $this->log('DEBUG', $message, $context);
    }

    private function log(string $level, string $message, array $context = []): void
    {
        $interpolated = $this->interpolate($message, $context);
        $formatted = sprintf('[%s] [%s] %s', date('Y-m-d H:i:s'), $level, $interpolated);
        $contextSuffix = $this->formatContext($context);

        if ($contextSuffix !== '') {
            $formatted .= ' ' . $contextSuffix;
        }

        $formatted .= PHP_EOL;

        $this->rotateIfNeeded(strlen($formatted));
        file_put_contents($this->logFile, $formatted, FILE_APPEND | LOCK_EX);

        if ($this->duplicateToStdout) {
            fwrite(\STDOUT, $formatted);
        }
    }

    private function rotateIfNeeded(int $incomingBytes): void
    {
        if (!is_file($this->logFile)) {
            return;
        }

        $currentSize = filesize($this->logFile);

        if ($currentSize === false) {
            return;
        }

        if ($currentSize + $incomingBytes <= self::MAX_FILE_SIZE) {
            return;
        }

        $rotatedFile = $this->logFile . '.1';

        if (is_file($rotatedFile)) {
            @unlink($rotatedFile);
        }

        @rename($this->logFile, $rotatedFile);
    }

    private function interpolate(string $message, array $context): string
    {
        if ($context === []) {
            return $message;
        }

        $replacements = [];

        foreach ($context as $key => $value) {
            if (!is_string($key)) {
                continue;
            }

            $replacements['{' . $key . '}'] = $this->stringify($value);
        }

        if ($replacements === []) {
            return $message;
        }

        return strtr($message, $replacements);
    }

    private function formatContext(array $context): string
    {
        if ($context === []) {
            return '';
        }

        $encoded = json_encode($this->stringifyRecursive($context), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        return $encoded === false ? '' : $encoded;
    }

    private function stringifyRecursive(mixed $value): mixed
    {
        if (is_array($value)) {
            $stringified = [];

            foreach ($value as $key => $item) {
                $stringified[$key] = $this->stringifyRecursive($item);
            }

            return $stringified;
        }

        return $this->stringify($value);
    }

    private function stringify(mixed $value): string
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->format(\DateTimeInterface::ATOM);
        }

        if ($value instanceof Stringable) {
            return (string) $value;
        }

        if (is_object($value)) {
            return 'object(' . $value::class . ')';
        }

        if (is_resource($value)) {
            return 'resource(' . get_resource_type($value) . ')';
        }

        if (is_scalar($value) || $value === null) {
            if (is_bool($value)) {
                return $value ? 'true' : 'false';
            }

            if (is_float($value)) {
                return sprintf('%F', $value);
            }

            return (string) $value;
        }

        return gettype($value);
    }
}
