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
            placeholder: (Energine.translations && Energine.translations.get('TXT_NO_RECORDS')) || ''
        }, options);

        this.data = [];
        this.metadata = {};
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
        this.metadata = metadata || {};
        this.keyFieldName = null;
        this.columnsDirty = true;

        Object.keys(this.metadata).forEach(fieldName => {
            const fieldMeta = this.metadata[fieldName];
            if (fieldMeta && fieldMeta.key) {
                this.keyFieldName = fieldName;
            }
        });

        if (this.tabulator) {
            this.updateTabulatorIndex();
            if (this.isTabulatorReady()) {
                this.tabulator.setColumns(this.buildColumns());
            } else {
                this.pendingBuild = true;
            }
        }
    }

    getMetadata() {
        return this.metadata;
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
        if (!this.metadata) {
            return [];
        }

        const columns = [];
        Object.keys(this.metadata).forEach(fieldName => {
            const fieldMeta = this.metadata[fieldName];
            if (!fieldMeta || !fieldMeta.visible || fieldMeta.type === 'hidden') {
                return;
            }

            const column = {
                field: fieldName,
                title: fieldMeta.title || fieldMeta.caption || fieldName,
                tooltip: fieldMeta.hint || false
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

            if (fieldMeta.align) {
                column.hozAlign = fieldMeta.align;
            }

            const type = fieldMeta.type || 'text';
            switch (type) {
                case 'boolean': {
                    column.hozAlign = column.hozAlign || 'center';
                    column.formatter = (cell) => {
                        const value = cell.getValue();
                        const normalized = (value !== undefined && value !== null)
                            ? String(value).toLowerCase()
                            : '';
                        const checked = value === true
                            || value === 1
                            || normalized === '1'
                            || normalized === 'true'
                            || normalized === 'y';
                        const formCheck = document.createElement('div');
                        formCheck.classList.add('form-check', 'm-0', 'd-inline-flex', 'justify-content-center');
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.classList.add('form-check-input');
                        checkbox.disabled = true;
                        checkbox.checked = checked;
                        formCheck.appendChild(checkbox);
                        return formCheck;
                    };
                    break;
                }
                case 'value': {
                    column.formatter = (cell) => {
                        const value = cell.getValue();
                        if (value && typeof value === 'object' && value.value !== undefined) {
                            return value.value;
                        }
                        return value ?? '';
                    };
                    break;
                }
                case 'textbox': {
                    column.formatter = (cell) => {
                        const value = cell.getValue();
                        if (value && typeof value === 'object') {
                            return Object.values(value).filter(Boolean).join(', ');
                        }
                        return value ?? '';
                    };
                    break;
                }
                case 'file': {
                    column.hozAlign = column.hozAlign || 'center';
                    column.formatter = (cell) => {
                        const value = cell.getValue();
                        if (!value) {
                            return '';
                        }
                        const image = document.createElement('img');
                        image.src = (window.Energine && Energine.resizer ? Energine.resizer : '') + 'w40-h40/' + value;
                        image.width = 40;
                        image.height = 40;
                        image.classList.add('img-thumbnail', 'rounded');
                        if (fieldMeta && fieldMeta.title) {
                            image.alt = fieldMeta.title;
                        }
                        return image;
                    };
                    break;
                }
                default: {
                    column.formatter = (cell) => {
                        const value = cell.getValue();
                        if (value === undefined || value === null) {
                            return '';
                        }
                        return String(value).trim();
                    };
                }
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
        this.tabulator = new Tabulator(this.container, {
            data: this.data,
            columns: this.buildColumns(),
            layout: 'fitColumns',
            selectable: 1,
            index: this.keyFieldName || undefined,
            sortMode: 'local',
            placeholder: this.options.placeholder,
            theme: 'bootstrap5',
            rowClick: (_, row) => {
                this.selectRow(row);
            },
            rowDblClick: (_, row) => {
                this.selectRow(row);
                this.fireEvent('doubleClick', row);
            }
        });

        this.columnsDirty = false;

        this.tabulator.on('tableBuilt', () => {
            this.tabulatorReady = true;
            if (this.pendingBuild) {
                this.pendingBuild = false;
                this.build();
            }
        });

        this.tabulator.on('rowSelectionChanged', (data, rows) => {
            this.selectedRow = rows && rows[0] ? rows[0] : null;
            if (this.selectedRow) {
                this.fireEvent('select', this.selectedRow, data[0]);
            }
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
                if (typeof this.options.onSortChange === 'function') {
                    this.options.onSortChange();
                }
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

        let columnsPromise;
        if (this.columnsDirty) {
            const columns = this.buildColumns();
            const result = this.tabulator.setColumns(columns);
            if (result && typeof result.then === 'function') {
                columnsPromise = result.then(() => { this.columnsDirty = false; });
            } else {
                this.columnsDirty = false;
                columnsPromise = Promise.resolve();
            }
        } else {
            columnsPromise = Promise.resolve();
        }

        const applyData = () => Promise.resolve(this.tabulator.replaceData(this.data || []))
            .then(() => {
                if (this.sort.field && this.sort.order) {
                    this.silentSortUpdate = true;
                    try {
                        this.tabulator.setSort([{ column: this.sort.field, dir: this.sort.order }]);
                    } catch (e) {
                        try {
                            this.silentSortUpdate = true;
                            this.tabulator.setSort(this.sort.field, this.sort.order);
                        } catch (ignored) {}
                    }
                    setTimeout(() => { this.silentSortUpdate = false; }, 0);
                } else {
                    this.silentSortUpdate = true;
                    this.tabulator.clearSort();
                    setTimeout(() => { this.silentSortUpdate = false; }, 0);
                }

                if (previouslySelectedRecordKey && this.dataKeyExists(previouslySelectedRecordKey)) {
                    this.selectByKey(previouslySelectedRecordKey);
                } else {
                    const rows = this.tabulator.getRows();
                    if (rows && rows.length) {
                        rows[0].select();
                    } else {
                        this.deselectItem();
                    }
                }
            });

        columnsPromise
            .then(() => {
                setTimeout(() => {
                    applyData().catch((error) => {
                        console.error('Grid build failed', error);
                    });
                }, 0);
            })
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

        // --- Grid ---
        this.grid = new Grid(this.element.querySelector('[data-role="grid"]'), {
            onSelect: this.onSelect.bind(this),
            onSortChange: this.onSortChange.bind(this),
            onDoubleClick: this.onDoubleClick.bind(this),
        });

        // --- Tabs ---
        this.tabPane = new TabPane(this.element, { onTabChange: this.onTabChange.bind(this) });

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
    }

    // --- Move Element ID API ---
    setMvElementId(id) { this.mvElementId = id; }
    getMvElementId() { return this.mvElementId; }
    clearMvElementId() { this.mvElementId = null; }

    // --- Toolbar ---
    attachToolbar(toolbar) {
        this.toolbar = toolbar;
        let toolbarContainer = this.tabPane.element.querySelector('[data-pane-part="footer"]');
        if (toolbarContainer) {
            toolbarContainer.appendChild(this.toolbar.getElement());
        } else {
            this.tabPane.element.appendChild(this.toolbar.getElement());
        }
        if (this.toolbar.disableControls) this.toolbar.disableControls();
        if (this.toolbar.bindTo) this.toolbar.bindTo(this);
        // this.reload(); // Можно сделать отложенную загрузку при необходимости
    }

    // --- Tabs ---
    onTabChange(data) {
        if (data instanceof Element) {
            // Ищем внутри .data
            const span = data.querySelector('[data-role="tab-meta"]');
            if (span) {
                // Преобразуем строку к валидному JSON
                const jsonString = span.textContent.replace(/(\w+)\s*:/g, '"$1":');
                data = JSON.parse(jsonString);
            } else {
                throw new Error('Нет .data внутри элемента!');
            }
        } else if (typeof data === 'string') {
            // Если пришла строка
            const jsonString = data.replace(/(\w+)\s*:/g, '"$1":');
            data = JSON.parse(jsonString);
        }
        this.langId = data.lang;
        if (this.filter) this.filter.remove();
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
    onSortChange() { this.loadPage(1); }
    sortChange() { this.loadPage(1); }

    // --- Paging ---
    reload() { this.loadPage(1); }

    loadPage(pageNum) {
        this.pageList.disable();
        if (this.toolbar) this.toolbar.disableControls();
        //this.overlay.show();
        showLoader();
        this.grid.clear();
        if(this.pageList.currentPage)
        {
            pageNum = this.pageList.currentPage;
        }
        // "Delay" replacement for browser layout quirks (setTimeout = 0)
        setTimeout(() => {
            Energine.request(
                this.buildRequestURL(pageNum),
                this.buildRequestPostBody(),
                this.processServerResponse.bind(this),
                null,
                this.processServerError.bind(this)
            );
        }, 0);
    }

    buildRequestURL(pageNum) {
        let url = '';
        if (this.grid.sort && this.grid.sort.order) {
            url = `${this.singlePath}get-data/${this.grid.sort.field}-${this.grid.sort.order}/page-${pageNum}`;
        } else {
            url = `${this.singlePath}get-data/page-${pageNum}`;
        }
        return url;
    }

    buildRequestPostBody() {
        let postBody = '';
        if (this.langId) {
            postBody += `languageID=${this.langId}&`;
        }
        if (this.filter && this.filter.getValue) {
            postBody += this.filter.getValue();
        }
        return postBody;
    }

    processServerResponse(result) {
        let control = false;
        if (this.toolbar && this.toolbar.getControlById) {
            control = this.toolbar.getControlById('add');
        }

        if (!this.initialized) {
            this.grid.setMetadata(result.meta);
            this.initialized = true;
        }
        this.grid.setData(result.data || []);

        if (result.pager) {
            this.pageList.build(result.pager.count, result.pager.current, result.pager.records);
        }
        if (!this.grid.isEmpty()) {
            if (this.toolbar) this.toolbar.enableControls();
            this.pageList.enable();
        }
        if (control) control.enable();
        this.grid.build();
        // this.overlay.hide();
        hideLoader();
    }

    processServerError(responseText) {
        alert(responseText);
        // this.overlay.hide();
        hideLoader();
    }

    processAfterCloseAction(returnValue) {
        if (returnValue) {
            if (returnValue.afterClose && typeof this[returnValue.afterClose] === 'function') {
                this[returnValue.afterClose](null);
            } else {
                this.loadPage(this.pageList.currentPage);
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
                    this.loadPage(this.pageList.currentPage);
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
            this.loadPage.bind(this, this.pageList.currentPage)
        );
    }
    down() {
        Energine.request(
            `${this.singlePath}${this.grid.getSelectedRecordKey()}/down/`,
            (this.filter && this.filter.getValue) ? this.filter.getValue() : null,
            this.loadPage.bind(this, this.pageList.currentPage)
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
            this.use();
            gridManager.reload();
        });
        resetLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.remove();
            gridManager.reload();
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
    }

    // Пометить как активный если есть значения, иначе очистить
    use() {
        if (this.inputs.hasValues && this.inputs.hasValues()) {
            this.element.classList.add('active');
            this.active = true;
        } else {
            this.remove();
        }
        return this.active;
    }

    // Получить строку фильтра
    getValue() {
        let result = '';
        if (this.active && this.inputs.hasValues && this.inputs.hasValues()) {
            const fieldName = this.fields.options[this.fields.selectedIndex].value;
            const fieldCondition = this.condition.options[this.condition.selectedIndex].value;
            if (this.inputs.getValues)
                result = this.inputs.getValues('filter' + fieldName) + `&filter[condition]=${fieldCondition}&`;
        }
        return result;
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
