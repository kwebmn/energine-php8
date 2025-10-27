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

### 2.1 Пример «до/после»

```xslt
<!-- Было -->
<div id="{generate-id(.)}"
     template="{$BASE}{$LANG_ABBR}{../@template}"
     single_template="{$BASE}{$LANG_ABBR}{../@single_template}">
    <xsl:apply-templates select="items"/>
</div>
<script>
    bootEnergine([{"id": "{generate-id(.)}", "behavior": "{javascript/behavior/@name}"}]);
</script>

<!-- Стало -->
<div data-e-js="{javascript/behavior/@name}"
     data-e-template="{$BASE}{$LANG_ABBR}{../@template}"
     data-e-single-template="{$BASE}{$LANG_ABBR}{../@single_template}">
    <xsl:apply-templates select="items"/>
</div>
<!-- Без inline-скриптов: Energine.js найдёт элемент сам -->
```

```js
// Было
const el = document.getElementById(component.id);
const behavior = new window[component.behavior](component.id);
behavior.singleTemplate = el.getAttribute('single_template');

// Стало
import { registerBehavior } from './Energine.js';

class GridManager {
    constructor(element) {
        this.el = element;
        this.template = element.dataset.eTemplate;
        this.singleTemplate = element.dataset.eSingleTemplate;
    }
}

registerBehavior('GridManager', GridManager);
```

### 2.2 Таблица сопоставления атрибутов

| Старый атрибут/поле             | Новый `data-e-*`                      | Тип/формат                                          | Комментарий |
|---------------------------------|--------------------------------------|-----------------------------------------------------|-------------|
| `template`                      | `data-e-template`                    | строка пути                                         | Используем абсолютный/относительный путь как раньше. |
| `single_template`               | `data-e-single-template`             | строка пути                                         | Для форм, модалок и валидации. |
| `quick_upload_path`             | `data-e-quick-upload-path`           | строка пути                                         | Для drag-n-drop аплоадеров. |
| `move_from_id`                  | `data-e-move-from-id`                | числовой/строковый идентификатор                    | Значение не преобразуется. |
| `data-page-toolbar-*`           | `data-e-toolbar-*`                    | строка/JSON (для сложных конфигураций)              | Префикс `toolbar` остаётся внутри `data-e-`. |
| События (`onaction`, `onsave`)  | `data-e-on-action`, `data-e-on-save`, `data-e-action` | строка с именем события или JSON для нескольких     | Для единичного обработчика можно использовать `data-e-action="methodName"`; behavior сам подпишется на `click`, остальные события переводятся в kebab-case. |
| Флаги (`is_popup="1"`)          | `data-e-is-popup="true"`             | `'true'/'false'` либо `'1'/'0'` (строки)            | Значение приводим к строке, в JS приводим к bool. |
| Произвольные параметры `paramX` | `data-e-param-x`                     | строка/число/JSON                                   | Kebab-case и `data-e-` обязательны. |

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

> **Статус (2025-10-27).** Кнопка сброса шаблона в `divisionEditor.xslt` больше не вызывает методы через `generate-id(...)`; разметка использует `data-e-action="resetPageContentTemplate"`, а `DivForm` подписывает обработчик по `dataset`.

### 3.2 JavaScript-модули

1. **Рантайм `Energine.js`.**
   - Добавить функцию `scanForComponents(root = document)` → `root.querySelectorAll('[data-e-js]:not([data-e-ready])')` инициализирует behavior-классы.
   - Встроить маппинг `const className = element.dataset.eJs; const ClassRef = globalThis[className] || importedRegistry.get(className);` и вызвать `new ClassRef(element, element.dataset);`. После успешной инициализации помечать элемент (`element.dataset.eReady = '1'`).
   - **API рантайма.**
     - `scanForComponents(root = document): HTMLElement[]` — возвращает список успешно инициализированных элементов и используется повторно после AJAX/SSI-вставок.
     - `registerBehavior(name: string, ClassRef: BehaviorCtor): void` — добавляет класс в реестр; повторный вызов с тем же именем логирует предупреждение и перезаписывает ссылку только под флагом `FORCE_REGISTER`.
     - Контракт конструктора: `new Behavior(element: HTMLElement, dataset: DOMStringMap)` возвращает экземпляр с методами `destroy()` и `reinit(nextDataset?)` (по желанию). `scanForComponents` перед переинициализацией вызывает `destroy()`, затем снимает `data-e-ready` и повторно запускает сканирование.
     - Повторная инициализация: внешние модули вызывают `scanForComponents(container)` после частичного обновления DOM; чтобы не создавать дубликатов, рантайм сверяет `element.__energineBehavior` и повторно создаёт экземпляр только если флаг `data-e-refresh="1"`.

2. **Поведенческие классы.**
   - Обновить все места, где используется `getAttribute('single_template')`/`getAttribute('template')`, на чтение из `dataset` (`element.dataset.eSingleTemplate`, `element.dataset.eTemplate`).
   - Для конфигураций с несколькими значениями (например, `quick_upload_path`) читать `element.dataset.eQuickUploadPath` и т.д.
   - Убедиться, что конструкторы принимают сам `element`, а не `id`. Если в классе допускается строка, изменить на `document.querySelector` и поддержать `data-e-id`/`data-e-selector` при необходимости.

