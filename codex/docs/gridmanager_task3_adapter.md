# GridManager → Tabulator Adapter (Task 3)

## Цель

Создан класс `TabulatorGrid`, который повторяет интерфейс старого `Grid` и делегирует отображение библиотеке Tabulator 6.3. Адаптер позволяет постепенно заменить ядро таблицы, не ломая текущий API `GridManager`.

## Архитектура

- **Расположение:** `engine/core/modules/share/scripts/TabulatorGrid.js`
- **Загрузка:** добавить `ScriptLoader.load('TabulatorGrid')` перед инициализацией, либо положиться на `system.jsmap.php` (см. запись `TabulatorGrid`).
- **Зависимости:** `lib/tabulator/tabulator.min.js` + тема `tabulator_bootstrap5.min.css` загружаются через существующие хелперы Energine.

```
TabulatorGrid
 ├─ setMetadata(meta)  → Tabulator.setColumns(columns)
 ├─ setData(rows)      → Tabulator.setData(rows)
 ├─ clear()            → Tabulator.clearData()
 ├─ selectRecordById() → Tabulator.selectRow(id)
 ├─ updateRecord()     → Tabulator.updateOrAddData()
 ├─ deleteRecord()     → Tabulator.deleteRow(id)
 └─ events             → tableBuilt / rowSelected / rowDblClick / sortChanged
```

## Конвертация metadata → columns

| Свойство meta | Поведение адаптера | Tabulator | Комментарии |
|---------------|--------------------|-----------|-------------|
| `title`       | Перевод через `Energine.translations.get()` | `column.title` | Фоллбэк – оригинальное значение |
| `visible`     | Пропуск скрытых полей | — | скрытые поля не добавляются |
| `sort`        | `true` → включён `headerSort` | `column.headerSort` | сохраняется управление сортировкой |
| `type`        | Определяет formatter | см. ниже | boolean → `tickCross`, file → `<img>`, html → `formatter:'html'`, textbox/value → кастомные функции |
| `key`         | Сохраняет `keyFieldName`, вызывает `table.setIndex(key)` | `table.setIndex` | нужен для select/update/delete |
| `align`       | Правое/центровое выравнивание | `column.hozAlign` | автомат для чисел/булевых/изображений |

### Formatter’ы

- `boolean`/`checkbox` → `formatter: 'tickCross'`, `formatterParams.tristate = true`, `mutator` приводит `'1'`, `'true'`, `'Y'` к `true`.
- `file`/`image` → HTML-превью через `Energine.resizer` (`w40-h40`).
- `value` → поддержка объектов вида `{ value: '…' }`.
- `textbox` → объединяет значения словаря `Object.values().join(', ')`.
- `html`/`htmlblock` → `formatter: 'html'`.
- остальные → универсальный вывод текста с заменой `null/undefined` на пустую строку.

## Локализация

При создании экземпляра формируется набор локалей Tabulator (`locale = 'energine'` по умолчанию). Значения подтягиваются из `Energine.translations`:

- Заглушки `loading`/`error`.
- Подписи пагинации (`first`, `prev`, `page_size`, `page_title` и т.д.).
- Плейсхолдер фильтра `headerFilters.default`.

## События

Адаптер прозрачно ретранслирует события Tabulator во внутреннюю шину (`on`/`fireEvent`):

| Tabulator | TabulatorGrid | Описание |
|-----------|---------------|----------|
| `tableBuilt` | `ready` | Таблица построена – удобно включить тулбар |
| `rowSelected` / `rowDeselected` / `rowSelectionChanged` | `select`, `deselect`, `selectionChange` | Следят за текущим выделением |
| `rowDblClick` | `doubleClick` | Старая логика CRUD переиспользует событие |
| `sortChanged` | `sortChange` | Обновляет `grid.sort` и сообщает менеджеру |
| `dataLoaded`, `dataChanged` | `dataLoaded`, `dataChanged` | Позволяет синхронизировать кеш данных |

## Публичные методы

| Метод | Назначение | Возвращает |
|-------|------------|------------|
| `setMetadata(meta)` | Задать метаданные колонок | void |
| `getMetadata()` | Получить текущее описание | `Object` |
| `setData(rows)` | Заполнить таблицу данными | `Promise` из `Tabulator.setData` |
| `clear()` | Очистить таблицу | `Promise` |
| `isEmpty()` | Проверить наличие строк | `Boolean` |
| `getSelectedRecord()` | Получить выбранную запись | `Object|null` |
| `getSelectedRecordKey()` | Значение ключевого поля | `String|Number|null` |
| `selectRecordById(id)` | Выделить запись по ключу | `Promise` |
| `updateRecord(record)` | Обновить или добавить запись | `Promise` |
| `deleteRecord(recordOrKey)` | Удалить строку | `Promise` |
| `deselect()` | Снять выделение | `Promise` |
| `destroy()` | Освободить ресурсы | void |
| `getTabulator()` | Доступ к нативному экземпляру | `Tabulator` |

## Следующие шаги

1. Подключить `TabulatorGrid` внутри `GridManager` вместо старого класса `Grid`.
2. Перенести логику сортировки/перезагрузки в обработчики событий адаптера.
3. Привести фильтр и пагинацию к работе через Tabulator (remote mode или вручную через `setData`).

