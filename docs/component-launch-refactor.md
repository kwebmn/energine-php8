# Декларативный запуск компонентов Energine

> Обновлено: все административные и пользовательские шаблоны инициализируют JavaScript-поведения только через `data-e-js`. Легаси-экосистема `bootEnergine`, `componentToolbars`, массивы `data-components` и ручные `generate-id()` удалены из рабочего кода и документации.

## 1. Итоговая архитектура рантайма

- Модуль `engine/core/modules/share/scripts/Energine.js` при загрузке автоматически считывает конфигурацию из собственного тега `<script type="module">` и вызывает `Energine.boot()`, после чего выполняет `scanForComponents(document)` инициализируя все узлы с `data-e-js`. Дополнительные механизмы запуска (`bootEnergine`, `queueTask`, глобальные массивы) отсутствуют.【F:engine/core/modules/share/scripts/Energine.js†L929-L1033】
- Каждый экземпляр создаётся только из DOM-элемента: имя поведения берётся из `dataset.eJs`, конструктор извлекается через `registerBehavior`, а ссылка на созданный объект сохраняется в `element.__energineBehavior`. Повторное выполнение `scanForComponents` пропускает уже готовые элементы, пока не выставлен флаг `data-e-refresh`.【F:engine/core/modules/share/scripts/Energine.js†L844-L922】
- После успешной инициализации элемент помечается `data-e-ready="1"`; при необходимости перезапуска рантайм вызывает `destroy()` существующего экземпляра и снимает флаг готовности, чтобы не оставалось зависимостей от прежних подходов с `id` и глобальными объектами.【F:engine/core/modules/share/scripts/Energine.js†L792-L922】

## 2. Контракт DOM и XSLT

- `document.xslt` подключает рантайм только как внешний модуль и не содержит inline-скриптов. Вся конфигурация передаётся через `data-*` атрибуты тега `<script type="module" src="…Energine.js" data-base="…" data-lang="…">` и статическую разметку компонентов.【F:engine/core/modules/share/transformers/bootstrap/document.xslt†L200-L214】
- Компонентные шаблоны (`list.xslt`, `form.xslt`, редакторы страниц и др.) помечают корневой контейнер `data-e-js` и переносят параметры в `data-e-*`. Ни один шаблон не генерирует вспомогательные `id` ради JavaScript — атрибут `id` используется только там, где это требуется по семантике или ARIA.【F:engine/core/modules/share/transformers/bootstrap/list.xslt†L31-L89】【F:engine/core/modules/share/transformers/bootstrap/form.xslt†L13-L84】
- Для административных сервисов (тулбар, редактор страницы, дерево разделов) XSLT сразу выводит собственные контейнеры с `data-e-js` и специфическими `data-e-*` параметрами, чтобы избежать JSON-конфигураций и промежуточных глобальных структур.【F:engine/core/modules/share/transformers/bootstrap/toolbar.xslt†L14-L112】【F:engine/core/modules/share/transformers/bootstrap/divisionEditor.xslt†L12-L88】

## 3. Реестр поведений и диагностика

- Единственная точка регистрации — `registerBehavior(name, ClassRef, options?)`. Повторная регистрация без `force: true` логирует предупреждение, что исключает расхождения с прежними глобальными экспортами через `window[behaviorName]`. Сами классы импортируют `registerBehavior` и передают DOM-элемент в конструктор.【F:engine/core/modules/share/scripts/Energine.js†L1035-L1062】
- Если поведение не зарегистрировано к моменту обхода, рантайм считает его ожидающим (`PENDING_BEHAVIOR`) и повторяет попытки. В режиме отладки превышение порога ожидания приводит к исключению с подсказкой о необходимости регистрации — вместо старых «тихих» попыток обратиться к `window[id]`.【F:engine/core/modules/share/scripts/Energine.js†L860-L918】
- При успешной инициализации рантайм дополнительно пытается привязать экземпляр к тулбару через `data-e-toolbar-component` и предупреждает, если разработчик оставил `id` и ожидает появление `window[id]`, что подтверждает отсутствие поддержки прежней экосистемы глобальных ссылок.【F:engine/core/modules/share/scripts/Energine.js†L816-L888】

## 4. Повторная инициализация и службы

- Повторный `scanForComponents` можно вызывать вручную после AJAX-вставок. Элементы с `data-e-refresh="1"` сначала освобождаются (`destroy()` + удаление `data-e-ready`), затем переинициализируются. Промежуточные массивы или очереди задач не используются, так как логика полностью внутри рантайма.【F:engine/core/modules/share/scripts/Energine.js†L792-L922】
- Тулбары запускаются тем же сканером: после того как все зависимости отмечены как готовые, `initializeToolbars(document)` получает возможность собрать контекст без глобальных переменных `componentToolbars`. Рантайм повторяет попытки, пока все поведения не зарегистрированы, и сообщает об ошибках через `safeConsoleError`.【F:engine/core/modules/share/scripts/Energine.js†L1005-L1033】

## 5. Чеклист для новых компонентов

1. Поместите поведение в ES-модуль, зарегистрируйте его через `registerBehavior('ComponentName', ClassRef)` и экспортируйте класс при необходимости повторного использования.【F:engine/core/modules/share/scripts/Energine.js†L1035-L1062】
2. В XSLT или PHP-шаблоне отметьте корневой контейнер `data-e-js="ComponentName"` и передайте параметры как `data-e-*`. Не добавляйте `id`, если он не нужен для ARIA/label — рантайм работает только с `dataset` и ссылкой на элемент.【F:engine/core/modules/share/transformers/bootstrap/list.xslt†L31-L89】
3. При динамическом обновлении DOM вызовите `scanForComponents(container)`; рантайм самостоятельно пропустит уже готовые узлы и проинициализирует новые без участия устаревших API.【F:engine/core/modules/share/scripts/Energine.js†L929-L1004】
