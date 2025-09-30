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
        this.activeSortColumnIndex = null;
        this.columnResizeState = null;
        this.isColumnResizing = false;
        this.columnResizeSuppressSort = false;
        this.handleColumnResizeMove = this.handleColumnResizeMove.bind(this);
        this.stopColumnResize = this.stopColumnResize.bind(this);
        this.handleGridBodyScroll = this.handleGridBodyScroll.bind(this);

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
            header.classList.add('text-center', 'align-middle', 'fw-semibold', 'position-relative');
            header.style.cursor = 'pointer';
        });

        this.headers.forEach(header => {
            if (!header.dataset.originalLabel) {
                header.dataset.originalLabel = header.textContent.trim();
            }
        });
        this.enableColumnResize();
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
        this.gridHeadScrollContainer = null;
        this.gridBodyScrollElement = null;
        this.boundGridBodyScrollElement = null;
        this.tabShownHandler = null;

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

        item.classList.remove('table-active', 'table-primary', 'bg-primary', 'text-white');
        item.classList.add('table-primary');
        this.selectedItem = item;
        this.fireEvent('select', item);
        this.fireEvent('selectionChange', item);
        this.updateSortHighlight();
    }
    deselectItem(options = {}) {
        if (this.selectedItem) {
            this.selectedItem.classList.remove('table-active', 'table-primary', 'bg-primary', 'text-white');
        }
        this.selectedItem = null;
        if (!options.silent) {
            this.fireEvent('selectionChange', null);
        }
        this.updateSortHighlight();
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
        this.clearSortHighlight();
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
            this.gridToolbar.classList.add('d-flex', 'flex-wrap', 'align-items-center');
        }
        this.gridHeadContainer = this.element.querySelector('[data-grid-role="head"], [data-grid-section="head"]');
        if (!this.gridHeadContainer && this.useCombinedTable) {
            const fallbackHead = this.element.querySelector('.grid-table-wrapper');
            this.gridHeadContainer = fallbackHead || (this.table ? this.table.parentElement : null);
        }
        if (this.gridHeadContainer && this.gridHeadContainer !== this.table) {
            if (!this.gridHeadContainer.classList.contains('grid-head')) {
                this.gridHeadContainer.classList.add('table-responsive', 'bg-body-tertiary', 'border', 'border-bottom-0');
            }
        }
        this.gridContainer = this.element.querySelector('[data-grid-section="body"]');
        if (!this.gridContainer && this.useCombinedTable) {
            this.gridContainer = this.gridHeadContainer;
        }
        if (this.gridContainer && this.gridContainer !== this.gridHeadContainer) {
            if (!this.gridContainer.classList.contains('grid-table-wrapper')) {
                const bodyClasses = ['table-responsive', 'bg-body', 'border', 'border-top-0'];
                this.gridContainer.classList.add(...bodyClasses);
            }
            if (!this.gridContainer.style.minHeight || this.gridContainer.style.minHeight === '' || this.gridContainer.style.minHeight === 'auto') {
                this.gridContainer.style.minHeight = '0';
            }
        }
        this.pane = this.element.closest('[data-role="pane"]');
        this.gridBodyContainer = this.element.querySelector('[data-grid-section="body-inner"]');
        if (!this.gridBodyContainer && this.useCombinedTable && this.table) {
            this.gridBodyContainer = this.table.parentElement;
        }

        this.setupGridScrollSync();

        this.prepareGridLayoutContainers();
        this.bindTabActivationHandler();

        this.adjustColumns();
        this.fitGridFormSize();
        this.refreshSortIndicators();
        this.enableColumnResize();

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

    prepareGridLayoutContainers() {
        if (this.element && (!this.element.style.minHeight || this.element.style.minHeight === '' || this.element.style.minHeight === 'auto')) {
            this.element.style.minHeight = '0';
        }

        if (!this.paneContent) {
            return;
        }

        const tabContent = (this.paneContent.parentElement && this.paneContent.parentElement.classList
            && this.paneContent.parentElement.classList.contains('tab-content'))
            ? this.paneContent.parentElement
            : null;
        const paneBody = this.paneContent.closest('[data-pane-part="body"]');
        const paneRoot = this.paneContent.closest('[data-role="pane"]');

        if (paneBody) {
            paneBody.classList.add('d-flex', 'flex-column');
        }

        if (tabContent) {
            tabContent.classList.add('flex-grow-1');
            if (!tabContent.classList.contains('d-flex')) {
                tabContent.classList.add('d-flex', 'flex-column');
            }
        }

        this.paneContent.classList.add('flex-grow-1');
        if (!this.paneContent.style.flexBasis) {
            this.paneContent.style.flexBasis = 'auto';
        }

        const nodesToNormalize = [this.paneContent, paneBody, paneRoot, tabContent].filter(Boolean);

        nodesToNormalize.forEach(node => {
            if (!node) return;
            if (!node.style.minHeight || node.style.minHeight === '' || node.style.minHeight === 'auto') {
                node.style.minHeight = '0';
            }
            try {
                const computed = window.getComputedStyle(node);
                if (computed.display.includes('flex') && computed.overflow === 'visible') {
                    node.style.overflow = 'hidden';
                }
            } catch (e) {
                // Ignore layout read errors in environments without layout engine
            }
        });
    }

    bindTabActivationHandler() {
        if (this.tabShownHandler || !this.paneContent || !this.paneContent.id) {
            return;
        }

        this.tabShownHandler = event => {
            if (!event || !event.target) {
                return;
            }

            let targetId = event.target.getAttribute('data-bs-target')
                || event.target.getAttribute('href')
                || event.target.getAttribute('aria-controls');

            if (!targetId) {
                return;
            }

            if (targetId.indexOf('#') !== -1) {
                targetId = targetId.substring(targetId.indexOf('#') + 1);
            }

            if (targetId !== this.paneContent.id) {
                return;
            }

            window.requestAnimationFrame(() => {
                this.fitGridFormSize();
                this.syncGridHeadScroll();
            });
        };

        document.addEventListener('shown.bs.tab', this.tabShownHandler);
    }

    setupGridScrollSync() {
        if (this.boundGridBodyScrollElement) {
            this.boundGridBodyScrollElement.removeEventListener('scroll', this.handleGridBodyScroll);
        }

        const headInner = this.gridHeadContainer
            ? (this.gridHeadContainer.querySelector('[data-grid-section="head-inner"]') || this.gridHeadContainer)
            : null;
        const bodyInner = this.gridBodyContainer
            || this.element.querySelector('[data-grid-section="body-inner"]')
            || this.gridContainer;

        if (!headInner || !bodyInner || headInner === bodyInner) {
            this.gridHeadScrollContainer = null;
            this.gridBodyScrollElement = null;
            this.boundGridBodyScrollElement = null;
            return;
        }

        this.gridHeadScrollContainer = headInner;
        this.gridBodyScrollElement = bodyInner;
        this.boundGridBodyScrollElement = bodyInner;

        Grid.ensureHeadScrollSuppression(headInner);
        this.syncGridHeadScroll();

        bodyInner.addEventListener('scroll', this.handleGridBodyScroll, { passive: true });
    }

    handleGridBodyScroll() {
        this.syncGridHeadScroll();
    }

    syncGridHeadScroll() {
        if (!this.gridHeadScrollContainer || !this.gridBodyScrollElement) {
            return;
        }

        const scrollLeft = this.gridBodyScrollElement.scrollLeft;
        if (this.gridHeadScrollContainer.scrollLeft !== scrollLeft) {
            this.gridHeadScrollContainer.scrollLeft = scrollLeft;
        }
    }

    iterateFields(fieldName, record, row) {
        if (!this.metadata[fieldName].visible || this.metadata[fieldName].type === 'hidden') {
            return;
        }
        let cell = document.createElement('td');
        row.appendChild(cell);

        const fieldMeta = this.metadata[fieldName];
        const fieldType = fieldMeta.type;
        cell.classList.add('align-middle', 'text-break', 'py-1');

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
        this.updateSortHighlight();
    }

    updateSortIndicator(header) {
        if (!header) {
            return;
        }
        const baseLabel = header.dataset.originalLabel || header.textContent.trim();
        header.dataset.originalLabel = baseLabel;

        const existingResizer = header.querySelector('.grid-column-resizer');
        const existingIndicator = header.querySelector('.grid-sort-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        let label = header.querySelector('.grid-header-label');
        if (!label) {
            label = document.createElement('span');
            label.className = 'grid-header-label';
        }
        label.textContent = baseLabel;

        header.textContent = '';
        header.appendChild(label);
        if (existingResizer) {
            existingResizer.remove();
        }

        let indicator = '';
        if (header.classList.contains('asc')) {
            indicator = '▲';
        } else if (header.classList.contains('desc')) {
            indicator = '▼';
        }

        if (indicator) {
        const indicatorEl = document.createElement('span');
            indicatorEl.className = 'grid-sort-indicator text-secondary ms-2 fw-semibold';
            indicatorEl.textContent = indicator;
            header.appendChild(indicatorEl);
        }

        if (existingResizer) {
            header.appendChild(existingResizer);
        } else if (header.classList.contains('position-relative')) {
            // Ensure resizer restored when missing
            this.enableColumnResize();
        }
    }

    enableColumnResize() {
        if (!Array.isArray(this.headers) || !this.headers.length) {
            return;
        }

        this.headers.forEach((header, index) => {
            if (!header) {
                return;
            }

            header.classList.add('position-relative');

            if (!header.querySelector('.grid-column-resizer')) {
                const resizer = document.createElement('span');
                resizer.className = 'grid-column-resizer position-absolute top-0 end-0 h-100';
                resizer.style.width = '10px';
                resizer.style.cursor = 'col-resize';
                resizer.style.userSelect = 'none';
                resizer.style.transform = 'translateX(50%)';
                resizer.style.display = 'flex';
                resizer.style.alignItems = 'center';
                resizer.style.justifyContent = 'center';

                const handle = document.createElement('span');
                handle.style.width = '2px';
                handle.style.height = '50%';
                handle.style.backgroundColor = 'var(--bs-border-color)';
                handle.style.opacity = '0.3';
                resizer.appendChild(handle);

                resizer.addEventListener('mousedown', event => this.startColumnResize(event, index));
                header.appendChild(resizer);
            }
        });
    }

    updateSortHighlight() {
        if (!Array.isArray(this.headers)) {
            return;
        }

        let activeIndex = -1;
        this.headers.forEach((header, index) => {
            if (header.classList.contains('asc') || header.classList.contains('desc')) {
                activeIndex = index;
            }
        });

        if (activeIndex !== -1 && this.sort.order) {
            this.applySortHighlight(activeIndex);
        } else {
            this.clearSortHighlight();
        }
    }

    applySortHighlight(index) {
        if (typeof index !== 'number' || index < 0) {
            this.clearSortHighlight();
            return;
        }

        if (this.activeSortColumnIndex === index) {
            return;
        }

        this.clearSortHighlight();

        const header = this.headers[index];
        if (header) {
            header.classList.add('bg-light');
        }

        this.getColumnCells(index).forEach(cell => {
            cell.classList.add('bg-light');
        });

        const selectedRow = this.getSelectedItem();
        if (selectedRow) {
            const selectedCells = selectedRow.querySelectorAll(`td:nth-child(${index + 1})`);
            selectedCells.forEach(cell => cell.classList.remove('table-active'));
        }

        this.activeSortColumnIndex = index;
    }

    clearSortHighlight() {
        if (typeof this.activeSortColumnIndex === 'number' && this.activeSortColumnIndex >= 0) {
            const header = this.headers[this.activeSortColumnIndex];
            if (header) {
                header.classList.remove('bg-light');
            }

            this.getColumnCells(this.activeSortColumnIndex).forEach(cell => {
                cell.classList.remove('bg-light');
            });
        }

        this.activeSortColumnIndex = null;
    }

    getColumnCells(index) {
        if (!this.table || index < 0) {
            return [];
        }
        return Array.from(this.table.querySelectorAll(`tbody tr td:nth-child(${index + 1})`));
    }

    getHeadTableElement() {
        if (!this.gridHeadContainer || this.gridHeadContainer === this.table) {
            return this.table;
        }
        if (this.gridHeadContainer.tagName === 'TABLE') {
            return this.gridHeadContainer;
        }
        return this.gridHeadContainer.querySelector('table');
    }

    getColumnElements(index) {
        const result = [];
        const collect = tableEl => {
            if (!tableEl) {
                return;
            }
            const colgroup = tableEl.querySelector('colgroup');
            if (!colgroup) {
                return;
            }
            const col = colgroup.children[index];
            if (col && !result.includes(col)) {
                result.push(col);
            }
        };

        collect(this.table);
        const headTable = this.getHeadTableElement();
        if (headTable && headTable !== this.table) {
            collect(headTable);
        }

        return result;
    }

    startColumnResize(event, index) {
        event.preventDefault();
        event.stopPropagation();

        const header = this.headers ? this.headers[index] : null;
        if (!header) {
            return;
        }

        const colElements = this.getColumnElements(index);
        if (!colElements.length) {
            return;
        }

        const initialWidth = header.offsetWidth;

        if (this.table) {
            this.table.style.tableLayout = 'fixed';
        }
        const headTable = this.getHeadTableElement();
        if (headTable) {
            headTable.style.tableLayout = 'fixed';
        }

        this.columnResizeState = {
            index,
            startX: event.clientX,
            startWidth: initialWidth,
            header,
            colElements
        };

        this.isColumnResizing = true;
        document.body.classList.add('user-select-none');
        document.addEventListener('mousemove', this.handleColumnResizeMove);
        document.addEventListener('mouseup', this.stopColumnResize);
    }

    handleColumnResizeMove(event) {
        if (!this.columnResizeState) {
            return;
        }

        const { startX, startWidth, header, colElements, index } = this.columnResizeState;
        let newWidth = startWidth + (event.clientX - startX);
        const MIN_WIDTH = 80;
        newWidth = Math.max(MIN_WIDTH, newWidth);

        if (header) {
            header.style.width = `${newWidth}px`;
            header.style.minWidth = `${newWidth}px`;
        }

        colElements.forEach(col => {
            col.style.width = `${newWidth}px`;
            col.style.minWidth = `${newWidth}px`;
        });

        this.getColumnCells(index).forEach(cell => {
            cell.style.width = `${newWidth}px`;
            cell.style.minWidth = `${newWidth}px`;
        });
    }

    stopColumnResize() {
        this.columnResizeState = null;
        this.isColumnResizing = false;
        this.columnResizeSuppressSort = true;
        setTimeout(() => {
            this.columnResizeSuppressSort = false;
        }, 0);
        document.body.classList.remove('user-select-none');
        document.removeEventListener('mousemove', this.handleColumnResizeMove);
        document.removeEventListener('mouseup', this.stopColumnResize);

        if (this.table) {
            this.table.style.tableLayout = '';
        }
        const headTable = this.getHeadTableElement();
        if (headTable && headTable !== this.table) {
            headTable.style.tableLayout = '';
        }
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

        if (this.paneContent && !this.paneContent.offsetParent) {
            return;
        }

        const headElement = (this.gridHeadContainer && this.gridHeadContainer === this.gridContainer && this.table && this.table.tHead)
            ? this.table.tHead
            : this.gridHeadContainer;

        let gridHeight = null;

        if (this.paneContent) {
            const margin = parseInt(this.element.style.marginTop, 10) || 0;
            const externalToolbar = this.pane
                ? this.pane.querySelector('[data-pane-part="footer"]')
                : null;
            const toolbarHeight = this.gridToolbar ? this.gridToolbar.offsetHeight : 0;
            const headHeight = headElement ? headElement.offsetHeight : 0;
            const externalToolbarHeight = externalToolbar ? externalToolbar.offsetHeight : 0;

            gridHeight = this.paneContent.offsetHeight
                - headHeight
                - toolbarHeight
                - margin
                - externalToolbarHeight;

            if (gridHeight < 0) {
                gridHeight = 0;
            }

            if (this.gridContainer === this.gridHeadContainer && headElement) {
                gridHeight += headHeight;
            }
        }

        const viewportLimit = this.getGridViewportLimit();
        const paneHeight = this.paneContent ? this.paneContent.offsetHeight : null;
        const minHeightBaseline = this.minGridHeight || 300;

        let effectiveMinHeight = minHeightBaseline;
        if (paneHeight) {
            effectiveMinHeight = Math.min(effectiveMinHeight, paneHeight);
        }
        if (viewportLimit !== null) {
            effectiveMinHeight = Math.min(effectiveMinHeight, viewportLimit);
        }

        if (gridHeight === null) {
            gridHeight = effectiveMinHeight;
        } else {
            gridHeight = Math.max(gridHeight, effectiveMinHeight);
        }

        if (viewportLimit !== null) {
            gridHeight = Math.min(gridHeight, viewportLimit);
        }

        const paneLimit = this.getPaneContentLimit();
        if (paneLimit !== null) {
            gridHeight = Math.min(gridHeight, paneLimit);
        }

        if (gridHeight > 0) {
            this.gridContainer.style.height = gridHeight + 'px';
            this.gridContainer.style.minHeight = '0px';
            this.gridContainer.style.overflowY = 'auto';
            this.gridContainer.style.overflowX = 'hidden';
        } else {
            this.gridContainer.style.removeProperty('height');
            this.gridContainer.style.removeProperty('min-height');
            this.gridContainer.style.removeProperty('overflow-y');
            this.gridContainer.style.removeProperty('overflow-x');
        }

        this.syncGridHeadScroll();
    }

    getGridViewportLimit() {
        if (!this.gridContainer) {
            return null;
        }

        try {
            const parsePixels = value => {
                const numeric = Number.parseFloat(value);
                return Number.isFinite(numeric) ? numeric : 0;
            };

            const rect = this.gridContainer.getBoundingClientRect();
            const { height: viewportHeight, offsetTop } = this.getViewportBox();

            if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) {
                return null;
            }

            if (!rect || !Number.isFinite(rect.top)) {
                return null;
            }

            const styles = window.getComputedStyle(this.gridContainer);
            const marginBottom = parsePixels(styles.marginBottom);
            const paddingBottom = parsePixels(styles.paddingBottom);
            const borderBottom = parsePixels(styles.borderBottomWidth);

            const distanceFromViewportTop = rect.top - offsetTop;
            let available = viewportHeight - distanceFromViewportTop - marginBottom - paddingBottom - borderBottom;

            if (this.pane) {
                const subtractPaneSpace = element => {
                    if (!element || !element.offsetParent) {
                        return 0;
                    }

                    const elementStyles = window.getComputedStyle(element);
                    const elementMarginTop = parsePixels(elementStyles.marginTop);
                    const elementMarginBottom = parsePixels(elementStyles.marginBottom);

                    return element.offsetHeight + elementMarginTop + elementMarginBottom;
                };

                const paneFooter = this.pane.querySelector('[data-pane-part="footer"]');
                if (paneFooter && paneFooter.compareDocumentPosition(this.gridContainer) & Node.DOCUMENT_POSITION_FOLLOWING) {
                    available -= subtractPaneSpace(paneFooter);
                }
            }

            return Number.isFinite(available) ? Math.max(available, 0) : null;
        } catch (error) {
            return null;
        }
    }

    getPaneContentLimit() {
        if (!this.paneContent || !this.gridContainer) {
            return null;
        }

        try {
            const parsePixels = value => {
                const numeric = Number.parseFloat(value);
                return Number.isFinite(numeric) ? numeric : 0;
            };

            const paneRect = this.paneContent.getBoundingClientRect();
            const containerRect = this.gridContainer.getBoundingClientRect();

            if (!paneRect || !containerRect) {
                return null;
            }

            if (!Number.isFinite(paneRect.bottom) || !Number.isFinite(containerRect.top)) {
                return null;
            }

            const paneStyles = window.getComputedStyle(this.paneContent);
            const paddingBottom = parsePixels(paneStyles.paddingBottom);
            const borderBottom = parsePixels(paneStyles.borderBottomWidth);

            const available = paneRect.bottom - paddingBottom - borderBottom - containerRect.top;

            return Number.isFinite(available) ? Math.max(available, 0) : null;
        } catch (error) {
            return null;
        }
    }

    getViewportBox() {
        try {
            const viewport = window.visualViewport;
            if (viewport && typeof viewport.height === 'number') {
                return {
                    height: viewport.height,
                    width: typeof viewport.width === 'number'
                        ? viewport.width
                        : (window.innerWidth || document.documentElement.clientWidth || 0),
                    offsetTop: viewport.offsetTop || 0,
                    offsetLeft: viewport.offsetLeft || 0,
                };
            }
        } catch (error) {
            // visualViewport might not be accessible (e.g., cross-origin iframes)
        }

        return {
            height: window.innerHeight || document.documentElement.clientHeight || 0,
            width: window.innerWidth || document.documentElement.clientWidth || 0,
            offsetTop: 0,
            offsetLeft: 0,
        };
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

        const parsePixels = value => {
            const numeric = Number.parseFloat(value);
            return Number.isFinite(numeric) ? numeric : 0;
        };

        const { height: viewportHeight, offsetTop } = this.getViewportBox();

        if (Number.isFinite(viewportHeight) && viewportHeight > 0) {
            const paneRect = this.pane.getBoundingClientRect();
            const paneStyles = window.getComputedStyle(this.pane);
            const marginBottom = parsePixels(paneStyles.marginBottom);
            const paddingBottom = parsePixels(paneStyles.paddingBottom);
            const borderBottom = parsePixels(paneStyles.borderBottomWidth);

            const paneTop = paneRect && Number.isFinite(paneRect.top)
                ? paneRect.top - offsetTop
                : 0;

            let availablePaneHeight = viewportHeight - paneTop - marginBottom - paddingBottom - borderBottom;
            if (!Number.isFinite(availablePaneHeight)) {
                availablePaneHeight = viewportHeight;
            }

            if (availablePaneHeight < 0) {
                availablePaneHeight = 0;
            }

            if (availablePaneHeight > 0) {
                this.pane.style.maxHeight = availablePaneHeight + 'px';

                const targetPaneHeightCandidate = Math.max(totalHeight, availablePaneHeight);
                const targetPaneHeight = Number.isFinite(targetPaneHeightCandidate)
                    ? Math.min(targetPaneHeightCandidate, availablePaneHeight)
                    : availablePaneHeight;

                if (targetPaneHeight > 0) {
                    this.pane.style.height = targetPaneHeight + 'px';
                } else {
                    this.pane.style.removeProperty('height');
                }
            } else {
                this.pane.style.removeProperty('height');
                this.pane.style.removeProperty('max-height');
            }
        } else {
            this.pane.style.removeProperty('height');
            this.pane.style.removeProperty('max-height');
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

        if (this.isColumnResizing || this.columnResizeSuppressSort) {
            return;
        }

        if (this.metadata[sortFieldName] && this.metadata[sortFieldName].sort === 1) {
            this.sort.field = sortFieldName;
            this.sort.order = getNextDirectionOrderItem(sortDirection);

            if (Array.isArray(this.headers)) {
                this.headers.forEach(th => {
                    if (th !== header) {
                        th.classList.remove('asc', 'desc');
                    }
                });
            }

            header.classList.remove('asc', 'desc');
            if (this.sort.order) {
                header.classList.add(this.sort.order);
            }

            this.fireEvent('sortChange');
            this.options.onSortChange();
            this.refreshSortIndicators();
            this.updateSortHighlight();
        }
    }

    static ensureHeadScrollSuppression(element) {
        if (!element) {
            return;
        }

        const doc = element.ownerDocument || document;
        Grid.ensureHeadScrollStyles(doc);

        element.classList.add('grid-head-scroll-suppressed');
        if (!element.style.overflowX) {
            element.style.overflowX = 'auto';
        }
        element.style.overflowY = 'hidden';
        element.style.scrollbarWidth = 'none';
        element.style.msOverflowStyle = 'none';
    }

    static ensureHeadScrollStyles(doc) {
        const targetDoc = doc || document;
        if (!targetDoc || !targetDoc.head) {
            return;
        }

        if (targetDoc.__gridHeadScrollStyleInjected) {
            return;
        }

        const style = targetDoc.createElement('style');
        style.type = 'text/css';
        style.textContent = '.grid-head-scroll-suppressed::-webkit-scrollbar{display:none;}'
            + '.grid-head-scroll-suppressed{scrollbar-width:none;-ms-overflow-style:none;}';
        targetDoc.head.appendChild(style);
        targetDoc.__gridHeadScrollStyleInjected = true;
    }
}

