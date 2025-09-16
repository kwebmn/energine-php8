<?php
declare(strict_types=1);

/**
 * Configuration for Site Editor.
 *
 * Extends GridConfig and registers Site Editor–specific states.
 */
class SiteEditorConfig extends GridConfig
{
    /**
     * @param mixed  $config     Config XML, filename, or falsy to auto-resolve.
     * @param string $className  Component class name.
     * @param string $moduleName Module name.
     */
    public function __construct(mixed $config, string $className, string $moduleName)
    {
        parent::__construct($config, $className, $moduleName);

        // Manage site domains
        $this->registerState('domains', [
            '/domains/[any]/',
            '/[site_id]/domains/[any]/',
        ]);

        // Jump to site
        $this->registerState('go', [
            '/goto/[site_id]/',
        ]);
    }
}
