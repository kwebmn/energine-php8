# GridManager → Tabulator markup plan

## Обзор XSLT с `@exttype='grid'`
- Карточка грида остаётся карточкой Bootstrap: `<div class="card ..." data-role="pane">` → `<div class="card-body">` → `<div class="grid" data-role="grid">`.
- Секция вкладок (`data-role="tabs"`, `data-role="pane-item"`, `data-role="tab-meta"`) не меняется: Tabulator живёт внутри активной вкладки.
- Фильтр и тулбар сохраняются без изменений в структуре, но обёрнуты в `<div data-role="grid-toolbar">` и `<div data-role="grid-filter">`.

## Новый контейнер под Tabulator
- Вместо двух таблиц (`data-grid-section="head/body"` + `data-role="grid-table"`) выводится пустой контейнер `<div data-role="tabulator-container">`.
- Уникальный `id` генерируется как `${TAB_ID}-tabulator`, чтобы `GridManager` мог инициализировать Tabulator по селектору.
- Внутри контейнера выводится плейсхолдер `<div data-role="tabulator-placeholder">` с текстом загрузки до инициализации.
- Вспомогательная обёртка `<div data-role="tabulator-shell">` оставлена для последующих эффектов (оверлеи, индикаторы, кастомные тулбары).

## Актуальные `data-role`
| data-role | Назначение | Комментарии |
|-----------|------------|-------------|
| `grid` | Корневой блок грида внутри вкладки. | Содержит фильтр, табулятор и будущие индикаторы.
| `grid-toolbar` | Область с фильтром и кнопками. | Без изменений относительно старой версии.
| `grid-filter` | Контейнер полей фильтра. | Используется классом `Filter`.
| `tabulator-shell` | Визуальная обёртка вокруг Tabulator. | Подходит для размещения оверлеев/индикаторов.
| `tabulator-container` | Элемент, на который навешивается `new Tabulator(...)`. | Заменяет старые `table[data-role="grid-table"]`.
| `tabulator-placeholder` | Заглушка до инициализации, может быть скрыта после `dataLoaded`. | Текст берётся из `@loadingLabel`, иначе `Loading…`.
| `tab-meta` | Метаданные вкладки для мульти-язычных списков. | Остаётся для TabPane.

## Удалённые элементы
- Таблицы `<table data-role="grid-table">` и связанные `thead/tbody` больше не рендерятся.
- Атрибуты `data-grid-section="head|body"`, `data-grid-part="head|body"`, `data-fixed-columns` уходят как наследие старого грида.
- Соответствующие `colgroup` и заголовки передаются Tabulator через `columns`/`columnCalcs`.

## Обновление стилей
- В `default.css` добавлены правила для `[data-role="tabulator-container"]`, чтобы сохранить рамку и фон карточки.
- Ядро Tabulator использует класс `.tabulator`, поэтому стили таргетят `.tabulator` внутри контейнера и подкрашивают шапку/фон под Bootstrap 5.
- Плейсхолдер получает `min-height`, чтобы карточка не схлопывалась до загрузки данных.

## Следующие шаги для Codex
1. Обновить `GridManager`/новую обёртку, чтобы она искала `data-role="tabulator-container"` и инициализировала Tabulator.
2. Переписать работу с метаданными (`meta → columns`) и данными (`data → setData`) с учётом нового контейнера.
3. Удалить логику, которая ожидала присутствия таблицы (поиск `thead`, `tbody`, `colgroup`).
