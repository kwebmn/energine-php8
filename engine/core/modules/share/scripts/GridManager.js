ScriptLoader.load('TabPane', 'PageList', 'Toolbar',  'ModalBox');
class Grid {
    /**
     * @param {HTMLElement|string} element
     * @param {Object} [options]
     */
    constructor(element, options = {}) {
        // Универсальная обертка для работы с элементами по селектору или объекту
        this.element = (typeof element === 'string')
            ? document.querySelector(element)
            : element;

        this.data = [];
        this.metadata = {};
        this.selectedItem = null;
        this.sort = { field: null, order: null };
        this.isDirty = false;
        this.keyFieldName = null;
        this.prevDataLength = 0;
        this.options = options;
        this.events = {};
        this.pendingSelectionKey = null;

        // --- DOM привязка ---
        this.useCombinedTable = false;
        this.table = null;
        this.tbody = null;

        this.headOff = null;

        const combinedTable = this.element.querySelector('[data-role="grid-table"][data-grid-part="table"]');
        if (combinedTable) {
            this.useCombinedTable = true;
            this.table = combinedTable;
            this.tbody = combinedTable.querySelector('tbody');
            if (!this.tbody) {
                this.tbody = document.createElement('tbody');
                combinedTable.appendChild(this.tbody);
            }
            this.headers = Array.from(combinedTable.querySelectorAll('thead th'));
            this.headOff = combinedTable.tHead || null;
            combinedTable.classList.add('table', 'table-hover', 'table-bordered', 'table-sm', 'align-middle', 'mb-0');
        } else {
            this.table = this.element.querySelector('[data-role="grid-table"][data-grid-part="body"]');
            if (this.table) {
                this.headOff = this.table.querySelector('thead');
                if (this.headOff) this.headOff.style.display = 'none';
                this.tbody = this.table.querySelector('tbody');
                this.table.classList.add('table', 'table-hover', 'table-bordered', 'table-sm', 'align-middle', 'mb-0');
            }
            const headTable = this.element.querySelector('[data-grid-section="head"] [data-role="grid-table"]');
            if (headTable) {
                headTable.classList.add('table', 'table-sm', 'align-middle', 'mb-0');
            }
            this.headers = Array.from(this.element.querySelectorAll('[data-grid-section="head"] [data-role="grid-table"] th'));
        }

        if (!this.tbody && this.table) {
            this.tbody = this.table.querySelector('tbody');
            if (!this.tbody) {
                this.tbody = document.createElement('tbody');
                this.table.appendChild(this.tbody);
            }
        }

        this.headers = this.headers || [];
        this.headers.forEach(header => {
            header.addEventListener('click', this.onChangeSort.bind(this));
            header.classList.add('text-center', 'align-middle', 'fw-semibold');
            header.style.cursor = 'pointer';
        });

        this.headers.forEach(header => {
            if (!header.dataset.originalLabel) {
                header.dataset.originalLabel = header.textContent.trim();
            }
        });
        this.refreshSortIndicators();

        this.handleWindowResize = () => {
            this.fitGridFormSize();
        };
        window.addEventListener('resize', this.handleWindowResize);

        // Поддержка событий
        this.on('dirty', () => {
            this.isDirty = true;
        });

        // Структура для дальнейших ссылок
        this.paneContent = null;
        this.gridToolbar = null;
        this.gridHeadContainer = null;
        this.gridContainer = null;
        this.minGridHeight = null;
        this.pane = null;
        this.gridBodyContainer = null;

        this.on('doubleClick', this.options.onDoubleClick);

    }


