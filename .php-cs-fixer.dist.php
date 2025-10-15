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
        '@PSR12' => true, // останется, но ниже мы переопределяем то, что нам нужно

        // 1) { на новой строке у конструкций управления
        'braces_position' => [
            'control_structures_opening_brace' => 'next_line_unless_newline_at_signature_end',
            // если хочешь Allman-стиль «везде», добавь ещё:
            'functions_opening_brace' => 'next_line_unless_newline_at_signature_end',
            'classes_opening_brace' => 'next_line_unless_newline_at_signature_end',
            'anonymous_functions_opening_brace' => 'next_line_unless_newline_at_signature_end',
            'anonymous_classes_opening_brace' => 'next_line_unless_newline_at_signature_end',
            'allow_single_line_anonymous_functions' => false,
            'allow_single_line_empty_anonymous_classes' => false,
        ],

        // 2) else/catch/finally на новой строке
        'control_structure_continuation_position' => ['position' => 'next_line'],

        // твои правила
        'nullable_type_declaration_for_default_null_value' => true,
        'array_syntax' => ['syntax' => 'short'],
        'ordered_imports' => true,
        'no_unused_imports' => true,
        'single_quote' => true,
    ])
    ->setFinder($finder);
