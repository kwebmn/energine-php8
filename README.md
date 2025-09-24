# energine-php8

## Авто-очистка кеша изображений

Сервис изображений автоматически удаляет устаревшие файлы из кеша при обращении к любому изображению. Для настройки используйте параметры в `system.config.php`:

- `images.cache_max_age` — максимальный срок хранения файлов кеша (секунды).
- `images.gc_interval` — минимальный интервал между автоматическими очистками (секунды).

Запуск отдельного cron не требуется — проверка и очистка выполняются в процессе обработки запроса к изображению.

## Tabulator 6.3 в GridManager

- **Что подключено:** локальные копии `tabulator.min.js`, `tabulator.min.css` и темы `tabulator_bootstrap5.min.css` версии 6.3.0 из официального пакета [`tabulator-tables`](https://www.tabulator.info/).
- **Где лежит:** `engine/core/modules/share/scripts/lib/tabulator/`. Статика раздаётся как `scripts/lib/tabulator/*`.
- **Как обновить:**
  1. Скачать новые файлы с CDN (`https://unpkg.com/tabulator-tables@<версия>/dist/...`) или из npm-пакета.
  2. Заменить содержимое соответствующих файлов в `engine/core/modules/share/scripts/lib/tabulator/`.
  3. Убедиться, что `engine/core/modules/share/scripts/GridManager.js` и `system.jsmap.php` указывают на актуальные имена файлов, затем выполнить smoke-тест `GridManager`.
- **Как загружается:** `GridManager.js` вызывает `Energine.loadScript`/`Energine.loadCSS`, поэтому Tabulator и тема Bootstrap подгружаются до инициализации компонента.
