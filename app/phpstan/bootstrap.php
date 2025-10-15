<?php

declare(strict_types=1);

// Bootstrap file for PHPStan: defines runtime constants that are provided dynamically at runtime.
$projectRoot = \dirname(__DIR__, 1);

$constants = [
    'HTDOCS_DIR'   => $projectRoot,
    'CORE_REL_DIR' => 'engine/core',
    'SITE_REL_DIR' => 'site',
    'CORE_DIR'     => $projectRoot . '/engine/core',
    'SITE_DIR'     => $projectRoot . '/site',
    'SETUP_DIR'    => $projectRoot . '/setup',
];

foreach ($constants as $name => $value) {
    if (!\defined($name)) {
        \define($name, $value);
    }
}