// Экспорт для ES-модуля (если нужно)
// export default Grid;

/**
 * GridManager (ES6 version)
 */
class GridManager {
    /**
     * GridManager orchestrates data grid interactions, paging, filtering and toolbar wiring.
     * It preserves the legacy API so existing integrations keep working while the internals
     * remain easier to follow.
     *
     * @param {HTMLElement|string} element Root element that hosts the grid UI.
     */
    constructor(element) {
        this.element = this._resolveElement(element);
        this._initializeState();

        this._initializeFilter();
        this._initializePageList();
        this._initializeGrid();
        this._initializeTabPane();
        this._placePaginationControls();
        this._setupModalCloseHandler();
        this._initializeMoveState();

        this.reload();
    }

    /**
     * Resolve DOM element reference from selector or HTMLElement.
     *
     * @private
     * @param {HTMLElement|string} element
     * @returns {HTMLElement}
     */
    _resolveElement(element) {
        if (element instanceof HTMLElement) {
            return element;
        }
        if (typeof element === 'string') {
            const target = document.querySelector(element);
            if (!target) {
                throw new Error(`GridManager: element "${element}" was not found.`);
            }
            return target;
        }
        throw new Error('GridManager: unexpected element reference.');
    }

    /**
     * Prepare baseline state holders used across the manager lifecycle.
     *
     * @private
     */
    _initializeState() {
        this.mvElementId = null;
        this.langId = 0;
        this.initialized = false;
        this.toolbar = null;
        this.gridPendingSelection = null;
        this.selectionControls = [];
        this.hasSelection = false;
        this.singlePath = this.element.getAttribute('single_template') || '';
    }

