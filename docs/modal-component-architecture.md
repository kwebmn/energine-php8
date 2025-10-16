# Реестр модальных компонентов Energine

## Обзор

Начиная с текущей версии, система модальных состояний реализована централизованно в
базовом классе `Component`. Реестр модалок объявляется в коде компонента через
`registerModals()`, а запуск дочерних окон полностью берёт на себя базовая логика —
дополнительные методы вроде `attachments()` или `fileLibrary()` больше не требуются.
Обратная совместимость с предыдущим ручным способом не поддерживается: состояния,
которые не зарегистрированы в реестре, рассматриваются как обычные методы и должны
быть переписаны на новый формат.【F:engine/core/modules/share/gears/Component.class.php†L79-L153】【F:engine/core/modules/share/gears/Component.class.php†L317-L347】

## Базовый API (`Component`)

* `registerModals(): array` — переопределяется в наследнике и возвращает карту
  `state => definition`. В определении можно передать массив с параметрами (`module`,
  `class`, `params`) либо замыкание, которое само создаёт компонент **или любой `IBlock`
  (например, `ComponentContainer`)**. Если состояние не объявлено, `Component::run()`
  продолжает искать метод состояния как раньше.
* `getModalRoutePatterns(): array` — статический метод, который возвращает карту
  `state => [uri-паттерны]`. `ComponentConfig` вызывает его автоматически и добавляет
  состояния в конфиг, поэтому паттерны больше не нужно дублировать вручную.
* `run()` очищает предыдущий активный модал, проверяет реестр и, при совпадении,
  создаёт дочерний компонент (через массив или замыкание), запускает его и сохраняет
  ссылку для дальнейшего использования.【F:engine/core/modules/share/gears/Component.class.php†L317-L347】【F:engine/core/modules/share/gears/Component.class.php†L483-L600】
* `build()` отдаёт результат активного модального компонента, если он существует,
  иначе использует стандартный билдер родителя.【F:engine/core/modules/share/gears/Component.class.php†L412-L448】
* Хелперы: `getRequest()` для доступа к текущему `Request`, `activateModalComponent()`
  для быстрого создания/запуска модалки, а также методы работы с активным компонентом
  (`setActiveModalComponent()`, `getActiveModalComponent()`, `clearActiveModalComponent()`).
  Они упрощают регистрацию и позволяют сохранять логику смещения URI внутри замыканий.【F:engine/core/modules/share/gears/Component.class.php†L488-L524】

## Реестры в стандартных компонентах

### `DataSet`

`DataSet::registerModals()` подключает стандартные модалки формы: файловую библиотеку,
менеджер изображений и режим просмотра исходного текста. Каждая запись сдвигает URI
(если нужно) и вызывает `activateModalComponent(...)`, чтобы создать и запустить
нужный компонент. Дополнительно `DataSet::getModalRoutePatterns()` возвращает те же
состояния, поэтому `DataSetConfig` сам регистрирует паттерны URI и не требует
ручного перечисления. `DataSet::build()` больше не содержит `switch` по состояниям —
результат модалки возвращается автоматически.【F:engine/core/modules/share/components/DataSet.class.php†L37-L129】【F:engine/core/modules/share/gears/DataSetConfig.class.php†L21-L48】【F:engine/core/modules/share/components/DataSet.class.php†L383-L451】

### `Grid`

`Grid` расширяет базовый реестр, добавляя состояния `fkEditor`, `attachments`,
`filtersTreeEditor` и `tags`. В замыканиях повторяется прежняя бизнес-логика:
вычисление имени таблицы для вложений/фильтров, смещение пути в зависимости от
наличия `id`, выбор конфигурационного файла для редактора тегов. Для `fkEditor`
используется вспомогательный метод `spawnFkEditor()`, а маршруты объявлены через
`Grid::getModalRoutePatterns()`, поэтому `GridConfig` больше не содержит дублирующих
регистраций модальных состояний.【F:engine/core/modules/share/components/Grid.class.php†L100-L213】【F:engine/core/modules/share/components/Grid.class.php†L401-L490】【F:engine/core/modules/share/gears/GridConfig.class.php†L15-L25】

### `DivisionEditor`

Редактор разделов регистрирует все дочерние модальные окна (`showTransEditor`,
`showUserEditor`, `showRoleEditor`, `showLangEditor`, `showSiteEditor`, `fileLibrary`).
Каждое состояние смещает URI на один сегмент и использует `activateModalComponent`
с нужным модулем/классом и конфигурацией. Метод `build()` обрабатывает особый кейс
`showPageToolbar`, а в остальных случаях полагается на базовый механизм модалок.【F:engine/core/modules/share/components/DivisionEditor.class.php†L22-L80】【F:engine/core/modules/share/components/DivisionEditor.class.php†L213-L249】

### `SiteEditor`

`SiteEditor` регистрирует состояния `reset`, `domains` и `properties`. Внутри замыканий
инкапсулировано смещение пути (2 сегмента, если передан `site_id`) и передача
параметров дочерним редакторам (`DivisionEditor`, `DomainEditor`, `SitePropertiesEditor`).
Метод `build()` теперь просто проверяет наличие активной модалки.【F:engine/core/modules/share/components/SiteEditor.class.php†L13-L60】【F:engine/core/modules/share/components/SiteEditor.class.php†L177-L185】

### Расширенные редакторы лент (`DefaultTemplateFeedEditor`, `TestfeedFeedEditor`)

Редакторы лент, собранные на `ExtendedFeedEditor`, используют контейнер
`site_div_selector.container.xml` для выбора раздела. Состояние `showSmapSelector`
регистрируется через замыкание, которое возвращает `ComponentContainer`; базовый
механизм теперь умеет работать с любым `IBlock`, поэтому дополнительные свойства и
перегрузки `build()` больше не нужны.【F:engine/core/modules/wizard/components/DefaultTemplateFeedEditor.class.php†L13-L86】【F:engine/core/modules/auto/components/TestfeedFeedEditor.class.php†L13-L92】

## Работа с путями и параметрами

* Используйте `getStateParams(true)` внутри замыкания, если нужно различать URL вида
  `/attachments/123/` и `/attachments/`. В примерах `Grid` вычисляет смещение сегментов
  и добавляет `linkedID` только когда параметр присутствует.【F:engine/core/modules/share/components/Grid.class.php†L130-L173】
* Для простых сценариев достаточно массива: `['module' => 'share', 'class' => 'ImageManager']`.
  Базовая реализация создаст компонент, запустит `run()` и запомнит его вывод.
* Если требуется предварительная настройка или альтернативное имя, в массиве можно
  указать `name` и `params` (как значение или как колбэк). Колбэк получает текущий
  компонент и массив параметров состояния.

## Миграция существующего кода

* Методы вида `attachments()`, `fileLibrary()`, `domains()` удалены. Новые состояния
  должны объявляться только через `registerModals()` и использовать вспомогательные
  методы `Component`.
* `Component::run()` больше не вызывает такие методы автоматически, поэтому оставленные
  ранее реализации будут проигнорированы, если не добавить запись в реестр.
* При добавлении новых модальных окон достаточно дописать замыкание или описание в
  `registerModals()`: базовый класс возьмёт на себя создание, запуск и возврат результата.

## Итог

Централизованный реестр модальных компонентов снижает объём шаблонного кода, устраняет
дублирование и делает добавление новых состояний декларативным. Компоненты продолжают
использовать привычный конвейер `prepare()` → `build()`, а модальные окна теперь
объявляются в одном месте и автоматически встроены в жизненный цикл `Component`.
