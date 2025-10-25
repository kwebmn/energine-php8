# План перехода на декларативный запуск компонентов Energine

## 1. Контекст и текущее состояние

### 1.1 Использование `generate-id()` и JSON-конфигураций

- Большинство XSLT-шаблонов Energine генерируют уникальные `id` при помощи `generate-id(recordset)` или `generate-id(.)`, чтобы JavaScript мог найти компонент по DOM-идентификатору и вызвать нужный behavior-класс. Например, грид получает контейнер `<div id="{generate-id(.)}" ...>` с дополнительными служебными атрибутами `template`, `single_template` и вспомогательными параметрами (`quick_upload_path`, `move_from_id` и т.д.).【F:engine/core/modules/share/transformers/bootstrap/list.xslt†L32-L62】
- Разметка страницы завершается inline-скриптом в `document.xslt`, который собирает JSON с парами `{ "id": "...", "behavior": "..." }` на основе тех же `generate-id` и передаёт его в клиентскую инициализацию (`componentToolbars`, `bootEnergine`).【F:engine/core/modules/share/transformers/bootstrap/document.xslt†L200-L244】
- Аналогично тулбар и редактор страницы получают конфигурацию через данные, встроенные в атрибуты `data-page-toolbar-*`, но идентификатор для `PageEditor` всё ещё вычисляется через `generate-id(recordset)` и сериализуется в JSON-строку.【F:engine/core/modules/share/transformers/bootstrap/document.xslt†L212-L241】

### 1.2 Привязка behavior-классов к `id`

- Поведенческие классы предполагают, что им передаётся DOM-элемент по `id`. `ValidForm` сохраняет путь `single_template`, считанный напрямую из атрибута `single_template`, сразу после поиска элемента по селектору или ссылке.【F:engine/core/modules/share/scripts/ValidForm.js†L14-L33】
- `Form` и `GridManager` читают пути из тех же атрибутов `single_template`/`template`, сохраняя их во внутреннем состоянии для формирования URL при действиях пользователя.【F:engine/core/modules/share/scripts/Form.js†L323-L356】【F:engine/core/modules/share/scripts/GridManager.js†L1420-L1433】
- Базовый рантайм `Energine.js` содержит вспомогательные методы, которые до сих пор опираются на `document.getElementById(id)` для поиска контейнеров, переданных из XSLT (например, при показе модалок или нотификаций).【F:engine/core/modules/share/scripts/Energine.js†L427-L516】

### 1.3 Ограничения текущего подхода

1. Требование уникальных `id` заставляет XSLT добавлять идентификаторы даже там, где они не нужны семантически, и повторно синхронизировать их между XSLT и JavaScript.
2. Inline-скрипты с JSON-конфигурацией нарушают требование об отсутствии поведения в шаблонах и усложняют lazy-загрузку/повторную инициализацию.
3. Атрибуты вроде `template` и `single_template` пересекаются с валидными HTML-атрибутами, затрудняют валидацию и не дают понять, что они нужны только Energine.

## 2. Целевое решение

1. **Явный маркировочный атрибут.** Каждый компонент отмечается `data-e-js="<BehaviorClass@sample>"`, где `<BehaviorClass@sample>` — значение `@sample` из `*.component.xml` или `javascript/behavior/@name` в разметке. Это освобождает от необходимости вычислять или синхронизировать идентификатор.
2. **Декларативные параметры.** Все дополнительные настройки переводятся в `data-*` с префиксом `data-e-`. Например, `template` → `data-e-template`, `single_template` → `data-e-single-template`, `quick_upload_path` → `data-e-quick-upload-path` (kebab-case для единообразия). Значения считываются через `element.dataset`.
3. **Автопоиск контейнеров.** Модуль `Energine.js` после `boot()` находит все элементы с `data-e-js` и вызывает конструктор указанного behavior-класса, передавая сам элемент. Повторная инициализация предотвращается пометкой `data-e-ready="1"` или сохранением ссылки `element.__energineInstance`.
4. **Отказ от JSON-конфигураций в XSLT.** `document.xslt` больше не генерирует массивы `{id, behavior}`. Вся конфигурация (`PageToolbar`, `PageEditor` и т.д.) читается из DOM `dataset`.

## 3. План работ по слоям

### 3.1 XSLT-шаблоны

1. **Базовые контейнеры компонентов.**
   - Удалить атрибуты `id="{generate-id(...)}` в шаблонах `list.xslt`, `form.xslt`, `divisionEditor.xslt`, `user.xslt`, `text.xslt` и других компонентных XSLT. Вместо них добавить `data-e-js="{@sample}` или `data-e-js="{javascript/behavior/@name}` в зависимости от наличия поведения в XML.
   - Перенести параметры (`template`, `single_template`, `quick_upload_*`, `move_from_id` и т.п.) в `data-e-*`. Формат: `data-e-template="{$BASE}{$LANG_ABBR}{../@template}"`, `data-e-single-template="{$BASE}{$LANG_ABBR}{../@single_template}"` и т.д.
   - Для булевых/флаговых значений использовать строки `'1'`/`'0'` либо `'true'`/`'false'`, чтобы их просто парсить в JS.

