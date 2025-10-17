# Поля мультивыбора (`FIELD_TYPE_MULTI`)

`FIELD_TYPE_MULTI` включает встроенную поддержку many-to-many связей в административных формах Energine: значения подгружаются из связующей таблицы, показываются в селекте с множественным выбором, синхронно сохраняются при вставке/редактировании. Ниже описан полный цикл, требования к схеме БД и пример настройки компонента.

## Когда поле становится `multi`

* При сборе метаданных `FieldDescription::convertType()` превращает целочисленную колонку с внешним ключом в `multi`, если в её имени есть суффикс `_multi`. В остальных случаях она станет `select` или обычным `int`.【F:engine/core/modules/share/gears/FieldDescription.class.php†L488-L527】
* Если поле описано вручную в компоненте, тип можно присвоить явно через `FieldDescription::setType(FieldDescription::FIELD_TYPE_MULTI)`. Такой же приём используется, например, в `UserEditor`, когда к описанию данных добавляется мультиселект групп пользователя.【F:engine/core/modules/user/components/UserEditor.class.php†L233-L247】

## Как Energine работает с мультиполями

### Загрузка опций

* После объединения конфигурации и структуры таблицы `DBDataSet::createDataDescription()` ищет у `multi`-полей массив `key` с информацией о связующей таблице. Оно считывает метаданные этой M2M-таблицы, отбрасывает колонку владельца (обычно `<entity>_id`) и по оставшемуся внешнему ключу подтягивает список значений через `getFKData()`. Полученные пары `[id => label]` попадают в `availableValues` поля.【F:engine/core/modules/share/components/DBDataSet.class.php†L642-L678】
* `getFKData()` использует общий механизм `QAL::getForeignKeyData()`, поэтому автоматически подхватывает переводные таблицы (`*_translation`) и сортировку по полю `_order_num`, если оно есть.【F:engine/core/modules/share/components/DBDataSet.class.php†L688-L691】【F:engine/core/modules/share/gears/QAL.class.php†L963-L1077】

### Получение выбранных значений

* При чтении данных `DBDataSet::modify()` собирает по каждому `FIELD_TYPE_MULTI` значения из связующей таблицы: делает выборку по FK на текущий PK записи и подставляет массив выбранных идентификаторов в строку результата.【F:engine/core/modules/share/components/DBDataSet.class.php†L120-L164】
* Базовый `Builder` превращает эти массивы в `<options>`, отмечая выбранные элементы, а `JSONBuilder` дополнительно заменяет ID на человекочитаемые подписи, собранные из `availableValues`. Это гарантирует корректный вывод как в XML-шаблонах, так и в REST-ответах.【F:engine/core/modules/share/gears/Builder.class.php†L69-L115】【F:engine/core/modules/share/gears/JSONBuilder.class.php†L72-L114】

### Сохранение

* `Saver::save()` собирает значения мультиполей отдельно: в основную таблицу подставляется пустая строка (поле работает как фиктивное), а выбранные идентификаторы раскладываются по M2M-таблице. После основного INSERT/UPDATE модуль удаляет старые связи и вставляет новые через `INSERT_IGNORE`, опираясь на ключи, описанные в метаданных поля.【F:engine/core/modules/share/gears/Saver.class.php†L166-L352】
* Обновление M2M выполняется только если из формы пришёл PK записи. Поэтому в кастомных формах важно не удалять скрытое поле с идентификатором — иначе `Saver` не узнает, какую связующую запись чистить.【F:engine/core/modules/share/gears/Saver.class.php†L323-L351】

## Требования к схеме БД

Чтобы автоматика отработала без доработок, структура таблиц должна удовлетворять нескольким условиям:

1. **Основная таблица** содержит PK (обычно `AUTO_INCREMENT`) — `DBDataSet::getPK()` извлекает его из метаданных и использует как идентификатор строки.【F:engine/core/modules/share/components/DBDataSet.class.php†L593-L621】
2. **Связующая таблица** хранит пары `(<owner>_id, <value>_id)` и имеет составной первичный ключ по этим столбцам. Так `DBStructureInfo` помечает `owner_id` как внешний ключ на основную таблицу, а `value_id` — как внешний ключ на справочник, что позволяет `createDataDescription()` вычислить доступные значения автоматически.【F:engine/core/modules/share/gears/DBStructureInfo.class.php†L6-L454】【F:engine/core/modules/share/components/DBDataSet.class.php†L657-L668】
3. **Справочная таблица** должна иметь понятный текстовый столбец (обычно `<value>_name`). `QAL::getForeignKeyData()` сам найдёт его по суффиксу `_name` или обратится к таблице переводов `*_translation` при наличии мультиязычности.【F:engine/core/modules/share/gears/QAL.class.php†L971-L1076】
4. **Внешние ключи и индексы** обязательно объявляются в БД. `DBStructureInfo` достаёт их из `information_schema`, и без них поле не распознается как M2M: не будет заполнен массив `key`, откуда берутся имена таблиц и колонок.【F:engine/core/modules/share/gears/DBStructureInfo.class.php†L283-L454】

