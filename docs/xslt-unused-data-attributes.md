# Неиспользуемые в JavaScript кастомные атрибуты из XSLT

## Методика
1. Автоматически собрал перечень атрибутов `data-*`, которые создаются в XSLT-шаблонах движка, с помощью поиска по регулярному выражению.
2. Для каждого атрибута проверил обращения в клиентских скриптах: учитывались вызовы `getAttribute('data-*')`, обращения через `dataset.camelCase` и вспомогательные методы, которые извлекают значения из `dataset` по строковым ключам.
3. Атрибуты, для которых не найдено упоминаний в JavaScript, признаны неиспользуемыми и сведены в таблицу ниже (с проверками поиска `rg`).

## Обнаруженные атрибуты
| Атрибут | Где генерируется | Контекст использования в XSLT | Наблюдения |
| --- | --- | --- | --- |
| `data-e-feed-view-id` | `engine/core/modules/apps/transformers/components/feed.xslt` | Присваивается корневому контейнеру режима просмотра компонента `feed`, совпадает с `id` элемента. 【F:engine/core/modules/apps/transformers/components/feed.xslt†L56-L66】 | В JavaScript отсутствуют обращения к `dataset.eFeedViewId` или `getAttribute('data-e-feed-view-id')`. 【b3d32d†L1-L2】 |
| `data-e-tag-id` | `engine/core/modules/share/transformers/bootstrap/tagEditor.xslt` | Добавляется карточке редактора тегов вместе с `data-e-js`, `data-e-template` и `data-e-toolbar-component`. 【F:engine/core/modules/share/transformers/bootstrap/tagEditor.xslt†L20-L35】 | JS-код не использует `dataset.eTagId` и не ищет `data-e-tag-id`. 【670af0†L1-L2】 |
| `data-input` | `engine/core/modules/share/transformers/bootstrap/fields.xslt` | Сохраняет идентификатор скрытого `<input type="file">` для быстрых загрузок в элементах `quick-upload`. 【F:engine/core/modules/share/transformers/bootstrap/fields.xslt†L195-L256】 | Поиск по проекту не выявил использования `data-input` в JavaScript. 【8b1e2c†L1-L2】 |
| `data-pane-toolbar` | `engine/core/modules/share/transformers/bootstrap/form.xslt`, `list.xslt`, `file.xslt`, `divisionEditor.xslt`, `tagEditor.xslt` | Помечает шапку и подвал карточных панелей, чтобы отделить зоны верхнего/нижнего тулбаров. 【F:engine/core/modules/share/transformers/bootstrap/form.xslt†L15-L223】【F:engine/core/modules/share/transformers/bootstrap/list.xslt†L70-L104】【F:engine/core/modules/share/transformers/bootstrap/file.xslt†L35-L70】【F:engine/core/modules/share/transformers/bootstrap/divisionEditor.xslt†L28-L86】【F:engine/core/modules/share/transformers/bootstrap/tagEditor.xslt†L20-L35】 | JavaScript работает только с `data-pane-part` и не обращается к `data-pane-toolbar`. 【c85858†L1-L2】 |

## Дополнительные наблюдения
- Атрибуты `data-base`, `data-static`, `data-resizer`, `data-media`, `data-root`, `data-lang`, `data-single-mode` и `data-debug`, которые выставляются в `document.xslt`, активно считываются в `Energine.js` через список `allowedConfigKeys`; они не попали в таблицу, потому что реально используются. 【F:engine/core/modules/share/transformers/bootstrap/document.xslt†L162-L195】【F:engine/core/modules/share/scripts/Energine.js†L20-L92】【F:engine/core/modules/share/scripts/Energine.js†L270-L292】
- Динамические атрибуты вида `data-prop-*`, генерируемые тулбаром, также востребованы: метод `Toolbar.extractPropertiesFromDataset` специально разбирает ключи `prop*`. 【F:engine/core/modules/share/transformers/bootstrap/toolbar.xslt†L494-L504】【F:engine/core/modules/share/scripts/Toolbar.js†L156-L170】

