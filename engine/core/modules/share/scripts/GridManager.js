ScriptLoader.load('TabPane', 'PageList', 'Toolbar', 'ModalBox', 'lib/tabulator/tabulator.min', 'TabulatorGrid');
Energine.loadCSS('scripts/lib/tabulator/tabulator.min.css');
Energine.loadCSS('scripts/lib/tabulator/tabulator_bootstrap5.min.css');

function gmTranslate(key, fallback) {
    if (window.Energine && window.Energine.translations) {
        const { translations } = window.Energine;
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
    }
    return fallback;
}

const GRID_DEFAULT_ERROR_MESSAGE = gmTranslate('MSG_LOADING_ERROR', 'Ошибка загрузки данных');
const GRID_DEFAULT_WARNING_MESSAGE = gmTranslate('GRID_DATA_WARNING', 'Получены данные неожиданного формата');

const GRID_SELECTION_ACTIONS = new Set([
    'view',
    'edit',
    'del',
    'delete',
    'move',
    'moveFirst',
    'moveLast',
    'moveAbove',
    'moveBelow',
    'moveTo',
    'copy',
    'use',
    'up',
    'down',
]);
class GridManager {
    /**
     * @param {HTMLElement|string} element Main holder element for the GridManager
     */
    constructor(element) {
        // --- Properties ---
        this.mvElementId = null;
        this.langId = 0;
        this.initialized = false;
        this.selectionAwareControls = [];
        this.lastMetaSignature = null;
        this.addControl = null;

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
        this.gridElement = this.element.querySelector('[data-role="grid"]');
        if (!this.gridElement) {
            throw new Error('GridManager: grid container not found.');
        }

        this.tabulatorShell = this.gridElement.querySelector('[data-role="tabulator-shell"]');
        this.tabulatorContainer = this.gridElement.querySelector('[data-role="tabulator-container"]');
        if (!this.tabulatorContainer) {
            throw new Error('GridManager: tabulator container not found.');
        }

        const tabulatorPlaceholder = this.gridElement.querySelector('[data-role="tabulator-placeholder"]');
        if (tabulatorPlaceholder && tabulatorPlaceholder.parentNode) {
            tabulatorPlaceholder.parentNode.removeChild(tabulatorPlaceholder);
        }
        this.tabulatorContainer.innerHTML = '';

        this.grid = new TabulatorGrid(this.tabulatorContainer, {
            tableOptions: {
                sortMode: 'remote',
            },
        });
        this.bindGridEvents();

        // --- Tabs ---
        this.tabPane = new TabPane(this.element, { onTabChange: this.onTabChange.bind(this) });

        // --- Toolbar placement ---
        let toolbarContainer = this.tabPane.element.querySelector('[data-pane-part="footer"]');
        if (toolbarContainer) {
            toolbarContainer.appendChild(this.pageList.getElement());
        } else {
            this.tabPane.element.appendChild(this.pageList.getElement());
        }

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

    logUnexpected(context, payload) {
        const errorCandidate = (payload && payload.err instanceof Error)
            ? payload.err
            : (payload instanceof Error ? payload : null);
        if (typeof window.safeConsoleError === 'function') {
            window.safeConsoleError(errorCandidate || new Error(context), `GridManager:${context}`);
        } else if (window.console && typeof window.console.warn === 'function') {
            window.console.warn(`GridManager unexpected state: ${context}`, payload);
        }
        if (payload && payload !== errorCandidate && window.console && typeof window.console.debug === 'function') {
            window.console.debug('GridManager payload:', payload);
        }
    }

    buildErrorMessageFromResponse(response, fallbackMessage = GRID_DEFAULT_ERROR_MESSAGE) {
        if (!response) {
            return fallbackMessage;
        }
        if (typeof response === 'string') {
            return response;
        }

        const parts = [];
        if (response.title) {
            parts.push(response.title);
        }
        if (Array.isArray(response.errors) && response.errors.length) {
            response.errors.forEach((error) => {
                if (!error) {
                    return;
                }
                if (typeof error === 'string') {
                    parts.push(error);
                    return;
                }
                const field = error.field ? `${error.field}: ` : '';
                if (error.message) {
                    parts.push(`${field}${error.message}`);
                } else {
                    parts.push(`${field}${error}`);
                }
            });
        }
        if (response.message) {
            parts.push(response.message);
        }
        if (response.description) {
            parts.push(response.description);
        }
        const message = parts.join('\n').trim();
        return message || fallbackMessage;
    }

    presentError(message) {
        const text = message || GRID_DEFAULT_ERROR_MESSAGE;
        if (window.Energine && typeof window.Energine.alertBox === 'function') {
            window.Energine.alertBox(text);
        } else {
            alert(text);
        }
    }

    presentWarning(message) {
        const text = message || GRID_DEFAULT_WARNING_MESSAGE;
        if (window.Energine && typeof window.Energine.noticeBox === 'function') {
            window.Energine.noticeBox(text, 'warning');
        } else if (window.console && typeof window.console.warn === 'function') {
            window.console.warn(text);
        }
    }

    showGridErrorOverlay(message) {
        if (this.grid && typeof this.grid.showErrorOverlay === 'function') {
            this.grid.showErrorOverlay(message);
        }
    }

    clearGridOverlay() {
        if (this.grid && typeof this.grid.clearOverlay === 'function') {
            this.grid.clearOverlay();
        }
    }

    bindGridEvents() {
        if (!this.grid) {
            return;
        }
        this.grid.on('select', (...args) => {
            this.updateToolbarSelectionState();
            this.onSelect(...args);
        });
        this.grid.on('deselect', () => {
            this.updateToolbarSelectionState();
        });
        this.grid.on('selectionChange', () => {
            this.updateToolbarSelectionState();
        });
        this.grid.on('doubleClick', (...args) => {
            this.onDoubleClick(...args);
        });
        this.grid.on('sortChange', () => {
            this.onSortChange();
        });
        this.grid.on('dataLoaded', () => {
            this.updateToolbarSelectionState();
        });
        this.grid.on('dataFiltered', (filteredData) => {
            const dataset = Array.isArray(filteredData)
                ? filteredData
                : this.getActiveGridData();
            this.handleDataLoad(dataset);
        });
        this.grid.on('filterCleared', () => {
            this.handleDataLoad(this.getActiveGridData());
        });
        this.grid.on('pagerUpdate', (pager) => {
            if (pager && typeof pager.current === 'number' && this.pageList) {
                this.pageList.currentPage = pager.current;
            }
        });
    }

    resolveSelectionAwareControls() {
        if (!this.toolbar || !Array.isArray(this.toolbar.controls)) {
            this.selectionAwareControls = [];
            return;
        }
        this.selectionAwareControls = this.toolbar.controls.filter((control) => {
            if (!control || !control.properties) {
                return false;
            }
            const action = control.properties.action || '';
            const controlId = control.properties.id || '';
            return GRID_SELECTION_ACTIONS.has(action) || GRID_SELECTION_ACTIONS.has(controlId);
        });
    }

    getAddControl() {
        if (!this.toolbar) {
            return null;
        }
        if (this.addControl) {
            return this.addControl;
        }
        if (typeof this.toolbar.getControlById === 'function') {
            const control = this.toolbar.getControlById('add');
            if (control) {
                this.addControl = control;
                return control;
            }
        }
        return null;
    }

    getActiveGridData() {
        if (!this.grid) {
            return [];
        }
        if (typeof this.grid.getActiveData === 'function') {
            try {
                const data = this.grid.getActiveData();
                if (Array.isArray(data)) {
                    return data;
                }
            } catch (err) {
                // ignore and fallback to cached data
            }
        }
        return Array.isArray(this.grid.data) ? this.grid.data : [];
    }

    updateToolbarSelectionState() {
        if (!this.toolbar) {
            return;
        }
        if (!Array.isArray(this.selectionAwareControls) || !this.selectionAwareControls.length) {
            this.resolveSelectionAwareControls();
        }
        const hasSelection = !!(this.grid && typeof this.grid.getSelectedRecord === 'function' && this.grid.getSelectedRecord());
        this.selectionAwareControls.forEach((control) => {
            if (!control || typeof control.enable !== 'function' || typeof control.disable !== 'function') {
                return;
            }
            if (hasSelection) {
                control.enable(true);
            } else {
                control.disable();
            }
        });
    }

    ensureFirstRowSelected() {
        if (!this.grid || typeof this.grid.getTabulator !== 'function') {
            return;
        }
        const table = this.grid.getTabulator();
        if (!table || typeof table.getRows !== 'function') {
            return;
        }
        const selectedRows = (typeof table.getSelectedRows === 'function') ? table.getSelectedRows() : [];
        if (selectedRows && selectedRows.length) {
            return;
        }
        const rows = table.getRows();
        if (rows && rows.length && typeof rows[0].select === 'function') {
            rows[0].select();
        }
    }

    getSelectedRowComponent() {
        if (!this.grid || typeof this.grid.getTabulator !== 'function') {
            return null;
        }
        const table = this.grid.getTabulator();
        if (!table || typeof table.getSelectedRows !== 'function') {
            return null;
        }
        const rows = table.getSelectedRows();
        return (rows && rows.length) ? rows[0] : null;
    }

    shouldRefreshMetadata(meta) {
        if (!meta) {
            return false;
        }
        const signature = JSON.stringify(meta);
        return this.lastMetaSignature !== signature;
    }

    handleDataLoad(data, addControl) {
        const control = addControl || this.getAddControl();
        const hasData = Array.isArray(data)
            ? data.length > 0
            : !(this.grid && typeof this.grid.isEmpty === 'function' && this.grid.isEmpty());
        if (hasData) {
            if (this.toolbar && typeof this.toolbar.enableControls === 'function') {
                this.toolbar.enableControls();
            }
            if (this.pageList && typeof this.pageList.enable === 'function') {
                this.pageList.enable();
            }
            this.ensureFirstRowSelected();
        } else {
            if (this.toolbar && typeof this.toolbar.disableControls === 'function') {
                this.toolbar.disableControls();
            }
        }
        if (control && typeof control.enable === 'function') {
            control.enable();
        }
        this.updateToolbarSelectionState();
        this.scheduleGridRedraw(true);
    }

    scheduleGridRedraw(force = false) {
        if (!this.grid || typeof this.grid.redraw !== 'function') {
            return;
        }
        const redraw = () => {
            try {
                this.grid.redraw(force);
            } catch (err) {
                this.logUnexpected('grid-redraw', { err });
            }
        };
        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(redraw);
        } else {
            setTimeout(redraw, 0);
        }
    }