### Пример SQL-схемы

```sql
CREATE TABLE test_article (
    test_article_id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    test_article_name        VARCHAR(255) NOT NULL,
    test_article_slug        VARCHAR(255) NOT NULL UNIQUE,
    test_article_intro       TEXT,
    test_article_published_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE test_category (
    test_category_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    test_category_name VARCHAR(100) NOT NULL
);

CREATE TABLE test_article_category (
    test_article_id  INT UNSIGNED NOT NULL,
    test_category_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (test_article_id, test_category_id),
    CONSTRAINT fk_test_article_category_article
        FOREIGN KEY (test_article_id) REFERENCES test_article(test_article_id) ON DELETE CASCADE,
    CONSTRAINT fk_test_article_category_category
        FOREIGN KEY (test_category_id) REFERENCES test_category(test_category_id) ON DELETE CASCADE
);
```

В примере колонка `test_article_id` служит «основным» ключом для `multi`-поля (её имя передаётся в свойстве `fieldName`), а `test_category_id` — колонка, из которой будут подтягиваться доступные значения через справочник `test_category`. Остальные колонки (`test_article_name`, `test_article_slug`, `test_article_intro`, `test_article_published_at`) показывают, что схема может содержать собственные данные и не ограничивается только ID.

## Настройка компонента

1. **Создайте поле.** Можно пойти двумя путями:

   * **Через PHP** — как и раньше, в `createDataDescription()` добавляется `FieldDescription`, у которого задаётся системный тип (`INT`), визуальный тип `multi`, признак `customField` и свойство `key`. Такой подход используется, например, в `UserEditor`, где поле групп пользователя добавляется программно.【F:engine/core/modules/user/components/UserEditor.class.php†L209-L247】

   * **Непосредственно в XML-конфиге.** Достаточно описать `<field name="category_multi" type="integer" customField="customField" keyTableName="test_article_category" keyFieldName="test_article_id"/>`. Метод `FieldDescription::loadXML()` собирает атрибуты `keyTableName`/`keyFieldName` в массив `key`, пересчитывает визуальный тип и в итоге отдаёт тот же набор метаданных, что и PHP-вариант.【F:engine/core/modules/share/gears/FieldDescription.class.php†L143-L220】 Благодаря суффиксу `_multi` и наличию `key` поле автоматически станет `FIELD_TYPE_MULTI`.

2. **Проверьте свойство `key`.** Независимо от того, откуда пришли метаданные (PHP или XML), `DBDataSet::createDataDescription()` ожидает массив `['tableName' => ..., 'fieldName' => ...]`. Он использует его, чтобы найти связующую таблицу и построить список опций.【F:engine/core/modules/share/components/DBDataSet.class.php†L642-L678】 Если вы добавляете поле через PHP, пример кода остаётся прежним:

   ```php
   $fdCategories = new FieldDescription('category_multi');
   $fdCategories->setSystemType(DBA::COLTYPE_INTEGER);
   $fdCategories->setType(FieldDescription::FIELD_TYPE_MULTI);
   $fdCategories->setProperty('customField', 'customField');
   $fdCategories->setProperty('key', [
       'tableName' => 'test_article_category',
       'fieldName' => 'test_article_id',
   ]);
   $dd->addFieldDescription($fdCategories);
   ```

3. **Оставьте сохранение за `Saver`.** После описанных шагов компонент может пользоваться штатными методами `insert`/`update`: мультисвязи будут очищаться и перезаписываться автоматически за счёт логики `Saver` из раздела выше.【F:engine/core/modules/share/gears/Saver.class.php†L333-L352】

4. **Не забывайте про PK в форме.** При редактировании форма обязана отправлять первичный ключ (`<input type="hidden" name="test_article_id">`). Без него `Saver` не сможет обновить связующую таблицу, и мультисвязи останутся в прежнем состоянии.【F:engine/core/modules/share/gears/Saver.class.php†L323-L351】

## Полный SQL-пример (структура БД)

Следующий скрипт создаёт три таблицы и тестовые записи, с которыми будет работать мультиселект. После его выполнения нужно подключить поле к компоненту — либо через PHP, либо через XML-конфиг (см. предыдущий раздел), чтобы у `FieldDescription` появились тип `multi` и свойство `key`.

