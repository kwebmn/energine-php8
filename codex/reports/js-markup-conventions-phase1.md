# Соглашения по разметке Energine (Фаза 1)

## 1. Назначение документа

Документ задаёт единые правила декларативной инициализации JavaScript-компонентов Energine. Цель — уйти от инлайн-скриптов в XSLT и подготовить единый загрузчик, который:

- ищет в DOM элементы с атрибутами `data-energine-*`,
- собирает параметры компонента из атрибутов `data-energine-param-*`,
- подключает внешние зависимости (через Vite-бандлы в prod и одиночные файлы в dev),
- монтирует тулбары и переводческие расширения без прямых вызовов `Energine.addTask`.

## 2. Базовые правила разметки

1. **Маркер класса** — `data-energine-js`.
   - Значение — имя JS-класса (в точности как в исходниках). Допускается перечисление нескольких классов через пробел, если один DOM-элемент должен создать несколько экземпляров (например, `"GridManager Toolbar"`).
   - Каждый класс инициализируется последовательно (в порядке перечисления) и получает один и тот же DOM-элемент.
2. **Параметры конструктора** — `data-energine-param-*`.
   - Суффикс после `data-energine-param-` пишется в kebab-case и транслируется загрузчиком в camelCase/`snake_case` в точности, как ожидает класс (см. реестр ниже).
   - Допустимые типы: строка, число, булево (`"true"/"false"`), список значений (`"value1 value2"`). JSON запрещён (ограничение XSLT 1.0).
   - Значения путей должны быть абсолютными относительно корня приложения (как сейчас в XSLT: `{$BASE}{$LANG_ABBR}{@single_template}`).
3. **Расширение переводов** — отдельный вспомогательный класс `TranslationsExtend` (будет реализован в Phase 2) помечается `data-energine-js="TranslationsExtend"` и получает параметры:
   - `data-energine-param-source` — CSS‑селектор узла `<script type="application/json">` с JSON переводов;
   - `data-energine-param-component` — имя компонента или `*` для глобального набора.
   Такой узел размещается рядом с компонентом вместо инлайн-вызова `Energine.translations.extend(...)`.
4. **Хуки тулбаров** размещаются внутри контейнеров с `data-pane-toolbar="top|bottom|left|right"` (как и сейчас в XSLT) и описываются по схеме из § 4.
5. **Генерируемые идентификаторы** (`generate-id()`, `id="form-…"`) сохраняются — они становятся значениями параметров вроде `data-energine-param-target="#${generate-id(.)}"`.

### Пример: сетка с тулбаром и переводами

```html
<div
  id="{$GRID_ID}"
  class="card border-0 overflow-hidden d-flex flex-column h-100"
  data-energine-js="GridManager"
  data-energine-param-single-template="{$BASE}{$LANG_ABBR}{@single_template}"
  data-energine-param-component="{@name}"
  data-energine-param-template="{$BASE}{$LANG_ABBR}{@template}"
  data-energine-param-quick-upload-path="{@quickUploadPath}"
  data-energine-param-quick-upload-pid="{@quickUploadPid}"
  data-energine-param-quick-upload-enabled="{@quickUploadEnabled}"
  data-energine-param-move-from-id="{@moveFromId}"
>
  …
  <footer class="card-footer" data-pane-toolbar="bottom">
    <div
      data-energine-js="Toolbar"
      data-energine-param-name="{@toolbar/@name}"
      data-energine-param-target="#{$GRID_ID}"
      data-energine-param-docking="bottom"
    >
      <button
        type="button"
        data-energine-toolbar-control="button"
        data-energine-param-id="save"
        data-energine-param-action="save"
        data-energine-param-icon="fa fa-save"
        data-energine-param-title="{//translation[@const='BTN_SAVE']}"
      >
        {//translation[@const='BTN_SAVE']}
      </button>
      <div data-energine-toolbar-control="separator"></div>
      …
    </div>
  </footer>
</div>

<!-- JSON с переводами -->
<script type="application/json" id="translations-{$GRID_ID}">
  {/document/translations/@json}
</script>
<div
  data-energine-js="TranslationsExtend"
  data-energine-param-source="#translations-{$GRID_ID}"
  data-energine-param-component="{@name}"
></div>
```

## 3. Реестр обязательных параметров компонентов

