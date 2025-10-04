# Dev-режим без system.jsmap (Фаза 2.1)

## 1. Назначение и границы решения

Задача: перевести режим `debug=1` на автоматический сбор списка `<script>` из готовой разметки DOM,
чтобы полностью отказаться от `system.jsmap.php`. Сервер после рендеринга XSLT анализирует итоговый
`DOMDocument`, определяет, какие компоненты и внешние библиотеки требуются, и формирует тот же набор
узлов `<document/javascript>`/`<document/javascript/library>`, которые XSLT уже выводят в `<head>`/`<body>`.
Все `<script>` должны подключаться неблокирующе (`defer`).

Входы:
- HTML/XHTML-документ после применения XSLT (см. Phase 1: все компоненты помечены `data-energine-js`).
- Правила разрешения имён из Phase 1.2 (класс → путь).
- Реестр обязательных параметров и тулбарных атрибутов из Phase 1.1 (используется только как контекст —
  сервер доверяет XSLT, что атрибуты заполнены корректно).

Выход: отсортированный список `<script>` с атрибутами `src`, `defer`, `type` (для модулей), доступный XSLT без
каких-либо inline-конфигураций.

## 2. Общий поток обработки

```text
[PHP: Document::finalizeJavascriptQueue]
    ↓ принимает DOM из XSLT (Document::transform)
    1. Собрать компоненты через XPath `//*[@data-energine-js]`
    2. Нормализовать список JS-классов (split по пробелу, удалить дубликаты)
    3. Для каждого класса → определить исходный файл
          ├─ правило Phase 1.2
          └─ fallback: словарь исключений
    4. Рассчитать обязательные и условные библиотеки
          ├─ всегда: ядро/утилиты
          └─ по наличию классов: CKEditor, jQuery, jsTree, FileAPI, CodeMirror, Fancytree, VK/Facebook и т.д.
    5. Сформировать итоговую очередь
          ├─ [ядро] + [условные либы] + [компонентные скрипты]
          └─ конвертировать в `<document/javascript/library>` с `@src`, `@defer='true'`
    6. Вернуть XML обратно в пайплайн (XSLT печатает `<script defer src="…"></script>` в прежних местах)
```

## 3. Шаги серверной процедуры

### 3.1 Извлечение компонентов из DOM

1. Создать `DOMXPath` на итоговом документе.
2. Выполнить запрос `//*[@data-energine-js]`.
3. Для каждого найденного узла:
   - Прочитать значение атрибута `data-energine-js`.
   - Разбить строку по whitespace (Phase 1 разрешает несколько классов на одном элементе).
   - Добавить имена в `SplObjectStorage`/`array`-множество для исключения дубликатов.
   - Дополнительно зафиксировать принадлежность к «админской» зоне (`Document::isAdmin()` или по префиксу URL),
     чтобы условные библиотеки не утекали на публичные страницы.
4. Результат — массив `['GridManager', 'Toolbar', 'TranslationsExtend', …]` без повторов.

Если список пустой, процедура всё равно добавляет обязательные ядра (`Energine.js`, loader) — так работают
ошибочные страницы и формы без JS-компонентов.

### 3.2 Разрешение путей (Phase 1.2)

1. Для каждого класса вызвать `resolveClassPath($className)`:
   - Применить правило поиска (директории `share/scripts`, `user/scripts`, `wizard/scripts`, `apps/scripts`, `auto/scripts`).
   - Если файл найден — вернуть относительный путь (`engine/core/modules/share/scripts/GridManager.js`).
   - Иначе проверить словарь исключений (`Grid` → `…/GridManager.js` и т.п.).
2. При отсутствии пути выбросить исключение с сообщением «JS class `<name>` is not registered in dev loader» — это сигнал для
   разработчика добавить класс либо в файловую структуру, либо в словарь.
3. Вернуть карту `class → path`.

### 3.3 Базовый набор скриптов (всегда включаются)