    /**
     * Try to instantiate filter helper if markup is available.
     *
     * @private
     */
    _initializeFilter() {
        try {
            this.filter = new GridManager.Filter(this);
        } catch (err) {
            this.filter = null;
        }
    }

    /**
     * Configure paging component that controls grid pages.
     *
     * @private
     */
    _initializePageList() {
        this.pageList = new PageList({ onPageSelect: this.loadPage.bind(this) });
    }

    /**
     * Initialize the grid view and wire core callbacks.
     *
     * @private
     */
    _initializeGrid() {
        const gridElement = this.element.querySelector('[data-role="grid"]');
        if (!gridElement) {
            throw new Error('GridManager: [data-role="grid"] element is required.');
        }

        this.grid = new Grid(gridElement, {
            onSelect: this.onSelect.bind(this),
            onSortChange: this.onSortChange.bind(this),
            onDoubleClick: this.onDoubleClick.bind(this),
        });

        this.grid.on('selectionChange', this.handleSelectionChange.bind(this));
    }

    /**
     * Setup tabs wrapper and detect current language context.
     *
     * @private
     */
    _initializeTabPane() {
        try {
            this.tabPane = new TabPane(this.element, { onTabChange: this.onTabChange.bind(this) });
        } catch (err) {
            this.tabPane = null;
            return;
        }

        if (this.tabPane && typeof this.tabPane.getCurrentTab === 'function') {
            const activeTab = this.tabPane.getCurrentTab();
            if (activeTab && activeTab.data && activeTab.data.lang) {
                this.langId = activeTab.data.lang;
            }
        }
    }

