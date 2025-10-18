# Редактор внешних ключей (`fkEditor`) и обновление значений (`fkValues`)

## Назначение

Компонент `Grid` поддерживает встроенный редактор для управления записями, на
которые ссылаются поля-"внешние ключи" в формах (`select`/`multi-select`).
Состояние `fkEditor` открывает вложенный грид, в котором можно добавлять и
редактировать записи связанной таблицы, а состояние `fkValues` возвращает свежий
набор значений, чтобы обновить список опций без перезагрузки формы.【F:engine/core/modules/share/components/Grid.class.php†L417-L533】【F:engine/core/modules/share/components/Grid.class.php†L496-L533】

## Маршруты и триггер в интерфейсе

* `fkEditor` зарегистрирован в реестре модалок `Grid` и сопоставлен с маршрутами
  вида `/field-editor/crud/`. Базовая реализация смещает URI и запускает
  дочерний компонент автоматически.【F:engine/core/modules/share/components/Grid.class.php†L103-L172】【F:engine/core/modules/share/components/Grid.class.php†L417-L490】
* `GridConfig` по умолчанию регистрирует маршрут `/field/fk-values/` для
  состояния `fkValues`, поэтому REST-запрос можно выполнять без дополнительной
  настройки в конфигурации компонента.【F:engine/core/modules/share/gears/GridConfig.class.php†L13-L23】
* В админской форме иконка CRUD помечена атрибутами `data-action="crud"`,
  `data-field` и `data-editor`. Скрипт `Form` открывает модалку по URL вида
  `${singlePath}${field}-${editor}/crud/` и ожидает объект-результат при закрытии
  окна.【F:engine/core/modules/share/scripts/Form.js†L516-L536】
* Если вложенный редактор изменил данные (флаг `dirty` в результате), `Form`
  выполняет AJAX-запрос на `${singlePath}${field}/fk-values/`, обнуляет список
  `<option>` и заполняет его обновлёнными значениями, возвращёнными сервером.
  Если изменений не было, выбранное значение просто подставляется из `result`.
  【F:engine/core/modules/share/scripts/Form.js†L536-L568】

## Алгоритм `spawnFkEditor()`

Метод `spawnFkEditor()` инкапсулирует подготовку дочернего редактора и вызывается
из реестра модалок `Grid`.

1. Из параметров состояния извлекаются имя поля (`field`) и имя класса редактора
   (`class`). Поддерживается короткая форма (`Grid`) и полное имя с указанием
   модуля (`module\Class`). Отсутствие обязательных параметров приводит к
   `SystemException('ERR_DEV_BAD_DATA')`.【F:engine/core/modules/share/components/Grid.class.php†L417-L438】
2. Если указан базовый `Grid`, метод автоматически определяет имя связанной
   таблицы из метаданных внешнего ключа (`QAL::getColumnsInfo`). Проверяются обе
   таблицы — основная и переводов. Отсутствие колонки или ключа приводит к
   исключению (`ERR_NO_COLUMN`, `ERR_BAD_FK_COLUMN`).【F:engine/core/modules/share/components/Grid.class.php†L438-L467】
3. Для сторонних классов проверяется существование класса и его наследование от
   `Grid`. Это защищает от запуска неподдерживаемых компонентов в модалке.
   【F:engine/core/modules/share/components/Grid.class.php†L467-L478】
4. Конфигурационный файл выбирается по приоритету: `<module>/<Class>Modal`, затем
   `<module>/<Class>`, и в крайнем случае — общий `share/GridModal`. Это позволяет
   переиспользовать уже существующие конфиги без ручной подстройки.
   【F:engine/core/modules/share/components/Grid.class.php†L480-L491】
5. После подготовки параметров путь в запросе смещается на два сегмента (`field` и
   `class`), чтобы вложенный компонент получил собственные параметры. Затем
   вызывается `activateModalComponent('fkEditor', $module, $class, $params)` —
   базовая логика `Component` создаёт и запускает дочерний грид.
   【F:engine/core/modules/share/components/Grid.class.php†L491-L495】

Таким образом, для стандартного сценария достаточно иметь FK-колонку в схеме и
оставить свойство `editor` пустым/`null`: `Grid::createData()` сам подставит
`'Grid'` как класс редактора. Если нужен другой компонент, присвойте нужный класс
(например, `news\CategoryGrid`) в описании поля — он будет передан как
`data-editor` и обработан `spawnFkEditor()` автоматически.【F:engine/core/modules/share/components/Grid.class.php†L603-L620】

## Ответ `fkValues`

