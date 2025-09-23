ScriptLoader.load('TabPane', 'PageList', 'Toolbar', 'ModalBox', 'tabulator/tabulator.min');

class Grid {
    /**
     * @param {HTMLElement|string} element
     * @param {Object} [options]
     */
    constructor(element, options = {}) {
        this.element = Energine.utils.resolveElement(element, {
            name: 'Grid root'
        });

        if (typeof Tabulator === 'undefined') {
            throw new Error('Tabulator 6.3 is required for GridManager to operate.');
        }

        this.options = Object.assign({
            onSelect: null,
            onSortChange: null,
            onDoubleClick: null,
            selectable: 1,
            theme: 'bootstrap5',
            placeholder: (Energine.translations && Energine.translations.get('TXT_NO_RECORDS')) || '',
            remotePagination: true,
            remoteSorting: true,
            remoteFiltering: true,
            paginationSize: null,
            paginationSizeSelector: [10, 25, 50, 100],
            initialPage: 1,
            paginationElement: null,
            requestHandler: null,
            responseHandler: null,
        }, options);

        this.data = [];
        this.metadata = {};
        this.metadataRaw = {};
        this.availableTypes = new Set();
        this.reportedUnknownTypes = new Set();
        this.keyFieldName = null;
        this.sort = { field: null, order: null };
        this.events = {};
        this.isDirty = false;
        this.selectedRow = null;
        this.tabulator = null;
        this.silentSortUpdate = false;
        this.tabulatorReady = false;
        this.pendingBuild = false;
        this.columnsDirty = true;
        this.pager = null;
        this.lastResponse = null;
        this.remoteFilters = [];
        this.remoteRequestHandler = (typeof this.options.requestHandler === 'function')
            ? this.options.requestHandler
            : null;
        this.remoteResponseHandler = (typeof this.options.responseHandler === 'function')
            ? this.options.responseHandler
            : null;
        this.remotePagination = this.options.remotePagination !== false;
        this.remoteSorting = this.options.remoteSorting !== false;
        this.remoteFiltering = this.options.remoteFiltering !== false;
        this.paginationSize = (typeof this.options.paginationSize === 'number' && this.options.paginationSize > 0)
            ? this.options.paginationSize
            : null;
        this.paginationSizeSelector = Array.isArray(this.options.paginationSizeSelector)
            ? this.options.paginationSizeSelector.slice()
            : [10, 25, 50, 100];
        this.requestedPage = parseInt(this.options.initialPage, 10) || 1;
        if (this.requestedPage <= 0) {
            this.requestedPage = 1;
        }
        this.currentPage = this.requestedPage;
        this.pendingSelectionKey = undefined;
        this.paginationElement = this.options.paginationElement || null;
        this.pendingReload = false;

        this.container = document.createElement('div');
        this.container.classList.add('grid-tabulator');
        this.element.innerHTML = '';
        this.element.appendChild(this.container);

        this.ensureAssetsLoaded();

        this.on('dirty', () => {
            this.isDirty = true;
        });

        if (typeof this.options.onSelect === 'function') {
            this.on('select', this.options.onSelect);
        }

        if (typeof this.options.onDoubleClick === 'function') {
            this.on('doubleClick', this.options.onDoubleClick);
        }

        if (typeof this.options.onSortChange === 'function') {
            this.on('sortChange', this.options.onSortChange);
        }
    }

    ensureAssetsLoaded() {
        const cssFiles = [
            { path: 'scripts/tabulator/tabulator.min.css', key: 'tabulator-core' },
            { path: 'scripts/tabulator/tabulator_bootstrap5.min.css', key: 'tabulator-bootstrap5' }
        ];

        cssFiles.forEach(({ path, key }) => {
            if (this.isStylesheetLoaded(key, path)) {
                return;
            }

            if (window.Energine && typeof Energine.loadCSS === 'function') {
                Energine.loadCSS(path);
                this.markStylesheet(key, path);
            } else {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = path;
                if (key) {
                    link.dataset.tabulatorStyle = key;
                }
                document.head.appendChild(link);
            }
        });
    }

    isStylesheetLoaded(key, cssPath) {
        if (key) {
            const existingByKey = document.head.querySelector(`link[data-tabulator-style="${key}"]`);
            if (existingByKey) {
                return true;
            }
        }

        const normalizedPath = cssPath || '';
        const existing = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find((link) => {
            const href = (link.getAttribute('href') || '').split('?')[0];
            return href.endsWith(normalizedPath);
        });

        if (existing && key && !existing.dataset.tabulatorStyle) {
            existing.dataset.tabulatorStyle = key;
        }

        return Boolean(existing);
    }

    markStylesheet(key, cssPath) {
        if (!key) {
            return;
        }

        const link = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find((candidate) => {
            const href = (candidate.getAttribute('href') || '').split('?')[0];
            return href.endsWith(cssPath);
        });

        if (link) {
            link.dataset.tabulatorStyle = key;
        }
    }

    normalizeMetadataStructure(metadata) {
        const result = {
            fields: {},
            keyFieldName: null,
            raw: metadata || {},
        };

        if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
            return result;
        }

        let fields = metadata;
        let possibleKey = null;

        if (metadata.fields && typeof metadata.fields === 'object' && !Array.isArray(metadata.fields)) {
            fields = metadata.fields;
            if (typeof metadata.key === 'string' && metadata.key) {
                possibleKey = metadata.key;
            } else if (typeof metadata.primary === 'string' && metadata.primary) {
                possibleKey = metadata.primary;
            } else if (Array.isArray(metadata.keys) && metadata.keys.length) {
                possibleKey = metadata.keys[0];
            }
        }

        if (typeof metadata.key === 'string' && metadata.key) {
            possibleKey = metadata.key;
        } else if (typeof metadata.primaryKey === 'string' && metadata.primaryKey) {
            possibleKey = metadata.primaryKey;
        }

        if ((!fields || typeof fields !== 'object' || Array.isArray(fields))
            && metadata.columns && typeof metadata.columns === 'object' && !Array.isArray(metadata.columns)
        ) {
            fields = metadata.columns;
        }

        if (fields && typeof fields === 'object' && !Array.isArray(fields)) {
            result.fields = fields;
        }