    /**
     * Insert paging controls into pane footer or fallback container.
     *
     * @private
     */
    _placePaginationControls() {
        if (!this.pageList) {
            return;
        }

        const hostElement = this.tabPane ? this.tabPane.element : this.element;
        const pagerElement = this.pageList.getElement();
        const toolbarContainer = hostElement.querySelector('[data-pane-part="footer"]');

        if (toolbarContainer) {
            toolbarContainer.appendChild(pagerElement);
        } else {
            hostElement.appendChild(pagerElement);
        }
    }

    /**
     * Allow closing modal container with Escape key when hosted inside ModalBox.
     *
     * @private
     */
    _setupModalCloseHandler() {
        try {
            const modalBox = window.parent && window.parent.ModalBox;
            if (modalBox && modalBox.initialized && modalBox.getCurrent()) {
                document.body.addEventListener('keydown', evt => {
                    if (evt.key === 'Escape') modalBox.close();
                });
            }
        } catch (err) {
            // Intentionally ignore cross-origin access errors.
        }
    }

    /**
     * Restore move state if manager was opened in move mode.
     *
     * @private
     */
    _initializeMoveState() {
        const moveFromId = this.element.getAttribute('move_from_id');
        if (moveFromId) {
            this.setMvElementId(moveFromId);
        }
    }