| Класс | Где ставим `data-energine-js` | Обязательные `data-energine-param-*` | Дополнительные параметры | Комментарии |
| --- | --- | --- | --- | --- |
| **GridManager** | Корневой контейнер сетки (`div[data-role='pane']`) | `single-template` | `component` (имя компонента), `template`, `quick-upload-path`, `quick-upload-pid`, `quick-upload-enabled`, `move-from-id` | Базовый список/грид. Значения quick-* подтягиваются из `@quickUpload*` XSLT. |
| AttachmentEditor | Тот же контейнер, что и GridManager | `single-template` | Наследует все параметры GridManager; quick-upload-* обязательны для модалки быстрого аплоада. |
| FileRepository | Контейнер списка файлов | `single-template` | `component`, `template` | Использует REST-методы GridManager. |
| FileRepoForm | Форма репозитория (`form`) | `single-template`, `template` | `preview`, `width`, `height`, `action`, `data` | Атрибуты берутся из XSLT (например, `@preview`). |
| TagEditor | Карточка грида меток | `single-template`, `template`, `tag-id` | `component` | `tag-id` = `@tag_id`. |
| SiteManager | Контейнер грида сайтов | `single-template` | `component` | Наследует GridManager. |
| DivManager | Карточка дерева разделов | `single-template`, `template`, `lang-id`, `site` | `component` | `lang-id={$LANG_ID}`, `site={@site}`. |
| DivTree | Вложенный `div` с деревом (`#treeContainer`) | `single-template`, `lang-id`, `site` | `component` | Используется для сайдбара/вспомогательных деревьев. |
| DivSidebar | Контейнер сайдбара | `single-template`, `template`, `lang-id`, `site` | `component` | Синхронизирует основной DivManager. |
| DivForm | Форма редактирования раздела (`form`) | `single-template`, `template` | `component` | Доп. параметры не требуются — Form обрабатывает остальное. |
| FiltersTreeEditor | Контейнер дерева фильтров | `single-template` | `txt-add`, `txt-edit`, `txt-delete`, `txt-confirm`, `txt-refresh`, `txt-up`, `txt-down` | Строки подтягиваются из переводов (`//translation[@const='…']`). |
| Form | Любая компонентная форма (`form` внутри `component[@type='form']`) | `single-template`, `template` | `component`, `lang-id` (при мультиязыке), `grid-name` (если вложена в grid) | `component` можно брать из `@name`. |
| ValidForm | Корневой `form` | `single-template`, `template` | Наследует Form. |
| PageEditor | Контейнер с редактируемой областью (`div.nrgnEditor`) | `single-template`, `e-id`, `num` | `component` | `e-id` = значение `@eID`, `num` = `@num`. |
| PageToolbar | Узел в `data-pane-toolbar="top"` | `component-path` (путь к `single_template`), `document-id` (ID документа), `toolbar-name` | `offcanvas-target`, `sidebar-frame`, `layout-mode` | Контролы описываются дочерними `data-energine-toolbar-control`. |
| Toolbar | Контейнер внутри `data-pane-toolbar` | `name`, `target` | `docking` (`top/bottom/left/right`), `class` (доп. CSS), `properties-*` (см. §4) | `target` = селектор, куда привязать тулбар (обычно `#{$GRID_ID}`). |
| Toolbar.Button / Toolbar.Separator | Кнопки внутри контейнера | `id`, `action`, `title` | `icon`, `icon-only`, `tooltip`, `variant`, `initially-disabled` | Каждая кнопка/разделитель — отдельный элемент. |
| PageList | Навигационные списки (`ul[data-role='tabs']`) | — | — | Не требует параметров — инициализация идёт через GridManager. |
| ModalBox | Модальные контейнеры (`div.modal`) | `id` (через обычный атрибут) | `backdrop`, `keyboard` | Параметры передаются через data-атрибуты Bootstrap (`data-bs-*`). |
| ImageManager | Контейнер модального окна менеджера изображений | `single-template` | `component` | Наследует GridManager API; доп. параметров нет. |
| FileAPI widgets | Инпуты файлов (`input[type='file']`) | `static-path` (через глобальную инициализацию) | `accept`, `multiple` | Используются внутри Form/AttachmentEditor — параметры задаются штатными HTML-атрибутами. |
| UserManager | Контейнер грида пользователей | `single-template` | `component` | Наследует GridManager. |
| GroupForm | Форма прав групп | `single-template`, `template` | — | Наследует Form. |
| UserProfile | Форма профиля (`form#user_profile`) | `single-template` | — | Отправка на `{single-template}save`. |
| RecoverPassword | Блок восстановления пароля | `single-template`, `template` | — | Использует оба пути (check/change). |
| SignIn | Блок авторизации | `template` | — | `template` указывает базовый URL (`/login/`). |
| FeedToolbar | Обёртка тулбара ленты | `single-template`, `toolbar-name` | `linked-to` (селектор привязки), `record` | Наследует Toolbar, работает внутри admin. |
| TemplateWizard | Контейнер грида мастера шаблонов | `single-template` | `component` | Наследует GridManager. |
| DefaultTemplateJs / Testfeed | Технические компоненты (устаревшие) | `template` | — | Для совместимости оставить возможность передавать путь. |
| FiltersTreeEditor.TranslationsExtend | См. §2.3 | `source`, `component` | — | В каждой карточке, где раньше был inline `translations.extend`. |

> **Примечание:** Если класс не ожидает параметров (например, `Toolbar.Separator`), атрибут `data-energine-param-*` опускается — загрузчик передаст только DOM-узел.

## 4. Схема описания тулбаров в DOM

