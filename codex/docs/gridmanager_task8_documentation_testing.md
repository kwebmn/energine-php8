# GridManager → Tabulator: Документация и тестирование (Task 8)

## 1. API `TabulatorGrid`

### 1.1 Основные методы
| Метод | Аргументы | Назначение | Возвращает |
|-------|-----------|------------|------------|
| `constructor(element, options)` | `HTMLElement`, опции Tabulator + адаптера | Создаёт Tabulator c Bootstrap 5 темой, настраивает события и локализацию | `TabulatorGrid` |
| `setMetadata(meta)` | `Object` (`meta.columns`, `meta.keyFieldName`, `meta.sorting`) | Конвертация серверных метаданных в Tabulator-колонки, установка ключа (`table.setIndex`) и сортировки | `Promise<void>` |
| `getMetadata()` | — | Возвращает последнее применённое описание колонок | `Object` |
| `setData(rows, options)` | `Array`, `{append:boolean}` | Загружает строки в таблицу (`table.setData` или `table.updateData`) | `Promise<Array>` |
| `clear()` | — | Очищает таблицу (`table.clearData`) и сбрасывает выбор | `Promise<void>` |
| `isEmpty()` | — | Проверяет наличие строк (`table.getDataCount() === 0`) | `Boolean` |
| `getSelectedRecord()` | — | Возвращает данные выделенной строки | `Object|null` |
| `getSelectedRecordKey()` | — | Возвращает ключ выбранной строки из `meta.keyFieldName` | `String\|Number\|null` |
| `selectRecordById(id)` | `String\|Number` | Выделяет строку по ключу (`table.selectRow`) | `Promise<void>` |
| `updateRecord(record)` | `Object` | Обновляет или добавляет запись (`table.updateOrAddData`) | `Promise<Array>` |
| `deleteRecord(recordOrKey)` | `Object\|String\|Number` | Удаляет строку (`table.deleteRow`) | `Promise<void>` |
| `deselect()` | — | Снимает выделение (`table.deselectRow`) | `Promise<void>` |
| `destroy()` | — | Уничтожает Tabulator и слушатели | `void` |
| `getTabulator()` | — | Возвращает оригинальный экземпляр Tabulator для расширений | `Tabulator` |

### 1.2 События адаптера
| Событие `TabulatorGrid` | Источник Tabulator | Когда вызывается | Что передаётся |
|-------------------------|--------------------|------------------|-----------------|
| `ready` | `tableBuilt` | После первой инициализации | `(tabulatorInstance)` |
| `dataLoaded` | `dataLoaded` | Когда данные загружены из `setData` | `(rows)` |
| `dataChanged` | `dataChanged` | При любом обновлении набора данных | `(rows)` |
| `selectionChange` | `rowSelectionChanged` | При изменении выделения | `(selectedRows)` |
| `select` | `rowSelected` | Когда строка выделена | `(rowComponent)` |
| `deselect` | `rowDeselected` | Когда строка снята | `(rowComponent)` |
| `doubleClick` | `rowDblClick` | Двойной клик по строке | `(event, row)` |
| `sortChange` | `sortChanged` | Пользователь изменил сортировку | `(sorters)` |
| `error` | `dataLoadError`, `ajaxError` и кастомные проверки | Ошибки Tabulator или адаптера | `(error)` |

### 1.3 Дополнительные хелперы
- `normaliseRow(row, meta)` – приводит булевы/даты/числа к ожидаемым типам для форматтеров.
- `buildColumns(meta)` – маппинг `meta.columns` → `Tabulator` (см. таблицу ниже).
- `localise(localeCode)` – применяет словарь переводов из `Energine.translations`.
- `setOverlay(state, message)` – переключает состояния `loading`/`error`/`empty`.

## 2. Соответствие `meta` ↔ `columns`
| Поле meta | Использование в адаптере | Настройка Tabulator | Примечания |
|-----------|-------------------------|---------------------|-----------|
| `keyFieldName` | Сохраняется для выборки/CRUD | `table.setIndex(keyFieldName)` | Обязательное поле |
| `columns[].name` | Системное имя колонки | `field` | Используется для доступа к данным |
| `columns[].title` | Заголовок, переводится | `title` | Фоллбэк: исходный текст |
| `columns[].visible` | Флаг отображения | `visible: true/false` | Скрытые остаются в данных |
| `columns[].sortable` | Управление сортировкой | `headerSort` | Для server-side сортировки перехватывается событие `sortChange` |
| `columns[].type` | Определяет formatter | `formatter`, `mutator` | Поддерживаются `boolean`, `checkbox`, `image`, `file`, `date`, `datetime`, `html`, `value`, `textbox`, `number`, по умолчанию — текст |
| `columns[].align` | Выравнивание | `hozAlign` | `right` для чисел, `center` для булевых/иконок |
| `columns[].width` | Фиксированная ширина | `width` | Значения в px |
| `columns[].cssClass` | Класс для ячейки | `cssClass`/`formatterParams` | Добавляется к `cell.getElement()` |
| `columns[].hint` | Тултип | `headerTooltip` | Можно отображать всплывающую подсказку |
| `columns[].placeholder` | Текст по умолчанию | `formatterParams.placeholder` | Показывается, если значение пустое |

## 3. Расширение тулбара
1. **Добавить кнопку в XSLT** (`list.xslt`):
   - Создать `<button data-role="grid-action" data-action="export" class="btn btn-sm btn-outline-secondary">…</button>`.
   - Привязать иконку Bootstrap или кастомный SVG.
