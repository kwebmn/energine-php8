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
    test_article_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title           VARCHAR(255) NOT NULL
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

В примере колонка `test_article_id` служит «основным» ключом для `multi`-поля (её имя передаётся в свойстве `fieldName`), а `test_category_id` — колонка, из которой будут подтягиваться доступные значения через справочник `test_category`.

## Настройка компонента

1. **Добавьте описание поля.** В `createDataDescription()` компонента создайте `FieldDescription` с именем, заканчивающимся на `_multi`, укажите системный тип (`int`) и визуальный тип (`multi`). Как и в примере с редактором пользователей, поле можно добавить поверх уже собранного описания из БД.【F:engine/core/modules/user/components/UserEditor.class.php†L209-L247】

2. **Опишите связующую таблицу.** Передайте в свойство `key` массив с именем таблицы и колонкой владельца — по нему `DBDataSet` поймёт, где искать связи и какие значения доступны:

   ```php
   $fdCategories = new FieldDescription('category_multi');
   $fdCategories->setSystemType(FieldDescription::FIELD_TYPE_INT);
   $fdCategories->setType(FieldDescription::FIELD_TYPE_MULTI);
   $fdCategories->setProperty('customField', true); // поле не хранится в test_article
   $fdCategories->setProperty('key', [
       'tableName' => 'test_article_category', // связующая таблица
       'fieldName' => 'test_article_id',       // колонка-владелец
   ]);
   $dd->addFieldDescription($fdCategories);
   ```

   Флаг `customField` позволяет `Saver` пропустить попытку записи фиктивного столбца в основную таблицу.【F:engine/core/modules/share/gears/Saver.class.php†L175-L244】

3. **Оставьте сохранение за `Saver`.** После описанных шагов компонент может пользоваться штатными методами `insert`/`update`: мультисвязи будут очищаться и перезаписываться автоматически за счёт логики `Saver` из раздела выше.【F:engine/core/modules/share/gears/Saver.class.php†L333-L352】

4. **Не забывайте про PK в форме.** При редактировании форма обязана отправлять первичный ключ (`<input type="hidden" name="test_article_id">`). Без него `Saver` не сможет обновить связующую таблицу, и мультисвязи останутся в прежнем состоянии.【F:engine/core/modules/share/gears/Saver.class.php†L323-L351】

## Результат

После выполнения описанных шагов `FIELD_TYPE_MULTI` обеспечит полный цикл работы с many-to-many связями:

* в редакторе появится мультиселект со значениями из справочника;
* выбранные ID будут загружаться из связующей таблицы при открытии формы;
* при сохранении старые связи удалятся, новые — добавятся автоматически.

Такую схему можно переиспользовать для тегов, категорий, подборок и любых других сущностей, требующих множественного выбора.