    /**
     * Memorise selection before issuing data request.
     *
     * @private
     */
    _rememberSelectionBeforeLoad() {
        if (!this.grid) {
            this.gridPendingSelection = null;
            return;
        }

        const key = this.grid.getSelectedRecordKey();
        if (key !== false && key !== undefined && key !== null) {
            this.gridPendingSelection = String(key);
        } else {
            this.gridPendingSelection = null;
        }
    }

    /**
     * Construct URL safe JSON out of tab metadata payloads.
     *
     * @private
     * @param {Element|string|Object} payload
     * @returns {Object}
     */
    _normalizeTabPayload(payload) {
        if (!payload) {
            return {};
        }
        if (payload instanceof Element) {
            const span = payload.querySelector('[data-role="tab-meta"]');
            if (!span) {
                throw new Error('GridManager: tab meta data element is missing.');
            }
            return this._parsePayloadString(span.textContent);
        }
        if (typeof payload === 'string') {
            return this._parsePayloadString(payload);
        }
        if (typeof payload === 'object') {
            return payload;
        }
        return {};
    }

    /**
     * Convert loosely formatted strings to JSON objects.
     *
     * @private
     * @param {string} value
     * @returns {Object}
     */
    _parsePayloadString(value) {
        if (!value) {
            return {};
        }
        const normalized = value.replace(/(\w+)\s*:/g, '"$1":');
        return JSON.parse(normalized);
    }