        result.keyFieldName = this.extractKeyFieldName(result.fields, possibleKey);
        return result;
    }

    extractKeyFieldName(fields, fallback) {
        if (!fields || typeof fields !== 'object') {
            return fallback || null;
        }

        if (fallback && Object.prototype.hasOwnProperty.call(fields, fallback)) {
            return fallback;
        }

        let detected = null;
        Object.keys(fields).some((fieldName) => {
            const info = fields[fieldName];
            if (!info || typeof info !== 'object') {
                return false;
            }

            if (info.key === true
                || info.key === 1
                || info.key === '1'
                || (typeof info.key === 'string' && info.key.toLowerCase() === 'true')
                || info.primary === true
                || info.primary === 1
                || info.isKey === true
            ) {
                detected = fieldName;
                return true;
            }
            return false;
        });

        return detected || fallback || null;
    }

    normalizeFieldType(type) {
        if (type === undefined || type === null) {
            return 'string';
        }

        const raw = String(type).toLowerCase();
        const aliasMap = {
            int: 'integer',
            bigint: 'integer',
            smallint: 'integer',
            tinyint: 'integer',
            decimal: 'float',
            double: 'float',
            real: 'float',
            numeric: 'float',
            number: 'float',
            bool: 'boolean',
            checkbox: 'boolean',
            html: 'htmlblock',
            textblock: 'htmlblock',
            textarea: 'text',
            datetimepicker: 'datetime',
            datepicker: 'date',
            timepicker: 'time',
            image: 'file',
            picture: 'file',
        };

        return aliasMap[raw] || raw;
    }

    stringifyValue(value, { separator = ', ', allowHtml = false } = {}) {
        if (value === undefined || value === null) {
            return '';
        }

        if (typeof value === 'string') {
            return value;
        }

        if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        }

        if (value instanceof Date) {
            return value.toISOString();
        }

        if (Array.isArray(value)) {
            return value
                .map((item) => this.stringifyValue(item, { separator, allowHtml }))
                .filter((part) => part !== '')
                .join(separator);
        }

        if (typeof value === 'object') {
            if (allowHtml && typeof value.html === 'string' && value.html.trim() !== '') {
                return value.html;
            }

            const priorityKeys = ['display', 'label', 'title', 'name', 'caption', 'text'];
            for (const key of priorityKeys) {
                if (Object.prototype.hasOwnProperty.call(value, key) && value[key] !== undefined && value[key] !== null) {
                    const result = this.stringifyValue(value[key], { separator, allowHtml });
                    if (result !== '') {
                        return result;
                    }
                }
            }

            if (Object.prototype.hasOwnProperty.call(value, 'value') && value.value !== undefined && value.value !== null) {
                const prefix = this.stringifyValue(value.prefix, { separator, allowHtml });
                const core = this.stringifyValue(value.value, { separator, allowHtml });
                const suffixes = [];
                if (value.unit !== undefined && value.unit !== null) {
                    suffixes.push(this.stringifyValue(value.unit, { separator, allowHtml }));
                }
                if (value.suffix !== undefined && value.suffix !== null) {
                    suffixes.push(this.stringifyValue(value.suffix, { separator, allowHtml }));
                }

                const parts = [];
                if (prefix) parts.push(prefix);
                if (core) parts.push(core);
                if (suffixes.length) {
                    parts.push(suffixes.filter(Boolean).join(' '));
                }

                const assembled = parts.join(' ').replace(/\s+/g, ' ').trim();
                if (assembled) {
                    return assembled;
                }
            }

            const collected = Object.values(value)
                .map((item) => this.stringifyValue(item, { separator, allowHtml }))
                .filter((part) => part !== '');
            return collected.join(separator);
        }

        return '';
    }

    createTextElement(text, { preserveLineBreaks = false, cssClass = [] } = {}) {
        const span = document.createElement('span');
        span.textContent = text ?? '';
        if (preserveLineBreaks) {
            span.style.whiteSpace = 'pre-line';
        }

        const classes = Array.isArray(cssClass) ? cssClass : [cssClass];
        classes.filter(Boolean).forEach((cls) => span.classList.add(cls));
        return span;
    }

    createHTMLContainer(html) {
        if (!html) {
            return '';
        }
        const container = document.createElement('div');
        container.classList.add('grid-html-cell');
        container.innerHTML = html;
        return container;
    }

    normalizeBoolean(value) {
        if (value === true || value === false) {
            return value;
        }

        if (typeof value === 'number') {
            return value === 1;
        }

        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            return ['1', 'true', 'y', 'yes', 'on'].includes(normalized);
        }

        if (typeof value === 'object' && value !== null) {
            if (Object.prototype.hasOwnProperty.call(value, 'value')) {
                return this.normalizeBoolean(value.value);
            }
            if (Object.prototype.hasOwnProperty.call(value, 'checked')) {
                return this.normalizeBoolean(value.checked);
            }
        }

        return Boolean(value);
    }

    createBooleanElement(value) {
        const wrapper = document.createElement('div');
        wrapper.classList.add('form-check', 'm-0', 'd-inline-flex', 'justify-content-center');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.classList.add('form-check-input');
        checkbox.disabled = true;
        checkbox.checked = this.normalizeBoolean(value);
        wrapper.appendChild(checkbox);
        return wrapper;
    }

    createTextFormatter(options = {}) {
        return (cell) => this.createTextElement(this.stringifyValue(cell.getValue()), options);
    }

    createMultilineTextFormatter() {
        return (cell) => this.createTextElement(this.stringifyValue(cell.getValue()), { preserveLineBreaks: true, cssClass: ['text-break'] });
    }

    createHTMLFormatter() {
        return (cell) => {
            const raw = cell.getValue();
            const html = this.stringifyValue(raw, { allowHtml: true });
            if (!html) {
                return '';
            }

            if (this.containsHTML(html)) {
                return this.createHTMLContainer(html);
            }

            return this.createTextElement(html, { preserveLineBreaks: true, cssClass: ['text-break'] });
        };
    }

    createValueFormatter() {
        return (cell) => {
            const raw = cell.getValue();
            const result = this.stringifyValue(raw, { allowHtml: true });
            if (!result) {
                return '';
            }

            if (this.containsHTML(result)) {
                return this.createHTMLContainer(result);
            }

            return this.createTextElement(result);
        };
    }

    createNumericFormatter({ decimals } = {}) {
        return (cell) => {
            const raw = cell.getValue();
            if (raw === null || raw === undefined || raw === '') {
                return '';
            }

            const textValue = this.stringifyValue(raw);
            if (textValue === '') {
                return '';
            }

            let numeric = null;
            if (typeof raw === 'number') {
                numeric = raw;
            } else {
                const normalized = textValue.replace(/\s+/g, '').replace(',', '.');
                const parsed = Number(normalized);
                if (Number.isFinite(parsed)) {
                    numeric = parsed;
                }
            }

            if (numeric === null) {
                return this.createTextElement(textValue);
            }

            const intlOptions = { useGrouping: true };
            if (typeof decimals === 'number' && decimals >= 0) {
                intlOptions.minimumFractionDigits = decimals;
                intlOptions.maximumFractionDigits = decimals;
            } else if (Number.isInteger(numeric)) {
                intlOptions.maximumFractionDigits = 0;
            } else {
                intlOptions.minimumFractionDigits = 0;
                intlOptions.maximumFractionDigits = 4;
            }

            let formatted;
            try {
                formatted = numeric.toLocaleString(undefined, intlOptions);
            } catch (err) {
                formatted = numeric.toString();
            }

            return this.createTextElement(formatted);
        };
    }

    createEmailFormatter() {
        return (cell) => {
            const value = this.stringifyValue(cell.getValue());
            if (!value) {
                return '';
            }
            const link = document.createElement('a');
            link.href = `mailto:${value}`;
            link.textContent = value;
            link.rel = 'noopener';
            return link;
        };
    }

    createPhoneFormatter() {
        return (cell) => {
            const value = this.stringifyValue(cell.getValue());
            if (!value) {
                return '';
            }
            const normalized = value.replace(/[^0-9+#*]/g, '');
            const link = document.createElement('a');
            link.href = `tel:${normalized}`;
            link.textContent = value;
            link.rel = 'noopener';
            return link;
        };
    }

    createCodeFormatter() {
        return (cell) => {
            const value = this.stringifyValue(cell.getValue());
            if (!value) {
                return '';
            }
            const pre = document.createElement('pre');
            pre.classList.add('grid-code-cell', 'mb-0');
            pre.textContent = value;
            return pre;
        };
    }

    createFileFormatter(fieldMeta = {}) {
        return (cell) => {
            const raw = cell.getValue();
            const info = this.extractFileInfo(raw);
            if (!info) {
                return '';
            }

            if (info.isImage) {
                const img = document.createElement('img');
                img.src = this.buildImagePreviewUrl(info.path, fieldMeta);
                img.classList.add('img-thumbnail', 'rounded');

                const width = parseInt(fieldMeta.thumbWidth || fieldMeta.previewWidth || 40, 10);
                const height = parseInt(fieldMeta.thumbHeight || fieldMeta.previewHeight || 40, 10);
                if (!Number.isNaN(width)) {
                    img.width = width;
                }
                if (!Number.isNaN(height)) {
                    img.height = height;
                }
                img.alt = fieldMeta.title ? this.stringifyValue(fieldMeta.title) : (info.label || '');

                const linkUrl = this.buildFileUrl(info.path);
                if (linkUrl) {
                    const link = document.createElement('a');
                    link.href = linkUrl;
                    link.target = '_blank';
                    link.rel = 'noopener';
                    link.appendChild(img);
                    return link;
                }
                return img;
            }

            const text = info.label || this.stringifyValue(raw) || this.extractFileName(info.path);
            const url = this.buildFileUrl(info.path);
            if (!url) {
                return this.createTextElement(text);
            }

            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener';
            link.textContent = text || url;
            link.classList.add('text-truncate', 'd-inline-block');
            link.style.maxWidth = '100%';
            return link;
        };
    }

    extractFileInfo(value) {
        if (value === undefined || value === null) {
            return null;
        }

        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) {
                return null;
            }
            return {
                path: trimmed,
                label: this.extractFileName(trimmed),
                isImage: this.isImagePath(trimmed),
            };
        }

        if (typeof value === 'object') {
            const fileKeys = ['url', 'href', 'path', 'src', 'file', 'value'];
            for (const key of fileKeys) {
                if (typeof value[key] === 'string' && value[key].trim()) {
                    const path = value[key].trim();
                    const labelKeys = ['label', 'name', 'title', 'caption', 'text', 'filename', 'fileName'];
                    let label = '';
                    for (const labelKey of labelKeys) {
                        if (value[labelKey] !== undefined && value[labelKey] !== null) {
                            label = this.stringifyValue(value[labelKey]);
                            break;
                        }
                    }

                    if (!label) {
                        label = this.extractFileName(path);
                    }

                    const isImage = key === 'src' || this.isImagePath(path);
                    return { path, label, isImage };
                }
            }
        }

        return null;
    }

    extractFileName(path) {
        if (typeof path !== 'string') {
            return '';
        }
        const trimmed = path.trim();
        if (!trimmed) {
            return '';
        }
        const parts = trimmed.split(/[\\/]/);
        return parts.pop() || trimmed;
    }

    isImagePath(path) {
        if (typeof path !== 'string') {
            return false;
        }
        return /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(path.trim());
    }

    buildFileUrl(path) {
        if (!path) {
            return '';
        }

        if (/^(?:[a-z]+:)?\/\//i.test(path)) {
            return path;
        }

        if (path.startsWith('/')) {
            return path;
        }

        if (window.Energine) {
            const base = (Energine.root || Energine.base || '').replace(/\/*$/, '/');
            if (base) {
                return base + path.replace(/^\/+/, '');
            }
        }

        return path;
    }

    buildImagePreviewUrl(path, fieldMeta = {}) {
        if (!path) {
            return '';
        }

        const resizer = window.Energine && typeof Energine.resizer === 'string' ? Energine.resizer : '';
        if (!resizer) {
            return this.buildFileUrl(path);
        }

        const preset = fieldMeta.previewPreset || fieldMeta.resizerPreset || 'w40-h40';
        const base = resizer.replace(/\/*$/, '/');
        const normalizedPreset = String(preset).replace(/^\/+|\/+$/g, '');
        const normalizedPath = String(path).replace(/^\/+/, '');
        return `${base}${normalizedPreset}/${normalizedPath}`;
    }

    containsHTML(text) {
        if (typeof text !== 'string') {
            return false;
        }
        return /<[a-z][\s\S]*>/i.test(text);
    }

    trackUnknownType(type) {
        const normalized = this.normalizeFieldType(type || '');
        if (!this.reportedUnknownTypes.has(normalized)) {
            this.reportedUnknownTypes.add(normalized);
            if (window.console && typeof console.warn === 'function') {
                console.warn(`Grid: unsupported field type "${type}". Falling back to text formatter.`);
            }
        }
    }

    isTabulatorReady() {
        return !!(this.tabulator && this.tabulatorReady);
    }

    // --- Event system ---
    on(event, handler) {
        if (!this.events[event]) this.events[event] = [];
        if (typeof handler === 'function') {
            this.events[event].push(handler);
        }
        return this;
    }

    off(event, handler) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(fn => fn !== handler);
        }
    }

    fireEvent(event, ...args) {
        if (this.events[event]) {
            this.events[event].forEach(fn => {
                if (typeof fn === 'function') {
                    fn.apply(this, args);
                }
            });
        }
    }

    updateTabulatorIndex() {
        if (!this.tabulator || !this.keyFieldName) {
            return;
        }

        if (typeof this.tabulator.setIndex === 'function') {
            this.tabulator.setIndex(this.keyFieldName);
        } else if (typeof this.tabulator.setOption === 'function') {
            this.tabulator.setOption('index', this.keyFieldName);
        } else if (this.tabulator.options && typeof this.tabulator.options === 'object') {
            this.tabulator.options.index = this.keyFieldName;
        }
    }

    setMetadata(metadata = {}) {
        const normalized = this.normalizeMetadataStructure(metadata);
        this.metadataRaw = normalized.raw || {};
        this.metadata = normalized.fields || {};
        this.keyFieldName = normalized.keyFieldName || null;
        this.columnsDirty = true;

        this.availableTypes = new Set();
        Object.values(this.metadata).forEach((fieldMeta) => {
            if (!fieldMeta || typeof fieldMeta !== 'object') {
                return;
            }
            const type = this.normalizeFieldType(fieldMeta.type || 'string');
            this.availableTypes.add(type);
        });

        if (this.tabulator) {
            this.updateTabulatorIndex();

            if (this.isTabulatorReady()) {
                try {
                    const columns = this.buildColumns();
                    const updateResult = this.tabulator.setColumns(columns);
                    this.columnsDirty = false;

                    Promise.resolve(updateResult).catch((error) => {
                        console.error('Failed to apply grid columns from metadata', error);
                        this.columnsDirty = true;
                    });
                } catch (error) {
                    console.error('Failed to build columns from metadata', error);
                    this.columnsDirty = true;
                }
            } else {
                this.pendingBuild = true;
            }
        }
    }

    getMetadata() {
        return this.metadata;
    }

    setPager(pager = null) {
        if (pager && typeof pager === 'object') {
            this.pager = Object.assign({}, pager);
        } else {
            this.pager = null;
        }
    }

    getPager() {
        return this.pager;
    }

    setLastResponse(payload = null) {
        if (!payload) {
            this.lastResponse = null;
            return;
        }
        if (typeof payload === 'object') {
            this.lastResponse = Object.assign({}, payload);
        } else {
            this.lastResponse = payload;
        }
    }

    setRequestHandler(handler) {
        this.remoteRequestHandler = (typeof handler === 'function') ? handler : null;
    }

    setResponseHandler(handler) {
        this.remoteResponseHandler = (typeof handler === 'function') ? handler : null;
    }

    isRemotePaginationEnabled() {
        return Boolean(this.remotePagination && typeof this.remoteRequestHandler === 'function');
    }

    isRemoteSortingEnabled() {
        return Boolean(this.remoteSorting && typeof this.remoteRequestHandler === 'function');
    }

    isRemoteFilteringEnabled() {
        return Boolean(this.remoteFiltering && typeof this.remoteRequestHandler === 'function');
    }

    setRemoteFilters(filters = []) {
        const normalized = Array.isArray(filters) ? filters.filter(Boolean).map((item) => Object.assign({}, item)) : [];
        this.remoteFilters = normalized;

        if (!this.tabulator) {
            return;
        }

        try {
            if (this.isTabulatorReady() && normalized.length) {
                this.tabulator.setFilter(normalized);
            } else if (this.isTabulatorReady()) {
                if (typeof this.tabulator.clearFilter === 'function') {
                    this.tabulator.clearFilter(true);
                }
            }
        } catch (error) {
            console.error('Failed to apply filters', error);
        }
    }

    clearRemoteFilters() {
        this.remoteFilters = [];
        if (this.tabulator && this.isTabulatorReady()) {
            try {
                if (typeof this.tabulator.clearFilter === 'function') {
                    this.tabulator.clearFilter(true);
                } else if (typeof this.tabulator.setFilter === 'function') {
                    this.tabulator.setFilter([]);
                }
            } catch (error) {
                console.error('Failed to clear filters', error);
            }
        }
    }

    getRemoteFilters() {
        return this.remoteFilters.map((item) => Object.assign({}, item));
    }

    getCurrentPage() {
        if (this.tabulator && typeof this.tabulator.getPage === 'function') {
            try {
                const page = this.tabulator.getPage();
                if (Number.isFinite(page) && page > 0) {
                    return page;
                }
            } catch (error) {}
        }
        if (Number.isFinite(this.currentPage) && this.currentPage > 0) {
            return this.currentPage;
        }
        if (this.pager && this.pager.current) {
            const pagerPage = parseInt(this.pager.current, 10);
            if (Number.isFinite(pagerPage) && pagerPage > 0) {
                return pagerPage;
            }
        }
        return 1;
    }

    updatePageSize(size) {
        const numericSize = parseInt(size, 10);
        if (!Number.isFinite(numericSize) || numericSize <= 0) {
            return;
        }
        this.paginationSize = numericSize;
        if (this.tabulator && typeof this.tabulator.setPageSize === 'function') {
            try {
                this.tabulator.setPageSize(numericSize);
            } catch (error) {
                console.warn('Failed to update Tabulator page size', error);
            }
        }
    }

    loadPage(page) {
        return this.reloadData({ page });
    }

    reloadData(options = {}) {
        const targetPage = parseInt(options.page, 10);
        if (Number.isFinite(targetPage) && targetPage > 0) {
            this.requestedPage = targetPage;
        }

        this.pendingSelectionKey = this.getSelectedRecordKey();

        if (!this.tabulator) {
            this.pendingReload = true;
            return Promise.resolve();
        }

        if (this.isRemotePaginationEnabled()) {
            const desiredPage = Number.isFinite(targetPage) && targetPage > 0
                ? targetPage
                : this.getCurrentPage();

            this.requestedPage = desiredPage;

            if (typeof this.tabulator.setPage === 'function') {
                try {
                    return Promise.resolve(this.tabulator.setPage(desiredPage));
                } catch (error) {
                    return Promise.reject(error);
                }
            }

            if (typeof this.tabulator.setData === 'function') {
                try {
                    return Promise.resolve(this.tabulator.setData());
                } catch (error) {
                    return Promise.reject(error);
                }
            }

            return Promise.resolve();
        }

        if (typeof this.tabulator.replaceData === 'function') {
            try {
                return Promise.resolve(this.tabulator.replaceData(this.data || []));
            } catch (error) {
                return Promise.reject(error);
            }
        }

        return Promise.resolve();
    }

    normalizePager(pager = {}) {
        const normalized = { raw: pager };
        if (!pager || typeof pager !== 'object') {
            return normalized;
        }

        const totalPages = parseInt(pager.count || pager.totalPages || pager.last_page || pager.lastPage, 10);
        if (Number.isFinite(totalPages) && totalPages > 0) {
            normalized.lastPage = totalPages;
        }

        const currentPage = parseInt(pager.current || pager.page || pager.currentPage, 10);
        if (Number.isFinite(currentPage) && currentPage > 0) {
            normalized.currentPage = currentPage;
        }

        const totalRecords = parseInt(pager.records || pager.totalRecords || pager.total_records, 10);
        if (Number.isFinite(totalRecords) && totalRecords >= 0) {
            normalized.totalRecords = totalRecords;
        }

        const pageSize = parseInt(pager.limit || pager.pageSize || pager.perPage || pager.size, 10);
        if (Number.isFinite(pageSize) && pageSize > 0) {
            normalized.pageSize = pageSize;
        }

        return normalized;
    }

    handleAjaxRequest(params = {}) {
        if (!this.remoteRequestHandler) {
            return Promise.resolve(Array.isArray(this.data) ? this.data.slice() : []);
        }

        const requestedPage = parseInt(params.page, 10);
        if (Number.isFinite(requestedPage) && requestedPage > 0) {
            this.currentPage = requestedPage;
        }

        try {
            const result = this.remoteRequestHandler(params) || [];
            if (result && typeof result.then === 'function') {
                return result;
            }
            return Promise.resolve(result);
        } catch (error) {
            return Promise.reject(error);
        }
    }

    handleAjaxResponse(response, params = {}) {
        let payload = response;
        if (this.remoteResponseHandler) {
            try {
                const processed = this.remoteResponseHandler(response, params);
                if (processed !== undefined) {
                    payload = processed;
                }
            } catch (error) {
                console.error('Remote response handler failed', error);
            }
        }

        if (!payload || typeof payload !== 'object') {
            if (Array.isArray(payload)) {
                this.data = payload.slice();
                return payload;
            }
            this.data = [];
            return [];
        }

        if (!Array.isArray(payload.data) && Array.isArray(response)) {
            payload.data = response;
        }

        if (payload.pager) {
            const normalized = this.normalizePager(payload.pager);
            if (normalized.pageSize) {
                this.updatePageSize(normalized.pageSize);
            }
            if (normalized.lastPage) {
                payload.last_page = normalized.lastPage;
            }
            if (normalized.currentPage) {
                payload.current_page = normalized.currentPage;
                this.currentPage = normalized.currentPage;
            }
            if (normalized.totalRecords !== undefined) {
                payload.total_records = normalized.totalRecords;
            }
        } else {
            if (payload.last_page === undefined) {
                payload.last_page = 1;
            }
            if (payload.current_page === undefined) {
                const requestedPage = parseInt(params.page, 10);
                payload.current_page = Number.isFinite(requestedPage) && requestedPage > 0
                    ? requestedPage
                    : this.getCurrentPage();
            }
            this.currentPage = payload.current_page;
            if (payload.total_records === undefined) {
                payload.total_records = Array.isArray(payload.data) ? payload.data.length : 0;
            }
        }

        if (params && params.size && !this.paginationSize) {
            this.updatePageSize(params.size);
        }

        this.data = Array.isArray(payload.data) ? payload.data.slice() : [];
        return this.data;
    }

    getSort() {
        let field = this.sort?.field || null;
        let order = this.sort?.order || null;

        if ((!field || !order) && this.tabulator && typeof this.tabulator.getSorters === 'function') {
            const sorters = this.tabulator.getSorters();
            if (Array.isArray(sorters) && sorters.length) {
                const sorter = sorters[0];
                field = sorter.field || (sorter.column && sorter.column.getField && sorter.column.getField()) || field;
                order = sorter.dir || sorter.direction || sorter.sort || sorter.order || order;
            }
        }

        field = (field !== undefined && field !== null) ? String(field).trim() : null;
        if (order !== undefined && order !== null) {
            order = String(order).toLowerCase();
            if (order !== 'asc' && order !== 'desc') {
                if (order.startsWith('asc')) {
                    order = 'asc';
                } else if (order.startsWith('desc')) {
                    order = 'desc';
                } else {
                    order = null;
                }
            }
        } else {
            order = null;
        }

        return { field: field || null, order: order || null };
    }

    setData(data = []) {
        if (!this.metadata) {
            alert('Cannot set data without specified metadata.');
            return false;
        }
        this.data = Array.isArray(data) ? data.slice() : [];
        return true;
    }

    isEmpty() {
        return !this.data || !this.data.length;
    }

    buildColumns() {
        if (!this.metadata || typeof this.metadata !== 'object') {
            return [];
        }

        const columns = [];
        Object.keys(this.metadata).forEach((fieldName) => {
            const fieldMeta = this.metadata[fieldName];
            if (!fieldMeta || typeof fieldMeta !== 'object') {
                return;
            }

            const type = this.normalizeFieldType(fieldMeta.type || 'text');

            if (type === 'hidden') {
                return;
            }

            if (Object.prototype.hasOwnProperty.call(fieldMeta, 'visible') && !this.normalizeBoolean(fieldMeta.visible)) {
                return;
            }

            const column = {
                field: fieldName,
                title: fieldMeta.title || fieldMeta.caption || fieldName,
                tooltip: fieldMeta.hint || false,
            };

            const appendCssClass = (cls) => {
                if (!cls) {
                    return;
                }
                const existing = column.cssClass ? column.cssClass.split(/\s+/).filter(Boolean) : [];
                cls.split(/\s+/).filter(Boolean).forEach((item) => {
                    if (!existing.includes(item)) {
                        existing.push(item);
                    }
                });
                if (existing.length) {
                    column.cssClass = existing.join(' ');
                }
            };

            if (Object.prototype.hasOwnProperty.call(fieldMeta, 'sort')) {
                column.headerSort = fieldMeta.sort === 1 || fieldMeta.sort === '1' || fieldMeta.sort === true;
            } else {
                column.headerSort = true;
            }

            if (fieldMeta.width) {
                const width = parseInt(fieldMeta.width, 10);
                if (!Number.isNaN(width)) {
                    column.width = width;
                }
            }

            if (fieldMeta.minWidth) {
                const minWidth = parseInt(fieldMeta.minWidth, 10);
                if (!Number.isNaN(minWidth)) {
                    column.minWidth = minWidth;
                }
            }

            if (fieldMeta.maxWidth) {
                const maxWidth = parseInt(fieldMeta.maxWidth, 10);
                if (!Number.isNaN(maxWidth)) {
                    column.maxWidth = maxWidth;
                }
            }

            if (fieldMeta.cssClass) {
                appendCssClass(fieldMeta.cssClass);
            }

            if (fieldMeta.class) {
                appendCssClass(fieldMeta.class);
            }

            if (fieldMeta.align) {
                column.hozAlign = fieldMeta.align;
            }

            switch (type) {
                case 'boolean': {
                    column.hozAlign = column.hozAlign || 'center';
                    column.formatter = (cell) => this.createBooleanElement(cell.getValue());
                    break;
                }

                case 'integer':
                case 'float':
                case 'number': {
                    column.hozAlign = column.hozAlign || 'right';
                    const decimals = type === 'integer' ? 0 : undefined;
                    column.formatter = this.createNumericFormatter({ decimals });
                    break;
                }

                case 'datetime':
                case 'date':
                case 'time': {
                    column.hozAlign = column.hozAlign || 'center';
                    appendCssClass('text-nowrap');
                    column.formatter = this.createTextFormatter();
                    break;
                }

                case 'htmlblock': {
                    appendCssClass('text-break');
                    column.vertAlign = column.vertAlign || 'top';
                    column.formatter = this.createHTMLFormatter();
                    break;
                }

                case 'text':
                case 'textbox':
                case 'multi': {
                    appendCssClass('text-break');
                    column.vertAlign = column.vertAlign || 'top';
                    column.formatter = this.createMultilineTextFormatter();
                    break;
                }

                case 'value': {
                    column.hozAlign = column.hozAlign || 'right';
                    column.formatter = this.createValueFormatter();
                    break;
                }

                case 'file':
                case 'thumb':
                case 'media':
                case 'video': {
                    column.hozAlign = column.hozAlign || 'center';
                    column.formatter = this.createFileFormatter(fieldMeta);
                    break;
                }

                case 'email': {
                    column.formatter = this.createEmailFormatter();
                    break;
                }

                case 'phone': {
                    column.formatter = this.createPhoneFormatter();
                    break;
                }

                case 'code': {
                    column.vertAlign = column.vertAlign || 'top';
                    appendCssClass('text-break');
                    column.formatter = this.createCodeFormatter();
                    break;
                }

                case 'password': {
                    column.formatter = (cell) => {
                        const value = this.stringifyValue(cell.getValue());
                        if (!value) {
                            return '';
                        }
                        const maskLength = Math.max(6, Math.min(12, value.length));
                        return this.createTextElement('•'.repeat(maskLength));
                    };
                    break;
                }

                case 'info': {
                    appendCssClass('text-break');
                    column.vertAlign = column.vertAlign || 'top';
                    column.formatter = this.createHTMLFormatter();
                    break;
                }

                case 'select':
                case 'string':
                case 'custom':
                case 'tab':
                case 'smap': {
                    column.formatter = this.createTextFormatter();
                    break;
                }

                default: {
                    this.trackUnknownType(type);
                    column.formatter = this.createTextFormatter();
                }
            }

            if (!column.formatter) {
                column.formatter = this.createTextFormatter();
            }

            columns.push(column);
        });

        return columns;
    }

    initializeTabulator() {
        if (this.tabulator) {
            return;
        }

        this.tabulatorReady = false;

        const selectableOption = (typeof this.options.selectable !== 'undefined')
            ? this.options.selectable
            : 1;
        const themeOption = this.options.theme || 'bootstrap5';
        const placeholderOption = (typeof this.options.placeholder !== 'undefined')
            ? this.options.placeholder
            : '';
        const extractRowData = (row) => {
            if (row && typeof row.getData === 'function') {
                try {
                    return row.getData();
                } catch (e) {
                    return null;
                }
            }
            return null;
        };

        const paginationElementOption = this.paginationElement || this.options.paginationElement || null;
        const remotePaginationEnabled = this.isRemotePaginationEnabled();
        const remoteSortingEnabled = this.isRemoteSortingEnabled();
        const remoteFilteringEnabled = this.isRemoteFilteringEnabled();

        const tabulatorOptions = {
            data: (remotePaginationEnabled || remoteSortingEnabled || remoteFilteringEnabled)
                ? []
                : (Array.isArray(this.data) ? this.data : []),
            columns: this.buildColumns(),
            layout: 'fitColumns',
            selectable: selectableOption,
            index: this.keyFieldName || undefined,
            placeholder: placeholderOption,
            theme: themeOption,
            rowClick: (_, row) => {
                this.selectRow(row);
                this.selectedRow = row;
                this.fireEvent('rowClick', row, extractRowData(row));
            },
            rowDblClick: (_, row) => {
                this.selectRow(row);
                this.selectedRow = row;
                this.fireEvent('doubleClick', row, extractRowData(row));
            }
        };

        if (remotePaginationEnabled || remoteSortingEnabled || remoteFilteringEnabled) {
            tabulatorOptions.ajaxURL = this.options.ajaxURL || '';
            tabulatorOptions.ajaxRequestFunc = (url, config, params) => this.handleAjaxRequest(params);
            tabulatorOptions.ajaxResponse = (url, params, response) => this.handleAjaxResponse(response, params);
            tabulatorOptions.pagination = true;
            tabulatorOptions.paginationMode = remotePaginationEnabled ? 'remote' : 'local';
            tabulatorOptions.paginationInitialPage = this.requestedPage || 1;
            tabulatorOptions.paginationCounter = 'rows';
            if (this.paginationSize) {
                tabulatorOptions.paginationSize = this.paginationSize;
            }
            if (Array.isArray(this.paginationSizeSelector) && this.paginationSizeSelector.length) {
                tabulatorOptions.paginationSizeSelector = this.paginationSizeSelector.slice();
            }
            if (paginationElementOption) {
                tabulatorOptions.paginationElement = paginationElementOption;
            }
            tabulatorOptions.sortMode = remoteSortingEnabled ? 'remote' : 'local';
            tabulatorOptions.filterMode = remoteFilteringEnabled ? 'remote' : 'local';
            tabulatorOptions.ajaxSorting = remoteSortingEnabled;
            tabulatorOptions.ajaxFiltering = remoteFilteringEnabled;
        } else {
            tabulatorOptions.sortMode = 'local';
            tabulatorOptions.filterMode = 'local';
            if (this.remotePagination) {
                tabulatorOptions.pagination = true;
                tabulatorOptions.paginationMode = 'local';
                if (this.paginationSize) {
                    tabulatorOptions.paginationSize = this.paginationSize;
                }
                if (Array.isArray(this.paginationSizeSelector) && this.paginationSizeSelector.length) {
                    tabulatorOptions.paginationSizeSelector = this.paginationSizeSelector.slice();
                }
                if (paginationElementOption) {
                    tabulatorOptions.paginationElement = paginationElementOption;
                }
            }
        }

        this.tabulator = new Tabulator(this.container, tabulatorOptions);

        this.columnsDirty = false;

        this.tabulator.on('tableBuilt', () => {
            this.tabulatorReady = true;

            if (this.paginationSize) {
                try {
                    this.tabulator.setPageSize(this.paginationSize);
                } catch (error) {}
            }

            if (this.remoteFilters.length && this.isRemoteFilteringEnabled()) {
                try {
                    this.tabulator.setFilter(this.remoteFilters);
                } catch (error) {}
            }

            if (this.pendingBuild) {
                this.pendingBuild = false;
                this.build();
            } else if (this.isRemotePaginationEnabled()) {
                this.reloadData({ page: this.requestedPage || this.currentPage || 1 });
            } else if (this.pendingReload) {
                this.pendingReload = false;
                this.reloadData();
            }
        });

        this.tabulator.on('dataLoading', () => {
            this.fireEvent('dataLoading');
        });

        this.tabulator.on('dataLoadError', (error) => {
            this.fireEvent('dataLoadError', error);
        });

        this.tabulator.on('dataProcessed', () => {
            try {
                if (this.tabulator && typeof this.tabulator.getData === 'function') {
                    this.data = this.tabulator.getData();
                }
            } catch (error) {
                this.data = Array.isArray(this.data) ? this.data : [];
            }

            if (this.pendingSelectionKey !== undefined) {
                const key = this.pendingSelectionKey;
                this.pendingSelectionKey = undefined;
                if (key !== false && key !== null && key !== undefined) {
                    this.selectByKey(key);
                } else {
                    this.deselectItem();
                }
            }

            this.fireEvent('dataLoaded', this.data);
        });

        this.tabulator.on('pageLoaded', (pageNumber) => {
            if (Number.isFinite(pageNumber) && pageNumber > 0) {
                this.currentPage = pageNumber;
            }
        });

        this.tabulator.on('rowSelectionChanged', (data, rows) => {
            const row = Array.isArray(rows) && rows.length ? rows[0] : null;
            this.selectedRow = row || null;
            const record = Array.isArray(data) && data.length ? data[0] : extractRowData(row);
            this.fireEvent('select', this.selectedRow, record);
        });

        this.tabulator.on('sortChanged', (sorters) => {
            const sorter = Array.isArray(sorters) && sorters.length ? sorters[0] : null;
            const previous = Object.assign({}, this.sort);
            if (sorter) {
                const field = sorter.field || (sorter.column && sorter.column.getField && sorter.column.getField());
                const dir = sorter.dir || sorter.direction || sorter.sort || sorter.order;
                this.sort = {
                    field: field || null,
                    order: dir || null
                };
            } else {
                this.sort = { field: null, order: null };
            }

            if (this.sort.field && !this.sort.order) {
                this.sort.order = 'asc';
            }

            const suppressed = this.silentSortUpdate;
            this.silentSortUpdate = false;

            if (!suppressed && (this.sort.field !== previous.field || this.sort.order !== previous.order)) {
                this.fireEvent('sortChange', this.sort, previous, sorter, sorters);
            }
        });
    }

    build() {
        const previouslySelectedRecordKey = this.getSelectedRecordKey();

        if (!this.tabulator) {
            this.initializeTabulator();
        }

        if (!this.tabulator) {
            return;
        }

        if (!this.isTabulatorReady()) {
            this.pendingBuild = true;
            return;
        }

        this.pendingBuild = false;
        this.updateTabulatorIndex();

        let columnsPromise = Promise.resolve();
        if (this.columnsDirty) {
            try {
                const columns = this.buildColumns();
                const result = this.tabulator.setColumns(columns);
                columnsPromise = Promise.resolve(result);
            } catch (error) {
                columnsPromise = Promise.reject(error);
            }
        }

        columnsPromise = columnsPromise.then(() => {
            this.columnsDirty = false;
        });

        const applyData = () => {
            if (this.isRemotePaginationEnabled()) {
                if (previouslySelectedRecordKey !== false
                    && previouslySelectedRecordKey !== undefined
                    && previouslySelectedRecordKey !== null) {
                    this.pendingSelectionKey = previouslySelectedRecordKey;
                } else {
                    this.pendingSelectionKey = undefined;
                }
                return this.reloadData({ page: this.requestedPage || this.currentPage || 1 });
            }

            return Promise.resolve(this.tabulator.replaceData(this.data || []))
                .then(() => {
                    const finalizeSilentSortUpdate = () => {
                        setTimeout(() => {
                            this.silentSortUpdate = false;
                        }, 0);
                    };

                    if (this.sort.field && this.sort.order) {
                        this.silentSortUpdate = true;
                        try {
                            this.tabulator.setSort([{ column: this.sort.field, dir: this.sort.order }]);
                        } catch (e) {
                            try {
                                this.tabulator.setSort(this.sort.field, this.sort.order);
                            } catch (ignored) {}
                        } finally {
                            finalizeSilentSortUpdate();
                        }
                    } else {
                        this.silentSortUpdate = true;
                        try {
                            if (typeof this.tabulator.clearSort === 'function') {
                                this.tabulator.clearSort();
                            }
                        } finally {
                            finalizeSilentSortUpdate();
                        }
                    }

                    const hasData = Array.isArray(this.data) && this.data.length > 0;
                    if (!hasData) {
                        this.deselectItem();
                        return;
                    }

                    if (previouslySelectedRecordKey !== false && previouslySelectedRecordKey !== undefined && previouslySelectedRecordKey !== null) {
                        this.selectByKey(previouslySelectedRecordKey);
                    }

                    const selectedRows = typeof this.tabulator.getSelectedRows === 'function'
                        ? this.tabulator.getSelectedRows()
                        : [];
                    if (!selectedRows || !selectedRows.length) {
                        this.deselectItem();
                    }
                });
        };

        columnsPromise
            .then(() => applyData())
            .catch((error) => {
                console.error('Grid build failed', error);
            });
    }

    clear() {
        this.deselectItem();
        this.data = [];
        if (this.tabulator) {
            this.tabulator.clearData();
        }
    }

    selectRow(row) {
        if (!row || !this.tabulator) {
            return;
        }
        const selected = typeof this.tabulator.getSelectedRows === 'function'
            ? this.tabulator.getSelectedRows()
            : [];
        if (selected && selected.length) {
            this.tabulator.deselectRow(selected);
        }
        row.select();
        this.selectedRow = row;
    }

    selectItem(row) {
        this.selectRow(row);
    }

    deselectItem() {
        if (this.tabulator) {
            const selected = typeof this.tabulator.getSelectedRows === 'function'
                ? this.tabulator.getSelectedRows()
                : [];
            if (selected && selected.length) {
                this.tabulator.deselectRow(selected);
            }
        }
        this.selectedRow = null;
    }

    getSelectedItem() {
        return this.selectedRow;
    }

    getSelectedRecord() {
        if (!this.getSelectedItem()) {
            return false;
        }
        if (typeof this.selectedRow.getData === 'function') {
            return this.selectedRow.getData();
        }
        return false;
    }

    getSelectedRecordKey() {
        if (!this.keyFieldName) {
            return false;
        }
        const record = this.getSelectedRecord();
        return record ? record[this.keyFieldName] : false;
    }

    selectByKey(key) {
        if (!this.tabulator || !this.keyFieldName || key === false || key === undefined || key === null) {
            return;
        }
        const row = this.tabulator.getRow(key);
        if (row) {
            this.selectRow(row);
            if (typeof row.scrollTo === 'function') {
                row.scrollTo();
            }
        }
    }

    dataKeyExists(key) {
        if (!this.data || !this.keyFieldName) {
            return false;
        }
        return this.data.some(item => item && item[this.keyFieldName] == key);
    }

    getAdjacentRow(direction) {
        const current = this.getSelectedItem();
        if (!current) {
            return null;
        }
        const method = direction === 'next' ? 'getNextRow' : 'getPrevRow';
        if (typeof current[method] === 'function') {
            return current[method]();
        }
        return null;
    }
}

// Экспорт для ES-модуля (если нужно)
// export default Grid;

/**
 * GridManager (ES6 version)
 */
class GridManager {
    /**
     * @param {HTMLElement|string} element Main holder element for the GridManager
     */
    constructor(element) {
        // --- Properties ---
        this.mvElementId = null;
        this.langId = 0;
        this.initialized = false;
        this.pendingPage = null;
        this.currentPage = 1;
        this.activeFilterDescriptor = null;

        // --- Element reference ---
        this.element = (typeof element === 'string') ?
            document.querySelector(element) : element;

        // --- Filter tool ---
        try {
            this.filter = new GridManager.Filter(this);
        } catch (err) {
            // console.warn(err);
            // console.warn('Filter is not created.');
        }

        // --- Pages ---
        this.pageList = new PageList({ onPageSelect: this.loadPage.bind(this) });
        this.useTabulatorPager = true;
        this.paginationContainer = this.pageList.getElement();
        if (this.paginationContainer) {
            this.paginationContainer.innerHTML = '';
            this.paginationContainer.classList.add('tabulator-pagination-holder');
            this.tabulatorPagerElement = document.createElement('div');
            this.tabulatorPagerElement.classList.add('tabulator-pager-placeholder', 'flex-grow-1');
            this.paginationContainer.appendChild(this.tabulatorPagerElement);
            this.paginationSummaryElement = document.createElement('span');
            this.paginationSummaryElement.classList.add('page-summary', 'text-muted', 'small', 'ms-auto');
            this.paginationSummaryElement.setAttribute('data-role', 'page-summary');
            this.paginationContainer.appendChild(this.paginationSummaryElement);
            this.updatePaginationSummary('');
        } else {
            this.tabulatorPagerElement = null;
            this.paginationSummaryElement = null;
        }

        // --- Grid ---
        this.grid = new Grid(this.element.querySelector('[data-role="grid"]'), {
            onSelect: this.onSelect.bind(this),
            onSortChange: this.onSortChange.bind(this),
            onDoubleClick: this.onDoubleClick.bind(this),
            paginationElement: this.tabulatorPagerElement || undefined,
            requestHandler: this.requestGridData.bind(this),
            responseHandler: this.handleGridResponse.bind(this),
            initialPage: 1,
        });

        this.grid.on('dataLoading', this.handleDataLoading.bind(this));
        this.grid.on('dataLoaded', this.handleDataLoaded.bind(this));
        this.grid.on('dataLoadError', this.handleDataLoadError.bind(this));

        // --- Tabs ---
        this.tabPane = new TabPane(this.element, { onTabChange: this.onTabChange.bind(this) });

        const activeTab = (this.tabPane && typeof this.tabPane.getCurrentTab === 'function')
            ? this.tabPane.getCurrentTab()
            : null;
        const initialTabData = this.extractTabData(activeTab);
        if (initialTabData && Object.prototype.hasOwnProperty.call(initialTabData, 'lang')) {
            this.langId = initialTabData.lang;
        }

        // --- Toolbar placement ---
        let toolbarContainer = this.tabPane.element.querySelector('[data-pane-part="footer"]');
        if (toolbarContainer) {
            toolbarContainer.appendChild(this.pageList.getElement());
        } else {
            this.tabPane.element.appendChild(this.pageList.getElement());
        }

        // --- Overlay (Visual imitation of waiting) ---
        // this.overlay = new Overlay(this.element);

        // --- Property 'single_template' of main holder element ---
        this.singlePath = this.element.getAttribute('single_template') || '';

        // ModalBox escape-close handling
        try {
            let mb = window.parent && window.parent.ModalBox;
            if (mb && mb.initialized && mb.getCurrent()) {
                document.body.addEventListener('keydown', evt => {
                    if (evt.key === 'Escape') mb.close();
                });
            }
        } catch (e) {}

        // Инициализация id записи для move state
        let move_from_id = this.element.getAttribute('move_from_id');
        if (move_from_id) {
            this.setMvElementId(move_from_id);
        }

        // --- Start! ---
        this.reload();
        this.grid.build();
    }

    // --- Move Element ID API ---
    setMvElementId(id) { this.mvElementId = id; }
    getMvElementId() { return this.mvElementId; }
    clearMvElementId() { this.mvElementId = null; }

    // --- Toolbar ---
    attachToolbar(toolbar) {
        this.toolbar = toolbar;
        const toolbarElement = this.toolbar ? this.toolbar.getElement() : null;
        const gridToolbar = this.element.querySelector('[data-role="grid-toolbar"]');

        if (toolbarElement) {
            if (!toolbarElement.getAttribute('data-role')) {
                toolbarElement.setAttribute('data-role', 'grid-actions-list');
            }

            if (gridToolbar) {
                let actionsContainer = gridToolbar.querySelector('[data-role="grid-actions"]');
                if (!actionsContainer) {
                    actionsContainer = document.createElement('div');
                    actionsContainer.classList.add('grid-actions', 'd-flex', 'flex-wrap', 'align-items-center', 'gap-2', 'ms-lg-auto');
                    actionsContainer.setAttribute('data-role', 'grid-actions');
                    gridToolbar.appendChild(actionsContainer);
                }
                actionsContainer.appendChild(toolbarElement);
            } else {
                let toolbarContainer = this.tabPane.element.querySelector('[data-pane-part="footer"]');
                if (!toolbarContainer) {
                    toolbarContainer = this.tabPane.element;
                }
                toolbarContainer.appendChild(toolbarElement);
            }
        }

        if (this.toolbar?.disableControls) this.toolbar.disableControls();
        if (this.toolbar?.bindTo) this.toolbar.bindTo(this);
        // this.reload(); // Можно сделать отложенную загрузку при необходимости
    }

    parseTabMeta(metaText) {
        if (typeof metaText !== 'string') {
            return {};
        }
        const trimmed = metaText.trim();
        if (!trimmed) {
            return {};
        }
        if (typeof TabPane !== 'undefined' && typeof TabPane.safeJsonParse === 'function') {
            return TabPane.safeJsonParse(trimmed) || {};
        }
        const normalized = trimmed.replace(/([\{,]\s*)(\w+)\s*:/g, '$1"$2":');
        try {
            return JSON.parse(normalized);
        } catch (e) {
            return {};
        }
    }

    extractTabData(source) {
        if (!source) {
            return {};
        }
        if (source instanceof Element) {
            if (source.data && typeof source.data === 'object') {
                return source.data;
            }
            const metaHolder = source.querySelector('[data-role="tab-meta"]');
            if (metaHolder) {
                return this.parseTabMeta(metaHolder.textContent || '');
            }
            return {};
        }
        if (typeof source === 'string') {
            return this.parseTabMeta(source);
        }
        if (typeof source === 'object') {
            if (source.data && typeof source.data === 'object') {
                return source.data;
            }
            return source;
        }
        return {};
    }

    // --- Tabs ---
    onTabChange(data) {
        const tabData = this.extractTabData(data);
        if (tabData && Object.prototype.hasOwnProperty.call(tabData, 'lang')) {
            this.langId = tabData.lang;
        }
        if (this.filter) {
            this.filter.remove();
            this.clearFilterDescriptor();
            if (typeof this.filter.checkCondition === 'function') {
                this.filter.checkCondition();
            }
        }
        this.reload();
    }

    // --- Grid events ---
    onSelect() { /* no-op, override as needed */ }
    onDoubleClick() {
        if (this.toolbar && this.toolbar.getControlById && this.toolbar.getControlById('edit')) {
            this.edit();
        } else if (this.toolbar && this.toolbar.controls && this.toolbar.controls.length) {
            let action = this.toolbar.controls[0].properties.action;
            if (typeof this[action] === 'function') this[action]();
        }
    }
    onSortChange() {
        if (!this.grid || !this.grid.isRemoteSortingEnabled || !this.grid.isRemoteSortingEnabled()) {
            this.loadPage(1);
        }
    }
    sortChange() { this.loadPage(1); }

    // --- Paging ---
    reload() { this.loadPage(1); }

    loadPage(pageNum) {
        const requested = (pageNum === undefined || pageNum === null)
            ? this.getCurrentPageNumber()
            : parseInt(pageNum, 10);
        const normalizedPage = Number.isFinite(requested) && requested > 0 ? requested : 1;

        this.pendingPage = normalizedPage;

        if (this.pageList) this.pageList.disable();
        if (this.toolbar) this.toolbar.disableControls();

        showLoader();
        if (this.grid && typeof this.grid.loadPage === 'function') {
            this.grid.loadPage(normalizedPage);
        }
    }

    getCurrentPageNumber() {
        if (this.grid && typeof this.grid.getCurrentPage === 'function') {
            const page = this.grid.getCurrentPage();
            if (Number.isFinite(page) && page > 0) {
                return page;
            }
        }
        if (this.pageList && Number.isFinite(this.pageList.currentPage) && this.pageList.currentPage > 0) {
            return this.pageList.currentPage;
        }
        if (Number.isFinite(this.currentPage) && this.currentPage > 0) {
            return this.currentPage;
        }
        return 1;
    }

    buildRequestURL(pageNum, sorters = null) {
        const basePath = this.singlePath ? `${this.singlePath.replace(/\/+$/, '')}/` : '';
        const segments = ['get-data'];
        const sort = this.normalizeSortParam(sorters);

        if (sort.field && sort.order) {
            segments.push(`${sort.field}-${sort.order}`);
        }

        const pageNumber = parseInt(pageNum, 10);
        const normalizedPage = Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;
        segments.push(`page-${normalizedPage}`);

        return `${basePath}${segments.join('/')}`;
    }

    buildRequestPostBody(filters = []) {
        const params = [];

        if (this.langId !== undefined && this.langId !== null && this.langId !== '') {
            params.push(`languageID=${encodeURIComponent(this.langId)}`);
        }

        let filterDescriptors = [];

        if (Array.isArray(filters) && filters.length) {
            filterDescriptors = filters;
        } else {
            filterDescriptors = this.getFilterDescriptors();
        }

        if (!filterDescriptors.length && this.filter && typeof this.filter.getValue === 'function') {
            const fallback = this.filter.getValue();
            if (fallback) {
                filterDescriptors = [{ queryString: fallback }];
            }
        }

        filterDescriptors.forEach((descriptor) => {
            if (!descriptor) {
                return;
            }
            const raw = descriptor.queryString || descriptor.query || descriptor.value || '';
            if (!raw) {
                return;
            }
            const cleaned = String(raw).replace(/^&+|&+$/g, '').replace(/&&+/g, '&');
            if (cleaned) {
                params.push(cleaned);
            }
        });

        return params.join('&');
    }

    normalizeSortParam(sorters) {
        if (!sorters) {
            return (this.grid && typeof this.grid.getSort === 'function')
                ? this.grid.getSort()
                : { field: null, order: null };
        }

        let sorter = null;
        if (Array.isArray(sorters) && sorters.length) {
            sorter = sorters[0];
        } else if (typeof sorters === 'object') {
            sorter = sorters;
        }

        if (!sorter || typeof sorter !== 'object') {
            return (this.grid && typeof this.grid.getSort === 'function')
                ? this.grid.getSort()
                : { field: null, order: null };
        }

        let field = sorter.field;
        if (!field && sorter.column && typeof sorter.column.getField === 'function') {
            field = sorter.column.getField();
        }

        let order = sorter.dir || sorter.direction || sorter.sort || sorter.order;
        if (order) {
            order = String(order).toLowerCase();
            if (order !== 'asc' && order !== 'desc') {
                if (order.startsWith('asc')) {
                    order = 'asc';
                } else if (order.startsWith('desc')) {
                    order = 'desc';
                } else {
                    order = null;
                }
            }
        }

        if (field) {
            return { field, order: order || 'asc' };
        }

        return (this.grid && typeof this.grid.getSort === 'function')
            ? this.grid.getSort()
            : { field: null, order: null };
    }

    requestGridData(params = {}) {
        const pageNumber = parseInt(params.page, 10);
        const normalizedPage = Number.isFinite(pageNumber) && pageNumber > 0
            ? pageNumber
            : (this.pendingPage || this.getCurrentPageNumber());

        const url = this.buildRequestURL(normalizedPage, params.sorters);
        const body = this.buildRequestPostBody(params.filter);

        return new Promise((resolve, reject) => {
            Energine.request(
                url,
                body ? body : null,
                (response) => resolve(response || {}),
                null,
                (error) => reject(error)
            );
        });
    }

    handleGridResponse(response, params = {}) {
        const payload = response || {};
        this.processServerResponse(payload, params);
        return payload;
    }

    handleDataLoading() {
        if (this.pageList) {
            this.pageList.disable();
        }
        if (this.toolbar) {
            this.toolbar.disableControls();
        }
        showLoader();
    }

    handleDataLoaded() {
        if (this.pageList) {
            this.pageList.enable();
        }
        const hasToolbarPayload = this.grid && this.grid.lastResponse && this.grid.lastResponse.toolbar;
        if (this.toolbar && !hasToolbarPayload) {
            if (this.grid && typeof this.grid.isEmpty === 'function' && this.grid.isEmpty()) {
                this.toolbar.disableControls();
            } else {
                this.toolbar.enableControls();
            }
            const addControl = this.toolbar.getControlById ? this.toolbar.getControlById('add') : null;
            if (addControl) {
                addControl.enable(true);
            }
        }
        hideLoader();
    }

    handleDataLoadError(error) {
        this.processServerError(error);
    }

    updatePaginationSummary(summaryText) {
        if (!this.paginationSummaryElement) {
            return;
        }
        const normalized = (summaryText !== undefined && summaryText !== null)
            ? String(summaryText).trim()
            : '';
        if (normalized) {
            this.paginationSummaryElement.textContent = normalized;
            this.paginationSummaryElement.classList.remove('d-none');
        } else {
            this.paginationSummaryElement.textContent = '';
            this.paginationSummaryElement.classList.add('d-none');
        }
    }

    updatePaginationFromPayload(pager = {}) {
        if (!pager || typeof pager !== 'object') {
            if (!this.useTabulatorPager && this.pageList) {
                this.pageList.clear();
            }
            this.updatePaginationSummary('');
            return;
        }

        const totalPages = parseInt(pager.count, 10) || 0;
        const currentPage = parseInt(pager.current, 10) || (this.pendingPage || 1);
        const recordSummary = (pager.records !== undefined && pager.records !== null) ? pager.records : '';

        this.currentPage = currentPage;
        if (this.pageList) {
            this.pageList.currentPage = currentPage;
        }

        if (!this.useTabulatorPager && this.pageList) {
            this.pageList.build(totalPages, currentPage, recordSummary);
        } else {
            this.updatePaginationSummary(recordSummary);
        }

        if (pager.limit && this.grid && typeof this.grid.updatePageSize === 'function') {
            this.grid.updatePageSize(pager.limit);
        }
    }

    applyFilterDescriptor(descriptor) {
        if (descriptor && typeof descriptor === 'object') {
            this.activeFilterDescriptor = Object.assign({}, descriptor);
            if (this.grid && typeof this.grid.setRemoteFilters === 'function') {
                this.grid.setRemoteFilters([descriptor]);
            }
        } else {
            this.clearFilterDescriptor();
        }
    }

    clearFilterDescriptor() {
        this.activeFilterDescriptor = null;
        if (this.grid && typeof this.grid.clearRemoteFilters === 'function') {
            this.grid.clearRemoteFilters();
        }
    }

    getFilterDescriptors() {
        if (this.grid && typeof this.grid.getRemoteFilters === 'function') {
            const filters = this.grid.getRemoteFilters();
            if (filters && filters.length) {
                return filters;
            }
        }
        return this.activeFilterDescriptor ? [Object.assign({}, this.activeFilterDescriptor)] : [];
    }

    applyToolbarPayload(toolbarData) {
        if (!this.toolbar || !toolbarData) {
            return;
        }

        const applyState = (id, state = {}) => {
            if (!id) {
                return;
            }
            const control = this.toolbar.getControlById ? this.toolbar.getControlById(id) : null;
            if (!control) {
                return;
            }
            const shouldDisable = state.disabled === true || state.enable === false || state.enabled === false;
            const shouldEnable = state.disabled === false || state.enable === true || state.enabled === true;

            if (shouldDisable) {
                control.disable();
            }
            if (shouldEnable) {
                control.enable(true);
            }
        };

        const handleDescriptor = (descriptor) => {
            if (!descriptor || typeof descriptor !== 'object') {
                return;
            }
            const id = descriptor.id || descriptor.control || descriptor.name;
            applyState(id, descriptor);
        };

        if (Array.isArray(toolbarData)) {
            toolbarData.forEach(handleDescriptor);
            return;
        }

        if (typeof toolbarData === 'object') {
            if (Array.isArray(toolbarData.controls)) {
                toolbarData.controls.forEach(handleDescriptor);
            }

            const disableList = [].concat(toolbarData.disabled || toolbarData.disable || []);
            disableList.forEach((id) => applyState(id, { disabled: true }));

            const enableList = [].concat(toolbarData.enabled || toolbarData.enable || []);
            enableList.forEach((id) => applyState(id, { enabled: true }));
        }
    }

    extractErrorMessage(error) {
        if (!error) {
            return '';
        }
        if (typeof error === 'string') {
            return error;
        }
        if (typeof error === 'object') {
            if (typeof error.responseText === 'string' && error.responseText.trim()) {
                return error.responseText;
            }
            if (typeof error.statusText === 'string' && error.statusText.trim()) {
                return error.statusText;
            }
            if (typeof error.message === 'string' && error.message.trim()) {
                return error.message;
            }
        }
        return '';
    }

    processServerResponse(result, requestParams = {}) {
        const payload = result || {};

        try {
            if (payload.meta) {
                this.grid.setMetadata(payload.meta);
                this.initialized = true;
            } else if (!this.initialized && this.grid.getMetadata && Object.keys(this.grid.getMetadata() || {}).length) {
                this.initialized = true;
            }

            if (typeof this.grid.setPager === 'function') {
                this.grid.setPager(payload.pager || null);
            }
            if (typeof this.grid.setLastResponse === 'function') {
                this.grid.setLastResponse(payload);
            }

            const remotePaginationActive = this.grid
                && typeof this.grid.isRemotePaginationEnabled === 'function'
                && this.grid.isRemotePaginationEnabled();

            if (remotePaginationActive) {
                this.updatePaginationFromPayload(payload.pager || {});
            } else {
                this.grid.setData(payload.data || []);
                this.grid.build();

                if (payload.pager) {
                    const totalPages = parseInt(payload.pager.count, 10) || 0;
                    const currentPage = parseInt(payload.pager.current, 10) || (this.pendingPage || 1);
                    if (!this.useTabulatorPager && this.pageList) {
                        this.pageList.build(totalPages, currentPage, payload.pager.records || '');
                    } else {
                        this.currentPage = currentPage;
                        this.updatePaginationSummary(payload.pager.records || '');
                    }
                } else if (this.pageList && typeof this.pageList.clear === 'function') {
                    if (!this.useTabulatorPager) {
                        this.pageList.clear();
                    }
                    this.updatePaginationSummary('');
                }

                if (this.pageList) {
                    this.pageList.enable();
                }
            }

            if (this.toolbar) {
                if (payload.toolbar) {
                    this.applyToolbarPayload(payload.toolbar);
                } else if (this.grid && typeof this.grid.isEmpty === 'function' && this.grid.isEmpty()) {
                    this.toolbar.disableControls();
                } else {
                    this.toolbar.enableControls();
                }

                const addControl = this.toolbar.getControlById ? this.toolbar.getControlById('add') : null;
                if (addControl) {
                    addControl.enable(true);
                }
            }
        } finally {
            this.pendingPage = null;
            const remotePaginationActive = this.grid
                && typeof this.grid.isRemotePaginationEnabled === 'function'
                && this.grid.isRemotePaginationEnabled();
            if (!remotePaginationActive) {
                hideLoader();
            }
        }

        return payload;
    }

    processServerError(error) {
        const message = this.extractErrorMessage(error);

        if (message) {
            console.error('GridManager request error:', message, error);
            alert(message);
        } else {
            console.error('GridManager request error:', error);
        }

        if (this.pageList) {
            this.pageList.enable();
        }
        if (this.toolbar) {
            this.toolbar.enableControls();
            const addControl = this.toolbar.getControlById ? this.toolbar.getControlById('add') : null;
            if (addControl) {
                addControl.enable(true);
            }
        }

        this.pendingPage = null;
        hideLoader();
    }

    processAfterCloseAction(returnValue) {
        if (returnValue) {
            if (returnValue.afterClose && typeof this[returnValue.afterClose] === 'function') {
                this[returnValue.afterClose](null);
            } else {
                this.loadPage(this.getCurrentPageNumber());
            }
            this.grid.fireEvent('dirty');
        }
    }

    // --- Actions ---
    view() {
        ModalBox.open({ url: `${this.singlePath}${this.grid.getSelectedRecordKey()}` });
    }
    add() {
        ModalBox.open({
            url: `${this.singlePath}add/`,
            onClose: this.processAfterCloseAction.bind(this)
        });
    }
    edit(id) {
        if (!parseInt(id)) id = this.grid.getSelectedRecordKey();
        ModalBox.open({
            url: `${this.singlePath}${id}/edit`,
            onClose: this.processAfterCloseAction.bind(this)
        });
    }
    move(id) {
        if (!parseInt(id)) id = this.grid.getSelectedRecordKey();
        this.setMvElementId(id);
        ModalBox.open({
            url: `${this.singlePath}move/${id}`,
            onClose: this.processAfterCloseAction.bind(this)
        });
    }
    moveFirst() { this.moveTo('first', this.getMvElementId()); }
    moveLast() { this.moveTo('last', this.getMvElementId()); }
    moveAbove(id) {
        if (!parseInt(id)) id = this.grid.getSelectedRecordKey();
        this.moveTo('above', this.getMvElementId(), id);
    }
    moveBelow(id) {
        if (!parseInt(id)) id = this.grid.getSelectedRecordKey();
        this.moveTo('below', this.getMvElementId(), id);
    }
    moveTo(dir, fromId, toId) {
        toId = toId || '';
        // this.overlay.show();
        showLoader();
        Energine.request(
            `${this.singlePath}move/${fromId}/${dir}/${toId}/`,
            null,
            () => {
                // this.overlay.hide();
                hideLoader();
                ModalBox.setReturnValue(true);
                this.close();
            },
            () => hideLoader(),//{ this.overlay.hide(); },
            (responseText) => {
                alert(responseText);
                // this.overlay.hide();
                hideLoader();
            }
        );
    }
    editPrev() {
        const prevRow = this.grid.getAdjacentRow('prev');
        if (prevRow) {
            this.grid.selectItem(prevRow);
            this.edit();
        }
    }
    editNext() {
        const nextRow = this.grid.getAdjacentRow('next');
        if (nextRow) {
            this.grid.selectItem(nextRow);
            this.edit();
        }
    }
    del() {
        let MSG_CONFIRM_DELETE = (Energine.translations && Energine.translations.get('MSG_CONFIRM_DELETE')) ||
            'Do you really want to delete the chosen record?';
        if (confirm(MSG_CONFIRM_DELETE)) {
            // this.overlay.show();
            showLoader();
            Energine.request(
                `${this.singlePath}${this.grid.getSelectedRecordKey()}/delete/`,
                null,
                () => {
                    // this.overlay.hide();
                    hideLoader();
                    this.grid.fireEvent('dirty');
                    this.loadPage(this.getCurrentPageNumber());
                },
                () => hideLoader(),//{ this.overlay.hide(); },
                (responseText) => {
                    alert(responseText);
                    // this.overlay.hide();
                    hideLoader();
                }
            );
        }
    }
    use() {
        ModalBox.setReturnValue(this.grid.getSelectedRecord());
        ModalBox.close();
    }
    close() {
        ModalBox.close();
    }
    up() {
        Energine.request(
            `${this.singlePath}${this.grid.getSelectedRecordKey()}/up/`,
            (this.filter && this.filter.getValue) ? this.filter.getValue() : null,
            () => this.loadPage(this.getCurrentPageNumber())
        );
    }
    down() {
        Energine.request(
            `${this.singlePath}${this.grid.getSelectedRecordKey()}/down/`,
            (this.filter && this.filter.getValue) ? this.filter.getValue() : null,
            () => this.loadPage(this.getCurrentPageNumber())
        );
    }
    print() {
        window.open(`${this.element.getAttribute('single_template')}print/`);
    }
    csv() {
        window.location.href = `${this.element.getAttribute('single_template')}csv/`;
    }

    // --- Static stub for Filter (should be redefined elsewhere) ---
    static Filter = class {
        constructor(manager) { /* ... */ }
        getValue() { return ''; }
        remove() {}
    };
}

// Для совместимости (глобально)
// window.GridManager = GridManager;
// export default GridManager;

/**
 * Filter tool.
 *
 * @throws Element for GridManager.Filter was not found.
 *
 * @constructor
 * @param {GridManager} gridManager
 */
class Filter {
    /**
     * @param {GridManager} gridManager
     */
    constructor(gridManager) {
        // Найти элемент фильтра
        this.element = gridManager.element.querySelector('[data-role="grid-filter"]');
        if (!this.element) {
            throw new Error('Element for GridManager.Filter was not found.');
        }

        this.element.classList.add('bg-light', 'border', 'border-light', 'rounded-3', 'p-3', 'mb-3', 'shadow-sm');

        // Привязки к основным элементам управления
        const applyButton = this.element.querySelector('[data-action="apply-filter"]');
        const resetLink = this.element.querySelector('[data-action="reset-filter"]');
        this.active = false;
        this.currentDescriptor = null;

        if (applyButton) {
            applyButton.classList.add('btn', 'btn-primary', 'btn-sm');
        }
        if (resetLink) {
            resetLink.classList.add('btn', 'btn-link', 'btn-sm', 'p-0', 'text-decoration-none');
            resetLink.setAttribute('role', 'button');
        }

        // Поля фильтра
        this.fields = this.element.querySelector('[data-role="filter-field"]');
        this.condition = this.element.querySelector('[data-role="filter-condition"]');

        if (!this.fields) throw new Error('Filter: data-role="filter-field" not found!');
        if (!this.condition) throw new Error('Filter: data-role="filter-condition" not found!');

        this.fields.classList.add('form-select', 'form-select-sm');
        this.condition.classList.add('form-select', 'form-select-sm');

        // Инициализация QueryControls
        this.inputs = new GridManager.Filter.QueryControls(
            Array.from(this.element.querySelectorAll('[data-role="filter-query"]')),
            applyButton
        );

        // Перенос типов из data-types в dataset (store/retrieve)
        Array.from(this.condition.children).forEach(el => {
            let types = el.getAttribute('data-types');
            if (types) {
                el.dataset.type = types;
                el.removeAttribute('data-types');
            }
        });

        // События
        applyButton.addEventListener('click', () => {
            const descriptor = this.use();
            gridManager.applyFilterDescriptor(descriptor);
        });
        resetLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.remove();
            gridManager.clearFilterDescriptor();
        });
        this.fields.addEventListener('change', this.checkCondition.bind(this));
        this.condition.addEventListener('change', (event) => {
            const fieldType = this.fields.options[this.fields.selectedIndex].getAttribute('type');
            this.switchInputs(event.target.value, fieldType);
        });

        this.checkCondition();
    }

    // Проверка условий фильтрации
    checkCondition() {
        if (!this.fields) {
            console.warn('Filter: data-role="filter-field" не найден!');
            return;
        }
        if (!this.condition) {
            console.warn('Filter: data-role="filter-condition" не найден!');
            return;
        }
        if (!this.condition.options || this.condition.options.length === 0) {
            console.warn('Filter: options списка условий пусты!');
            return;
        }

        const fieldType = this.fields.options[this.fields.selectedIndex].getAttribute('type');
        const isDate = (fieldType === 'datetime' || fieldType === 'date');

        Array.from(this.condition.options).forEach(option => {
            if (!option) return;
            const types = option.dataset.type ? option.dataset.type.split('|') : [];
            option.style.display = types.includes(fieldType) ? '' : 'none';
        });

        // Убедиться, что выбранная опция видима
        const options = Array.from(this.condition.options);
        if (getComputedStyle(this.condition.options[this.condition.selectedIndex]).display === 'none') {
            for (let n = 0; n < options.length; n++) {
                if (getComputedStyle(options[n]).display !== 'none') {
                    this.condition.selectedIndex = n;
                    break;
                }
            }
        }

        // Переключить поля ввода
        this.switchInputs(this.condition.value, fieldType);
        this.disableInputField(isDate);
        if (this.inputs.showDatePickers) {
            this.inputs.showDatePickers(isDate);
        }

        if (this.inputs.inputs && this.inputs.inputs[0] && this.inputs.inputs[0].style.display !== 'none') {
            this.inputs.inputs[0].focus();
        }
    }

    // Переключение режима ввода (скаляр/период) в зависимости от типа и условия
    switchInputs(condition, type) {
        if (type === 'boolean') {
            if (this.inputs.hide) this.inputs.hide();
        } else {
            if (condition === 'between') {
                if (this.inputs.asPeriod) this.inputs.asPeriod();
            } else {
                if (this.inputs.asScalar) this.inputs.asScalar();
            }
        }
    }

    // Отключить/включить поля ввода
    disableInputField(disable) {
        const arr = this.inputs.inputs ? this.inputs.inputs : [];
        if (disable) {
            arr.forEach(input => {
                if (input && input.disabled !== undefined) {
                    input.disabled = true;
                    input.value = '';
                }
            });
        } else if (arr[0] && arr[0].disabled) {
            arr.forEach(input => {
                if (input && input.disabled !== undefined) {
                    input.disabled = false;
                }
            });
        }
    }

    // Очистить фильтр
    remove() {
        if (this.inputs.empty) this.inputs.empty();
        this.element.classList.remove('active');
        this.active = false;
        this.currentDescriptor = null;
    }

    // Пометить как активный если есть значения, иначе очистить
    use() {
        if (!(this.inputs.hasValues && this.inputs.hasValues())) {
            this.remove();
            return null;
        }

        this.element.classList.add('active');
        this.active = true;

        const fieldOption = this.fields.options[this.fields.selectedIndex];
        const conditionOption = this.condition.options[this.condition.selectedIndex];
        const fieldName = fieldOption ? fieldOption.value : '';
        const fieldCondition = conditionOption ? conditionOption.value : '';
        const values = this.inputs.getRawValues ? this.inputs.getRawValues() : [];
        const queryString = (this.inputs.getValues)
            ? this.inputs.getValues('filter' + fieldName) + `&filter[condition]=${fieldCondition}&`
            : '';

        const descriptor = {
            field: fieldName,
            type: fieldCondition,
            values,
            value: values.length > 1 ? values.slice() : (values[0] || ''),
            queryString,
        };

        this.currentDescriptor = descriptor;
        return descriptor;
    }

    // Получить строку фильтра
    getValue() {
        if (this.currentDescriptor && this.currentDescriptor.queryString) {
            return this.currentDescriptor.queryString;
        }
        return '';
    }
}

// Привязка к глобальному пространству
GridManager.Filter = Filter;


class QueryControls {
    /**
     * @param {HTMLElement[]} containers - Массив контейнеров для полей ввода фильтра.
     * @param {HTMLElement} applyAction - Кнопка "применить" фильтр.
     */
    constructor(containers, applyAction) {
        this.hiddenClass = 'd-none';

        // containers — массив или NodeList
        this.containers = Array.from(containers);
        this.containers.forEach(container => {
            container.classList.add('d-flex', 'flex-nowrap', 'align-items-center', 'gap-2', 'mb-2');
        });

        // Убираем класс скрытия у первого контейнера
        if (this.containers[0]) this.containers[0].classList.remove(this.hiddenClass);

        // this.inputs — все инпуты внутри контейнеров (первый input в каждом)
        this.inputs = this.containers.map(container => {
            const input = container.querySelector('input');
            if (input) {
                input.classList.add('form-control', 'form-control-sm');
            }
            return input;
        });

        // this.dpsInputs — создаём для каждого контейнера отдельный input[type=date], скрытый по умолчанию
        this.dpsInputs = this.inputs.map(input => {
            if (!input) return null;
            const clone = input.cloneNode(true);
            clone.type = 'date';
            clone.classList.add(this.hiddenClass, 'form-control', 'form-control-sm');
            if (input.parentNode) {
                input.parentNode.appendChild(clone);
            }
            return clone;
        });

        // DatePickers. Если нужна инициализация DatePicker, добавь здесь.
        this.dps = [];

        // Обработка enter для всех инпутов
        [...this.dpsInputs, ...this.inputs].forEach(input => {
            if (!input) return;
            input.addEventListener('keydown', event => {
                if ((event.key === 'Enter' || event.key === 'enter') && event.target.value !== '') {
                    event.preventDefault();
                    if (applyAction && typeof applyAction.click === 'function') {
                        applyAction.click();
                    }
                }
            });
        });

        this.isDate = false;
    }

    // Проверяет: есть ли значения в активных инпутах
    hasValues() {
        const inputs = this.isDate ? this.dpsInputs : this.inputs;
        return inputs.some(el => el && el.value);
    }

    // Очищает все инпуты (текстовые и для дат)
    empty() {
        [...this.dpsInputs, ...this.inputs].forEach(el => { if (el) el.value = ''; });
    }

    // Формирует query-строку для запроса
    getValues(fieldName) {
        const inputs = this.isDate ? this.dpsInputs : this.inputs;
        return inputs.map(el => el && el.value ? `${fieldName}[]=${encodeURIComponent(el.value)}` : '')
            .filter(Boolean)
            .join('&');
    }

    getRawValues() {
        const inputs = this.isDate ? this.dpsInputs : this.inputs;
        return inputs
            .map(el => (el && el.value ? el.value : ''))
            .filter(value => value !== '');
    }

    // Включить режим "между" (2 инпута), сделать маленькими
    asPeriod() {
        this.show();
    }

    // Включить режим одного инпута, остальные скрыть и убрать "маленькость"
    asScalar() {
        this.show();
        this.containers.slice(1).forEach(container => container.classList.add(this.hiddenClass));
    }

    // Показать все контейнеры
    show() {
        this.containers.forEach(c => c.classList.remove(this.hiddenClass));
    }

    // Скрыть все контейнеры
    hide() {
        this.containers.forEach(c => c.classList.add(this.hiddenClass));
    }

    // Показать или скрыть datepicker-инпуты
    showDatePickers(toShow) {
        this.isDate = toShow;
        if (toShow) {
            this.inputs.forEach(el => { if (el) el.classList.add(this.hiddenClass); });
            this.dpsInputs.forEach(el => { if (el) el.classList.remove(this.hiddenClass); });
        } else {
            this.inputs.forEach(el => { if (el) el.classList.remove(this.hiddenClass); });
            this.dpsInputs.forEach(el => { if (el) el.classList.add(this.hiddenClass); });
        }
    }
}
// Привязка к глобальному пространству
GridManager.Filter.QueryControls = QueryControls;

document.addEventListener('DOMContentLoaded', function () {
    /**
     * Scroll bar width of the browser.
     * @type {number}
     */
    // window.ScrollBarWidth = (window.top.ScrollBarWidth !== undefined)
    //     ? window.top.ScrollBarWidth
    //     : (function () {
    //         // Создаём внешний контейнер
    //         const parent = document.createElement('div');
    //         parent.style.height = '1px';
    //         parent.style.overflow = 'scroll';
    //         parent.style.visibility = 'hidden';
    //         parent.style.position = 'absolute'; // чтобы не влиять на макет
    //         parent.style.width = '100px';
    //
    //         // Создаём внутренний элемент
    //         const child = document.createElement('div');
    //         child.style.height = '2px';
    //         parent.appendChild(child);
    //
    //         document.body.appendChild(parent);
    //
    //         // Вычисляем ширину полосы прокрутки
    //         const width = parent.offsetWidth - parent.clientWidth;
    //
    //         // Удаляем временные элементы
    //         document.body.removeChild(parent);
    //
    //         return width;
    //     })();
});
;
