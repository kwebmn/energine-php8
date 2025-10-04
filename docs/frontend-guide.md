# Руководство по работе с фронтендом Energine

Этот документ описывает контракт между XSLT-шаблонами, загрузчиком компонентов и системой сборки. Следуйте инструкциям ниже при создании новых компонентов или обновлении существующих.

## Разметка компонентов в XSLT

1. **Корневой элемент** каждого компонента должен содержать `data-energine-js` с именем класса. Базовый шаблон `energine-component-attributes` делает это автоматически и одновременно выносит параметры в `data-energine-param-*`, поэтому достаточно вызвать его в разметке компонента. 【F:engine/core/modules/share/transformers/base.xslt†L15-L32】
2. **Дополнительные параметры**: любые атрибуты на узле компонента автоматически попадают в `data-energine-param-<name>`. Пользуйтесь существующими атрибутами (`template`, `single_template`, `moveFromId` и т. д.) — они станут доступными в `options` конструктора. Пример можно увидеть в шаблоне списка с гридом. 【F:engine/core/modules/share/transformers/list.xslt†L33-L75】
3. **Тулбары** размечаются контейнером с `data-energine-toolbar` и вложенными элементами с `data-energine-control-*`. Шаблон `energine-toolbar-attributes` выполняет преобразование, поэтому в XSLT достаточно вызвать его при рендере тулбара. 【F:engine/core/modules/share/transformers/base.xslt†L34-L49】【F:engine/core/modules/share/transformers/list.xslt†L75-L89】
4. **Фолбэк для нестандартных путей**: если класс лежит вне стандартных `scripts` или носит нестандартное имя, укажите `data-energine-module="/relative/path/to/file.js"` на контейнере — Document подключит указанный файл напрямую. 【F:engine/core/modules/share/gears/Document.class.php†L354-L365】【F:engine/core/modules/share/gears/Document.class.php†L426-L465】

## Как работает loader.js

- Загрузчик запускается после `DOMContentLoaded`, ищет все элементы с `data-energine-js`, создает экземпляры соответствующих классов и передает им параметры, собранные из `data-energine-param-*`. 【F:engine/core/modules/share/scripts/loader.js†L1-L83】
- Если у компонента объявлены тулбары, `loader.js` инициализирует `Toolbar`, переносит элементы управления и вызывает `attachToolbar` у компонента. 【F:engine/core/modules/share/scripts/loader.js†L84-L133】【F:engine/core/modules/share/scripts/loader.js†L134-L199】
- После запуска компонентов выполняется совместимостьная `Energine.run`, поэтому прежние отложенные задачи продолжают работать. 【F:engine/core/modules/share/scripts/loader.js†L200-L227】

## Автоматический резолвер скриптов

- Document сканирует итоговый DOM на предмет `data-energine-js`, собирает список уникальных классов и дополнительных флагов (например, CodeMirror). 【F:engine/core/modules/share/gears/Document.class.php†L283-L375】
- Для каждого класса резолвер ищет файл в существующих `scripts` директориях и формирует `<script type="module" defer>` теги в debug-режиме. 【F:engine/core/modules/share/gears/Document.class.php†L426-L509】【F:engine/core/modules/share/transformers/document.xslt†L143-L220】
- В админке автоматически добавляются UMD-зависимости (jQuery, jsTree, CKEditor, CodeMirror) только когда этого требует конкретная страница. 【F:engine/core/modules/share/gears/Document.class.php†L385-L415】
- В production Document считывает `manifest.json`, чтобы подставить хэшированные `site` и `admin` бандлы вместо множества отдельных файлов. 【F:engine/core/modules/share/gears/Document.class.php†L520-L593】

## Добавление нового компонента

1. Создайте файл в соответствующем каталоге `engine/core/modules/<module>/scripts/` (или `site/modules/.../scripts/`). Компонент должен экспортировать класс по умолчанию с сигнатурой `(element, options = {})`, как в базовых модулях (например, `Form.js`). 【F:engine/core/modules/share/scripts/Form.js†L1-L36】
2. Импортируйте зависимости через ES-модули или рассчитывайте на глобальные UMD-библиотеки в debug-режиме (jQuery/CKEditor/CodeMirror подключаются автоматически при необходимости). 【F:engine/core/modules/share/scripts/admin.entry.js†L3-L30】
3. Обновите XSLT- или шаблон-контейнер, вызвав `energine-component-attributes` и передав нужные параметры. Резолвер сам найдёт и подключит файл.
4. Если компонент должен присутствовать в production-бандле, импортируйте его в `site.entry.js` или `admin.entry.js` — Vite добавит модуль в соответствующий бандл. 【F:engine/core/modules/share/scripts/site.entry.js†L1-L27】【F:engine/core/modules/share/scripts/admin.entry.js†L1-L30】

## Сборка и деплой

- Debug-режим (`site.debug=1`) работает с исходниками: Document подключает `Energine.js`, найденные компоненты и `loader.js` в виде defer-скриптов. 【F:engine/core/modules/share/gears/Document.class.php†L287-L321】
- Production (`site.debug=0`) использует Vite. Выполните `npm install` и `npm run build` — конфигурация собирает `site.[hash].js` и `admin.[hash].js` в `htdocs/assets`, а также `manifest.json` для Document. 【F:vite.config.mjs†L28-L49】
- При выкладке синхронизируйте содержимое `htdocs/assets`. Document автоматически подставит актуальные пути из манифеста и добавит теги `<script type="module" defer>` в тех же местах, что и в debug. 【F:engine/core/modules/share/gears/Document.class.php†L540-L593】【F:engine/core/modules/share/transformers/document.xslt†L143-L220】

Следование этим правилам гарантирует, что новые компоненты автоматически подхватываются загрузчиком, а сборка остаётся консистентной в debug и production режимах без ручного редактирования карт зависимостей.