2. **`document.xslt`.**
   - Удалить формирование массива `data-components` и JSON `data-page-editor-config`. Вместо этого тулбар, редактор и другие сервисы получают собственные контейнеры с `data-e-js` и `data-e-*`-параметрами.
   - Inline-скрипт (в том числе импорт `bootEnergine` и наполнение `componentToolbars`) переносится в модуль `Energine.js`. XSLT оставляет только `<script type="module" src="...Energine.js" data-base="..." data-lang="...">`.

3. **Модули, завязанные на `id`.**
   - Проверить шаблоны, создающие вспомогательные элементы (например, `toolbar.xslt`), чтобы они не ссылались на `id` контейнеров компонент. Там, где `aria-controls`/`data-bs-target` требуют `id`, использовать стабильные имена (`data-e-target-id`) и синхронизировать их в JS.

### 3.2 JavaScript-модули

1. **Рантайм `Energine.js`.**
   - Добавить функцию `scanForComponents(root = document)` → `root.querySelectorAll('[data-e-js]:not([data-e-ready])')` инициализирует behavior-классы.
   - Встроить маппинг `const className = element.dataset.eJs; const ClassRef = globalThis[className] || importedRegistry.get(className);` и вызвать `new ClassRef(element, element.dataset);`. После успешной инициализации помечать элемент (`element.dataset.eReady = '1'`).

2. **Поведенческие классы.**
   - Обновить все места, где используется `getAttribute('single_template')`/`getAttribute('template')`, на чтение из `dataset` (`element.dataset.eSingleTemplate`, `element.dataset.eTemplate`).
   - Для конфигураций с несколькими значениями (например, `quick_upload_path`) читать `element.dataset.eQuickUploadPath` и т.д.
   - Убедиться, что конструкторы принимают сам `element`, а не `id`. Если в классе допускается строка, изменить на `document.querySelector` и поддержать `data-e-id`/`data-e-selector` при необходимости.

3. **Реестр behavior-классов.**
   - Ввести вспомогательную функцию `registerBehavior(name, ClassRef)` в `Energine.js` или отдельном модуле, чтобы классы могли объявляться без глобального `attachToWindow`.

### 3.3 Согласование с серверной частью

1. Провести аудит всех `*.component.xml` и `*.component.php`, чтобы определить, какие `@sample` используются и какие параметры передаются в XSLT. Документировать соответствие `@sample` → JS-класс.
2. Обновить документацию для разработчиков XSLT: новые компоненты обязаны задавать `data-e-js` и `data-e-*` вместо `id` и произвольных атрибутов.

## 4. План внедрения

1. Выполнить обновление XSLT и JavaScript в рамках одного релиза, чтобы разметка сразу использовала только `data-e-js` и `data-e-*` без `generate-id()` и старых атрибутов `template`/`single_template`.
2. Перед выкладкой прогнать smoke-тесты UI и ручные проверки ключевых сценариев (`GridManager`, `Form`, `ValidForm`, тулбар, редактор страниц), убедившись, что все компоненты инициализируются автоматически.
3. После релиза мониторить консоль браузера и серверные логи: при появлении неизвестных значений `data-e-js` оперативно регистрировать соответствующие классы или корректировать шаблоны.

## 5. Риски и меры смягчения

- **Неинициализированные компоненты.** Возможны ситуации, когда `data-e-js` указывает на класс, не зарегистрированный в глобальной области. Нужно централизованно регистрировать все поведенческие классы и логировать ошибки с указанием селектора.
- **Брейкинг для сторонних модулей.** Внутренние расширения, напрямую использующие `getElementById`, должны получить патч и перейти на поиск через `dataset` либо `data-e-*`-селекторы.
- **Изменение CSS/JS селекторов.** Атрибуты `template`/`single_template` могли использоваться в стилях или скриптах. Перед заменой выполнить поиск по репозиторию и уведомить команды о необходимости обновить селекторы.

## 6. Результат

Переход на `data-e-js` и `data-e-*`:
- Устраняет зависимость от динамически сгенерированных `id` и inline-скриптов.
- Делает HTML-шаблоны декларативными и валидными, упрощает SSR и повторную инициализацию при частичном обновлении DOM.
- Централизует запуск компонент в `Energine.js`, позволяя внедрять lazy-loading, hot reload и другие улучшения без правок XSLT.
