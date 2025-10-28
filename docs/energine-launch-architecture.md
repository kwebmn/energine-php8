# Архитектура запуска Energine и разделение поведения

Документ фиксирует текущее устройство клиентского рантайма Energine после отказа от «моста» `bootEnergine`, массивов `componentToolbars` и любых inline-инициализаций. Все компоненты запускаются исключительно через `data-e-js`, конфигурация передаётся декларативно через `data-*`, а модуль `Energine.js` берёт на себя полный цикл загрузки.

## 1. Требования к разметке

### 1.1 Подключение скриптов

- Базовый модуль подключается тегом `<script type="module" src="…/Energine.js" data-base="…" data-lang="…"></script>` в конце документа. XSLT выставляет все параметры через `data-*`, поэтому JavaScript не опирается на inline-вызовы.【F:engine/core/modules/share/transformers/bootstrap/document.xslt†L200-L214】
- Дополнительные модули (например, `energine.extended.js`) также подключаются как ES-модули и не содержат инлайнового кода. Устаревший блок с импортами `bootEnergine`, `queueTask` и ручными вызовами удалён.

### 1.2 Маркировка компонентов

- Каждый интерактивный контейнер размечается `data-e-js="<BehaviorName>"`. Параметры поведения переводятся в `data-e-*` с kebab-case, чтобы их можно было прочитать из `dataset` без промежуточных JSON-структур.【F:engine/core/modules/share/transformers/bootstrap/list.xslt†L31-L79】【F:engine/core/modules/share/transformers/bootstrap/form.xslt†L13-L84】
- `id` генерируется только по семантическим причинам (ARIA, label/for). Рантайм не использует `document.getElementById` и не создаёт `window[id]`-ссылок, поэтому нет необходимости поддерживать прежние `generate-id()` ради JavaScript.
- Административные сервисы (`PageToolbar`, `DivisionEditor`, редакторы форм) получают собственные контейнеры с `data-e-*` параметрами и больше не используют массивы `data-components` или `data-page-editor-config` из inline-скриптов.【F:engine/core/modules/share/transformers/bootstrap/toolbar.xslt†L10-L133】【F:engine/core/modules/share/transformers/bootstrap/divisionEditor.xslt†L14-L88】

## 2. Инициализация рантайма

### 2.1 Автозапуск

- При загрузке `Energine.js` находит `<script>` с собственным `src`, считывает `dataset`, вызывает `Energine.boot()` и запускает `scanForComponents(document)`. Внешние вызовы `bootEnergine()` или мосты `__energineBridge` отсутствуют.【F:engine/core/modules/share/scripts/Energine.js†L969-L1033】
- Рантайм автоматически экспортируется в `window.Energine` через `exposeRuntimeToGlobal`, но он же отвечает за инициализацию и повторные попытки запуска без участия стороннего кода.【F:engine/core/modules/share/scripts/Energine.js†L986-L1033】

### 2.2 Сканирование DOM

- `scanForComponents` ищет `[data-e-js]`, проверяет, не отмечен ли элемент `data-e-ready`, и создаёт экземпляр поведения, вызывая конструктор с `element` и `dataset`. Если компонент требует повторной инициализации, достаточно установить `data-e-refresh="1"` и вызвать `scanForComponents` повторно — рантайм вызовет `destroy()` старого экземпляра и снимет маркер готовности.【F:engine/core/modules/share/scripts/Energine.js†L792-L965】
- Имя поведения берётся из `dataset.eJs`, а класс — из регистра `behaviorRegistry`. Рантайм больше не ищет конструктор в `globalThis[name]` и не создаёт глобальные переменные по `id`. Попытки обратиться к несуществующему поведению фиксируются как `PENDING_BEHAVIOR`, чтобы лениво загружаемые модули успели зарегистрироваться.【F:engine/core/modules/share/scripts/Energine.js†L829-L918】

### 2.3 Регистрация поведений

