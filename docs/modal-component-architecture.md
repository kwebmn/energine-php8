# Реестр модальных компонентов в Energine

## 1. Контекст и текущая реализация

Компоненты Energine наследуются от базового `Component`, который определяет состояние
из URI/POST, запускает одноимённый метод и строит XML-ответ через билдер.
Состояния определяются в `determineState()` и выполняются в `run()` с приоритетом
методов `stateNameState()` перед `stateName()`【F:engine/core/modules/share/gears/Component.class.php†L226-L330】.

`DataSet` и его наследники (`Grid`, редакторы и т. д.) расширяют этот механизм:
`prepare()` формирует билдер, описание данных (`DataDescription`), данные (`Data`),
панели инструментов (`Toolbar`) и JavaScript-вставки согласно конфигурации состояния,
а `build()` передаёт их в базовый билдер【F:engine/core/modules/share/components/DataSet.class.php†L221-L427】.
Описание полей берётся из XML-конфигурации текущего состояния и может
дополняться внешними данными, после чего сливается в `createDataDescription()`【F:engine/core/modules/share/components/DataSet.class.php†L259-L288】.
Это обеспечивает единый формат XML→XSLT→HTML и встроенную поддержку мультиязычности
(см. переводчики `TranslationEditor`, `LanguageEditor` и обработку *_translation полей в Grid-компонентах)【F:engine/core/modules/share/components/TranslationEditor.class.php†L13-L123】【F:engine/core/modules/share/components/LanguageEditor.class.php†L15-L190】.

Сейчас подключение модальных окон реализовано вручную: `DataSet::build()` и `Grid::build()`
разбирают значения состояния через `switch`/`if`, хранят ссылки на запущенные модальные
компоненты и вызывают их `build()` вместо собственного результата. Создание модалок
происходит в одноимённых методах, которые повторяют логику смещения пути, подготовки
параметров и регистрации в менеджере компонентов документа【F:engine/core/modules/share/components/DataSet.class.php†L373-L439】【F:engine/core/modules/share/components/DataSet.class.php†L724-L767】【F:engine/core/modules/share/components/Grid.class.php†L781-L938】.
`SiteEditor` демонстрирует тот же подход для состояний `domains`, `properties`, `reset`【F:engine/core/modules/share/components/SiteEditor.class.php†L149-L207】.

В результате:

- В каждом компоненте появляются вспомогательные методы (`attachments()`,
  `fileLibrary()`, `properties()` и т. п.), где 90 % кода — повторяющийся шаблон
  создания дочернего компонента.
- Требуется дублировать `switch` в `build()` или хранить ссылки на дочерние компоненты,
  чтобы вернуть их результат.
- Добавление нового модального состояния требует правки кода (метод + ветка в `build()`),
  хотя XML-конфигурации и XSLT уже совместимы с новым состоянием.

## 2. Цели реестра модалок

Предлагаемая архитектура должна:

1. Централизовать создание модальных компонентов в базовом слое (`Component`/`DataSet`),
   чтобы наследники объявляли только карту состояний.
2. Сохранить текущий протокол XML→HTML, работу `ComponentManager` и обратную совместимость
   существующих конфигураций.
3. Сделать регистрацию модальных окон декларативной и локальной для каждого компонента,
   без вмешательства в общую инфраструктуру.
4. Позволить модалкам переиспользовать стандартный конвейер `prepare()`, `createDataDescription()`,
   `Toolbar`, мультиязычность и др., который уже есть в `DataSet`/`Grid`.

## 3. Предлагаемая архитектура

### 3.1 Базовый уровень (Component/DataSet)

1. **Реестр модалок.** В `Component` или в ближайшем общем наследнике (`DataSet`)
   вводится свойство `protected array $modals = [];` и метод `protected function registerModals(): void`.
   Базовая реализация возвращает пустой массив.