    // --- Event system ---
    on(event, handler) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(handler);
    }
    off(event, handler) {
        if (this.events[event])
            this.events[event] = this.events[event].filter(fn => fn !== handler);
    }
    fireEvent(event, ...args) {
        if (this.events[event])
            this.events[event].forEach(fn => fn.apply(this, args));
    }

    setMetadata(metadata) {
        for (let fieldName in metadata) {
            if (metadata[fieldName].key) {
                this.keyFieldName = fieldName;
            }
        }
        this.metadata = metadata;
    }
    getMetadata() { return this.metadata; }
    setData(data) {
        if (!this.metadata) {
            alert('Cannot set data without specified metadata.');
            return false;
        }
        this.data = data;
        return true;
    }

    selectItem(item) {
        const current = this.selectedItem;

        if (!item) {
            this.deselectItem();
            return;
        }

        if (item === current) {
            this.deselectItem();
            return;
        }

        if (current) {
            this.deselectItem({ silent: true });
        }

        item.classList.remove('table-active');
        item.classList.add('table-primary');
        this.selectedItem = item;
        this.fireEvent('select', item);
        this.fireEvent('selectionChange', item);
    }
    deselectItem(options = {}) {
        if (this.selectedItem) {
            this.selectedItem.classList.remove('table-active');
            this.selectedItem.classList.remove('table-primary');
        }
        this.selectedItem = null;
        if (!options.silent) {
            this.fireEvent('selectionChange', null);
        }
    }
    getSelectedItem() { return this.selectedItem; }
    isEmpty() { return !this.data || !this.data.length; }

    getSelectedRecord() {
        if (!this.getSelectedItem()) return false;
        return this.getSelectedItem().record;
    }
    getSelectedRecordKey() {
        if (!this.keyFieldName) return false;
        let rec = this.getSelectedRecord();
        return rec ? rec[this.keyFieldName] : false;
    }
    dataKeyExists(key) {
        if (!this.data) return false;
        if (!this.keyFieldName) return false;
        return this.data.some(item => item[this.keyFieldName] == key);
    }

    clear() {
        this.deselectItem();
        while (this.tbody.firstChild) {
            this.tbody.removeChild(this.tbody.firstChild);
        }
    }

    build() {

        let preiouslySelectedRecordKey = this.getSelectedRecordKey();
        if ((preiouslySelectedRecordKey === false || preiouslySelectedRecordKey === undefined || preiouslySelectedRecordKey === null) && this.pendingSelectionKey) {
            preiouslySelectedRecordKey = this.pendingSelectionKey;
        }
        this.pendingSelectionKey = null;
        if (preiouslySelectedRecordKey !== false && preiouslySelectedRecordKey !== undefined && preiouslySelectedRecordKey !== null) {
            preiouslySelectedRecordKey = String(preiouslySelectedRecordKey);
        } else {
            preiouslySelectedRecordKey = null;
        }
        this.selectedItem = null;
        this.clear();

        if (!this.isEmpty()) {
            if (preiouslySelectedRecordKey !== null && !this.dataKeyExists(preiouslySelectedRecordKey)) {
                preiouslySelectedRecordKey = null;
            }
            this.data.forEach((record, id) => {
                this.addRecord(record, id, preiouslySelectedRecordKey);
            });
        } else {
            this.tbody.appendChild(document.createElement('tr'));
        }

        this.paneContent = this.element.closest('[data-role="pane-item"]');
        this.gridToolbar = this.element.querySelector('[data-role="grid-toolbar"]');
        if (this.gridToolbar) {
            this.gridToolbar.classList.add('d-flex', 'flex-wrap', 'align-items-center', 'gap-2', 'mb-3');
        }
        this.gridHeadContainer = this.element.querySelector('[data-grid-section="head"]');
        if (!this.gridHeadContainer && this.useCombinedTable) {
            const fallbackHead = this.element.querySelector('.grid-table-wrapper');
            this.gridHeadContainer = fallbackHead || (this.table ? this.table.parentElement : null);
        }
        if (this.gridHeadContainer && this.gridHeadContainer !== this.table) {
            this.gridHeadContainer.classList.add('table-responsive', 'bg-body-tertiary', 'border', 'border-bottom-0');
        }
        this.gridContainer = this.element.querySelector('[data-grid-section="body"]');
        if (!this.gridContainer && this.useCombinedTable) {
            this.gridContainer = this.gridHeadContainer;
        }
        if (this.gridContainer && this.gridContainer !== this.gridHeadContainer) {
            const bodyClasses = ['table-responsive', 'bg-body', 'border', 'border-top-0'];
            this.gridContainer.classList.add(...bodyClasses);
        }
        this.pane = this.element.closest('[data-role="pane"]');
        this.gridBodyContainer = this.element.querySelector('[data-grid-section="body-inner"]');
        if (!this.gridBodyContainer && this.useCombinedTable && this.table) {
            this.gridBodyContainer = this.table.parentElement;
        }

        this.adjustColumns();
        this.fitGridFormSize();
        this.refreshSortIndicators();

        if (!this.minGridHeight && this.gridContainer) {
            let h = this.gridContainer.style.height;
            this.minGridHeight = h ? parseInt(h, 10) : 300;
            this.fitGridFormSize();
        }
    }

    addRecord(record, id, currentKey) {
        // Проверяем соответствие записи метаданным
        for (let fieldName in record) {
            if (!this.metadata[fieldName]) {
                alert('Grid: record doesn\'t conform to metadata.');
                return;
            }
        }

        let row = document.createElement('tr');
        row.setAttribute('unselectable', 'on');
        this.tbody.appendChild(row);

        row.record = record;

        for (let fieldName in record) {
            this.iterateFields(fieldName, record, row);
        }

        if (row.firstChild) row.firstChild.classList.add('firstColumn');

        const recordKey = record[this.keyFieldName];
        const normalizedRecordKey = (recordKey !== undefined && recordKey !== null) ? String(recordKey) : null;
        if (currentKey !== null && normalizedRecordKey !== null && currentKey === normalizedRecordKey) {
            this.selectItem(row);
            // row.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        // Навешиваем события
        row.addEventListener('mouseover', () => {
            if (row !== this.getSelectedItem()) {
                row.classList.add('highlighted', 'table-active');
            }
        });
        row.addEventListener('mouseout', () => {
            if (row !== this.getSelectedItem()) {
                row.classList.remove('highlighted', 'table-active');
            } else {
                row.classList.remove('highlighted');
            }
        });
        row.addEventListener('click', event => {
            if (event.detail > 1) {
                return;
            }
            this.selectItem(row);
        });
        row.addEventListener('dblclick', () => {
            if (this.getSelectedItem() !== row) {
                this.selectItem(row);
            }
            if (this.getSelectedItem() === row) {
                this.fireEvent('doubleClick');
            }
        });
    }

    iterateFields(fieldName, record, row) {
        if (!this.metadata[fieldName].visible || this.metadata[fieldName].type === 'hidden') {
            return;
        }
        let cell = document.createElement('td');
        row.appendChild(cell);

        const fieldMeta = this.metadata[fieldName];
        const fieldType = fieldMeta.type;
        cell.classList.add('align-middle', 'text-break');
        cell.style.minHeight = '48px';
        cell.style.height = '48px';

        switch (fieldType) {
            case 'boolean': {
                const formCheck = document.createElement('div');
                formCheck.classList.add('form-check', 'm-0', 'd-inline-flex', 'justify-content-center');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.classList.add('form-check-input');
                checkbox.disabled = true;
                const value = record[fieldName];
                const normalized = (value !== undefined && value !== null)
                    ? String(value).toLowerCase()
                    : '';
                checkbox.checked = value === true
                    || value === 1
                    || normalized === '1'
                    || normalized === 'true'
                    || normalized === 'y';
                formCheck.appendChild(checkbox);
                cell.classList.add('text-center');
                cell.appendChild(formCheck);
                break;
            }
            case 'value': {
                const value = (record[fieldName] && record[fieldName].value !== undefined)
                    ? record[fieldName].value
                    : '&nbsp;';
                cell.innerHTML = value;
                break;
            }
            case 'textbox':
                if (record[fieldName] && Object.keys(record[fieldName]).length) {
                    cell.innerHTML = Object.values(record[fieldName]).join(', ');
                } else {
                    cell.innerHTML = '&nbsp;';
                }
                break;
            case 'file':
                if (record[fieldName]) {
                    const imageWrapper = document.createElement('div');
                    imageWrapper.classList.add('d-inline-flex', 'justify-content-center', 'align-items-center');
                    imageWrapper.style.width = '48px';
                    imageWrapper.style.height = '48px';
                    imageWrapper.style.border = '1px solid var(--bs-border-color)';
                    imageWrapper.style.backgroundColor = 'var(--bs-body-bg)';

                    const image = document.createElement('img');
                    image.src = (window.Energine && Energine.resizer ? Energine.resizer : '') + 'w40-h40/' + record[fieldName];
                    image.width = 40;
                    image.height = 40;
                    image.style.objectFit = 'cover';
                    image.style.borderRadius = '2px';
                    const altText = (fieldMeta && fieldMeta.title) ? fieldMeta.title : '';
                    if (altText) image.alt = altText;

                    imageWrapper.appendChild(image);
                    cell.classList.add('text-center');
                    cell.appendChild(imageWrapper);
                } else {
                    cell.innerHTML = '&nbsp;';
                }
                break;
            default: {
                let fieldValue = '';
                if (record[fieldName] || record[fieldName] === 0) {
                    fieldValue = (record[fieldName] + '').trim();
                }
                let prevRow = row.previousElementSibling;
                if (
                    fieldType === 'select' &&
                    row.firstChild === cell &&
                    prevRow &&
                    prevRow.record &&
                    prevRow.record[fieldName] === record[fieldName]
                ) {
                    fieldValue = '';
                    if (prevRow.firstChild) prevRow.firstChild.classList.add('fw-bold');
                }
                cell.innerHTML = fieldValue !== '' ? fieldValue : '&#160;';
            }
        }
    }

    refreshSortIndicators() {
        if (!Array.isArray(this.headers)) {
            return;
        }
        this.headers.forEach(header => this.updateSortIndicator(header));
    }

    updateSortIndicator(header) {
        if (!header) {
            return;
        }
        const baseLabel = header.dataset.originalLabel || header.textContent.trim();
        header.dataset.originalLabel = baseLabel;
        let suffix = '';
        if (header.classList.contains('asc')) {
            suffix = ' ▲';
        } else if (header.classList.contains('desc')) {
            suffix = ' ▼';
        }
        header.textContent = suffix ? `${baseLabel}${suffix}` : baseLabel;
    }

    adjustColumns() {
        if (!this.table || !this.tbody) {
            return;
        }

        const fixedColumns = this.table.dataset.fixedColumns === 'true';
        const tbodyTr = this.tbody.querySelector('tr');
        if (!tbodyTr) {
            return;
        }

        const tds = Array.from(tbodyTr.children);
        const ths = this.headers || [];
        const cols = Array.from(this.table.querySelectorAll('col'));

        if (this.useCombinedTable) {
            if (fixedColumns) {
                this.table.style.tableLayout = 'fixed';
            } else if (tds.length) {
                const widths = tds.map(td => td.offsetWidth);
                widths.forEach((width, index) => {
                    if (cols[index]) {
                        cols[index].style.width = width + 'px';
                    }
                });
            }
        } else {
            const gridHeadContainer = this.gridHeadContainer;
            if (!gridHeadContainer) {
                return;
            }
            const headCols = Array.from(gridHeadContainer.querySelectorAll('col'));
            const bodyCols = Array.from(this.table.querySelectorAll('col'));

            const ScrollBarWidth = 16;
            gridHeadContainer.style.paddingRight = ScrollBarWidth + 'px';

            if (!fixedColumns) {
                let headers = tds.map(td => td.offsetWidth);
                headers.forEach((width, n) => {
                    if (headCols[n]) headCols[n].style.width = width + 'px';
                    if (bodyCols[n]) bodyCols[n].style.width = width + 'px';
                });

                let oversizeHead = ths.map((th, n) => th.offsetWidth > headers[n]);
                if (oversizeHead.some(Boolean)) {
                    let newWidth = ths.map((th, n) => oversizeHead[n] ? th.offsetWidth : 0);
                    let colWidth = [0, 0];
                    headers.forEach((w, n) => {
                        if (oversizeHead[n]) {
                            colWidth[1] += newWidth[n] - w;
                        } else {
                            colWidth[0] += w;
                        }
                    });
                    colWidth[1] += colWidth[0];
                    let scaleCoef = colWidth[0] / colWidth[1];
                    headers = headers.map((w, n) => oversizeHead[n] ? newWidth[n] : Math.floor(w * scaleCoef));
                    headers.forEach((width, n) => {
                        if (headCols[n]) headCols[n].style.width = width + 'px';
                        if (bodyCols[n]) bodyCols[n].style.width = width + 'px';
                    });
                }
            } else {
                let tableParent = this.tbody.parentElement;
                if (tableParent) tableParent.style.tableLayout = 'fixed';
            }
        }

        if (this.tbody.parentElement) {
            this.tbody.parentElement.style.wordWrap = 'break-word';
        }
    }

    fitGridSize() {
        if (!this.gridContainer) {
            return;
        }
        if (this.paneContent) {
            let margin = parseInt(this.element.style.marginTop) || 0;
            let eBToolbar = document.body.querySelector('[data-pane-part="footer"]');
            const headElement = (this.gridHeadContainer && this.gridHeadContainer === this.gridContainer && this.table && this.table.tHead)
                ? this.table.tHead
                : this.gridHeadContainer;
            let gridHeight = this.paneContent.offsetHeight
                - (headElement ? headElement.offsetHeight : 0)
                - (this.gridToolbar ? this.gridToolbar.offsetHeight : 0)
                - margin
                - (eBToolbar ? eBToolbar.offsetHeight : 0);

            if (gridHeight > 0) {
                if (gridHeight < 100) gridHeight = 300;
                this.gridContainer.style.height = gridHeight ;
            }
            else
            {

            }
        }
    }

    fitGridFormSize() {
        if (!this.gridContainer) {
            return;
        }

        if (!this.pane) {
            this.fitGridSize();
            return;
        }

        const toolbarHeight = this.gridToolbar ? this.gridToolbar.offsetHeight : 0;
        const headElement = (this.gridHeadContainer && this.gridHeadContainer === this.gridContainer && this.table && this.table.tHead)
            ? this.table.tHead
            : this.gridHeadContainer;
        const gridHeadHeight = headElement ? headElement.offsetHeight : 0;
        const paneToolbarTop = this.pane.querySelector('[data-pane-part="header"]');
        const paneToolbarBottom = this.pane.querySelector('[data-pane-part="footer"]');
        const paneToolbarTopHeight = paneToolbarTop ? paneToolbarTop.offsetHeight : 0;
        const paneToolbarBottomHeight = paneToolbarBottom ? paneToolbarBottom.offsetHeight : 0;
        const paneHeight = this.pane.offsetHeight;
        const margin = parseInt(this.element.style.marginTop, 10) || 0;
        const gridBodyContainer = this.gridBodyContainer
            || this.element.querySelector('[data-grid-section="body-inner"]');
        let gridBodyHeight = (gridBodyContainer ? gridBodyContainer.offsetHeight : 0)
            + parseInt(window.getComputedStyle(this.gridContainer).borderTopWidth || 0, 10)
            + parseInt(window.getComputedStyle(this.gridContainer).borderBottomWidth || 0, 10);

        if (this.minGridHeight && gridBodyHeight < this.minGridHeight) {
            gridBodyHeight = this.minGridHeight;
        }

        const totalHeight = toolbarHeight
            + gridHeadHeight
            + gridBodyHeight
            + paneToolbarTopHeight
            + paneToolbarBottomHeight
            + margin
            + 3;
        const viewportHeight = window.innerHeight;
        let freeSpace = viewportHeight;

        if ((document.body.scrollHeight - 16 - 81) < viewportHeight) {
            freeSpace -= (this.pane.offsetTop + 16 + 81);
        }

        if (totalHeight > paneHeight) {
            this.pane.style.height = ((totalHeight > freeSpace) ? freeSpace : totalHeight) + 'px';
        }

        this.fitGridSize();
    }

    // --- Sorting
    onChangeSort(event) {
        const getNextDirectionOrderItem = current => {
            const sortDirectionOrder = ['', 'asc', 'desc'];
            const currentIndex = sortDirectionOrder.indexOf(current || '');
            if (currentIndex === -1) {
                return sortDirectionOrder[0];
            }
            return sortDirectionOrder[(currentIndex + 1) % sortDirectionOrder.length];
        };

        const header = event.currentTarget || event.target;
        const sortFieldName = header.getAttribute('name');
        const hasAsc = header.classList.contains('asc');
        const hasDesc = header.classList.contains('desc');
        const sortDirection = hasAsc ? 'asc' : hasDesc ? 'desc' : '';


        if (this.metadata[sortFieldName] && this.metadata[sortFieldName].sort === 1) {
            this.sort.field = sortFieldName;
            this.sort.order = getNextDirectionOrderItem(sortDirection);

            header.classList.remove('asc', 'desc');
            if (this.sort.order) {
                header.classList.add(this.sort.order);
            }

            this.fireEvent('sortChange');
            this.options.onSortChange();
            this.refreshSortIndicators();
        }
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
        this.grid.on('selectionChange', this.handleSelectionChange.bind(this));

        this.selectionControls = [];
        this.hasSelection = false;

        // --- Tabs ---
        this.tabPane = new TabPane(this.element, { onTabChange: this.onTabChange.bind(this) });

        if (this.tabPane && typeof this.tabPane.getCurrentTab === 'function') {
            const activeTab = this.tabPane.getCurrentTab();
            if (activeTab && activeTab.data && activeTab.data.lang) {
                this.langId = activeTab.data.lang;
            }
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

        if (Array.isArray(this.toolbar.controls)) {
            this.toolbar.controls.forEach(control => {
                const element = control && control.element;
                if (element && element.classList && element.classList.contains('btn-sm')) {
                    element.classList.remove('btn-sm');
                }
            });
        }

        this.setupSelectionControls();
        // this.reload(); // Можно сделать отложенную загрузку при необходимости
    }

    handleSelectionChange(item) {
        this.hasSelection = !!item;
        this.updateSelectionDependentControls(this.hasSelection);
    }

    setupSelectionControls() {
        if (!this.toolbar || !Array.isArray(this.toolbar.controls)) {
            this.selectionControls = [];
            return;
        }

        const keywordsExact = ['view', 'edit', 'del', 'delete', 'use', 'up', 'down', 'open', 'preview'];
        const keywordsPrefix = ['move', 'activate', 'deactivate', 'approve', 'decline', 'restore', 'publish', 'unpublish', 'archive', 'unarchive', 'assign', 'unassign', 'lock', 'unlock', 'block', 'unblock', 'ban', 'unban', 'send', 'resend', 'select', 'clone', 'copy', 'download', 'remove', 'reject', 'disable', 'enable', 'suspend', 'resume'];

        this.selectionControls = this.toolbar.controls.filter(control => this.isSelectionDependentControl(control, keywordsExact, keywordsPrefix));
        this.selectionControls.forEach(control => {
            if (control && control.element) {
                control.element.dataset.requiresSelection = 'true';
            }
            control._disabledBySelection = false;
        });

        this.updateSelectionDependentControls(!!this.grid.getSelectedItem());
    }

    isSelectionDependentControl(control, keywordsExact, keywordsPrefix) {
        if (!control || !control.properties) {
            return false;
        }
        const action = (control.properties.action || '').toLowerCase();
        const id = (control.properties.id || '').toLowerCase();

        if (!action && !id) {
            return false;
        }

        if (keywordsExact.includes(action) || keywordsExact.includes(id)) {
            return true;
        }

        return keywordsPrefix.some(prefix => action.startsWith(prefix) || id.startsWith(prefix));
    }

    updateSelectionDependentControls(hasSelection) {
        if (!Array.isArray(this.selectionControls) || !this.selectionControls.length) {
            return;
        }

        this.selectionControls.forEach(control => {
            if (!control) return;

            const initiallyDisabled = typeof control.initially_disabled === 'function'
                ? control.initially_disabled()
                : false;

            if (!hasSelection) {
                if (initiallyDisabled) {
                    return;
                }

                const alreadyDisabled = typeof control.disabled === 'function'
                    ? control.disabled()
                    : false;

                if (!alreadyDisabled && typeof control.disable === 'function') {
                    control.disable();
                    control._disabledBySelection = true;
                }
            } else if (control._disabledBySelection && typeof control.enable === 'function') {
                control.enable();
                control._disabledBySelection = false;
            }
        });
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
        const currentSelectionKey = this.grid.getSelectedRecordKey();
        if (currentSelectionKey !== false && currentSelectionKey !== undefined && currentSelectionKey !== null) {
            this.gridPendingSelection = String(currentSelectionKey);
        } else {
            this.gridPendingSelection = null;
        }

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
        const parts = [];
        if (this.langId) {
            parts.push(`languageID=${encodeURIComponent(this.langId)}`);
        }
        if (this.filter && typeof this.filter.getValue === 'function') {
            const filterQuery = this.filter.getValue();
            if (filterQuery) {
                parts.push(filterQuery);
            }
        }
        return parts.join('&');
    }

    processServerResponse(result) {
        let control = false;
        if (this.toolbar && this.toolbar.getControlById) {
            control = this.toolbar.getControlById('add');
        }

        const pendingSelection = this.gridPendingSelection || null;
        this.gridPendingSelection = null;

        if (!this.initialized) {
            this.grid.setMetadata(result.meta);
            this.initialized = true;
        }
        this.grid.setData(result.data || []);
        if (pendingSelection !== null) {
            this.grid.pendingSelectionKey = pendingSelection;
        }

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
        let prevRow;
        let curr = this.grid.getSelectedItem();
        if (curr && (prevRow = curr.previousElementSibling)) {
            this.grid.selectItem(prevRow);
            this.edit();
        }
    }
    editNext() {
        let nextRow;
        let curr = this.grid.getSelectedItem();
        if (curr && (nextRow = curr.nextElementSibling)) {
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
        const payload = (this.filter && typeof this.filter.getValue === 'function') ? this.filter.getValue() : null;
        Energine.request(
            `${this.singlePath}${this.grid.getSelectedRecordKey()}/up/`,
            payload || undefined,
            this.loadPage.bind(this, this.pageList.currentPage)
        );
    }
    down() {
        const payload = (this.filter && typeof this.filter.getValue === 'function') ? this.filter.getValue() : null;
        Energine.request(
            `${this.singlePath}${this.grid.getSelectedRecordKey()}/down/`,
            payload || undefined,
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

        this.element.classList.add('row', 'row-cols-lg-auto', 'g-3', 'align-items-center', 'w-100', 'border', 'border-light-subtle', 'bg-body', 'px-3', 'py-3');
        this.element.classList.remove('mb-3');

        // Привязки к основным элементам управления
        const applyButton = this.element.querySelector('[data-action="apply-filter"]');
        const resetLink = this.element.querySelector('[data-action="reset-filter"]');
        this.active = false;

        if (applyButton) {
            applyButton.classList.add('btn', 'btn-primary', 'btn-sm', 'd-inline-flex', 'align-items-center', 'gap-2');
        }
        if (resetLink) {
            resetLink.classList.remove('btn-link', 'p-0', 'text-decoration-none');
            resetLink.classList.add('btn', 'btn-outline-secondary', 'btn-sm', 'd-inline-flex', 'align-items-center', 'gap-2');
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
        if (!this.active || !this.inputs.hasValues || !this.inputs.hasValues()) {
            return '';
        }

        const fieldOption = this.fields.options[this.fields.selectedIndex];
        if (!fieldOption || !fieldOption.value) {
            return '';
        }

        const pathMatch = /^\[([^\]]+)]\[([^\]]+)]$/.exec(fieldOption.value);
        if (!pathMatch) {
            return '';
        }

        const [, tableName, columnName] = pathMatch;
        const values = (this.inputs.getValues && this.inputs.getValues()) || [];
        if (!Array.isArray(values) || values.length === 0) {
            return '';
        }

        const conditionOption = this.condition.options[this.condition.selectedIndex];
        const fieldCondition = conditionOption ? conditionOption.value : '';
        if (!fieldCondition) {
            return '';
        }

        if (fieldCondition === 'between' && values.length !== 2) {
            return '';
        }

        const baseKey = `filter[${tableName}][${columnName}]`;
        const encodedValues = values.map(value => `${baseKey}[]=${encodeURIComponent(value)}`);
        encodedValues.push(`filter[condition]=${encodeURIComponent(fieldCondition)}`);
        return encodedValues.join('&');
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

        const containerList = Array.from(containers).filter(Boolean);
        if (containerList.length === 1) {
            const firstContainer = containerList[0];
            const containerClone = firstContainer.cloneNode(false);
            if (containerClone.hasAttribute('id')) containerClone.removeAttribute('id');
            const clonedInput = document.createElement('input');
            clonedInput.type = 'text';
            clonedInput.classList.add('form-control', 'form-control-sm');
            clonedInput.setAttribute('data-role', 'filter-query-input');
            containerClone.appendChild(clonedInput);

            const wrapper = firstContainer.closest('.col');
            if (wrapper && wrapper.parentNode) {
                const wrapperClone = wrapper.cloneNode(false);
                if (wrapperClone.hasAttribute('id')) wrapperClone.removeAttribute('id');
                wrapperClone.appendChild(containerClone);
                wrapper.parentNode.insertBefore(wrapperClone, wrapper.nextSibling);
            } else if (firstContainer.parentNode) {
                firstContainer.parentNode.insertBefore(containerClone, firstContainer.nextSibling);
            }

            containerList.push(containerClone);
        }

        this.containers = containerList;
        this.wrapperMap = new Map();
        this.wrapperGroups = new Map();

        this.containers.forEach((container, index) => {
            container.classList.add('d-flex', 'flex-nowrap', 'align-items-center', 'gap-2');
            container.classList.remove('mb-2');
            const wrapper = container.closest('.col');
            if (wrapper) {
                this.wrapperMap.set(container, wrapper);
                if (!this.wrapperGroups.has(wrapper)) {
                    this.wrapperGroups.set(wrapper, new Set());
                }
                this.wrapperGroups.get(wrapper).add(container);
            }
            this.setVisibility(container, index === 0);
        });

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

    // Получить активные инпуты (учитывая режим даты)
    getActiveInputs() {
        return (this.isDate ? this.dpsInputs : this.inputs).filter(Boolean);
    }

    // Проверяет: есть ли значения в активных инпутах
    hasValues() {
        return this.getActiveInputs().some(el => el && el.value !== '');
    }

    // Очищает все инпуты (текстовые и для дат)
    empty() {
        [...this.dpsInputs, ...this.inputs].forEach(el => { if (el) el.value = ''; });
    }

    // Возвращает массив введённых значений (в порядке отображения)
    getValues() {
        return this.getActiveInputs()
            .map(input => (typeof input.value === 'string') ? input.value : '')
            .filter(value => value !== '');
    }

    // Включить режим "между" (2 инпута), сделать маленькими
    asPeriod() {
        this.containers.forEach((container, index) => {
            this.setVisibility(container, index < 2);
        });
    }

    // Включить режим одного инпута, остальные скрыть и убрать "маленькость"
    asScalar() {
        this.containers.forEach((container, index) => {
            this.setVisibility(container, index === 0);
        });
    }

    // Показать все контейнеры
    show() {
        this.containers.forEach(container => this.setVisibility(container, true));
    }

    // Скрыть все контейнеры
    hide() {
        this.containers.forEach(container => this.setVisibility(container, false));
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

    setVisibility(container, visible) {
        if (!container) return;
        container.classList.toggle(this.hiddenClass, !visible);
        if (!this.wrapperMap) return;
        const wrapper = this.wrapperMap.get(container);
        if (!wrapper) return;

        const group = this.wrapperGroups && this.wrapperGroups.get(wrapper);
        if (group && group.size > 0) {
            const shouldShowWrapper = Array.from(group).some(node => node && !node.classList.contains(this.hiddenClass));
            wrapper.classList.toggle(this.hiddenClass, !shouldShowWrapper);
        } else {
            wrapper.classList.toggle(this.hiddenClass, !visible);
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
