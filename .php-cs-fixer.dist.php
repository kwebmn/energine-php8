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

        // Скобки на новой строке
        'braces_position' => [
            'classes_opening_brace' => 'next_line_unless_newline_at_signature_end',
            'functions_opening_brace' => 'next_line_unless_newline_at_signature_end',
            'control_structures_opening_brace' => 'next_line_unless_newline_at_signature_end',
            'anonymous_classes_opening_brace' => 'next_line_unless_newline_at_signature_end',
            'anonymous_functions_opening_brace' => 'next_line_unless_newline_at_signature_end',
            // Чтобы анонимные функции/пустые анонимные классы не оставались в одну строку:
            'allow_single_line_anonymous_functions' => false,
            'allow_single_line_empty_anonymous_classes' => false,
        ],

        // Твои текущие правила
        'nullable_type_declaration_for_default_null_value' => true,
        'array_syntax' => ['syntax' => 'short'],
        'ordered_imports' => true,
        'no_unused_imports' => true,
        'single_quote' => true,

        // (опционально) без пустой строки сразу после {
        'no_blank_lines_after_class_opening' => true,
    ])
    ->setFinder($finder);