2. **Декларация состояния.** Каждый элемент реестра описывает модальное состояние:

   ```php
   $this->modals = [
       'attachments' => ['module' => 'share', 'class' => 'AttachmentEditor'],
       'domains'     => ['module' => 'share', 'class' => 'DomainEditor'],
       // ...
   ];
   ```

   Вариант расширенного описания может включать параметры конструктора,
   ключи для чтения stateParams и индикатор «запустить `run()`» (по умолчанию true).

3. **Ленивая инициализация.** Перед запуском состояния (`run()`) или при первом вызове `build()`
   базовый класс проверяет, зарегистрировано ли текущее состояние в `$modals`.
   Если да:
   - берёт параметры состояния через `getStateParams(true)`;
   - подготавливает массив параметров для дочернего компонента (передаёт `linkedID`, `pk`, `config` и т. п.);
   - создаёт компонент через `ComponentManager->createComponent()` и запускает `run()`.

   Логику подготовки параметров можно вынести в отдельный метод `makeModalParams(string $state, array $stateParams): array`,
   чтобы наследники переопределяли её при необходимости.

4. **Возврат результата.** В `build()` добавляется проверка: если для текущего состояния
   была создана модалка, то `Component::build()` импортирует результат дочернего компонента
   и возвращает его без запуска собственного билдер-пайплайна. Это избавляет от ручных `switch`
   и локальных свойств с ссылками на дочерние компоненты.

5. **Жизненный цикл.** Для немодальных состояний конвейер остаётся прежним:
   `run()` вызывает метод состояния → `prepare()` → `build()` формирует XML и вкладывает
   результат билдера (`Builder`, `JSONCustomBuilder`, `TreeBuilder` и т. д.)【F:engine/core/modules/share/gears/Component.class.php†L335-L427】.

### 3.2 Регистрация в наследниках

Каждый конкретный компонент переопределяет `registerModals()` и/или `makeModalParams()`.
Примеры деклараций:

- **`Grid`:**
  ```php
  protected function registerModals(): void
  {
      parent::registerModals();
      $this->modals += [
          'attachments'       => ['module' => 'share', 'class' => AttachmentEditor::class],
          'tags'              => ['module' => 'share', 'class' => TagEditor::class],
          'filtersTreeEditor' => ['module' => 'share', 'class' => FiltersTreeEditor::class],
      ];
  }
  ```
  Метод `makeModalParams()` обрабатывает `linkedID`/`id`, формирует имена таблиц и смещает путь
  вместо текущих методов `attachments()`, `tags()`, `filtersTreeEditor()`【F:engine/core/modules/share/components/Grid.class.php†L781-L938】.

- **`DataSet`:** аналогично регистрирует `fileLibrary`, `imageManager`, `source`. Параметры
  можно формировать согласно прежней логике (смещение `shiftPath`, выбор конфигурации)【F:engine/core/modules/share/components/DataSet.class.php†L373-L439】【F:engine/core/modules/share/components/DataSet.class.php†L724-L767】.

- **`SiteEditor`:** добавляет `domains`, `properties`, `reset`, ссылаясь на `DomainEditor`,
  `SitePropertiesEditor`, `DivisionEditor`. Передача `site_id` выполняется в `makeModalParams()`【F:engine/core/modules/share/components/SiteEditor.class.php†L149-L207】.

- **Другие компоненты** (например, `DivisionEditor`) регистрируют `fileLibrary`, `showLangEditor`,
  `showUserEditor`, `showRoleEditor` и т. д., оставляя бизнес-логику неизменной【F:engine/core/modules/share/components/DivisionEditor.class.php†L1051-L1129】.

### 3.3 Расширяемость и конфигурация

- **Поддержка параметров.** Реестр может принимать замыкания/колбэки, возвращающие параметры
  на основе текущего состояния. Это позволяет инкапсулировать уникальную логику (например,
  загрузку дерева прав ролей) внутри соответствующего компонента (`RoleEditor`, `UserEditor`).