- Единственный публичный API для регистрации — `registerBehavior(name, ClassRef, { force? })`. Повторная регистрация без `force: true` возвращает `false` и пишет предупреждение, что исключает двойные определения, характерные для старых глобальных экспортов.【F:engine/core/modules/share/scripts/Energine.js†L1057-L1075】
- Если поведение появляется позже (например, после динамического импорта), рантайм очистит очередь ожидания и сразу проинициализирует соответствующие элементы при следующем `scanForComponents` или во время отложенных попыток авто-бутстрапа.【F:engine/core/modules/share/scripts/Energine.js†L849-L918】

### 2.4 Тулбары и вспомогательные сервисы

- После успешной инициализации всех компонентов рантайм вызывает `initializeToolbars(document)` внутри планировщика повторных попыток. Связка конкретного поведения с тулбаром выполняется через `data-e-toolbar-component`, который `Energine.js` считывает и передаёт в `registerToolbarComponent` сразу после создания экземпляра, без глобального массива `componentToolbars`.【F:engine/core/modules/share/scripts/Energine.js†L809-L905】【F:engine/core/modules/share/scripts/Energine.js†L995-L1033】

## 3. Наблюдаемость и диагностика

- Каждый элемент, которому не удалось сопоставить класс, переводится в состояние ожидания. В debug-режиме превышение порога попыток приводит к исключению с подсказкой, чтобы разработчик не пропустил отсутствующий импорт. В продакшене ошибки логируются через `safeConsoleError`.【F:engine/core/modules/share/scripts/Energine.js†L849-L918】
- При успешной инициализации рантайм предупреждает разработчика, если элемент всё ещё имеет `id` и ожидал глобальную ссылку `window[id]`, чтобы напомнить об удалении легаси-паттерна. Это финальная страховка против возврата к старому подходу.【F:engine/core/modules/share/scripts/Energine.js†L894-L903】

## 4. Практические рекомендации

1. **Новые компоненты** — создавайте ES-модуль с классом поведения и регистрируйте его через `registerBehavior`. Конструктор должен принимать `HTMLElement` и `dataset`, а собственные параметры хранить в `element.dataset` вместо чтения произвольных атрибутов.【F:engine/core/modules/share/scripts/Energine.js†L829-L905】【F:engine/core/modules/share/scripts/Energine.js†L1057-L1075】
2. **Шаблоны** — размечайте контейнеры `data-e-js` и `data-e-*`, избегайте inline-скриптов и глобальных переменных. При необходимости передачи сложных структур используйте JSON в `data-*` и разбирайте его в поведении. Примеры можно найти в `list.xslt`, `form.xslt`, `divisionEditor.xslt`.【F:engine/core/modules/share/transformers/bootstrap/list.xslt†L31-L79】【F:engine/core/modules/share/transformers/bootstrap/divisionEditor.xslt†L14-L88】
3. **Динамическое обновление DOM** — после вставки нового фрагмента вызовите `scanForComponents(container)` или положитесь на автоматический ретраер, если модуль грузится асинхронно. Не требуется поддерживать массивы `data-components` или очереди задач: рантайм выполнит все действия сам.【F:engine/core/modules/share/scripts/Energine.js†L929-L1033】
4. **Тестирование** — проверяйте, что итоговая страница не содержит inline JS и что все интерактивные блоки имеют `data-e-js`. Ошибки регистрации должны отображаться в консоли через `safeConsoleError`; отсутствие таких сообщений означает успешный переход на новую схему.

## 5. Совместимость и дальнейшее развитие

- Ядро `Energine.js` остаётся единым для административных и публичных страниц. Дополнительные подсистемы (модальные окна, уведомления, тулбары) можно изолировать в отдельные модули, подключая их только там, где присутствуют соответствующие `data-e-*` флаги — базовая инициализация компонентов этому не мешает.【F:engine/core/modules/share/scripts/Energine.js†L969-L1078】
- При появлении новых behavior-классов следите за тем, чтобы они не возрождали практику глобальных массивов или ручных вызовов. Весь цикл жизни (создание, повторная инициализация, уничтожение) должен проходить через `scanForComponents` и `registerBehavior`.