| Порядок | Назначение | Путь | Примечание |
| --- | --- | --- | --- |
| 1 | Глобальный рантайм + ScriptLoader | `engine/core/modules/share/scripts/Energine.js` | Инициализирует `window.Energine`, `ScriptLoader`, очередь задач. |
| 2 | Лоадер DOM-атрибутов (новый файл) | `engine/core/modules/share/scripts/energine-loader.dev.js` | Будет добавлен в Phase 2 — читает `data-energine-*`, вызывает классы. |
| 3 | Общие утилиты | `engine/core/modules/share/scripts/Cookie.js`, `engine/core/modules/share/scripts/ModalBox.js`, `engine/core/modules/share/scripts/TabPane.js`, `engine/core/modules/share/scripts/PageList.js` | Дублируют «always loaded» из старого `system.jsmap.php`, чтобы большинство компонентов не делали доп. HTTP-запросов. |

> Точный состав утилит можно корректировать по результатам тестов; главное — ядро загрузчика (`Energine.js` + `energine-loader.dev.js`).

### 3.4 Условные внешние библиотеки

Формируем отдельный список `requiredVendorLibs` согласно обнаруженным классам. Таблица условий:

| Библиотека | Путь | Подключать, если | Примечание |
| --- | --- | --- | --- |
| CKEditor 4 | `engine/core/modules/share/scripts/ckeditor/ckeditor.js` | Класс `Form`, `ValidForm`, `PageEditor`, `FormRichEditor` | Доступно только в админке. |
| CKEditor адаптер | `engine/core/modules/share/scripts/ckeditor/adapters/jquery.js` (если нужен) | Те же классы | Проверить наличие файла; если нет — пропустить. |
| CodeMirror ядро | `engine/core/modules/share/scripts/CodeMirror/lib/codemirror.js` | В DOM найден компонент, описанный в Phase 0 как потребитель CodeMirror (например, формы с `field[@type='code']`) | Признак берётся из Phase 0/Phase 1 (специальный блок для CodeMirror вместо inline-скрипта). |
| CodeMirror CSS | `engine/core/modules/share/scripts/CodeMirror/lib/codemirror.css` (через `<link>` — остаётся в XSLT) | См. выше | Для JS-списка добавляем только `.js`. |
| jQuery | `engine/core/modules/share/scripts/jquery.min.js` | `DivManager`, `DivTree`, `DivSidebar`, `FiltersTreeEditor`, `SiteManager` (если они используют дерево) | Перекрывает все ScriptLoader-зависимости на jQuery. |
| jsTree | `engine/core/modules/share/scripts/jstree/jstree.js` | `DivManager`, `DivTree`, `DivSidebar`, `FiltersTreeEditor` | В дев-режиме можно грузить неминифицированную версию. |
| Fancytree | `engine/core/modules/share/scripts/fancytree/jquery.fancytree-all-deps.min.js` | Классы, использующие Fancytree (см. Phase 0 примечания) | Подключается только при наличии соответствующих компонентов. |
| FileAPI | `engine/core/modules/share/scripts/FileAPI/FileAPI.min.js` | `FileRepository`, `FileRepoForm`, `AttachmentEditor`, `FormUploader` | Также устанавливает `FileAPI.staticPath`. |
| FileAPI jQuery-плагин | `engine/core/modules/share/scripts/FileAPI/jquery.fileapi.min.js` | Те же классы | Загружается вместе с основным ядром FileAPI. |
| VK OpenAPI | `https://vk.com/js/api/openapi.js` | В DOM найден класс `SignIn`/`RecoverPassword` или спец. атрибут `data-energine-param-enable-vk="true"` | В дев-режиме допустимо оставлять внешнюю ссылку. |
| Facebook helper | `engine/core/modules/share/scripts/social/fbl.js` (если локальный) | `SignIn` с соц-авторизацией | Нужен анализ наличия файла; иначе оставить существующую внешнюю загрузку. |