    // --- Move Element ID API ---
    setMvElementId(id) { this.mvElementId = id; }
    getMvElementId() { return this.mvElementId; }
    clearMvElementId() { this.mvElementId = null; }

    /**
     * Attach toolbar controls to the pane and align sizing.
     *
     * @param {Toolbar} toolbar
     */
    attachToolbar(toolbar) {
        this.toolbar = toolbar;

        if (!this.toolbar) {
            return;
        }

        const hostElement = this.tabPane ? this.tabPane.element : this.element;
        const toolbarContainer = hostElement.querySelector('[data-pane-part="footer"]');
        const toolbarElement = this.toolbar.getElement();

        if (toolbarContainer) {
            toolbarContainer.appendChild(toolbarElement);
        } else {
            hostElement.appendChild(toolbarElement);
        }

        if (typeof this.toolbar.disableControls === 'function') {
            this.toolbar.disableControls();
        }
        if (typeof this.toolbar.bindTo === 'function') {
            this.toolbar.bindTo(this);
        }

        if (Array.isArray(this.toolbar.controls)) {
            this.toolbar.controls.forEach(control => {
                const element = control && control.element;
                if (element && element.classList && element.classList.contains('btn-sm')) {
                    element.classList.remove('btn-sm');
                }
            });
        }

        this.setupSelectionControls();
    }