- **Конфигурационные шаблоны.** CRUD-формы продолжают описываться через `DataDescription`
  и `Toolbar`, наследники `Grid`/`DataSet` уже вызывают `createDataDescription()` и `createToolbar()`【F:engine/core/modules/share/components/DataSet.class.php†L221-L316】.
  В случае модалок, конфигурация может подключаться через отдельные XML-файлы (как для
  `FileRepositorySelect` и `TagEditorModal`) без изменения XSLT-шаблонов.

- **Мультиязычность.** Регистрация модалок не влияет на существующие механизмы перевода:
  компоненты вроде `TranslationEditor`, `LanguageEditor`, `RoleEditor` продолжают работать с
  *_translation таблицами и валидацией языков/ролей【F:engine/core/modules/share/components/TranslationEditor.class.php†L13-L123】【F:engine/core/modules/share/components/LanguageEditor.class.php†L15-L190】【F:engine/core/modules/user/components/RoleEditor.class.php†L10-L190】.

### 3.4 Вариант реализации

1. Добавить в `Component` методы:
   - `protected function registerModals(): void` (вызывается в конструкторе или лениво);
   - `protected function resolveModalComponent(string $state): ?Component` — создаёт и кэширует
     дочерний компонент;
   - `protected function isModalState(string $state): bool`;
   - доработать `run()` и/или `build()`, чтобы для модального состояния вместо запуска
     метода-наследника вызывался код модалки.

2. Для обратной совместимости: если состояние зарегистрировано, но разработчик всё ещё оставил
   метод `stateName()`, можно вызвать его внутри `makeModalParams()` или дать возможность
   отмечать «обработать сначала основной метод, затем модалку».

3. В `build()` после формирования стандартного XML добавить импорт дочернего компонента,
   если `resolveModalComponent()` вернул результат. Таким образом, новый механизм прозрачен
   для XSLT-шаблонов (модалка возвращает свой XML, который отрисовывается существующим шаблоном).

## 4. Каталог типовых модальных компонентов

Ниже перечислены модалки, встречающиеся в текущем коде, которые следует зарегистрировать
в соответствующих родительских компонентах:

| Состояние | Компонент | Назначение | Где вызывается | Источник кода |
|-----------|-----------|------------|----------------|---------------|
| `attachments` | `AttachmentEditor` | Управление вложениями записей | `Grid` | 【F:engine/core/modules/share/components/Grid.class.php†L783-L938】【F:engine/core/modules/share/components/AttachmentEditor.class.php†L10-L189】 |
| `tags` | `TagEditor` | Выбор и создание тегов | `Grid` | 【F:engine/core/modules/share/components/Grid.class.php†L781-L938】【F:engine/core/modules/share/components/TagEditor.class.php†L12-L149】 |
| `filtersTreeEditor` | `FiltersTreeEditor` | Редактор дерева фильтров | `Grid` | 【F:engine/core/modules/share/components/Grid.class.php†L781-L923】【F:engine/core/modules/share/components/FiltersTreeEditor.class.php†L9-L200】 |
| `fileLibrary` | `FileRepository` | Выбор файлов из репозитория | `DataSet`, `DivisionEditor` | 【F:engine/core/modules/share/components/DataSet.class.php†L373-L738】【F:engine/core/modules/share/components/DivisionEditor.class.php†L1069-L1077】【F:engine/core/modules/share/components/FileRepository.class.php†L10-L200】 |
| `imageManager` | `ImageManager` | Менеджер изображений | `DataSet` | 【F:engine/core/modules/share/components/DataSet.class.php†L373-L767】【F:engine/core/modules/share/components/ImageManager.class.php†L9-L59】 |
| `source` | `TextBlockSource` | Режим источника текста | `DataSet` | 【F:engine/core/modules/share/components/DataSet.class.php†L373-L753】 |
| `domains` | `DomainEditor` | Управление доменами сайта | `SiteEditor` | 【F:engine/core/modules/share/components/SiteEditor.class.php†L149-L207】【F:engine/core/modules/share/components/DomainEditor.class.php†L5-L75】 |
| `properties` | `SitePropertiesEditor` | Доп. свойства сайта | `SiteEditor` | 【F:engine/core/modules/share/components/SiteEditor.class.php†L176-L207】【F:engine/core/modules/share/components/SitePropertiesEditor.class.php†L33-L120】 |
| `reset` / `showPageToolbar` | `DivisionEditor` | Редактор структуры разделов | `SiteEditor`, меню | 【F:engine/core/modules/share/components/SiteEditor.class.php†L136-L207】【F:engine/core/modules/share/components/DivisionEditor.class.php†L1051-L1129】 |
| `showLangEditor` | `LanguageEditor` | Управление языками | `DivisionEditor` | 【F:engine/core/modules/share/components/DivisionEditor.class.php†L1051-L1129】【F:engine/core/modules/share/components/LanguageEditor.class.php†L10-L190】 |
| `showUserEditor` | `UserEditor` | Управление пользователями | `DivisionEditor` | 【F:engine/core/modules/share/components/DivisionEditor.class.php†L1051-L1129】【F:engine/core/modules/user/components/UserEditor.class.php†L10-L200】 |
| `showRoleEditor` | `RoleEditor` | Управление ролями | `DivisionEditor` | 【F:engine/core/modules/share/components/DivisionEditor.class.php†L1051-L1129】【F:engine/core/modules/user/components/RoleEditor.class.php†L10-L190】 |
| `translations` | `TranslationEditor` | Редактор переводов | Меню разделов / отдельный вызов | 【F:engine/core/modules/share/components/TranslationEditor.class.php†L13-L123】 |
| `imageManager`, `fileLibrary` (в текстовых блоках) | см. выше | Переиспользование | `TextBlock`, `WYSIWYG` редакторы | 【F:engine/core/modules/share/components/DataSet.class.php†L373-L767】 |

## 5. Переходный план

1. **Подготовка базовых классов.** Реализовать поддержку реестра в `Component`/`DataSet`
   с сохранением обратной совместимости. Пока методы `attachments()` и т. д. остаются,
   но помечаются как `@deprecated` и переводятся на `registerModals()`.

2. **Миграция компонентов.** Последовательно переносить существующие модальные состояния
   в новый механизм. Для каждого класса:
   - определить записи в `registerModals()`;
   - перенести код подготовки параметров в `makeModalParams()` или анонимную функцию;
   - удалить ручные `switch` в `build()` после проверки, что модалка успешно строится.

3. **Расширение документации и примеров.** Обновить XML-конфигурации и разработческую документацию
   (включая этот файл) с примером регистрации новой модалки.

4. **Тестирование.** Проверить сценарии, где модалки зависят от параметров URL/POST,
   мультиязычности и специфичных конфигураций (например, быстрая загрузка в `AttachmentEditor`
   или проверка уникальности ролей в `RoleEditor`).

5. **Оптимизация.** После перевода основных компонентов возможна оптимизация:
   - кэшировать созданные модалки между `run()` и `build()`;
   - добавить типизированные DTO для настроек модалок;
   - вынести типовые стратегии параметров (например, `linkById`, `linkBySiteId`).

## 6. Выводы

Реестр модальных компонентов позволяет убрать дублирование кода, сделать интерфейс
расширяемым и сохранить обратную совместимость. Компоненты продолжают описывать поля и
поведение в `prepare()`/`createDataDescription()`, задействуют мультиязычные механизмы и
регистрируют модальные «дочерние» компоненты локально в своём коде или конфиге. Добавление
нового модального окна сводится к расширению массива `modals`, без дополнительных методов и
ручной обработки состояний.