Состояние `fkValues` возвращает JSON c ключом `result`, содержащим кортеж из
данных, имени поля-идентификатора и имени поля-подписи. Процедура повторяет
валидацию, используемую в `spawnFkEditor()`, чтобы убедиться, что колонка
действительно является внешним ключом. Затем вызывается `getFKData()`, который
берёт значения из основной или переводной таблицы (учитывая текущий язык) и
возвращает их вместе с именами служебных полей.【F:engine/core/modules/share/components/Grid.class.php†L496-L533】【F:engine/core/modules/share/components/Grid.class.php†L693-L713】【F:engine/core/modules/share/components/DBDataSet.class.php†L639-L688】【F:engine/core/modules/share/gears/QAL.class.php†L985-L1119】

На клиенте ответ обрабатывается функцией, которая пересоздаёт `<option>` и, при
необходимости, выставляет выбранное значение, переданное из модального окна.
Это гарантирует, что форма сразу отразит изменения, выполненные в редакторе
внешнего ключа, без перезагрузки страницы.【F:engine/core/modules/share/scripts/Form.js†L536-L568】

## Практическое применение

1. **Проверьте схему БД.** Столбец должен иметь реальный `FOREIGN KEY`, чтобы
   `QAL::getColumnsInfo()` вернул структуру `['key' => ['tableName' => ..., 'fieldName' => ...]]`.
   Без этого поле не распознается как FK и не станет `<select>` со списком
   значений.【F:engine/core/modules/share/components/Grid.class.php†L438-L467】【F:engine/core/modules/share/gears/QAL.class.php†L985-L1119】
2. **Опишите поле как `select`.** При автогенерации `FieldDescription` по схеме
   целочисленные колонки с FK автоматически получают тип `select`/`multi`
   благодаря `FieldDescription::convertType()`. Если вы добавляете поле вручную
   в XML, задайте `type="select"` и укажите `tableName`, чтобы билдер понимал,
   к какой таблице относится поле. Для переводимых колонок используйте
   соответствующую `_translation`-таблицу по аналогии со стандартными конфигами.
   【F:engine/core/modules/share/gears/FieldDescription.class.php†L484-L526】【F:codex/xml/grid_edit.xml†L19-L36】
3. **Подключите скрипт `ModalBox`.** Поведение `Form` импортирует ModalBox и не
   сможет открыть CRUD-окно без соответствующей библиотеки. Добавьте
   `<library path="ModalBox"/>` (или собранный бандл, который её экспортирует) в
   секцию `<javascript>`, если он ещё не подключен.【F:engine/core/modules/share/scripts/Form.js†L1-L35】
4. **Не очищайте свойство `editor`.** В формах `Grid::createData()` подставляет
   редактор `Grid`, когда свойство не задано (`null`). Передача пустой строки
   (`editor=""`) напротив удаляет редактор и скрывает кнопку CRUD. Поэтому для
   стандартного поведения либо совсем уберите атрибут, либо явно пропишите
   `editor="Grid"` (или FQCN пользовательского грида).【F:engine/core/modules/share/components/Grid.class.php†L603-L629】
5. **Убедитесь, что на форме есть кнопка CRUD.** Базовые шаблоны Energine
   автоматически выводят пиктограмму возле `select` с атрибутом `editor`. Если
   поле рендерится вручную, добавьте элемент с `data-action="crud"`,
   `data-field="gallery_id"` и `data-editor="Grid"` — `Form.js` повесит на него
   обработчик открытия модального окна.【F:engine/core/modules/share/scripts/Form.js†L516-L568】
6. **После редактирования данные обновятся сами.** Когда вложенный грид закрывается
   с флагом `dirty`, `Form.js` отправляет запрос на `${singlePath}${field}/fk-values/` и
   пересобирает `<option>` без дополнительного кода на вашей стороне.【F:engine/core/modules/share/scripts/Form.js†L536-L568】

### Минимальный пример для `gallery_id`

```
<state name="edit">
    <javascript>
        <library path="Form"/>
        <library path="ModalBox"/>
    </javascript>
    <fields>
        <field name="gallery_id"
               type="select"
               tableName="auto_test"
               title="Галерея"
               editor="Grid"/>
    </fields>
</state>
```

Такое описание предполагает, что в таблице `auto_test` есть колонка
`gallery_id`, которая ссылается на `site_gallery.gallery_id`. `Grid`
использует метаданные внешнего ключа, чтобы построить URL `/gallery_id-Grid/crud/`
для модального окна и вернуть таблицу-источник в `spawnFkEditor()`, а после
закрытия модалки `Form` автоматически отправит запрос `/gallery_id/fk-values/`
и обновит выпадающий список значений.【F:engine/core/modules/share/components/Grid.class.php†L417-L495】【F:engine/core/modules/share/scripts/Form.js†L516-L568】

### Частые ошибки

* **`editor=""`** — отключает CRUD. Удалите атрибут или задайте `Grid`.
* **Нет FK в схеме** — поле остаётся обычным числом; нужно создать ограничение и
  пересгенерировать описание поля.
* **Тип отличается от `select`** — убедитесь, что в XML нет явного `type="string"`
  или другого значения, иначе билдер не подгрузит список значений и CRUD-кнопку.