    applyClientFilter(descriptor) {
        if (!this.grid || typeof this.grid.applyFilter !== 'function') {
            return Promise.resolve(this.getActiveGridData());
        }
        if (!descriptor) {
            return this.clearClientFilter();
        }
        return Promise.resolve(this.grid.applyFilter(descriptor))
            .then((dataset) => {
                const data = Array.isArray(dataset) ? dataset : this.getActiveGridData();
                this.handleDataLoad(data);
                return data;
            })
            .catch((error) => {
                if (typeof window !== 'undefined' && window.console && typeof window.console.error === 'function') {
                    window.console.error('GridManager: unable to apply client filter', error);
                }
                return this.getActiveGridData();
            });
    }

    clearClientFilter() {
        if (!this.grid || typeof this.grid.clearFilter !== 'function') {
            return Promise.resolve(this.getActiveGridData());
        }
        return Promise.resolve(this.grid.clearFilter())
            .then((dataset) => {
                const data = Array.isArray(dataset) ? dataset : this.getActiveGridData();
                this.handleDataLoad(data);
                return data;
            })
            .catch((error) => {
                if (typeof window !== 'undefined' && window.console && typeof window.console.error === 'function') {
                    window.console.error('GridManager: unable to clear client filter', error);
                }
                return this.getActiveGridData();
            });
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
        this.addControl = (this.toolbar && typeof this.toolbar.getControlById === 'function')
            ? this.toolbar.getControlById('add')
            : null;
        this.resolveSelectionAwareControls();
        const currentData = this.getActiveGridData();
        this.handleDataLoad(currentData, this.addControl);
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
        this.clearClientFilter();
        this.reload();
        this.scheduleGridRedraw(true);
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
        if (this.grid && typeof this.grid.showLoadingOverlay === 'function') {
            this.grid.showLoadingOverlay();
        }
        showLoader();
        const performRequest = () => {
            let targetPage = pageNum;
            if (this.pageList && this.pageList.currentPage) {
                targetPage = this.pageList.currentPage;
            }

            // "Delay" replacement for browser layout quirks (setTimeout = 0)
            setTimeout(() => {
                Energine.request(
                    this.buildRequestURL(targetPage),
                    this.buildRequestPostBody(),
                    this.processServerResponse.bind(this),
                    this.processServerUserError.bind(this),
                    this.processServerError.bind(this)
                );
            }, 0);
        };

        const clearPromise = (this.grid && typeof this.grid.clear === 'function')
            ? this.grid.clear()
            : null;

        Promise.resolve(clearPromise)
            .catch((error) => {
                if (typeof window !== 'undefined' && window.console && typeof window.console.warn === 'function') {
                    window.console.warn('GridManager: unable to clear grid before reload', error);
                }
            })
            .finally(performRequest);
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

    processServerUserError(response, fallbackMessage) {
        hideLoader();
        const message = this.buildErrorMessageFromResponse(response, fallbackMessage || GRID_DEFAULT_ERROR_MESSAGE);
        this.presentError(message);
        this.showGridErrorOverlay(message);
        if (this.pageList && typeof this.pageList.enable === 'function') {
            this.pageList.enable();
        }
        if (this.toolbar && typeof this.toolbar.disableControls === 'function') {
            this.toolbar.disableControls();
        }
        return true;
    }

    processServerResponse(result) {
        const addControl = this.getAddControl();

        const meta = (result && typeof result.meta === 'object') ? result.meta : null;
        if (!meta) {
            this.logUnexpected('response-meta-missing', result);
        }
        if (!this.initialized) {
            this.grid.setMetadata(meta || {});
            this.lastMetaSignature = meta ? JSON.stringify(meta) : null;
            this.initialized = true;
        } else if (meta && this.shouldRefreshMetadata(meta)) {
            this.grid.setMetadata(meta);
            this.lastMetaSignature = JSON.stringify(meta);
        }

        if (result && result.pager) {
            this.pageList.build(result.pager.count, result.pager.current, result.pager.records);
            if (this.grid && typeof this.grid.setPager === 'function') {
                this.grid.setPager(result.pager);
            }
        }

        if (result && Array.isArray(result.errors) && result.errors.length) {
            const warningMessage = this.buildErrorMessageFromResponse({
                title: result.title,
                errors: result.errors,
                message: result.message,
            }, GRID_DEFAULT_WARNING_MESSAGE);
            this.presentWarning(warningMessage);
        }

        let data = [];
        if (result && Array.isArray(result.data)) {
            data = result.data;
        } else if (result && result.data) {
            this.logUnexpected('response-data-shape', result.data);
        }

        Promise.resolve(this.grid.setData(data))
            .then((resolvedData) => {
                const dataset = Array.isArray(resolvedData) ? resolvedData : data;
                this.handleDataLoad(dataset, addControl);
                this.clearGridOverlay();
            })
            .catch((error) => {
                if (typeof window !== 'undefined' && window.console && typeof window.console.error === 'function') {
                    window.console.error('GridManager: unable to apply grid data', error);
                }
                this.logUnexpected('grid-set-data', { err: error });
                this.handleDataLoad([], addControl);
                this.showGridErrorOverlay(GRID_DEFAULT_ERROR_MESSAGE);
            })
            .finally(() => {
                hideLoader();
            });
    }

    processServerError(responseText) {
        hideLoader();
        const message = this.buildErrorMessageFromResponse(responseText, GRID_DEFAULT_ERROR_MESSAGE);
        this.presentError(message);
        this.showGridErrorOverlay(message);
        if (this.pageList && typeof this.pageList.enable === 'function') {
            this.pageList.enable();
        }
        if (this.toolbar && typeof this.toolbar.disableControls === 'function') {
            this.toolbar.disableControls();
        }
        this.logUnexpected('server-error', responseText);
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
        const currentRow = this.getSelectedRowComponent();
        const prevRow = currentRow && typeof currentRow.getPrevRow === 'function'
            ? currentRow.getPrevRow()
            : null;
        if (prevRow && typeof prevRow.select === 'function') {
            prevRow.select();
            this.edit();
        }
    }
    editNext() {
        const currentRow = this.getSelectedRowComponent();
        const nextRow = currentRow && typeof currentRow.getNextRow === 'function'
            ? currentRow.getNextRow()
            : null;
        if (nextRow && typeof nextRow.select === 'function') {
            nextRow.select();
            this.edit();
        }
    }
    del() {
        let MSG_CONFIRM_DELETE = (Energine.translations && Energine.translations.get('MSG_CONFIRM_DELETE')) ||
            'Do you really want to delete the chosen record?';
        if (confirm(MSG_CONFIRM_DELETE)) {
            showLoader();
            Energine.request(
                `${this.singlePath}${this.grid.getSelectedRecordKey()}/delete/`,
                null,
                () => {
                    hideLoader();
                    this.grid.fireEvent('dirty');
                    this.loadPage(this.pageList.currentPage);
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

}

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

        this.gridManager = gridManager;
        this.mode = this.normaliseMode(this.element.dataset.filterMode || this.element.getAttribute('data-filter-mode') || 'server');
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
        if (applyButton) {
            applyButton.addEventListener('click', () => {
                const descriptor = this.buildFilterDescriptor();
                const isActive = this.use();
                if (this.shouldApplyClientFilter()) {
                    if (isActive) {
                        gridManager.applyClientFilter(descriptor);
                    } else {
                        gridManager.clearClientFilter();
                    }
                } else {
                    gridManager.clearClientFilter();
                }
                if (this.shouldReloadServer()) {
                    gridManager.reload();
                }
            });
        }
        if (resetLink) {
            resetLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.remove();
                gridManager.clearClientFilter();
                if (this.shouldReloadServer()) {
                    gridManager.reload();
                }
            });
        }
        this.fields.addEventListener('change', this.checkCondition.bind(this));
        this.condition.addEventListener('change', (event) => {
            const fieldType = this.fields.options[this.fields.selectedIndex].getAttribute('type');
            this.switchInputs(event.target.value, fieldType);
        });

        this.checkCondition();
    }

    normaliseMode(mode) {
        const normalized = (mode || '').toString().toLowerCase();
        if (normalized === 'client' || normalized === 'server') {
            return normalized;
        }
        if (normalized === 'hybrid' || normalized === 'both') {
            return 'hybrid';
        }
        return 'server';
    }

    shouldApplyClientFilter() {
        return this.mode === 'client' || this.mode === 'hybrid';
    }

    shouldReloadServer() {
        return this.mode === 'server' || this.mode === 'hybrid';
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

    buildFilterDescriptor() {
        const fieldOption = this.fields && this.fields.options ? this.fields.options[this.fields.selectedIndex] : null;
        const conditionOption = this.condition && this.condition.options ? this.condition.options[this.condition.selectedIndex] : null;
        return {
            field: fieldOption ? fieldOption.value : null,
            fieldLabel: fieldOption ? fieldOption.textContent : '',
            fieldType: fieldOption ? fieldOption.getAttribute('type') : null,
            condition: conditionOption ? conditionOption.value : null,
            conditionLabel: conditionOption ? conditionOption.textContent : '',
            values: (this.inputs && typeof this.inputs.getActiveValues === 'function') ? this.inputs.getActiveValues() : [],
            mode: this.mode,
        };
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

    getActiveValues() {
        const inputs = this.isDate ? this.dpsInputs : this.inputs;
        return inputs
            .map((el) => (el && typeof el.value === 'string') ? el.value.trim() : '')
            .filter((value) => value !== '');
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