    /**
     * Track selection state changes coming from grid component.
     *
     * @param {HTMLElement|null} item
     */
    handleSelectionChange(item) {
        this.hasSelection = !!item;
        this.updateSelectionDependentControls(this.hasSelection);
    }

    /**
     * Scan toolbar controls and store ones that depend on row selection.
     */
    setupSelectionControls() {
        if (!this.toolbar || !Array.isArray(this.toolbar.controls)) {
            this.selectionControls = [];
            return;
        }

        const keywordsExact = ['view', 'edit', 'del', 'delete', 'use', 'up', 'down', 'open', 'preview'];
        const keywordsPrefix = [
            'move', 'activate', 'deactivate', 'approve', 'decline', 'restore', 'publish', 'unpublish',
            'archive', 'unarchive', 'assign', 'unassign', 'lock', 'unlock', 'block', 'unblock', 'ban',
            'unban', 'send', 'resend', 'select', 'clone', 'copy', 'download', 'remove', 'reject',
            'disable', 'enable', 'suspend', 'resume'
        ];

        this.selectionControls = this.toolbar.controls.filter(control =>
            this.isSelectionDependentControl(control, keywordsExact, keywordsPrefix)
        );

        this.selectionControls.forEach(control => {
            if (control && control.element) {
                control.element.dataset.requiresSelection = 'true';
            }
            control._disabledBySelection = false;
        });

        this.updateSelectionDependentControls(!!(this.grid && this.grid.getSelectedItem()));
    }

    /**
     * Determine whether control should be enabled only when row is selected.
     *
     * @param {Object} control
     * @param {string[]} keywordsExact
     * @param {string[]} keywordsPrefix
     * @returns {boolean}
     */
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

