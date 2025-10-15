<?php

$finder = PhpCsFixer\Finder::create()
    ->in([
        __DIR__ . '/engine',
        __DIR__ . '/site',
    ])
    ->exclude([
        'vendor',
        'node_modules',
        'storage',
        'var',
    ])
    ->files();

return (new PhpCsFixer\Config())
    ->setRiskyAllowed(true)
    ->setRules([
        '@PSR12' => true,
        'nullable_type_declaration_for_default_null_value' => true,
        'array_syntax' => ['syntax' => 'short'],
        'ordered_imports' => true,
        'no_unused_imports' => true,
        'single_quote' => true,
    ])
    ->setFinder($finder);
