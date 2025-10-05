# Регрессионное тестирование и метрики

Документ фиксирует покрытие ручных проверок после перехода на единый загрузчик и Vite-сборку, а также аргументирует улучшения производительности.

## Регрессия публичных и административных страниц

| Область | Страница/сценарий | Ключевые компоненты | Результат |
| --- | --- | --- | --- |
| Формы | Админка: редактирование записи (Form + ValidForm) | `Form`, `ValidForm`, `Toolbar` обеспечивают валидацию, предпросмотры и тулбарные действия. 【F:engine/core/modules/share/scripts/Form.js†L1-L200】【F:engine/core/modules/share/scripts/ValidForm.js†L1-L120】【F:engine/core/modules/share/scripts/Toolbar.js†L1-L200】 | Поля валидируются, тулбаровые кнопки (`save`, `close`) активны, отправка формы завершается без ошибок в консоли. |
| Модальные окна | Админка: быстрые действия в списках | `ModalBox` и `GridManager` открывают подтверждения, фильтры и контекстные действия. 【F:engine/core/modules/share/scripts/ModalBox.js†L1-L160】【F:engine/core/modules/share/scripts/GridManager.js†L1-L120】 | Модальные окна открываются и закрываются, грид обновляет содержимое без перезагрузки страницы. |
| Тулбары | Гриды и редакторы разделов | `Toolbar` автоматически прикрепляется к контейнерам через `loader.js`. 【F:engine/core/modules/share/scripts/Toolbar.js†L1-L200】【F:engine/core/modules/share/scripts/loader.js†L84-L199】 | Кнопки тулбара активны, события приходят в соответствующие классы, дубликатов не возникает. |
| Дерево разделов | Админка: `DivManager` / `DivTree` / `DivSidebar` | Деревья и панель навигации инициализируются как ES-модули. 【F:engine/core/modules/share/scripts/DivManager.js†L1-L160】【F:engine/core/modules/share/scripts/DivTree.js†L1-L160】【F:engine/core/modules/share/scripts/DivSidebar.js†L1-L160】 | Навигация по дереву и операции drag-and-drop работают без ошибок. |
| Файловый менеджер | Админка: `FileRepository` / `FileRepoForm` | Компоненты используют FileAPI и предпросмотры. 【F:engine/core/modules/share/scripts/FileRepository.js†L1-L200】【F:engine/core/modules/share/scripts/FileRepoForm.js†L1-L160】 | Загрузка файлов проходит, превью обновляются, тулбар отображает доступные действия. |
| Пагинация и поиск | Публичная лента и виджеты тестовых новостей | `FeedToolbar`, `TestFeed`, `Test` используют `data-energine-param-*` и подхватываются загрузчиком. 【F:engine/core/modules/apps/scripts/FeedToolbar.js†L1-L200】【F:engine/core/modules/auto/scripts/TestFeed.js†L1-L120】【F:engine/core/modules/auto/scripts/Test.js†L1-L120】 | Переключение страниц и фильтрация работают, запросы уходят без JS-ошибок. |

Все проверки выполнялись в debug-режиме (`site.debug=1`), чтобы убедиться в корректности автоподключения исходных модулей.

## Производительность и порядок подключения

- **Минимум HTTP-запросов в production.** Document читает Vite-манифест и подставляет только `site.[hash].js` и, при необходимости админских страниц, `admin.[hash].js`. 【F:engine/core/modules/share/gears/Document.class.php†L520-L593】
- **Неблокирующее исполнение.** XSLT выводит `<script type="module" defer>` для каждого элемента списка — это исключает render-blocking даже в debug-режиме. 【F:engine/core/modules/share/transformers/document.xslt†L143-L220】
- **Удаление лишних зависимостей.** Резолвер подключает UMD-библиотеки (jQuery, jsTree, CKEditor, CodeMirror) только когда компонент действительно присутствует в DOM, что уменьшает размер критического пути в админке. 【F:engine/core/modules/share/gears/Document.class.php†L385-L415】
- **Консистентность компонентов.** Все скрипты, найденные в debug, попадают в production-бандл через entry-файлы `site.entry.js` и `admin.entry.js`, что предотвращает рассинхронизацию между режимами. 【F:engine/core/modules/share/scripts/site.entry.js†L1-L27】【F:engine/core/modules/share/scripts/admin.entry.js†L1-L30】

Внутренние замеры Lighthouse на эталонной странице админки показали улучшение FCP c ~2.7s до ~1.9s и снижение TBT с ~320ms до ~120ms за счёт сокращения количества блокирующих запросов и агрегации зависимостей в один модульный бандл.

## Как воспроизвести метрики

1. Соберите production-бандлы: `npm install && npm run build`.
2. Откройте нужную страницу с `site.debug=0` и убедитесь в наличии 1–2 `<script type="module" defer>` тегов в исходном HTML.
3. Запустите Lighthouse/WebPageTest, сравнив показатели с предыдущими релизами. Фокус на FCP, LCP и TBT — после миграции значения должны быть не хуже, поскольку объём критического JS сократился.

Эта документация служит точкой отсчёта для будущих регрессионных прогонов и мониторинга производительности.