    /**
     * Enable or disable controls based on grid selection.
     *
     * @param {boolean} hasSelection
     */
    updateSelectionDependentControls(hasSelection) {
        if (!Array.isArray(this.selectionControls) || !this.selectionControls.length) {
            return;
        }

        this.selectionControls.forEach(control => {
            if (!control) {
                return;
            }

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
    /**
     * Handle tab switch events and reload grid data.
     *
     * @param {Element|string|Object} data
     */
    onTabChange(data) {
        const normalized = this._normalizeTabPayload(data);
        if (normalized.lang !== undefined) {
            this.langId = normalized.lang;
        }

        if (this.filter && typeof this.filter.remove === 'function') {
            this.filter.remove();
        }

        this.reload();
    }

    // --- Grid events ---
    onSelect() { /* no-op, override as needed */ }

    onDoubleClick() {
        if (this.toolbar && typeof this.toolbar.getControlById === 'function' && this.toolbar.getControlById('edit')) {
            this.edit();
        } else if (this.toolbar && Array.isArray(this.toolbar.controls) && this.toolbar.controls.length) {
            const action = this.toolbar.controls[0].properties.action;
            if (typeof this[action] === 'function') this[action]();
        }
    }

    onSortChange() { this.loadPage(1); }
    sortChange() { this.loadPage(1); }

    // --- Paging ---
    reload() { this.loadPage(1); }

    /**
     * Request grid data for specific page.
     *
     * @param {number} pageNum
     */
    loadPage(pageNum) {
        if (!this.grid) {
            return;
        }

        this._rememberSelectionBeforeLoad();

        if (this.pageList && typeof this.pageList.disable === 'function') {
            this.pageList.disable();
        }
        if (this.toolbar && typeof this.toolbar.disableControls === 'function') {
            this.toolbar.disableControls();
        }

        showLoader();
        this.grid.clear();

        if (this.pageList && this.pageList.currentPage) {
            pageNum = this.pageList.currentPage;
        }

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

    /**
     * Build request URL reflecting current sort and page.
     *
     * @param {number} pageNum
     * @returns {string}
     */
    buildRequestURL(pageNum) {
        if (this.grid.sort && this.grid.sort.order) {
            return `${this.singlePath}get-data/${this.grid.sort.field}-${this.grid.sort.order}/page-${pageNum}`;
        }
        return `${this.singlePath}get-data/page-${pageNum}`;
    }

    /**
     * Prepare POST body for data request.
     *
     * @returns {string}
     */
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

    /**
     * Handle successful server response and render grid.
     *
     * @param {Object} result
     */
    processServerResponse(result) {
        const addControl = (this.toolbar && typeof this.toolbar.getControlById === 'function')
            ? this.toolbar.getControlById('add')
            : null;

        const pendingSelection = this.gridPendingSelection;
        this.gridPendingSelection = null;

        if (!this.initialized) {
            this.grid.setMetadata(result.meta);
            this.initialized = true;
        }

        this.grid.setData(result.data || []);
        if (pendingSelection !== null) {
            this.grid.pendingSelectionKey = pendingSelection;
        }

        if (result.pager && this.pageList) {
            this.pageList.build(result.pager.count, result.pager.current, result.pager.records);
        }

        if (!this.grid.isEmpty()) {
            if (this.toolbar && typeof this.toolbar.enableControls === 'function') {
                this.toolbar.enableControls();
            }
            if (this.pageList && typeof this.pageList.enable === 'function') {
                this.pageList.enable();
            }
        }

        if (addControl && typeof addControl.enable === 'function') {
            addControl.enable();
        }

        this.grid.build();
        hideLoader();
    }

    /**
     * Handle data loading errors.
     *
     * @param {string} responseText
     */
    processServerError(responseText) {
        alert(responseText);
        hideLoader();
    }

    /**
     * React on modal close callbacks.
     *
     * @param {Object} returnValue
     */
    processAfterCloseAction(returnValue) {
        if (!returnValue || returnValue.result !== true) {
            return;
        }

        if (returnValue.data !== undefined && returnValue.data !== null) {
            this.gridPendingSelection = String(returnValue.data);
        }

        const targetPage = this.pageList ? this.pageList.currentPage : 1;
        this.loadPage(targetPage);

        if (returnValue.afterClose && returnValue.afterClose !== 'reload'
            && typeof this[returnValue.afterClose] === 'function') {
            this[returnValue.afterClose](null);
        }

        this.grid.fireEvent('dirty');
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
        if (!parseInt(id, 10)) id = this.grid.getSelectedRecordKey();
        ModalBox.open({
            url: `${this.singlePath}${id}/edit`,
            onClose: this.processAfterCloseAction.bind(this)
        });
    }
    move(id) {
        if (!parseInt(id, 10)) id = this.grid.getSelectedRecordKey();
        this.setMvElementId(id);
        ModalBox.open({
            url: `${this.singlePath}move/${id}`,
            onClose: this.processAfterCloseAction.bind(this)
        });
    }
    moveFirst() { this.moveTo('first', this.getMvElementId()); }
    moveLast() { this.moveTo('last', this.getMvElementId()); }
    moveAbove(id) {
        if (!parseInt(id, 10)) id = this.grid.getSelectedRecordKey();
        this.moveTo('above', this.getMvElementId(), id);
    }
    moveBelow(id) {
        if (!parseInt(id, 10)) id = this.grid.getSelectedRecordKey();
        this.moveTo('below', this.getMvElementId(), id);
    }
    moveTo(dir, fromId, toId) {
        toId = toId || '';
        showLoader();
        Energine.request(
            `${this.singlePath}move/${fromId}/${dir}/${toId}/`,
            null,
            () => {
                hideLoader();
                ModalBox.setReturnValue(true);
                this.close();
            },
            () => hideLoader(),
            (responseText) => {
                alert(responseText);
                hideLoader();
            }
        );
    }
    editPrev() {
        let prevRow;
        const curr = this.grid.getSelectedItem();
        if (curr && (prevRow = curr.previousElementSibling)) {
            this.grid.selectItem(prevRow);
            this.edit();
        }
    }
    editNext() {
        let nextRow;
        const curr = this.grid.getSelectedItem();
        if (curr && (nextRow = curr.nextElementSibling)) {
            this.grid.selectItem(nextRow);
            this.edit();
        }
    }
    del() {
        const MSG_CONFIRM_DELETE = (Energine.translations && Energine.translations.get('MSG_CONFIRM_DELETE')) ||
            'Do you really want to delete the chosen record?';
        if (confirm(MSG_CONFIRM_DELETE)) {
            showLoader();
            Energine.request(
                `${this.singlePath}${this.grid.getSelectedRecordKey()}/delete/`,
                null,
                () => {
                    hideLoader();
                    this.grid.fireEvent('dirty');
                    this.loadPage(this.pageList ? this.pageList.currentPage : 1);
                },
                () => hideLoader(),
                (responseText) => {
                    alert(responseText);
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
            this.loadPage.bind(this, this.pageList ? this.pageList.currentPage : 1)
        );
    }
    down() {
        const payload = (this.filter && typeof this.filter.getValue === 'function') ? this.filter.getValue() : null;
        Energine.request(
            `${this.singlePath}${this.grid.getSelectedRecordKey()}/down/`,
            payload || undefined,
            this.loadPage.bind(this, this.pageList ? this.pageList.currentPage : 1)
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

        this.element.classList.add('row', 'row-cols-lg-auto', 'g-3', 'align-items-center', 'w-100', 'bg-body');
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
