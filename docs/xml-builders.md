# Документация XML-структуры билдеров

## Общие элементы

### `<recordset>`
Корневой контейнер для записей. Создаётся в большинстве билдеров и может включать:
- `title` — заголовок набора, передаётся конструктору `Builder` и его потомков.【F:engine/core/modules/share/gears/Builder.class.php†L26-L40】
- `rows` — количество строк в исходных данных; при отсутствии записей атрибут равен `0` и добавляется текст локализованного сообщения об отсутствии данных в атрибут `empty`.【F:engine/core/modules/share/gears/Builder.class.php†L32-L41】
- `empty` — текст сообщения о пустом наборе. Может появляться как у корневого `recordset`, так и у вложенных наборов (например, в `MultiLanguageBuilder`).【F:engine/core/modules/share/gears/Builder.class.php†L36-L51】【F:engine/core/modules/share/gears/MultiLanguageBuilder.class.php†L179-L216】

`TreeBuilder` создаёт `recordset` для каждого уровня дерева и вкладывает их внутрь родительских записей, тем самым формируя иерархию.【F:engine/core/modules/share/gears/TreeBuilder.class.php†L69-L115】

`EmptyBuilder` возвращает одиночный пустой `recordset` без дополнительных атрибутов, который служит заглушкой, когда данные загружаются асинхронно.【F:engine/core/modules/share/gears/EmptyBuilder.class.php†L18-L41】

### `<record>`
Элемент строки данных. В стандартном билдере создаётся по одной записи на строку данных; при пустом источнике формируется хотя бы один каркасный `record` c атрибутом `empty` для корректной работы XSLT-шаблонов.【F:engine/core/modules/share/gears/Builder.class.php†L42-L101】

`TreeBuilder` создаёт запись для каждого узла дерева; дочерние `recordset` (если есть потомки) вкладываются внутрь соответствующего `record`.【F:engine/core/modules/share/gears/TreeBuilder.class.php†L83-L115】

`MultiLanguageBuilder` формирует записи, объединяя поля с одинаковым первичным ключом — так в одной записи собираются поля для всех языков и служебные атрибуты.【F:engine/core/modules/share/gears/MultiLanguageBuilder.class.php†L26-L177】

### `<field>`
Узел, описывающий отдельное поле. Общие атрибуты, которые всегда заполняет `AbstractBuilder::createField`:
- `name`, `type`, `mode`, `length` (если ограничение задано в метаданных).【F:engine/core/modules/share/gears/AbstractBuilder.class.php†L101-L115】
- Любые скалярные свойства из `FieldDescription`, кроме `message` и `pattern` в режиме чтения; массивы игнорируются.【F:engine/core/modules/share/gears/AbstractBuilder.class.php†L140-L152】
- Дополнительные атрибуты из `DataField::getRowProperties()` или переданные явно — например, `tabName`, стили форматирования и др.【F:engine/core/modules/share/gears/Builder.class.php†L53-L99】【F:engine/core/modules/share/gears/AbstractBuilder.class.php†L154-L165】

#### Специальная обработка типов
- Файлы (`FIELD_TYPE_FILE`): добавляются атрибуты «быстрой загрузки» (`quickUploadPath`, `quickUploadPid`, `quickUploadEnabled`), флаг защищённого репозитория (`secure`), MIME-тип, тип медиа и список доступных форматов (`playlist`).【F:engine/core/modules/share/gears/AbstractBuilder.class.php†L117-L283】
- Навигационный селектор (`FIELD_TYPE_SMAP_SELECTOR`): поле получает человекочитаемое имя страницы в атрибут `smap_name`.【F:engine/core/modules/share/gears/AbstractBuilder.class.php†L117-L128】
- CAPTCHA (`FIELD_TYPE_CAPTCHA`): содержимое заменяется HTML-кодом reCAPTCHA для дальнейшего отображения. 【F:engine/core/modules/share/gears/AbstractBuilder.class.php†L117-L131】
- Поля-значения (`FIELD_TYPE_VALUE`): значение `{id, value}` оборачивается отдельным узлом `<value>` с атрибутом `id`.【F:engine/core/modules/share/gears/AbstractBuilder.class.php†L131-L138】
- Дата и время (`FIELD_TYPE_DATE`, `FIELD_TYPE_TIME`, `FIELD_TYPE_DATETIME`): атрибут `date` хранит исходную строку, а текст узла содержит отформатированное значение с учётом настроек `outputFormat`. Если формат не задаёт время, для временных типов добавляются часы и минуты. 【F:engine/core/modules/share/gears/AbstractBuilder.class.php†L202-L415】
- Медиа (`FIELD_TYPE_MEDIA`): текстовое значение сохраняет путь к файлу, а атрибуты `media_type` и `mime` заполняются по результату анализа репозитория. 【F:engine/core/modules/share/gears/AbstractBuilder.class.php†L188-L200】
- Списки (`FIELD_TYPE_TEXTBOX_LIST`): внутрь поля вставляется вложенный `<items>` c набором `<item>` (см. ниже).【F:engine/core/modules/share/gears/AbstractBuilder.class.php†L180-L185】【F:engine/core/modules/share/gears/AbstractBuilder.class.php†L490-L515】