Логику включения реализуем как правило «если множество классов содержит любой из ключей — подключить библиотеку». Реестр оформляется PHP-ассоциативным массивом:

```php
$libraryRules = [
    'ckeditor/ckeditor.js' => ['Form', 'ValidForm', 'PageEditor', 'FormRichEditor'],
    'jquery.min.js'        => ['DivManager', 'DivTree', 'DivSidebar', 'FiltersTreeEditor'],
    'jstree/jstree.js'     => ['DivManager', 'DivTree', 'DivSidebar', 'FiltersTreeEditor'],
    'FileAPI/FileAPI.min.js' => ['FileRepository', 'FileRepoForm', 'AttachmentEditor', 'FormUploader'],
    // …
];
```

При вычислении требуется учитывать:
- Некоторые классы — псевдонимы из словаря Phase 1.2 (например, `FormRichEditor` живёт в `Form.js`).
- Для публичного сайта (не админ) подключение CKEditor/jQuery возможно только если класс реально встречается (например, `SignIn`).

### 3.5 Очередь итоговых скриптов и порядок

1. Начальный массив `$queue = []`.
2. Добавить базовые скрипты в фиксированном порядке (§ 3.3).
3. Добавить внешние библиотеки (`requiredVendorLibs`) в порядке определения — допускается ручная сортировка
   (например, сначала `jquery.min.js`, затем плагины, потом `FileAPI`).
4. Добавить компонентные файлы из `class → path` (отсортировать по алфавиту или по порядку обнаружения в DOM):
   - Рекомендуется сохранять порядок первого появления в документе, чтобы классы верхних панелей грузились раньше.
5. Удалить дубликаты (если библиотека входит и в базовый, и в условный списки).
6. Преобразовать каждый путь в URL относительно веб-корня (добавить `$BASE`/`$ADMIN_PATH`).
7. Для каждого скрипта создать XML-узел `<document/javascript/library src="…" defer="true" />`.
   - Дополнительные атрибуты: `data-origin="component"|"vendor"|"core"` (для отладки), `type="module"` — если когда-нибудь
     появятся ESM-файлы (не требуется на Phase 2.1, но поле можно зарезервировать).

### 3.6 Интеграция с существующим XSLT

- `document.xslt` и другие шаблоны продолжают выводить `<script>` в тех же местах, используя новые узлы
  `<document/javascript/library>`.
- Каждому `<script>` принудительно добавляется `defer` (`<xsl:attribute name="defer">defer</xsl:attribute>`), чтобы загрузка
  была неблокирующей.
- Если требуется `<script type="module">` (например, для будущего Vite-бандла) — поле `@type` передаётся напрямую из XML.
- Inline-вызовы `Energine.addTask` постепенно будут удалены после внедрения общего загрузчика; для Phase 2.1 достаточно,
  чтобы новые скрипты подменили старый список, ничего не ломая.

## 4. Дополнительные соображения

1. **Кеширование.** Чтобы не обходить DOM на каждом запросе, можно кешировать результат
   (`$document->getJavascriptQueue()`) с ключом «шаблон + хэш DOM». Но на Phase 2.1 достаточно прямого вычисления.
2. **Расширяемость.** Добавление нового компонента → достаточно создать файл в директории по правилу Phase 1.2
   или дописать его в словарь исключений/библиотек.
3. **Отладка.** При включенном `debug` выводить в лог сформированный список скриптов.
4. **Совместимость с будущим прод-бандлом.** Архитектура сохраняет структуру `<document/javascript>`, так что в Phase 3
   `debug=0` сможет заменить массив путей на один Vite-бандл, не меняя XSLT.

## 5. Результат

В дев-режиме каждое обращение к странице формирует корректный набор `<script>`:
- все классы, указанные в разметке, получают свои файлы без участия `system.jsmap.php`;
- обязательные ядра и утилиты всегда присутствуют;
- внешние библиотеки подключаются только там, где действительно требуются;
- загрузка происходит неблокирующе, а XSLT остаются неизменными по структуре.