3. **Реестр behavior-классов.**
   - Ввести вспомогательную функцию `registerBehavior(name, ClassRef)` в `Energine.js` или отдельном модуле, чтобы классы могли объявляться без глобального `attachToWindow`.
   - Начиная с обновления 2024-04, рантайм больше не ищет конструкторы по `window[behaviorName]`. Каждый behavior обязан импортировать `registerBehavior` из `Energine.js` и вызвать его один раз после объявления класса. Старый паттерн `globalScope[id] = instance` удалён; при попытке опереться на него рантайм выводит предупреждение с именем элемента.
   - В debug-режиме (атрибут `<script data-debug="true">`) `scanForComponents` выбрасывает `Error`, если компонент встретил неизвестное значение `data-e-js` и регистрация не произошла в течение нескольких повторных попыток (порог по умолчанию — 5). Это помогает найти забытые импорты/регистрации во время миграции, но при корректной ленивой загрузке предотвращает ложные срабатывания. В продакшене рантайм продолжает повторять инициализацию до тех пор, пока модуль не будет загружен.

> **Статус (2025-10-27).** `PageToolbar` больше не ищет старые `data-component-*`/`data-document-*` атрибуты и читает конфигурацию только из `data-e-*`.

> **Статус (2025-10-27).** Рантайм выполняет первичное сканирование самостоятельно и больше не предоставляет экспорт `autoScanComponents` для ручного запуска; повторная инициализация осуществляется внутренними механизмами.

### 3.3 Согласование с серверной частью

1. Провести аудит всех `*.component.xml` и `*.component.php`, чтобы определить, какие `@sample` используются и какие параметры передаются в XSLT. Документировать соответствие `@sample` → JS-класс.
2. Обновить документацию для разработчиков XSLT: новые компоненты обязаны задавать `data-e-js` и `data-e-*` вместо `id` и произвольных атрибутов.
3. **Чеклист внедрения.**
   1. Сформировать перечень файлов `engine/**/**.component.xml`, где объявлены `javascript/behavior`; для каждого файла отметить, какие параметры уносятся в `data-e-*`.
   2. Найти сопряжённые `*.component.php` и убедиться, что серверные методы больше не ожидают `id` в запросах; при необходимости добавить поддержку чтения `data-e-*`.
   3. Выполнить поиск `rg "generate-id"` по репозиторию и зафиксировать участки, требующие миграции на `data-e-js`.
   4. Проверить фронтовые шаблоны (`document.xslt`, `toolbar.xslt`, модули редакторов) на наличие `data-page-toolbar-*` и заменить на документированные `data-e-*`.
   5. Валидировать Git-хук `.git/hooks/applypatch-msg.sample`: запустить `bash .git/hooks/applypatch-msg.sample <<<"Component refactor test"` и убедиться, что hook возвращает код 0 и корректно проверяет формат сообщения; описать ожидаемый формат в документации.
   6. После правок прогнать smoke-тесты UI и PHP-юнит-тесты, убедившись, что серверная часть корректно возвращает значения для новых атрибутов.

## 4. План внедрения

1. Выполнить обновление XSLT и JavaScript в рамках одного релиза, чтобы разметка сразу использовала только `data-e-js` и `data-e-*` без `generate-id()` и старых атрибутов `template`/`single_template`.
2. Перед выкладкой прогнать smoke-тесты UI и ручные проверки ключевых сценариев (`GridManager`, `Form`, `ValidForm`, тулбар, редактор страниц), убедившись, что все компоненты инициализируются автоматически.
3. После релиза мониторить консоль браузера и серверные логи: при появлении неизвестных значений `data-e-js` оперативно регистрировать соответствующие классы или корректировать шаблоны.

## 5. Риски и меры смягчения

- **Неинициализированные компоненты.** Возможны ситуации, когда `data-e-js` указывает на класс, не зарегистрированный в глобальной области. Нужно централизованно регистрировать все поведенческие классы и логировать ошибки с указанием селектора.
- **Брейкинг для сторонних модулей.** Внутренние расширения, напрямую использующие `getElementById`, должны получить патч и перейти на поиск через `dataset` либо `data-e-*`-селекторы.
- **Изменение CSS/JS селекторов.** Атрибуты `template`/`single_template` могли использоваться в стилях или скриптах. Перед заменой выполнить поиск по репозиторию и уведомить команды о необходимости обновить селекторы.
- **Наблюдаемость.**
  - При неизвестном `data-e-js` логировать `console.error('[energine] Unknown behavior', className, element)` и отправлять событие `component_init_failed` в существующий логгер (Sentry/Graylog) с `element.dataset`.
  - В `scanForComponents` подсчитывать `initialized`, `failed` и `skipped` и публиковать метрики в Prometheus/StatsD (`energine_components_total{status="ok|fail"}`) раз в тик boot-а.
  - Для перезапусков компонента сохранять timestamp в `element.dataset.eInitTs` и репортить в telemetry, если компонент переинициализируется более 3 раз за страницу — это симптом утечек.

## 6. Результат

Переход на `data-e-js` и `data-e-*`:
- Устраняет зависимость от динамически сгенерированных `id` и inline-скриптов.
- Делает HTML-шаблоны декларативными и валидными, упрощает SSR и повторную инициализацию при частичном обновлении DOM.
- Централизует запуск компонент в `Energine.js`, позволяя внедрять lazy-loading, hot reload и другие улучшения без правок XSLT.