2. **Зарегистрировать действие в `GridManager`**:
   - В методе `attachToolbar` добавить обработчик: `this.toolbar.on('export', this.handleExport.bind(this));`.
   - Реализовать `handleExport()` с доступом к `this.grid.getSelectedRecord()` или `this.grid.getTabulator().download(...)`.
3. **Управлять состоянием**:
   - Использовать `this.toggleToolbarAction('export', enabled);` в `handleSelectionChange` или `handleDataLoad`.
4. **Документировать**:
   - Описать новое действие в README/wiki (назначение, требования к правам).

## 4. Расширение фильтра
1. **HTML**: оставить `data-role="grid-filter"` и элементы `<input>`/`<select>`; при необходимости добавить `data-client-filter` для локальных фильтров.
2. **JS**:
   - Для серверной фильтрации — формировать query string (`Filter.buildFilterParams()`), передавать в `GridManager.reload({ params })`.
   - Для клиентской — вызвать `this.grid.getTabulator().setFilter(filtersArray)` без запроса к серверу.
3. **Сброс**:
   - Вызывать `Filter.reset()` и `this.grid.clear()`; при локальном режиме дополнительно `table.clearFilter()`.
4. **Расширение логики**:
   - Добавить поддержку новых типов (например, `daterange`) через кастомные парсеры, которые возвращают массив фильтров `[{ field, type, value }]`.
5. **Документация**:
   - Внести изменения в `codex/docs/gridmanager_task2_markup.md`, указав соответствие `data-role` и используемых атрибутов.

## 5. Чек-лист ручного тестирования
| Сценарий | Шаги | Ожидаемый результат |
|----------|------|---------------------|
| **Загрузка данных** | Открыть страницу с гридом → дождаться загрузки | Таблица Tabulator отображается, тулбар активен, overlay скрыт |
| **Сортировка (клиент)** | Клик по заголовку со включённым `headerSort` | Стрелка сортировки меняет направление, порядок строк обновляется без запроса |
| **Сортировка (сервер)** | Включить `remoteSort` → клик по заголовку | Выполняется `GridManager.loadPage({ sort })`, Tabulator показывает индикатор загрузки |
| **Фильтрация (сервер)** | Заполнить поля фильтра → `Применить` | Отправляется запрос с query string, таблица перезагружается, счётчик страниц обновлён |
| **Фильтрация (клиент)** | Заполнить поле с `data-client-filter` | `setFilter` Tabulator применяет фильтр моментально, пагинация отражает количество строк |
| **Пагинация** | Использовать `PageList` (следующая/предыдущая) | Таблица меняет страницу, кнопки `prev/next` корректно включены/выключены |
| **Выбор строк** | Клик по строке | Строка подсвечена, тулбар (просмотр/редактировать/удалить) активируется |
| **CRUD** | Нажать `Добавить`/`Редактировать`/`Удалить` | Выполняются соответствующие действия, таблица обновляется через `updateRecord`/`deleteRecord` |
| **Двойной клик** | Двойной клик по строке | Срабатывает `GridManager.view()` (или другая привязка), открывается форма |
| **Ошибки HTTP** | Смоделировать ответ 500/JSON с `error` | Показывается уведомление `Energine.showMessage('error', ...)`, Tabulator отображает overlay ошибки |
| **Пустые данные** | Вернуть пустой `data` | Показать placeholder `Нет данных`, тулбар отключён, пагинация скрыта |

## 6. Автоматические тесты
1. **Юнит-тесты конвертера `meta → columns`** (можно на Jest + `@jest-environment jsdom`):
   - `buildColumns` корректно выставляет `field`, `title`, `formatter` для разных типов (`boolean`, `file`, `number`).
   - Скрытые колонки присутствуют в данных, но не в результатах `table.getColumns()`.
   - `keyFieldName` передаётся в `setIndex` и используется `getSelectedRecordKey()`.
2. **Юнит-тесты форматтеров**:
   - Проверка форматтера файлов: генерирует ссылку/изображение с корректным URL.
   - Проверка placeholder: при `null` возвращается локализованная заглушка.
3. **Интеграционный тест (опционально)**:
   - С помощью `vitest` + `happy-dom` поднять Tabulator, передать тестовый HAR-ответ, убедиться в корректном количестве строк и работе сортировки клиента.
4. **Линтеры**:
   - Убедиться, что `eslint`/`prettier` (если подключены) проходят для новых файлов.

## 7. Known Issues и дальнейшие шаги
- **Легаси-зависимости**: часть модулей всё ещё ожидает старый `Grid` — требуется поэтапно переподключить.
- **Стилизация**: тема Bootstrap 5 может конфликтовать с кастомными стилями проекта; нужна ревизия классов `table`, `btn` и `card`.
- **Server-side сортировка/фильтрация**: необходимо синхронизировать параметры Tabulator и `GridManager.buildRequestURL()`.
- **Адаптация модальных окон**: действия CRUD могут полагаться на `grid.getSelectedRowElement()` — придётся заменить на Tabulator API.
- **Доступность (a11y)**: проверить фокус и управление с клавиатуры в новой таблице.
- **Персистентность настроек**: опционально реализовать `tabulator-persistence` для сохранения ширины колонок и фильтров.
- **Экспорт/импорт**: в будущем подключить Tabulator `download()`/`clipboard` для CSV/XLSX.

---
Эта документация закрывает задачи по описанию API, расширению тулбара/фильтра, определяет тестовый чек-лист и фиксирует известные ограничения для дальнейшей миграции на Tabulator.
