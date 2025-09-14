<?php
declare(strict_types=1);

/**
 * The main abstract class for all objects in the system.
 * - measures execution time;
 * - loads and reads the system configuration (array-based, dot-path access).
 */
abstract class BaseObject
{
    /** Configuration file name. */
    public const CONFIG_FILE = 'system.config.php';

    /** System configuration (tree as nested arrays). */
    private static ?array $systemConfig = null;

    /** Execution time counter (stores start time or last measured diff). */
    private ?float $executionTime = null;

    /* ===== Timer ===== */

    /** Start the execution time counter. */
    public function startTimer(): void
    {
        $this->executionTime = microtime(true);
    }

    /**
     * Stop the execution time counter and return elapsed seconds.
     */
    public function stopTimer(): float
    {
        if ($this->executionTime === null) {
            return 0.0;
        }
        $elapsed = microtime(true) - $this->executionTime;
        // BC: keep last measured value inside the property
        $this->executionTime = $elapsed;
        return $elapsed;
    }

    /**
     * Reset the counter (return last elapsed and start again).
     */
    public function resetTimer(): float
    {
        $result = $this->stopTimer();
        $this->startTimer();
        return $result;
    }

    /**
     * Get the current value of the timer (0.0 if not started).
     */
    public function getTimer(): float
    {
        return $this->executionTime ?? 0.0;
    }

    /* ===== Config ===== */

    /**
     * Get the configuration value by dot-separated path.
     *
     * Example:
     *   BaseObject::_getConfigValue('database.host');
     *
     * @param string $paramPath e.g. "database.host"
     * @param mixed  $initial   default value if not found
     * @return mixed
     */
    public static function _getConfigValue(string $paramPath, mixed $initial = null): mixed
    {
        if (self::$systemConfig === null) {
            // system.config.php must return an array
            /** @var array $cfg */
            $cfg = include self::CONFIG_FILE;
            self::setConfigArray($cfg);
        }

        $result = self::$systemConfig;
        foreach (explode('.', $paramPath) as $segment) {
            if (is_array($result) && array_key_exists($segment, $result)) {
                $result = $result[$segment];
            } else {
                return $initial;
            }
        }
        return $result;
    }

    /**
     * Non-static wrapper for use in instance methods.
     *
     * @see BaseObject::_getConfigValue()
     */
    public function getConfigValue(string $paramPath, mixed $initial = null): mixed
    {
        return self::_getConfigValue($paramPath, $initial);
    }

    /**
     * Replace the whole system configuration array.
     */
    public static function setConfigArray(array $config): void
    {
        self::$systemConfig = $config;
    }

    /**
     * Get the full configuration array (lazy-loaded if needed).
     */
    public static function getConfigArray(): array
    {
        if (self::$systemConfig === null) {
            /** @var array $cfg */
            $cfg = include self::CONFIG_FILE;
            self::setConfigArray($cfg);
        }
        return self::$systemConfig;
    }
}
