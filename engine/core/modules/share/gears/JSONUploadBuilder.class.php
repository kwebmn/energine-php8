<?php
declare(strict_types=1);

/**
 * JSON builder for uploading (used by FileLibrary).
 */
class JSONUploadBuilder extends JSONBuilder
{
    /**
     * Current directory path for uploads.
     */
    private ?string $currentDirectory = null;

    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Inject current directory into the JSON payload and return parent's result.
     *
     * @return mixed
     */
    public function getResult(): mixed
    {
        // Ensure currentDirectory is defined
        $this->result['currentDirectory'] = $this->getCurrentDirectory();
        return parent::getResult();
    }

    /**
     * Get current directory.
     *
     * @throws SystemException If current directory was not set.
     */
    public function getCurrentDirectory(): string
    {
        if ($this->currentDirectory === null || $this->currentDirectory === '') {
            throw new SystemException('ERR_DEV_NO_CURR_DIR', SystemException::ERR_DEVELOPER);
        }

        return $this->currentDirectory;
    }

    /**
     * Set current directory.
     *
     * Backward-compatible name kept as in legacy code.
     */
    public function setCurrentDir(string $path): void
    {
        $this->currentDirectory = $path;
    }

    /**
     * Optional modern alias.
     */
    public function setCurrentDirectory(string $path): void
    {
        $this->setCurrentDir($path);
    }
}