```sql
START TRANSACTION;

-- Основная сущность
CREATE TABLE test_article (
    test_article_id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    test_article_name        VARCHAR(255) NOT NULL,
    test_article_slug        VARCHAR(255) NOT NULL UNIQUE,
    test_article_intro       TEXT,
    test_article_published_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Справочник значений
CREATE TABLE test_category (
    test_category_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    test_category_name VARCHAR(100) NOT NULL
);

-- Таблица связей многие-ко-многим
CREATE TABLE test_article_category (
    test_article_id  INT UNSIGNED NOT NULL,
    test_category_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (test_article_id, test_category_id),
    CONSTRAINT fk_test_article_category_article
        FOREIGN KEY (test_article_id) REFERENCES test_article(test_article_id) ON DELETE CASCADE,
    CONSTRAINT fk_test_article_category_category
        FOREIGN KEY (test_category_id) REFERENCES test_category(test_category_id) ON DELETE CASCADE
);

-- Пример наполнения
INSERT INTO test_category (test_category_name) VALUES
    ('Новости компании'),
    ('Промо-материалы'),
    ('Интервью');

INSERT INTO test_article (
    test_article_name,
    test_article_slug,
    test_article_intro,
    test_article_published_at
) VALUES
    (
        'Запуск новой линии производства',
        'factory-launch',
        'Краткий обзор нового производственного комплекса и его возможностей.',
        '2024-02-12 09:30:00'
    ),
    (
        'Интервью с генеральным директором',
        'ceo-interview',
        'Подборка ключевых цитат о стратегии и планах компании на год.',
        '2024-03-28 15:00:00'
    );

INSERT INTO test_article_category (test_article_id, test_category_id) VALUES
    (1, 1),
    (1, 2),
    (2, 1),
    (2, 3);

COMMIT;
```

После выполнения скрипта подключите поле `category_multi` к компоненту — через PHP (см. пример ниже) или напрямую в XML-конфиге. В обоих случаях важно, чтобы у `FieldDescription` появилось свойство `key`: тогда `DBDataSet` загрузит значения из связующей таблицы и сохранит их через `Saver`.【F:engine/core/modules/share/components/DBDataSet.class.php†L642-L678】【F:engine/core/modules/share/gears/Saver.class.php†L166-L352】

### Пример конфигурации `component.xml`

XML-конфигурация определяет, в каких состояниях показывать поле, и теперь может полностью описать метаданные мультиселектора. Атрибуты `keyTableName`/`keyFieldName` внутри `<field>` превращаются в свойство `key`, поэтому `FieldDescription` получает всю необходимую информацию прямо из конфигурации. Ниже приведён `*.component.xml` в том же стиле, что и `engine/core/modules/auto/config/TestfeedFeedEditor.component.xml`: у него есть состояния `main`, `add`, `edit` с наборами полей и тулбарами.【F:engine/core/modules/auto/config/TestfeedFeedEditor.component.xml†L1-L74】【F:engine/core/modules/share/gears/FieldDescription.class.php†L143-L220】

```xml
<?xml version="1.0" encoding="utf-8" ?>
<configuration>
    <state name="main">
        <javascript>
            <behavior name="GridManager"/>
        </javascript>
        <toolbar>
            <control id="add" title="BTN_ADD" icon="fa fa-plus" type="button" onclick="add"/>
            <control id="edit" title="BTN_EDIT" icon="fa fa-pencil" type="button" onclick="edit"/>
            <control id="delete" title="BTN_DELETE" icon="fa fa-trash" type="button" onclick="del"/>
        </toolbar>
        <fields>
            <field name="test_article_id"/>
            <field name="test_article_name"/>
            <field name="test_article_slug"/>
            <field name="test_article_published_at"/>
            <field
                name="category_multi"
                type="integer"
                customField="customField"
                keyTableName="test_article_category"
                keyFieldName="test_article_id"
            />
        </fields>
    </state>

    <state name="add">
        <uri_patterns>
            <pattern>/add/</pattern>
        </uri_patterns>
        <javascript>
            <behavior name="Form"/>
        </javascript>
        <toolbar>
            <control id="save" title="BTN_SAVE" icon="fa fa-save" type="button" onclick="save"/>
            <control id="after_save_action" title="TXT_AFTER_SAVE_ACTION" type="select">
                <options>
                    <option id="reload">BTN_CLOSE</option>
                    <option id="add">BTN_ADD</option>
                </options>
            </control>
            <control id="sep1" type="separator"/>
            <control id="list" title="BTN_CANCEL" icon="fa fa-arrow-left" type="button" onclick="close"/>
        </toolbar>
        <fields>
            <field name="test_article_id" type="hidden"/>
            <field name="test_article_name" required="true"/>
            <field name="test_article_slug" required="true"/>
            <field name="test_article_intro"/>
            <field name="test_article_published_at"/>
            <field
                name="category_multi"
                type="integer"
                customField="customField"
                keyTableName="test_article_category"
                keyFieldName="test_article_id"
            />
        </fields>
    </state>

    <state name="edit">
        <uri_patterns>
            <pattern>/[int]/edit/</pattern>
        </uri_patterns>
        <javascript>
            <behavior name="Form"/>
        </javascript>
        <toolbar>
            <control id="save" title="BTN_SAVE" icon="fa fa-save" type="button" onclick="save"/>
            <control id="list" title="BTN_CLOSE" icon="fa fa-arrow-left" type="button" onclick="close"/>
        </toolbar>
        <fields>
            <field name="test_article_id" type="hidden"/>
            <field name="test_article_name" required="true"/>
            <field name="test_article_slug" required="true"/>
            <field name="test_article_intro"/>
            <field name="test_article_published_at"/>
            <field
                name="category_multi"
                type="integer"
                customField="customField"
                keyTableName="test_article_category"
                keyFieldName="test_article_id"
            />
        </fields>
    </state>
</configuration>
```