`SimpleBuilder` и `TreeBuilder` дополнительно очищают часть служебных свойств (`nullable`, `pattern`, `tabName` и др.), чтобы не перегружать итоговый XML — атрибуты этих свойств отсутствуют в соответствующих вариантах XML. 【F:engine/core/modules/share/gears/SimpleBuilder.class.php†L30-L52】【F:engine/core/modules/share/gears/TreeBuilder.class.php†L118-L141】

`MultiLanguageBuilder` устанавливает для мультиязычных полей атрибуты `language`, `languageOrder`, `languageAbbr` и `tabName` с человекочитаемым названием языка, обеспечивая группировку значений по вкладкам в интерфейсе. 【F:engine/core/modules/share/gears/MultiLanguageBuilder.class.php†L63-L110】

### `<value>`
Используется только для полей типа `FIELD_TYPE_VALUE`. Внутри хранится текст представления значения, а атрибут `id` содержит идентификатор записи, если он присутствует в исходных данных. 【F:engine/core/modules/share/gears/AbstractBuilder.class.php†L131-L138】

### `<options>` и `<option>`
Комбинация для полей `SELECT` и `MULTI`. Корневой контейнер `<options>` содержит по одному `<option>` на каждое доступное значение. Атрибуты `<option>`:
- `id` — ключ опции.
- Дополнительные пользовательские атрибуты из метаданных (например, CSS-класс, блокировка).
- `selected="selected"` — пометка выбранных значений для мультиселектов.
Текстовое содержимое — локализованная подпись опции. 【F:engine/core/modules/share/gears/AbstractBuilder.class.php†L455-L488】

### `<items>` и `<item>`
Структура, выдаваемая для полей `TEXTBOX_LIST`. `<items>` содержит набор `<item>` с атрибутом `id` (значение из массива) и текстовым содержимым, отображаемым в интерфейсе. Пустые списки не формируются. 【F:engine/core/modules/share/gears/AbstractBuilder.class.php†L490-L515】

## Билдеры

### `Builder`
Базовый XML-билдер, который конвертирует табличные данные в плоский список записей. Формирует корневой `recordset`, атрибуты `title/rows/empty`, создаёт по записи на каждую строку и копирует значения и свойства полей в узлы `field`. Поддерживает генерацию `<options>` и передачу построчных свойств (`DataField::getRowProperties`) в виде атрибутов поля. 【F:engine/core/modules/share/gears/Builder.class.php†L26-L101】

### `SimpleBuilder`
Наследует базовый `Builder`, но перед построением полей удаляет часть метаданных (`nullable`, `pattern`, `message`, `tabName`, `tableName`, `sort`, `customField`, `default`), поэтому итоговый XML содержит только минимальный набор атрибутов. Подходит для лёгких форм и простых списков. 【F:engine/core/modules/share/gears/SimpleBuilder.class.php†L30-L52】

### `TreeBuilder`
Формирует иерархическую структуру. Требует указания поля-ключа (`key` в метаданных) и экземпляра `TreeNodeList`. Для каждого узла создаётся `record` с набором `field`, после чего рекурсивно прикрепляется дочерний `recordset` с потомками. Значения SELECT-полей заменяются готовым блоком `<options>`, а лишние атрибуты полей вычищаются так же, как в `SimpleBuilder`. 【F:engine/core/modules/share/gears/TreeBuilder.class.php†L41-L141】

### `MultiLanguageBuilder`
Собирает данные для мультиязычных форм. На основе первичного ключа формирует группы полей, чтобы в одной записи присутствовали все языковые варианты. Для мультиязычных полей устанавливает язык (`language`, `languageOrder`, `languageAbbr`) и человекочитаемое название вкладки (`tabName`), а также дублирует свойства `tabName` для остальных полей. В режиме вставки создаёт одну запись с пустыми значениями, атрибутом `empty` у `recordset` и набором `field` для каждого языка. 【F:engine/core/modules/share/gears/MultiLanguageBuilder.class.php†L26-L216】

### `EmptyBuilder`
Минимальная реализация интерфейса `IBuilder`. Создаёт только пустой `recordset`, чтобы удовлетворить контракт компонентов, которым нужен XML-корень, но которые загружают содержимое отдельно (например, через AJAX). 【F:engine/core/modules/share/gears/EmptyBuilder.class.php†L18-L41】