1. **Контейнер тулбара** (`div`, `nav`, `section`) располагается внутри области `data-pane-toolbar` и помечается `data-energine-js="Toolbar"` (или `PageToolbar`, `FeedToolbar`).
2. Обязательные параметры контейнера:
   - `data-energine-param-name` — машинное имя тулбара (`Toolbar`, `pageToolbar` и т.д.);
   - `data-energine-param-target` — CSS‑селектор узла компонента, к которому тулбар привязывается (часто `#{generate-id(.)}`).
3. Дополнительные параметры контейнера:
   - `data-energine-param-docking` — позиция (`top`, `bottom`, `left`, `right`), на основе которой класс вызывает `dock()`/`undock()`;
   - `data-energine-param-class` — дополнительные CSS-классы через пробел;
   - произвольные `data-energine-param-*`, которые будут переданы в объект `props` конструктора (например, `data-energine-param-sidebar-offcanvas="admin-sidebar"`).
4. **Контролы тулбара** описываются дочерними узлами:
   - `data-energine-toolbar-control="button"` — обычная кнопка;
   - `data-energine-toolbar-control="submit"` — сабмит формы;
   - `data-energine-toolbar-control="separator"` — разделитель.
5. Каждый контрол получает набор `data-energine-param-*`:
   - Обязательные: `id`, `action` (метод компонента), `title` или `aria-label`.
   - Опциональные: `icon`, `icon-only` (`true|false`), `tooltip`, `variant` (Bootstrap-класс), `disabled`, `initially-disabled`, `class`.
6. Текстовые подписи выводятся как содержимое элемента (`<button>Подпись</button>`). Для иконок используется `data-energine-param-icon` (значение CSS-класса) или вложенный `<svg>`.
7. Для вложенных тулбаров (например, `PageToolbar`) допускается включение `data-energine-js="Toolbar"` на дочерних элементах, чтобы описывать составные панели без JS-кода в шаблоне.

### Минимальный пример тулбара

```html
<div data-pane-toolbar="top">
  <div
    data-energine-js="Toolbar"
    data-energine-param-name="gridToolbar"
    data-energine-param-target="#{$GRID_ID}"
  >
    <button
      type="button"
      data-energine-toolbar-control="button"
      data-energine-param-id="refresh"
      data-energine-param-action="refresh"
      data-energine-param-title="{//translation[@const='BTN_REFRESH']}"
      data-energine-param-icon="fa fa-rotate-right"
    >
      {//translation[@const='BTN_REFRESH']}
    </button>
    <div data-energine-toolbar-control="separator"></div>
    <button
      type="button"
      data-energine-toolbar-control="button"
      data-energine-param-id="delete"
      data-energine-param-action="delete"
      data-energine-param-title="{//translation[@const='BTN_DELETE']}"
      data-energine-param-variant="btn-outline-danger"
      data-energine-param-initially-disabled="true"
    >
      {//translation[@const='BTN_DELETE']}
    </button>
  </div>
</div>
```

## 5. Общие рекомендации по именованию и преобразованию

- Значения `data-energine-param-*` транслируются в свойства конструктора через замену дефисов:
  - `data-energine-param-single-template` → `single_template` (или `singleTemplate` — в зависимости от класса; правило задаётся в загрузчике по словарю из таблицы выше).
  - `data-energine-param-lang-id` → `lang_id`.
- Если один атрибут должен содержать несколько значений (например, список контролов), используются повторяющиеся дочерние элементы, а не разделители внутри строки.
- Классы, использующие числовые значения (`num`, `lang_id`), получают строки — конструкторы сами приводят к числу при необходимости.
- Атрибуты, связанные с URL, не содержат `LANG_ABBR` вручную — XSLT формирует конечный путь (`/uk/admin/...`).
- Для повторно используемых путей (например, `single-template`, `template`) XSLT объявляет переменные и вставляет значения в оба атрибута, чтобы исключить расхождения.

## 6. Переводы без inline-скриптов

1. В конце документа (`document.xslt`) формируется единый `<script type="application/json" id="translations-root">` с полным набором переводов.
2. Каждый компонент, которому нужны переводы, добавляет рядом узел `data-energine-js="TranslationsExtend"` с параметрами `source` и `component`.
3. Для WYSIWYG-полей в сетке достаточно одного такого узла на родительскую карточку: `data-energine-param-component="{@name}"`.
4. В дев-режиме JSON остаётся человекочитаемым; в проде бандлер может инлайнить его в бандл (детали в Phase 2).

## 7. Поток инициализации (текстовая схема)

```
[Загрузчик (dev/prod)]
    └─ сканирует DOM на `data-energine-js`
         └─ формирует карту {элемент → классы}
             └─ для каждого класса
                 ├─ собирает параметры `data-energine-param-*`
                 ├─ подтягивает зависимости (бандл или одиночные файлы)
                 ├─ создаёт экземпляр класса с (element, params)
                 └─ выполняет post-init (например, привязку тулбара)
```

Документ покрывает все компоненты, перечисленные в Phase 0 (гриды, формы, тулбары, редакторы, пользовательские виджеты) и позволяет описать их поведение исключительно через атрибуты DOM — без inline JS.
