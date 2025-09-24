(function(global) {
    'use strict';

    const DEFAULT_LOCALE_KEY = 'energine';
    const DEFAULT_PLACEHOLDER = '—';

    function getTranslations() {
        if (global.Energine && global.Energine.translations) {
            return global.Energine.translations;
        }
        return null;
    }

    function translate(key, fallback) {
        const translations = getTranslations();
        if (translations) {
            if (typeof translations.get === 'function') {
                const value = translations.get(key);
                if (value !== undefined && value !== null && value !== '') {
                    return value;
                }
            } else if (translations[key] !== undefined && translations[key] !== null && translations[key] !== '') {
                return translations[key];
            }
        }
        return fallback;
    }

    function resolveTabulatorGlobal() {
        if (global.TabulatorFull) {
            return global.TabulatorFull;
        }
        if (global.Tabulator) {
            return global.Tabulator;
        }
        return null;
    }

    function resolveDisplayLocale() {
        if (global.Energine && global.Energine.lang) {
            return String(global.Energine.lang).replace('_', '-');
        }
        if (global.document && global.document.documentElement && global.document.documentElement.lang) {
            return global.document.documentElement.lang;
        }
        if (global.navigator && global.navigator.language) {
            return global.navigator.language;
        }
        return 'en-US';
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function normaliseBooleanValue(value) {
        if (value === true || value === 1) {
            return true;
        }
        if (typeof value === 'string') {
            const lowered = value.toLowerCase();
            return lowered === '1' || lowered === 'true' || lowered === 'y' || lowered === 'yes';
        }
        return false;
    }

    function normaliseTypeName(type) {
        return (type || '').toString().toLowerCase();
    }

    function isNumericType(type) {
        const name = normaliseTypeName(type);
        return ['int', 'integer', 'number', 'float', 'double', 'numeric', 'money', 'decimal'].includes(name);
    }

    function isDateType(type) {
        const name = normaliseTypeName(type);
        return ['date', 'datetime', 'time', 'timestamp'].includes(name);
    }

    function isBooleanType(type) {
        const name = normaliseTypeName(type);
        return ['boolean', 'checkbox', 'bool'].includes(name);
    }

    function isEmptyValue(value) {
        if (value === undefined || value === null) {
            return true;
        }
        if (typeof value === 'string') {
            return value.trim() === '';
        }
        if (Array.isArray(value)) {
            return value.length === 0;
        }
        if (typeof value === 'object') {
            return Object.keys(value).length === 0;
        }
        return false;
    }

    function normaliseFilterValue(fieldType, value) {
        if (value === undefined || value === null) {
            return null;
        }
        if (typeof value === 'string') {
            value = value.trim();
        }
        if (value === '') {
            return null;
        }
        if (isNumericType(fieldType)) {
            const numeric = (typeof value === 'number') ? value : parseFloat(String(value).replace(',', '.'));
            return Number.isNaN(numeric) ? null : numeric;
        }
        if (isDateType(fieldType)) {
            const timestamp = Date.parse(String(value));
            if (!Number.isNaN(timestamp)) {
                return timestamp;
            }
            return String(value).trim().toLowerCase();
        }
        if (isBooleanType(fieldType)) {
            return normaliseBooleanValue(value);
        }
        return String(value).trim().toLowerCase();
    }

    function valueToSearchableString(value) {
        if (value === undefined || value === null) {
            return '';
        }
        if (typeof value === 'object') {
            if (value.value !== undefined) {
                value = value.value;
            } else if (value.name !== undefined) {
                value = value.name;
            } else if (Array.isArray(value)) {
                value = value.join(' ');
            } else {
                value = Object.values(value).join(' ');
            }
        }
        return String(value).trim().toLowerCase();
    }

    function normaliseRowValue(fieldType, value) {
        if (value === undefined || value === null) {
            return null;
        }
        if (typeof value === 'object') {
            if (value.value !== undefined) {
                value = value.value;
            } else if (value.name !== undefined) {
                value = value.name;
            } else if (Array.isArray(value)) {
                value = value.join(' ');
            } else {
                value = Object.values(value).join(' ');
            }
        }
        if (typeof value === 'string') {
            value = value.trim();
        }
        if (value === '') {
            return '';
        }
        if (isNumericType(fieldType)) {
            if (typeof value === 'number') {
                return value;
            }
            const numeric = parseFloat(String(value).replace(',', '.'));
            return Number.isNaN(numeric) ? null : numeric;
        }
        if (isDateType(fieldType)) {
            if (value instanceof Date) {
                return value.getTime();
            }
            const timestamp = Date.parse(String(value));
            if (!Number.isNaN(timestamp)) {
                return timestamp;
            }
            return String(value).toLowerCase();
        }
        if (isBooleanType(fieldType)) {
            return normaliseBooleanValue(value);
        }
        return String(value).toLowerCase();
    }

    function compareValues(a, b, fieldType) {
        if (a === null || a === undefined || b === null || b === undefined) {
            return null;
        }
        if (isNumericType(fieldType) || isDateType(fieldType)) {
            return a - b;
        }
        if (typeof a === 'boolean' && typeof b === 'boolean') {
            if (a === b) {
                return 0;
            }
            return a ? 1 : -1;
        }
        const strA = String(a);
        const strB = String(b);
        if (strA === strB) {
            return 0;
        }
        return strA > strB ? 1 : -1;
    }

    /**
     * Адаптер, который повторяет интерфейс старого грида и проксирует его в Tabulator 6.3.
     * Сконструирован как лёгкий слой для GridManager: управляет колонками, данными и событиями.
     */
    class TabulatorGrid {
        constructor(element, options = {}) {
            this.element = (typeof element === 'string') ? global.document.querySelector(element) : element;
            if (!this.element) {
                throw new Error('TabulatorGrid: unable to locate container element.');
            }

            const TabulatorCtor = resolveTabulatorGlobal();
            if (!TabulatorCtor) {
                throw new Error('TabulatorGrid: Tabulator 6.3 is not loaded. Make sure tabulator.min.js is included before initialising the grid.');
            }

            this.options = Object.assign({
                layout: 'fitDataStretch',
                height: '100%',
                responsiveLayout: 'collapse',
                selectable: 1,
                selectableRollingSelection: false,
                selectableRows: 1,
                selectableRowsRollingSelection: false,
                placeholder: translate('MSG_GRID_EMPTY', 'Нет данных'),
                locale: DEFAULT_LOCALE_KEY,
                columnDefaults: {
                    resizable: true,
                    headerHozAlign: 'center',
                    vertAlign: 'middle',
                    tooltip: true,
                },
            }, options);

            const providedSelectable = options && Object.prototype.hasOwnProperty.call(options, 'selectable');
            const providedSelectableRows = options && Object.prototype.hasOwnProperty.call(options, 'selectableRows');

            if (providedSelectable && !providedSelectableRows) {
                this.options.selectableRows = options.selectable;
            }

            if (!providedSelectable && providedSelectableRows) {
                this.options.selectable = options.selectableRows;
            }

            const providedSelectableRolling = options
                && Object.prototype.hasOwnProperty.call(options, 'selectableRollingSelection');
            const providedSelectableRowsRolling = options
                && Object.prototype.hasOwnProperty.call(options, 'selectableRowsRollingSelection');

            if (providedSelectableRolling && !providedSelectableRowsRolling) {
                this.options.selectableRowsRollingSelection = options.selectableRollingSelection;
            }

            if (!providedSelectableRolling && providedSelectableRowsRolling) {
                this.options.selectableRollingSelection = options.selectableRowsRollingSelection;
            }

            this.events = {};
            this.metadata = {};
            this.columns = [];
            this.data = [];
            this.keyFieldName = null;
            this.sort = { field: null, order: null };
            this.selectedRow = null;
            this.activeFilter = null;
            this.pagination = {};
            this.suspendSortEvent = false;
            this.placeholderText = translate('GRID_PLACEHOLDER_EMPTY', DEFAULT_PLACEHOLDER);
            this.placeholderHTML = escapeHtml(this.placeholderText);
            this.displayLocale = resolveDisplayLocale();
            this.numberFormatters = new Map();
            this.dateFormatters = new Map();
            this.booleanLabels = {
                yes: translate('GRID_BOOLEAN_YES', 'Да'),
                no: translate('GRID_BOOLEAN_NO', 'Нет'),
            };
            this.overlayMessages = {
                loading: translate('MSG_LOADING', 'Загрузка...'),
                error: translate('MSG_LOADING_ERROR', 'Ошибка загрузки данных'),
            };

            const localisation = this.buildLocalisation();

            this.table = new TabulatorCtor(this.element, Object.assign({
                data: [],
                layout: this.options.layout,
                height: this.options.height,
                responsiveLayout: this.options.responsiveLayout,
                placeholder: this.options.placeholder,
                selectable: this.options.selectable,
                selectableRollingSelection: this.options.selectableRollingSelection,
                selectableRows: this.options.selectableRows,
                selectableRowsRollingSelection: this.options.selectableRowsRollingSelection,
                columnDefaults: this.options.columnDefaults,
                locale: localisation.locale,
                langs: localisation.langs,
                renderHorizontal: 'virtual',
                renderVertical: 'virtual',
            }, this.options.tableOptions || {}));

            this.registerEventBridges();
        }

        /**
         * Формирует объект локализаций Tabulator на базе Energine.translations.
         * Возвращает { locale, langs } для передачи в конфиг табулятора.
         */
        buildLocalisation() {
            const locale = this.options.locale || DEFAULT_LOCALE_KEY;
            const loading = translate('MSG_LOADING', 'Загрузка...');
            const error = translate('MSG_LOADING_ERROR', 'Ошибка загрузки данных');
            const first = translate('GRID_PAGER_FIRST', 'Первая страница');
            const firstTitle = translate('GRID_PAGER_FIRST_TITLE', 'В начало');
            const last = translate('GRID_PAGER_LAST', 'Последняя страница');
            const lastTitle = translate('GRID_PAGER_LAST_TITLE', 'В конец');
            const prev = translate('GRID_PAGER_PREV', 'Предыдущая страница');
            const prevTitle = translate('GRID_PAGER_PREV_TITLE', 'Назад');
            const next = translate('GRID_PAGER_NEXT', 'Следующая страница');
            const nextTitle = translate('GRID_PAGER_NEXT_TITLE', 'Вперёд');
            const pageSize = translate('GRID_PAGER_PAGE_SIZE', 'Строк на странице');
            const pageTitle = translate('GRID_PAGER_PAGE_TITLE', 'Страница {page} из {pages}');
            const filterPlaceholder = translate('GRID_FILTER_PLACEHOLDER', 'Фильтр...');

            return {
                locale,
                langs: {
                    [locale]: {
                        data: {
                            loading,
                            error,
                        },
                        pagination: {
                            first,
                            first_title: firstTitle,
                            last,
                            last_title: lastTitle,
                            prev,
                            prev_title: prevTitle,
                            next,
                            next_title: nextTitle,
                            page_size: pageSize,
                            page_title: pageTitle,
                        },
                        headerFilters: {
                            default: filterPlaceholder,
                        },
                    },
                },
            };
        }

        /**
         * Подписывает Tabulator-события и ретранслирует их наружу через fireEvent.
         */
        registerEventBridges() {
            this.table.on('tableBuilt', () => {
                this.fireEvent('ready', this);
            });

            this.table.on('rowClick', (e, row) => {
                if (!row) {
                    return;
                }

                try {
                    const tableOptions = (this.table && this.table.options) ? this.table.options : {};
                    const selectableSetting = (tableOptions.selectableRows !== undefined)
                        ? tableOptions.selectableRows
                        : tableOptions.selectable;
                    const selectionDisabled = selectableSetting === false || selectableSetting === 0;
                    const singleSelection = selectableSetting === 1 || selectableSetting === '1';

                    if (!selectionDisabled && typeof row.isSelected === 'function' && !row.isSelected()) {
                        if (singleSelection && this.table && typeof this.table.deselectRow === 'function') {
                            this.table.deselectRow();
                        }

                        if (typeof row.select === 'function') {
                            row.select();
                        }
                    }
                } catch (error) {
                    if (global.console && typeof global.console.warn === 'function') {
                        global.console.warn('TabulatorGrid: unable to select row on click', error);
                    }
                }

                this.fireEvent('rowClick', row.getData(), row);
            });

            this.table.on('rowSelected', (row) => {
                this.selectedRow = row;
                this.fireEvent('select', row.getData(), row);
            });

            this.table.on('rowDeselected', (row) => {
                if (this.selectedRow === row) {
                    this.selectedRow = null;
                }
                this.fireEvent('deselect', row.getData(), row);
            });

            this.table.on('rowSelectionChanged', (data, rows) => {
                this.selectedRow = (rows && rows.length) ? rows[0] : null;
                this.fireEvent('selectionChange', data, rows);
            });

            this.table.on('rowDblClick', (e, row) => {
                this.fireEvent('doubleClick', row.getData(), row);
            });

            this.table.on('sortChanged', (sorters) => {
                if (this.suspendSortEvent) {
                    return;
                }
                if (Array.isArray(sorters) && sorters.length) {
                    this.sort.field = sorters[0].field;
                    this.sort.order = sorters[0].dir;
                } else {
                    this.sort.field = null;
                    this.sort.order = null;
                }
                this.fireEvent('sortChange', sorters);
            });

            this.table.on('dataLoaded', (data) => {
                this.data = Array.isArray(data) ? data : [];
                this.fireEvent('dataLoaded', this.data);
            });

            this.table.on('dataChanged', (data) => {
                this.data = Array.isArray(data) ? data : [];
                this.fireEvent('dataChanged', this.data);
            });

            this.table.on('dataFiltered', (filters, rows) => {
                const filteredData = Array.isArray(rows)
                    ? rows.map((row) => (typeof row.getData === 'function' ? row.getData() : row))
                    : this.getActiveData();
                this.fireEvent('dataFiltered', filteredData, filters, rows);
            });
        }

        /**
         * Регистрирует обработчик пользовательского события адаптера.
         */
        on(event, handler) {
            if (!this.events[event]) {
                this.events[event] = [];
            }
            this.events[event].push(handler);
        }

        /**
         * Удаляет обработчик пользовательского события.
         */
        off(event, handler) {
            if (!this.events[event]) {
                return;
            }
            this.events[event] = this.events[event].filter((fn) => fn !== handler);
        }

        /**
         * Безопасный вызов пользовательских событий с обработкой ошибок.
         */
        fireEvent(event, ...args) {
            if (!this.events[event]) {
                return;
            }
            this.events[event].forEach((handler) => {
                try {
                    handler.apply(this, args);
                } catch (err) {
                    if (global.console && typeof global.console.error === 'function') {
                        global.console.error('TabulatorGrid event handler error:', err);
                    }
                }
            });
        }

        /**
         * Принимает metadata (как в старом Grid) и на лету конвертирует её в Tabulator columns.
         */
        setMetadata(metadata = {}) {
            this.metadata = metadata || {};
            this.keyFieldName = this.detectKeyField(metadata);
            this.columns = this.buildColumnsFromMetadata(metadata);

            if (this.keyFieldName) {
                if (typeof this.table.setIndex === 'function') {
                    this.table.setIndex(this.keyFieldName);
                } else {
                    this.table.options.index = this.keyFieldName;
                }
            }

            if (this.columns.length) {
                this.table.setColumns(this.columns);
            } else {
                this.table.setColumns([]);
            }
        }

        getMetadata() {
            return this.metadata;
        }

        /**
         * Определяет поле-ключ (meta[field].key === true) для привязки selection/updates.
         */
        detectKeyField(metadata) {
            const keys = Object.keys(metadata || {});
            for (let i = 0; i < keys.length; i += 1) {
                const fieldName = keys[i];
                if (metadata[fieldName] && metadata[fieldName].key) {
                    return fieldName;
                }
            }
            return null;
        }

        /**
         * Конструирует массив columns Tabulator, учитывая типы, форматтеры и выравнивание.
         */
        buildColumnsFromMetadata(metadata) {
            const columns = [];
            Object.keys(metadata || {}).forEach((fieldName) => {
                const fieldMeta = metadata[fieldName] || {};
                if (fieldMeta.visible === false) {
                    return;
                }

                const column = {
                    field: fieldName,
                    title: this.resolveTitle(fieldMeta.title || fieldName),
                    headerTooltip: fieldMeta.tooltip ? this.resolveTitle(fieldMeta.tooltip) : undefined,
                    visible: fieldMeta.visible !== false,
                    headerSort: fieldMeta.sort === 1 || fieldMeta.sort === true,
                    hozAlign: this.resolveAlignment(fieldMeta.align),
                    formatter: this.resolveFormatter(fieldName, fieldMeta),
                    formatterParams: this.resolveFormatterParams(fieldName, fieldMeta),
                    mutator: this.resolveMutator(fieldMeta),
                };

                const normalisedType = (fieldMeta.type || '').toLowerCase();
                if (!column.hozAlign && (normalisedType === 'boolean' || normalisedType === 'checkbox' || normalisedType === 'file' || normalisedType === 'image')) {
                    column.hozAlign = 'center';
                }
                if (!column.hozAlign && ['int', 'integer', 'number', 'float', 'numeric', 'double', 'money'].includes(normalisedType)) {
                    column.hozAlign = 'right';
                }

                if (fieldMeta.width) {
                    column.width = fieldMeta.width;
                }
                if (fieldMeta.minWidth) {
                    column.minWidth = fieldMeta.minWidth;
                }
                if (fieldMeta.maxWidth) {
                    column.maxWidth = fieldMeta.maxWidth;
                }
                if (fieldMeta.cssClass) {
                    column.cssClass = fieldMeta.cssClass;
                }

                columns.push(column);
            });
            return columns;
        }

        resolveTitle(title) {
            if (!title) {
                return '';
            }
            return translate(title, title);
        }

        resolveAlignment(align) {
            switch ((align || '').toLowerCase()) {
                case 'center':
                case 'middle':
                    return 'center';
                case 'right':
                    return 'right';
                default:
                    return undefined;
            }
        }

        /**
         * Подбирает formatter Tabulator в зависимости от meta.type.
         */
        resolveFormatter(fieldName, fieldMeta) {
            const type = (fieldMeta.type || '').toLowerCase();
            switch (type) {
                case 'boolean':
                case 'checkbox':
                    return this.booleanFormatter.bind(this, fieldMeta);
                case 'file':
                    return this.fileFormatter.bind(this, fieldMeta);
                case 'image':
                    return this.imageFormatter.bind(this, fieldMeta);
                case 'value':
                    return this.valueFormatter.bind(this, fieldName);
                case 'textbox':
                    return this.textboxFormatter.bind(this, fieldName);
                case 'html':
                case 'htmlblock':
                    return 'html';
                default: {
                    if (isNumericType(type)) {
                        return this.numberFormatter.bind(this, fieldMeta);
                    }
                    if (isDateType(type) || type === 'time') {
                        return this.dateFormatter.bind(this, fieldMeta);
                    }
                    return this.defaultFormatter.bind(this);
                }
            }
        }

        /**
         * Формирует formatterParams для специальных типов (boolean, image).
         */
        resolveFormatterParams(fieldName, fieldMeta) {
            const type = (fieldMeta.type || '').toLowerCase();
            if (type === 'boolean' || type === 'checkbox') {
                return {
                    allowEmpty: true,
                    tristate: true,
                };
            }
            if (type === 'file' || type === 'image') {
                return {
                    height: 40,
                    width: 40,
                };
            }
            return undefined;
        }

        /**
         * Добавляет mutator для boolean-полей, чтобы tickCross понимал "1"/"true"/"Y".
         */
        resolveMutator(fieldMeta) {
            const type = (fieldMeta.type || '').toLowerCase();
            if (type === 'boolean' || type === 'checkbox') {
                return normaliseBooleanValue;
            }
            return undefined;
        }

        logUnexpected(context, payload) {
            const errorCandidate = (payload && payload.err instanceof Error)
                ? payload.err
                : (payload instanceof Error ? payload : null);
            if (typeof global.safeConsoleError === 'function') {
                global.safeConsoleError(errorCandidate || new Error(context), `TabulatorGrid:${context}`);
            } else if (global.console && typeof global.console.warn === 'function') {
                global.console.warn(`TabulatorGrid unexpected state: ${context}`, payload);
            }
            if (payload && global.console && typeof global.console.debug === 'function' && payload !== errorCandidate) {
                global.console.debug('TabulatorGrid payload:', payload);
            }
        }

        resolveMediaURL(path) {
            if (!path) {
                return '';
            }
            if (/^(?:[a-z]+:)?\/\//i.test(path) || path.startsWith('/')) {
                return path;
            }
            if (global.Energine) {
                if (global.Energine.media) {
                    const base = global.Energine.media.endsWith('/') ? global.Energine.media : `${global.Energine.media}/`;
                    return `${base}${path.replace(/^\//, '')}`;
                }
                if (typeof global.Energine._resolveAssetURL === 'function') {
                    return global.Energine._resolveAssetURL(path);
                }
            }
            return path;
        }

        extractFileName(path) {
            if (!path) {
                return '';
            }
            return String(path).split(/[\\/]/).pop();
        }

        /**
         * Универсальный formatter, приводящий null/undefined к пустой строке.
         */
        defaultFormatter(cell) {
            const value = cell.getValue();
            if (value === undefined || value === null || value === '') {
                return this.placeholderHTML;
            }
            if (typeof value === 'object') {
                try {
                    return escapeHtml(JSON.stringify(value));
                } catch (err) {
                    return this.placeholderHTML;
                }
            }
            return escapeHtml(value);
        }

        /**
         * Formatter для числовых типов с учётом локали.
         */
        numberFormatter(fieldMeta, cell) {
            const rawValue = cell.getValue();
            if (rawValue === undefined || rawValue === null || rawValue === '') {
                return this.placeholderHTML;
            }

            let numericValue = typeof rawValue === 'number'
                ? rawValue
                : parseFloat(String(rawValue).replace(',', '.'));
            if (Number.isNaN(numericValue)) {
                numericValue = parseFloat(String(rawValue).replace(/\s+/g, '').replace(',', '.'));
            }
            if (Number.isNaN(numericValue)) {
                return escapeHtml(rawValue);
            }

            const type = (fieldMeta.type || '').toLowerCase();
            const formatterKey = `${type}-${fieldMeta.precision || ''}-${fieldMeta.scale || ''}`;
            if (!this.numberFormatters.has(formatterKey)) {
                const options = {};
                if (type === 'money' || type === 'currency') {
                    const fractionDigits = (typeof fieldMeta.scale === 'number') ? fieldMeta.scale : 2;
                    options.minimumFractionDigits = fractionDigits;
                    options.maximumFractionDigits = fractionDigits;
                } else if (type === 'int' || type === 'integer') {
                    options.maximumFractionDigits = 0;
                    options.minimumFractionDigits = 0;
                } else {
                    const fractionDigits = (typeof fieldMeta.scale === 'number') ? fieldMeta.scale : 2;
                    options.minimumFractionDigits = 0;
                    options.maximumFractionDigits = Math.max(fractionDigits, 2);
                }
                try {
                    this.numberFormatters.set(formatterKey, new Intl.NumberFormat(this.displayLocale, options));
                } catch (err) {
                    this.numberFormatters.set(formatterKey, null);
                    this.logUnexpected('number-format-init', { err, fieldMeta });
                }
            }

            const formatter = this.numberFormatters.get(formatterKey);
            if (!formatter) {
                return escapeHtml(numericValue);
            }
            try {
                return escapeHtml(formatter.format(numericValue));
            } catch (err) {
                this.logUnexpected('number-format', { err, rawValue, fieldMeta });
                return escapeHtml(numericValue);
            }
        }

        /**
         * Formatter для дат/времени.
         */
        dateFormatter(fieldMeta, cell) {
            const rawValue = cell.getValue();
            if (rawValue === undefined || rawValue === null || rawValue === '') {
                return this.placeholderHTML;
            }

            let dateObj = null;
            if (rawValue instanceof Date) {
                dateObj = rawValue;
            } else if (typeof rawValue === 'number') {
                dateObj = new Date(rawValue);
            } else if (typeof rawValue === 'string') {
                const trimmed = rawValue.trim();
                if (/^\d+$/.test(trimmed)) {
                    const timestamp = parseInt(trimmed, 10);
                    if (!Number.isNaN(timestamp)) {
                        dateObj = new Date(timestamp * (trimmed.length === 10 ? 1000 : 1));
                    }
                }
                if (!dateObj) {
                    const normalised = trimmed.replace(' ', 'T');
                    const parsed = Date.parse(normalised);
                    if (!Number.isNaN(parsed)) {
                        dateObj = new Date(parsed);
                    }
                }
            }

            if (!dateObj || Number.isNaN(dateObj.getTime())) {
                if ((fieldMeta.type || '').toLowerCase() === 'time') {
                    return escapeHtml(rawValue);
                }
                this.logUnexpected('date-parse', { rawValue, fieldMeta });
                return escapeHtml(rawValue);
            }

            const type = (fieldMeta.type || '').toLowerCase();
            let formatterKey = `date-${type}`;
            if (!this.dateFormatters.has(formatterKey)) {
                let options;
                switch (type) {
                    case 'time':
                        options = { timeStyle: 'medium' };
                        break;
                    case 'datetime':
                    case 'timestamp':
                        options = { dateStyle: 'medium', timeStyle: 'short' };
                        break;
                    default:
                        options = { dateStyle: 'medium' };
                }
                try {
                    this.dateFormatters.set(formatterKey, new Intl.DateTimeFormat(this.displayLocale, options));
                } catch (err) {
                    this.dateFormatters.set(formatterKey, null);
                    this.logUnexpected('date-format-init', { err, fieldMeta });
                }
            }

            const formatter = this.dateFormatters.get(formatterKey);
            if (!formatter) {
                return escapeHtml(dateObj.toISOString());
            }
            try {
                return escapeHtml(formatter.format(dateObj));
            } catch (err) {
                this.logUnexpected('date-format', { err, rawValue, fieldMeta });
                return escapeHtml(dateObj.toISOString());
            }
        }

        /**
         * Formatter для boolean-типов с иконками и подсказкой.
         */
        booleanFormatter(fieldMeta, cell) {
            const rawValue = cell.getValue();
            if (rawValue === undefined || rawValue === null || rawValue === '') {
                return `<span class="text-muted">${this.placeholderHTML}</span>`;
            }

            const value = normaliseBooleanValue(rawValue);
            const title = value ? this.booleanLabels.yes : this.booleanLabels.no;
            const icon = value
                ? '<span class="badge bg-success" aria-hidden="true">✓</span>'
                : '<span class="badge bg-danger" aria-hidden="true">✕</span>';
            return `<span class="d-inline-flex align-items-center gap-2" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">${icon}</span>`;
        }

        /**
         * Formatter для meta.type === 'value': поддерживает объекты { value }.
         */
        valueFormatter(fieldName, cell) {
            const value = cell.getData()[fieldName];
            if (value === undefined || value === null || value === '') {
                return this.placeholderHTML;
            }
            if (typeof value === 'object' && value.value !== undefined) {
                return escapeHtml(value.value);
            }
            return escapeHtml(value);
        }

        /**
         * Formatter для meta.type === 'textbox': собирает словарь значений в строку.
         */
        textboxFormatter(fieldName, cell) {
            const value = cell.getData()[fieldName];
            if (value === undefined || value === null || value === '') {
                return this.placeholderHTML;
            }
            if (typeof value === 'object') {
                return escapeHtml(Object.values(value).join(', '));
            }
            return escapeHtml(value);
        }

        /**
         * Formatter для файлов: строит ссылку.
         */
        fileFormatter(fieldMeta, cell) {
            const value = cell.getValue();
            if (value === undefined || value === null || value === '') {
                return this.placeholderHTML;
            }

            let url = '';
            let title = '';

            if (typeof value === 'object') {
                url = value.url || value.href || value.path || value.value || '';
                title = value.name || value.title || url;
            } else {
                url = String(value);
                title = url;
            }

            if (!url) {
                return this.placeholderHTML;
            }

            const resolvedUrl = this.resolveMediaURL(url);
            const label = escapeHtml(this.extractFileName(title || url));
            return `<a href="${escapeHtml(resolvedUrl)}" target="_blank" rel="noopener" class="text-decoration-none">📎 ${label}</a>`;
        }

        /**
         * Formatter для изображений: строит превью через Energine.resizer (w40-h40).
         */
        imageFormatter(fieldMeta, cell) {
            const value = cell.getValue();
            if (value === undefined || value === null || value === '') {
                return this.placeholderHTML;
            }
            const resizerBase = (global.Energine && global.Energine.resizer) ? global.Energine.resizer : '';
            const url = `${resizerBase}w40-h40/${value}`;
            const alt = fieldMeta && fieldMeta.title ? this.resolveTitle(fieldMeta.title) : '';
            return `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" width="40" height="40" class="img-thumbnail rounded" />`;
        }

        /**
         * Присваивает новую выборку данных и делегирует Tabulator.setData.
         */
        setData(data = []) {
            this.data = Array.isArray(data) ? data : [];
            if (!this.table) {
                return Promise.resolve(this.data);
            }

            this.suspendSortEvent = true;
            let result;
            try {
                result = this.table.setData(this.data);
            } catch (err) {
                this.suspendSortEvent = false;
                throw err;
            }

            const finalize = () => {
                this.suspendSortEvent = false;
            };

            return Promise.resolve(result)
                .then((resolved) => {
                    finalize();
                    return resolved;
                }, (error) => {
                    finalize();
                    throw error;
                });
        }

        /**
         * Очищает таблицу и снимает выделение.
         */
        clear() {
            this.data = [];
            this.selectedRow = null;
            if (!this.table) {
                return Promise.resolve();
            }

            this.suspendSortEvent = true;
            let result;
            try {
                if (typeof this.table.deselectRow === 'function') {
                    this.table.deselectRow();
                }
                result = this.table.clearData();
            } catch (err) {
                this.suspendSortEvent = false;
                throw err;
            }

            const finalize = () => {
                this.suspendSortEvent = false;
            };

            return Promise.resolve(result)
                .then((resolved) => {
                    finalize();
                    return resolved;
                }, (error) => {
                    finalize();
                    throw error;
                });
        }

        /**
         * Перестраивает таблицу и пересчитывает ширины колонок (актуально при показе в скрытом табе).
         */
        redraw(force = false) {
            if (!this.table || typeof this.table.redraw !== 'function') {
                return false;
            }
            try {
                this.table.redraw(force);
                return true;
            } catch (err) {
                this.logUnexpected('redraw', { err });
                return false;
            }
        }

        /**
         * Возвращает текущий набор данных с учётом фильтров и сортировки.
         */
        getActiveData() {
            if (this.table && typeof this.table.getData === 'function') {
                try {
                    return this.table.getData();
                } catch (err) {
                    // ignore and fallback
                }
            }
            return Array.isArray(this.data) ? this.data.slice() : [];
        }

        /**
         * Сообщает, содержит ли таблица строки.
         */
        isEmpty() {
            return !this.data || this.data.length === 0;
        }

        /**
         * Возвращает выбранную запись (single select).
         */
        getSelectedRecord() {
            if (!this.table) {
                return null;
            }
            const selected = this.table.getSelectedData();
            return (selected && selected.length) ? selected[0] : null;
        }

        /**
         * Возвращает значение ключевого поля выбранной записи.
         */
        getSelectedRecordKey() {
            const record = this.getSelectedRecord();
            if (!record || !this.keyFieldName) {
                return null;
            }
            return record[this.keyFieldName];
        }

        /**
         * Выделяет строку по ключу (используется тулбаром).
         */
        selectRecordById(recordId) {
            if (!this.table || !this.keyFieldName || recordId === undefined || recordId === null) {
                return Promise.resolve(false);
            }
            this.table.deselectRow();
            return this.table.selectRow(recordId, true);
        }

        /**
         * Обновляет существующую запись (или добавляет новую).
         */
        updateRecord(record) {
            if (!record || !this.table) {
                return Promise.resolve(false);
            }
            const key = this.keyFieldName ? record[this.keyFieldName] : null;
            if (key === undefined || key === null) {
                return this.table.updateData([record]);
            }
            return this.table.updateOrAddData([record]);
        }

        /**
         * Удаляет строку из таблицы по записи или ключу.
         */
        deleteRecord(recordOrKey) {
            if (!this.table) {
                return Promise.resolve(false);
            }
            const key = (typeof recordOrKey === 'object')
                ? recordOrKey[this.keyFieldName]
                : recordOrKey;
            if (key === undefined || key === null) {
                return Promise.resolve(false);
            }
            return this.table.deleteRow(key);
        }

        /**
         * Снимает выделение.
         */
        deselect() {
            if (this.table) {
                this.table.deselectRow();
            }
            this.selectedRow = null;
            return Promise.resolve();
        }

        /**
         * Применяет клиентский фильтр через Tabulator.setFilter.
         */
        applyFilter(descriptor) {
            if (!this.table) {
                return Promise.resolve(this.getActiveData());
            }
            this.table.clearFilter(true);

            if (!descriptor) {
                this.activeFilter = null;
                this.fireEvent('filterCleared');
                return Promise.resolve(this.getActiveData());
            }

            const predicate = this.createFilterPredicate(descriptor);
            if (!predicate) {
                this.activeFilter = null;
                this.table.clearFilter(true);
                this.fireEvent('filterCleared');
                return Promise.resolve(this.getActiveData());
            }

            this.activeFilter = descriptor;
            this.table.setFilter((data, row) => {
                try {
                    return predicate(data, row);
                } catch (err) {
                    if (global.console && typeof global.console.error === 'function') {
                        global.console.error('TabulatorGrid filter predicate error:', err);
                    }
                    return true;
                }
            });
            this.fireEvent('filterApplied', descriptor);
            return Promise.resolve(this.getActiveData());
        }

        /**
         * Сбрасывает клиентский фильтр.
         */
        clearFilter() {
            if (this.table) {
                this.table.clearFilter(true);
            }
            this.activeFilter = null;
            this.fireEvent('filterCleared');
            return Promise.resolve(this.getActiveData());
        }

        /**
         * Возвращает активный фильтр.
         */
        getActiveFilter() {
            return this.activeFilter;
        }

        /**
         * Создаёт предикат для Tabulator.setFilter.
         */
        createFilterPredicate(descriptor) {
            if (!descriptor || !descriptor.field) {
                return null;
            }
            const field = descriptor.field;
            const fieldType = descriptor.fieldType;
            const condition = (descriptor.condition || '').toLowerCase();
            const rawValues = Array.isArray(descriptor.values) ? descriptor.values : [];
            const preparedValues = rawValues
                .map((value) => normaliseFilterValue(fieldType, value))
                .filter((value) => value !== null && value !== undefined && value !== '');
            const conditionWithoutValue = ['empty', 'isnull', 'null', 'notempty', 'notnull'];
            if (!preparedValues.length && !conditionWithoutValue.includes(condition)) {
                return null;
            }

            return (rowData) => {
                const comparableValue = normaliseRowValue(fieldType, rowData[field]);
                const searchableValue = valueToSearchableString(rowData[field]);
                switch (condition) {
                    case 'between': {
                        const min = preparedValues[0];
                        const max = preparedValues[1];
                        if (comparableValue === null || comparableValue === undefined || comparableValue === '') {
                            return false;
                        }
                        if (min !== undefined && min !== null) {
                            const cmpMin = compareValues(comparableValue, min, fieldType);
                            if (cmpMin === null || cmpMin < 0) {
                                return false;
                            }
                        }
                        if (max !== undefined && max !== null) {
                            const cmpMax = compareValues(comparableValue, max, fieldType);
                            if (cmpMax === null || cmpMax > 0) {
                                return false;
                            }
                        }
                        return true;
                    }
                    case 'greater':
                    case '>':
                    case 'gt': {
                        const cmp = compareValues(comparableValue, preparedValues[0], fieldType);
                        return cmp !== null && cmp > 0;
                    }
                    case 'greaterorequal':
                    case '>=':
                    case 'gte': {
                        const cmp = compareValues(comparableValue, preparedValues[0], fieldType);
                        return cmp !== null && cmp >= 0;
                    }
                    case 'less':
                    case '<':
                    case 'lt': {
                        const cmp = compareValues(comparableValue, preparedValues[0], fieldType);
                        return cmp !== null && cmp < 0;
                    }
                    case 'lessorequal':
                    case '<=':
                    case 'lte': {
                        const cmp = compareValues(comparableValue, preparedValues[0], fieldType);
                        return cmp !== null && cmp <= 0;
                    }
                    case 'notequal':
                    case '!=':
                    case 'neq': {
                        const cmp = compareValues(comparableValue, preparedValues[0], fieldType);
                        if (cmp === null) {
                            return String(comparableValue) !== String(preparedValues[0]);
                        }
                        return cmp !== 0;
                    }
                    case 'equal':
                    case '=':
                    case 'eq': {
                        const cmp = compareValues(comparableValue, preparedValues[0], fieldType);
                        if (cmp === null) {
                            return String(comparableValue) === String(preparedValues[0]);
                        }
                        return cmp === 0;
                    }
                    case 'like':
                    case 'contains':
                    case 'substring': {
                        if (!searchableValue) {
                            return false;
                        }
                        return searchableValue.includes(String(preparedValues[0]));
                    }
                    case 'notlike':
                    case 'not contains':
                    case 'notcontains': {
                        if (!searchableValue) {
                            return true;
                        }
                        return !searchableValue.includes(String(preparedValues[0]));
                    }
                    case 'begins':
                    case 'startswith':
                    case 'starts': {
                        if (!searchableValue) {
                            return false;
                        }
                        return searchableValue.startsWith(String(preparedValues[0]));
                    }
                    case 'ends':
                    case 'endswith': {
                        if (!searchableValue) {
                            return false;
                        }
                        return searchableValue.endsWith(String(preparedValues[0]));
                    }
                    case 'in': {
                        if (comparableValue === null || comparableValue === undefined || comparableValue === '') {
                            return false;
                        }
                        return preparedValues.some((value) => {
                            const cmp = compareValues(comparableValue, value, fieldType);
                            if (cmp === null) {
                                return String(comparableValue) === String(value);
                            }
                            return cmp === 0;
                        });
                    }
                    case 'notin':
                    case 'not in': {
                        if (comparableValue === null || comparableValue === undefined || comparableValue === '') {
                            return true;
                        }
                        return !preparedValues.some((value) => {
                            const cmp = compareValues(comparableValue, value, fieldType);
                            if (cmp === null) {
                                return String(comparableValue) === String(value);
                            }
                            return cmp === 0;
                        });
                    }
                    case 'empty':
                    case 'isnull':
                    case 'null':
                        return isEmptyValue(rowData[field]);
                    case 'notempty':
                    case 'notnull':
                        return !isEmptyValue(rowData[field]);
                    default: {
                        if (!preparedValues.length) {
                            return true;
                        }
                        if (comparableValue === null || comparableValue === undefined) {
                            return false;
                        }
                        const cmp = compareValues(comparableValue, preparedValues[0], fieldType);
                        if (cmp === null) {
                            return String(comparableValue) === String(preparedValues[0]);
                        }
                        return cmp === 0;
                    }
                }
            };
        }

        /**
         * Сохраняет информацию о пагинации для синхронизации с GridManager.
         */
        setPager(pager = {}) {
            this.pagination = pager || {};
            this.fireEvent('pagerUpdate', this.pagination);
            return this.pagination;
        }

        /**
         * Показывает overlay с кастомной разметкой.
         */
        showOverlay(message, variant = 'info') {
            if (!this.table || typeof this.table.showOverlay !== 'function') {
                return;
            }
            const content = this.buildOverlayMarkup(message, variant);
            this.table.showOverlay(content);
        }

        showLoadingOverlay(message) {
            this.showOverlay(message || this.overlayMessages.loading, 'loading');
        }

        showErrorOverlay(message) {
            this.showOverlay(message || this.overlayMessages.error, 'error');
        }

        clearOverlay() {
            if (this.table && typeof this.table.clearOverlay === 'function') {
                this.table.clearOverlay();
            }
        }

        buildOverlayMarkup(message, variant) {
            const text = escapeHtml(message || '');
            switch (variant) {
                case 'loading':
                    return `
                        <div class="py-4 d-flex flex-column gap-3 align-items-center text-muted">
                            <div class="spinner-border text-primary" role="status" aria-hidden="true"></div>
                            <div>${text}</div>
                        </div>
                    `;
                case 'error':
                    return `
                        <div class="py-4 d-flex flex-column gap-2 align-items-center text-danger">
                            <div class="display-6" aria-hidden="true">⚠️</div>
                            <div class="fw-semibold text-center">${text}</div>
                        </div>
                    `;
                default:
                    return `
                        <div class="py-4 text-center text-muted">${text}</div>
                    `;
            }
        }

        getPager() {
            return this.pagination || {};
        }

        /**
         * Полностью уничтожает экземпляр Tabulator.
         */
        destroy() {
            if (this.table && typeof this.table.destroy === 'function') {
                this.table.destroy();
            }
            this.events = {};
            this.metadata = {};
            this.columns = [];
            this.data = [];
            this.keyFieldName = null;
            this.selectedRow = null;
        }

        /**
         * Возвращает доступ к оригинальному Tabulator (для расширений).
         */
        getTabulator() {
            return this.table;
        }
    }

    global.TabulatorGrid = TabulatorGrid;
})(typeof window !== 'undefined' ? window : this);