XML-слой задаёт, в каких состояниях компонента показывать поле `category_multi`, и помечает его как «виртуальное», чтобы `DataDescription::intersect()` не пытался сопоставить его с колонками БД (см. атрибут `customField`). Дополнительно мы сразу передаём `keyTableName` и `keyFieldName`: `FieldDescription::loadXML()` превратит их в массив `key`, пересчитает тип поля и в итоге сформирует полный набор метаданных для мультиселекта без PHP-кода.【F:engine/core/modules/share/gears/DataDescription.class.php†L214-L261】【F:engine/core/modules/share/gears/FieldDescription.class.php†L143-L220】 `DBDataSet` и `Saver` читают именно свойство `key`, поэтому после загрузки конфигурации они знают, где искать выбранные категории и как их сохранить.【F:engine/core/modules/share/components/DBDataSet.class.php†L642-L678】【F:engine/core/modules/share/gears/Saver.class.php†L333-L352】

### Несколько мультиполей и вывод в списке

`DBDataSet::modify()` обрабатывает каждое поле с типом `FIELD_TYPE_MULTI`, поэтому можно добавить несколько мультиселектов в один компонент: для каждого создайте `FieldDescription`, присвойте тип `multi` и пропишите собственный `key`. Например, массив со схемой можно перечислить инициализацией:

```php
foreach ([
    'category_multi' => ['tableName' => 'test_article_category', 'fieldName' => 'test_article_id'],
    'audience_multi' => ['tableName' => 'test_article_audience', 'fieldName' => 'test_article_id'],
] as $fieldName => $keyInfo) {
    $fd = new FieldDescription($fieldName);
    $fd->setSystemType(DBA::COLTYPE_INTEGER);
    $fd->setType(FieldDescription::FIELD_TYPE_MULTI);
    $fd->setProperty('customField', 'customField');
    $fd->setProperty('key', $keyInfo);
    $dd->addFieldDescription($fd);
}
```

Для каждого поля требуется собственная связующая таблица (`test_article_audience` в примере устроена так же, как `test_article_category`: пара внешних ключей и составной PK). Аналогичный результат можно получить через XML, добавив несколько `<field ... keyTableName="..." keyFieldName="..."/>` с уникальными именами. Это позволяет ядру разобрать структуру и подготовить списки значений автоматически.

Чтобы выбранные значения отображались в списке (`state="main"`), добавьте соответствующие поля в `<fields>` и пометьте их `customField="customField"`, как показано в примере выше. При рендеринге грида `JSONBuilder` преобразует массив ID в строку с названиями, объединяя подписи через запятую, поэтому в колонке списка сразу будут отображаться человекочитаемые значения без дополнительного кода.【F:engine/core/modules/share/components/DBDataSet.class.php†L120-L164】【F:engine/core/modules/share/gears/JSONBuilder.class.php†L72-L114】

## Результат

После выполнения описанных шагов `FIELD_TYPE_MULTI` обеспечит полный цикл работы с many-to-many связями:

* в редакторе появится мультиселект со значениями из справочника;
* выбранные ID будут загружаться из связующей таблицы при открытии формы;
* при сохранении старые связи удалятся, новые — добавятся автоматически.

Такую схему можно переиспользовать для тегов, категорий, подборок и любых других сущностей, требующих множественного выбора.
