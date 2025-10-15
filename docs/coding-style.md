# Coding Style Guide

Этот проект использует [PHP-CS-Fixer](https://github.com/PHP-CS-Fixer/PHP-CS-Fixer) для автоматического применения правил форматирования в каталогах `engine/` и `site/`.

## Инструменты

- `composer cs:lint` — проверяет файлы и показывает отличия.
- `composer cs:fix` — автоматически приводит код к нужному стилю.

## Правила форматирования

Ниже перечислены ключевые правила, включённые в `.php-cs-fixer.dist.php`.

### Базовый набор

- `@PSR12` — общий базовый набор правил, на который опирается конфигурация.

### Расположение фигурных скобок

- `braces_position`
  - `control_structures_opening_brace => next_line_unless_newline_at_signature_end` — ставит `{` с новой строки после `if`, `foreach`, `while` и других управляющих конструкций.
  - `functions_opening_brace => next_line_unless_newline_at_signature_end` — переносит `{` функции или метода на новую строку.
  - `classes_opening_brace => next_line_unless_newline_at_signature_end` — аналогично переносит `{` классов и трейтов.
  - `anonymous_functions_opening_brace => next_line_unless_newline_at_signature_end` — распространяет стиль на анонимные функции.
  - `anonymous_classes_opening_brace => next_line_unless_newline_at_signature_end` — переносит `{` у анонимных классов.
  - `allow_single_line_anonymous_functions => false` и `allow_single_line_empty_anonymous_classes => false` — не допускают однострочные анонимные функции и пустые анонимные классы, чтобы сохранить Allman-стиль.

### Продолжение управляющих конструкций

- `control_structure_continuation_position => next_line` — заставляет `else`, `catch` и `finally` начинаться с новой строки.

### Дополнительные правила

- `nullable_type_declaration_for_default_null_value` — добавляет явный `?Type` для аргументов/свойств с `= null` по умолчанию, что устраняет предупреждения PHP 8.4.
- `array_syntax => short` — приводит массивы к синтаксису `[]`.
- `ordered_imports` — сортирует `use`-импорты.
- `no_unused_imports` — удаляет неиспользуемые `use`-выражения.
- `single_quote` — использует одинарные кавычки для строк без интерполяции.

## Slevomat Coding Standard

В проект добавлен пакет `slevomat/coding-standard`. Он не подключён к PHP-CS-Fixer, но необходим для будущей конфигурации PHP_CodeSniffer.

## Как обновить конфигурацию

При изменении `.php-cs-fixer.dist.php` обновите этот документ, чтобы команда знала о новых правилах.
