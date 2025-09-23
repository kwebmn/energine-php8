ScriptLoader.load('lib/tabulator/tabulator.min', 'TabPane', 'PageList', 'Toolbar', 'ModalBox');

(() => {
    const cssFiles = [
        'scripts/lib/tabulator/tabulator.min.css',
        'scripts/lib/tabulator/tabulator_bootstrap5.min.css',
    ];

    const appendStylesheet = (href) => {
        if (window.Energine && typeof window.Energine.loadCSS === 'function') {
            window.Energine.loadCSS(href);
        } else if (!document.querySelector(`link[href$="${href}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            document.head.appendChild(link);
        }
    };

    cssFiles.forEach(appendStylesheet);
})();


/**
 * Lightweight adapter that exposes the legacy Grid API on top of a Tabulator instance.
 * The class is intentionally verbose so other modules can hook into request/response
 * milestones without depending on Tabulator internals.
 */
class TabulatorGrid {

    constructor(element, options = {}) {
        this.element = (typeof element === 'string') ? document.querySelector(element) : element;
        if (!this.element) {
            throw new Error('TabulatorGrid: container element not found.');
        }

        this.options = options;
        this.requestBuilder = options.requestBuilder || {};
        this.metadata = {};
        this.data = [];
        this.sort = { field: null, order: null };
        this.keyFieldName = null;
        this.selectedKey = null;
        this.events = {};
        this.pendingRequest = null;
        this.lastResponse = null;
        this.isDirty = false;
        this.filterQuery = '';
        this.lastRequest = null;
        this.hasLoaded = false;
        this.lastPager = null;
        this.tableBuilt = false;
        this._tableBuiltWaiters = [];

        this.tableContainer = this.element.querySelector('[data-role="grid-table"]');
        if (!this.tableContainer) {
            throw new Error('TabulatorGrid: [data-role="grid-table"] element is required.');
        }

        const placeholder = (window.Energine && window.Energine.translations)
            ? (typeof window.Energine.translations.get === 'function'
                ? window.Energine.translations.get('TXT_NO_RECORDS')
                : window.Energine.translations['TXT_NO_RECORDS'])
            : 'No records';

        const tabulatorOptions = {
            layout: 'fitDataStretch',
            placeholder,
            selectable: 1,
            columns: [],
            data: [],
            index: undefined,
            pagination: true,
            paginationMode: 'remote',
            paginationSize: options.paginationSize || 25,
            sortMode: 'remote',
            filterMode: 'remote',
            ajaxSorting: false,
            ajaxFiltering: false,
            ajaxConfig: 'POST',
            ajaxContentType: 'form',
            ajaxURL: undefined,
            ajaxURLGenerator: (url, config, params) => this._generateRequestURL(url, params),
            ajaxRequestFunc: (url, config, params) => this._ajaxRequest(url, config, params),
            ajaxRequesting: (url, params) => this._ajaxRequesting(url, params),
            ajaxResponse: (url, params, response) => this._ajaxResponse(url, params, response),
            rowClick: (e, row) => this._handleRowClick(row),
            rowDblClick: (e, row) => this._handleRowDoubleClick(row),
            rowSelectionChanged: () => this._handleSelectionChanged(),
            dataLoading: () => this.fireEvent('dataLoading'),
            dataLoaded: () => this._handleDataLoaded(),
            dataLoadError: (error) => this._handleDataLoadError(error),
            dataSorting: (sorters) => this._handleDataSorting(sorters),
        };

        this.table = new Tabulator(this.tableContainer, tabulatorOptions);

        this.table.on('tableBuilt', () => {
            this.tableBuilt = true;
            this._flushTableBuiltQueue();
        });
        if (this.table && this.table.initialized) {
            this.tableBuilt = true;
            this._flushTableBuiltQueue();
        }
        this.table.on('pageLoaded', (page) => this._handlePageLoaded(page));

        this.on('dirty', () => {
            this.isDirty = true;
        });
    }

    on(event, handler) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(handler);
        return () => this.off(event, handler);
    }

    once(event, handler) {
        const onceWrapper = (...args) => {
            this.off(event, onceWrapper);
            handler.apply(this, args);
        };
        return this.on(event, onceWrapper);
    }

    off(event, handler) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(fn => fn !== handler);
    }

    fireEvent(event, ...args) {
        if (!this.events[event]) return;
        this.events[event].forEach(fn => fn.apply(this, args));
    }

    /**
     * Build the remote URL while persisting the requested page, filters and sort state.
     * Tabulator calls this before every network request so we can keep the legacy helpers.
     */
    _generateRequestURL(url, params) {
        const request = this.pendingRequest || {};
        const paramsObj = (params && typeof params === 'object') ? params : {};
        const sorters = Array.isArray(paramsObj.sorters) ? paramsObj.sorters : [];
        const page = paramsObj.page || request.page || 1;
        const sort = sorters.length
            ? { field: sorters[0].field || null, order: sorters[0].dir || null }
            : (request.sort || this.sort || { field: null, order: null });
        const filters = Array.isArray(paramsObj.filter) ? paramsObj.filter : (request.filters || []);

        const buildURL = this.requestBuilder.buildURL;
        const buildPostBody = this.requestBuilder.buildPostBody;

        const finalURL = (typeof buildURL === 'function')
            ? buildURL({ page, sort, filters, request })
            : (request.url || url);
        const postBody = (typeof buildPostBody === 'function')
            ? buildPostBody({ page, sort, filters, request })
            : (request.postBody || '');

        this.sort = sort || { field: null, order: null };
        this.pendingRequest = Object.assign({}, request, {
            page,
            sort,
            filters,
            url: finalURL,
            postBody,
        });

        return finalURL;
    }

    /**
     * Inject paging metadata and notify listeners that a remote request is about to start.
     */
    _ajaxRequesting(url, params) {
        const request = this.pendingRequest || {};
        if (request.page != null) {
            if (!params || typeof params !== 'object') {
                params = {};
            }
            params.page = request.page;
        }
        const details = { url, params, request };
        this.fireEvent('request', details);
        if (typeof this.options.onRequest === 'function') {
            this.options.onRequest(details);
        }
        return true;
    }

    /**
     * Hard reload the grid data using Tabulator#setData so metadata changes are respected.
     */
    load(pageNum = 1, { url, postBody, forceReload = false } = {}) {
        return this._requestPage(pageNum, { url, postBody, forceReload }, false);
    }

    /**
     * Navigate to a specific page. Falls back to a full reload if the URL changes.
     */
    setPage(pageNum = 1, { url, postBody, forceReload = false } = {}) {
        return this._requestPage(pageNum, { url, postBody, forceReload }, true);
    }

    /**
     * Shared remote loader used by both load() and setPage().
     */
    _requestPage(pageNum = 1, { url, postBody, forceReload = false } = {}, preferSetPage = false) {
        const page = (typeof pageNum === 'number' && !Number.isNaN(pageNum)) ? pageNum : 1;
        const baseRequest = this.lastRequest || {};
        const requestClone = Object.assign({}, baseRequest);
        const queryFilter = this.filterQuery
            ? [{ field: '__query__', value: this.filterQuery }]
            : (Array.isArray(requestClone.filters) ? requestClone.filters.slice() : []);
        const sortState = Object.assign({}, this.sort || {});
        const originalPostBody = (postBody !== undefined)
            ? postBody
            : (typeof this.requestBuilder.buildPostBody === 'function'
                ? this.requestBuilder.buildPostBody({ page, sort: sortState, filters: queryFilter, request: requestClone })
                : (requestClone.originalPostBody !== undefined ? requestClone.originalPostBody : ''));
        const mergedBody = this._mergePostBody(originalPostBody);

        let resolvedURL = url || null;
        if (!resolvedURL && typeof this.requestBuilder.buildURL === 'function') {
            resolvedURL = this.requestBuilder.buildURL({ page, sort: sortState, filters: queryFilter, request: requestClone });
        }
        if (!resolvedURL && requestClone.url) {
            resolvedURL = requestClone.url;
        }

        const request = {
            page,
            url: resolvedURL,
            postBody: mergedBody,
            originalPostBody,
            sort: sortState,
            filters: queryFilter,
        };

        if (!request.url) {
            return Promise.reject(new Error('TabulatorGrid.load: url is required'));
        }

        this.pendingRequest = request;

        const urlChanged = !!(requestClone.url && requestClone.url !== request.url);
        const shouldUseSetData = forceReload || !preferSetPage || !this.hasLoaded || urlChanged;
        const performRequest = () => {
            const actionPromise = shouldUseSetData
                ? this.table.setData(request.url, { page }, 'POST')
                : this.table.setPage(page);
            return this._wrapRequestPromise(actionPromise);
        };

        if (this.tableBuilt) {
            return performRequest();
        }

        return this._waitForTableBuilt().then(() => performRequest());
    }

    /**
     * Convert Tabulator's internal promises into a standard promise that resolves when
     * the response event fires. This keeps the public API identical to the legacy grid.
     */
    _wrapRequestPromise(requestPromise) {
        return new Promise((resolve, reject) => {
            const cleanup = () => {
                this.off('response', onResponse);
                this.off('loadError', onError);
            };
            const onResponse = (payload) => { cleanup(); resolve(payload); };
            const onError = (error) => { cleanup(); reject(error); };
            this.on('response', onResponse);
            this.on('loadError', onError);
            if (requestPromise && typeof requestPromise.catch === 'function') {
                requestPromise.catch(() => {});
            }
        });
    }

    _waitForTableBuilt() {
        if (this.tableBuilt) {
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            this._tableBuiltWaiters.push(resolve);
        });
    }

    _flushTableBuiltQueue() {
        if (!Array.isArray(this._tableBuiltWaiters) || !this._tableBuiltWaiters.length) {
            this._tableBuiltWaiters = [];
            return;
        }
        const waiters = this._tableBuiltWaiters.slice();
        this._tableBuiltWaiters.length = 0;
        waiters.forEach((resolve) => {
            if (typeof resolve === 'function') {
                resolve();
            }
        });
    }

    _mergePostBody(postBody) {
        const parts = [];
        const normalizedBody = this._normalizeBody(postBody);
        const bodyHasFilter = normalizedBody && /(?:^|&)filter\[/i.test(normalizedBody);
        if (normalizedBody) parts.push(normalizedBody);
        const normalizedFilter = this._normalizeBody(this.filterQuery);
        if (normalizedFilter && !bodyHasFilter) parts.push(normalizedFilter);
        if (!parts.length) return '';
        return parts.join('&');
    }

    _normalizeBody(body) {
        if (body == null) return '';
        if (typeof body === 'string') {
            return body.replace(/^[&\s]+|[&\s]+$/g, '');
        }
        if (body instanceof URLSearchParams) {
            return body.toString();
        }
        if (typeof body === 'object') {
            return Object.keys(body)
                .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(body[key])}`)
                .join('&');
        }
        return String(body);
    }

    /**
     * Delegate AJAX execution to Energine.request or fetch so the backend contract stays intact.
     */
    _ajaxRequest(url, config, params) {
        const request = this.pendingRequest || {};
        const targetURL = request.url || url;
        const body = (request.postBody != null)
            ? (typeof request.postBody === 'string' ? request.postBody : this._normalizeBody(request.postBody))
            : this._mergePostBody(request.originalPostBody);
        return new Promise((resolve, reject) => {
            const payload = (body && body.length) ? body : null;
            if (window.Energine && typeof window.Energine.request === 'function') {
                try {
                    window.Energine.request(
                        targetURL,
                        payload,
                        (result) => resolve(result),
                        null,
                        (error) => reject(error || new Error('Request failed'))
                    );
                } catch (err) {
                    reject(err);
                }
            } else if (typeof fetch === 'function') {
                const fetchConfig = Object.assign({}, config || {});
                fetchConfig.method = fetchConfig.method || (body ? 'POST' : 'GET');
                fetchConfig.headers = Object.assign({}, fetchConfig.headers || {});
                if (payload != null && !fetchConfig.headers['Content-Type']) {
                    fetchConfig.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
                }
                if (payload != null) {
                    fetchConfig.body = payload;
                }
                fetch(targetURL, fetchConfig)
                    .then(resp => {
                        if (!resp.ok) throw resp;
                        const header = resp.headers && resp.headers.get ? resp.headers.get('content-type') : '';
                        if (header && header.indexOf('application/json') !== -1) {
                            return resp.json();
                        }
                        return resp.text().then(text => {
                            try { return JSON.parse(text); } catch (_) { return text; }
                        });
                    })
                    .then(resolve)
                    .catch(reject);
            } else {
                reject(new Error('No AJAX implementation available'));
            }
        });
    }

    _normalizeResponse(response) {
        if (response === null || response === undefined) {
            return { data: [] };
        }
        if (typeof response === 'string') {
            try {
                return JSON.parse(response);
            } catch (err) {
                return { data: [] };
            }
        }
        return response;
    }

    /**
     * Normalize server responses and surface them through the legacy `response` event.
     */
    _ajaxResponse(url, params, response) {
        const payload = this._normalizeResponse(response) || {};
        this.lastResponse = payload;
        if (payload.meta) {
            this.setMetadata(payload.meta);
        }
        if (payload.pager) {
            const totalPages = parseInt(payload.pager.count, 10);
            if (!Number.isNaN(totalPages)) {
                payload.last_page = totalPages;
                if (typeof this.table.setMaxPage === 'function') {
                    this.table.setMaxPage(totalPages);
                }
            }
            const currentPage = parseInt(payload.pager.current, 10);
            if (!Number.isNaN(currentPage)
                && this.table
                && this.table.modules
                && this.table.modules.pagination) {
                payload.page = currentPage;
                this.table.modules.pagination.page = currentPage;
            }
            this.lastPager = payload.pager;
        } else {
            this.lastPager = null;
        }
        this.data = Array.isArray(payload.data) ? payload.data : [];
        this.fireEvent('response', payload);
        return this.data;
    }

    /**
     * Keep the previously selected row highlighted once Tabulator finishes rendering.
     */
    _handleDataLoaded() {
        this.data = this.table.getData();
        if (this.selectedKey != null) {
            const row = this.table.getRow(this.selectedKey);
            if (row) row.select();
        } else {
            const rows = this.table.getSelectedRows();
            if (!rows || !rows.length) {
                const first = this.table.getRows()[0];
                if (first) first.select();
            }
        }
        if (typeof this.options.onDataLoaded === 'function' && this.lastResponse) {
            this.options.onDataLoaded(this.lastResponse);
        }
        this.fireEvent('dataLoaded', this.lastResponse || { data: this.data, meta: this.metadata });
        this.lastRequest = this.pendingRequest ? Object.assign({}, this.pendingRequest) : this.lastRequest;
        this.pendingRequest = null;
        this.hasLoaded = true;
    }

    /**
     * Forward load errors to listeners so GridManager can surface alerts.
     */
    _handleDataLoadError(error) {
        if (typeof this.options.onDataError === 'function') {
            this.options.onDataError(error);
        }
        this.fireEvent('loadError', error);
        this.pendingRequest = null;
    }

    /**
     * Persist sort state so GridManager can rebuild URLs for follow-up requests.
     */
    _handleDataSorting(sorters) {
        if (Array.isArray(sorters) && sorters.length) {
            this.sort.field = sorters[0].field || null;
            this.sort.order = sorters[0].dir || null;
        } else {
            this.sort = { field: null, order: null };
        }
        if (typeof this.options.onSortChange === 'function') {
            this.options.onSortChange(this.sort);
        }
        this.fireEvent('sortChange', this.sort);
        return sorters;
    }

    _handlePageLoaded(page) {
        const parsed = (typeof page === 'number' && !Number.isNaN(page)) ? page : parseInt(page, 10);
        const pageNumber = Number.isNaN(parsed) ? null : parsed;
        if (typeof this.options.onPageLoaded === 'function') {
            this.options.onPageLoaded(pageNumber);
        }
        this.fireEvent('pageLoaded', pageNumber);
    }

    _handleRowClick(row) {
        const data = row.getData();
        this.selectedKey = this.keyFieldName ? data[this.keyFieldName] : null;
        if (typeof this.options.onSelect === 'function') {
            this.options.onSelect(row);
        }
        this.fireEvent('select', row);
    }

    _handleRowDoubleClick(row) {
        const data = row.getData();
        this.selectedKey = this.keyFieldName ? data[this.keyFieldName] : null;
        if (typeof this.options.onDoubleClick === 'function') {
            this.options.onDoubleClick(row);
        }
        this.fireEvent('doubleClick', row);
    }

    _handleSelectionChanged() {
        const row = this.getSelectedItem();
        if (row) {
            const data = row.getData();
            this.selectedKey = this.keyFieldName ? data[this.keyFieldName] : null;
            this.fireEvent('select', row);
        } else {
            this.selectedKey = null;
        }
    }

    /**
     * Replace column metadata and rebuild Tabulator definitions on the fly.
     */
    setMetadata(metadata) {
        this.metadata = metadata || {};
        this.keyFieldName = null;
        const columns = [];
        Object.keys(this.metadata).forEach((fieldName) => {
            const fieldMeta = this.metadata[fieldName];
            if (!fieldMeta) return;
            if (fieldMeta.key) {
                this.keyFieldName = fieldName;
            }
            if (fieldMeta.visible === false || fieldMeta.type === 'hidden') {
                return;
            }
            columns.push(this.createColumnDefinition(fieldName, fieldMeta));
        });
        this.table.setColumns(columns);
        if (this.keyFieldName) {
            this.table.setOptions({ index: this.keyFieldName });
        }
    }

    /**
     * Translate Energine column metadata into Tabulator column settings.
     */
    createColumnDefinition(fieldName, fieldMeta) {
        const column = {
            field: fieldName,
            title: fieldMeta.title || fieldName,
            headerSort: fieldMeta.sort === 1,
            visible: fieldMeta.visible !== false,
            hozAlign: fieldMeta.align || 'left',
        };

        if (fieldMeta.width) {
            column.width = fieldMeta.width;
        }
        column.formatter = this.createFormatter(fieldName, fieldMeta);
        return column;
    }

    createFormatter(fieldName, fieldMeta) {
        switch ((fieldMeta.type || '').toLowerCase()) {
            case 'boolean':
                return (cell) => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'form-check m-0 d-flex justify-content-center';
                    const input = document.createElement('input');
                    input.type = 'checkbox';
                    input.className = 'form-check-input';
                    input.disabled = true;
                    const value = cell.getValue();
                    const normalized = value !== undefined && value !== null
                        ? String(value).toLowerCase()
                        : '';
                    input.checked = value === true
                        || value === 1
                        || normalized === '1'
                        || normalized === 'true'
                        || normalized === 'y';
                    wrapper.appendChild(input);
                    return wrapper;
                };
            case 'value':
                return (cell) => {
                    const value = cell.getValue();
                    if (value && typeof value === 'object' && value.value !== undefined) {
                        return value.value || '';
                    }
                    return value != null ? value : '';
                };
            case 'textbox':
                return (cell) => {
                    const value = cell.getValue();
                    if (value && typeof value === 'object') {
                        return Object.values(value).join(', ');
                    }
                    return value != null ? value : '';
                };
            case 'file':
                return (cell) => {
                    const value = cell.getValue();
                    if (!value) {
                        return '';
                    }
                    const img = document.createElement('img');
                    img.src = ((window.Energine && window.Energine.resizer) || '') + 'w40-h40/' + value;
                    img.width = 40;
                    img.height = 40;
                    img.className = 'img-thumbnail rounded';
                    if (fieldMeta && fieldMeta.title) {
                        img.alt = fieldMeta.title;
                    }
                    const holder = document.createElement('div');
                    holder.className = 'd-flex justify-content-center';
                    holder.appendChild(img);
                    return holder;
                };
            default:
                return (cell) => {
                    const value = cell.getValue();
                    return value != null ? String(value).trim() : '';
                };
        }
    }

    setData(data = []) {
        this.data = Array.isArray(data) ? data : [];
        return this.table.setData(this.data);
    }

    clear() {
        this.data = [];
        this.table.clearData();
    }

    build() {
        // Tabulator renders data automatically; method kept for legacy compatibility.
    }

    isEmpty() {
        return this.table.getDataCount() === 0;
    }

    getSelectedItem() {
        const rows = this.table.getSelectedRows();
        return rows && rows.length ? rows[0] : null;
    }

    getSelectedRecord() {
        const row = this.getSelectedItem();
        return row ? row.getData() : null;
    }

    getSelectedRecordKey() {
        const record = this.getSelectedRecord();
        return (record && this.keyFieldName) ? record[this.keyFieldName] : null;
    }

    dataKeyExists(key) {
        if (!this.keyFieldName) return false;
        return this.table.getData().some(item => item[this.keyFieldName] == key);
    }

    selectRowByKey(key) {
        if (!this.keyFieldName || key === undefined || key === null) return null;
        const row = this.table.getRow(key);
        if (row) {
            row.select();
            this.selectedKey = key;
            return row;
        }
        return null;
    }

    selectFirstRow() {
        const row = this.table.getRows()[0];
        if (row) row.select();
        return row;
    }

    selectPrevRow() {
        const current = this.getSelectedItem();
        const prev = current && typeof current.getPrevRow === 'function' ? current.getPrevRow() : null;
        if (prev) prev.select();
        return prev;
    }

    selectNextRow() {
        const current = this.getSelectedItem();
        const next = current && typeof current.getNextRow === 'function' ? current.getNextRow() : null;
        if (next) next.select();
        return next;
    }

    selectItem(row) {
        if (row && typeof row.select === 'function') {
            row.select();
            return row;
        }
        if (row && this.keyFieldName && row[this.keyFieldName] !== undefined) {
            return this.selectRowByKey(row[this.keyFieldName]);
        }
        return this.selectFirstRow();
    }

    deselectItem() {
        this.table.deselectRow();
        this.selectedKey = null;
    }

    setSort(field, order) {
        if (field) {
            this.table.setSort(field, order || 'asc');
            this.sort = { field, order: order || 'asc' };
        } else {
            this.table.clearSort();
            this.sort = { field: null, order: null };
        }
    }

    setFilter(field, type, value) {
        if (Array.isArray(field)) {
            if (field.length === 1 && field[0] && field[0].field === '__query__') {
                this.filterQuery = this._normalizeBody(field[0].value);
            }
            return this.table.setFilter(field);
        }
        if (field === '__query__') {
            this.filterQuery = this._normalizeBody(value);
        }
        return this.table.setFilter(field, type, value);
    }

    setFilterQuery(queryString) {
        this.filterQuery = this._normalizeBody(queryString);
        if (this.filterQuery) {
            return this.table.setFilter([{ field: '__query__', type: 'plain', value: this.filterQuery }]);
        }
        return this.table.clearFilter();
    }

    clearFilter() {
        this.filterQuery = '';
        this.table.clearFilter(true);
    }

    clearSort() {
        this.table.clearSort();
        this.sort = { field: null, order: null };
    }

    iterateFields() {
        // legacy stub for backwards compatibility
    }
}

class Grid extends TabulatorGrid {}

class GridManager {
    /**
     * @param {HTMLElement|string} element Root container rendered by list.xslt.
     */
    constructor(element) {
        // --- Properties ---
        this.mvElementId = null;
        this.langId = 0;
        this.filterQuery = '';

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
        this.grid = this.createGrid(this.element.querySelector('[data-role="grid"]'));

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

        // --- Initial load ---
        this.reload();
    }

    /**
     * Factory method that allows descendants (e.g. FileRepository) to override grid behaviour.
     */
    createGrid(element) {
        return new Grid(element, {
            onSelect: this.onSelect.bind(this),
            onSortChange: this.onSortChange.bind(this),
            onDoubleClick: this.onDoubleClick.bind(this),
            onDataLoaded: this.processServerResponse.bind(this),
            onDataError: this.processServerError.bind(this),
            onPageLoaded: this.handlePageLoaded.bind(this),
            requestBuilder: {
                buildURL: ({ page, sort }) => this.buildRequestURL(page, sort),
                buildPostBody: () => this.buildRequestPostBody(),
            },
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
        this.clearFilterQuery();
        this.reload();
    }

    setFilterQuery(query) {
        this.filterQuery = query || '';
        if (this.grid && typeof this.grid.setFilterQuery === 'function') {
            this.grid.setFilterQuery(this.filterQuery);
        }
    }

    clearFilterQuery() {
        this.filterQuery = '';
        if (this.grid && typeof this.grid.clearFilter === 'function') {
            this.grid.clearFilter();
        }
    }

    getFilterQuery() {
        return this.filterQuery;
    }

    applyFilter(query) {
        this.setFilterQuery(query);
        this.pageList.currentPage = 1;
        this.loadPage(1);
    }

    resetFilter() {
        this.clearFilterQuery();
        this.pageList.currentPage = 1;
        this.loadPage(1);
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

    /**
     * Request a specific page from the server and update the paginator state.
     */
    loadPage(pageNum) {
        this.pageList.disable();
        if (this.toolbar) this.toolbar.disableControls();
        showLoader();
        const targetPage = (typeof pageNum === 'number' && !Number.isNaN(pageNum))
            ? pageNum
            : (this.pageList.currentPage || 1);
        this.pageList.currentPage = targetPage;

        this.grid.setPage(targetPage, {
            url: this.buildRequestURL(targetPage),
            postBody: this.buildRequestPostBody(),
        }).catch(() => {});
    }

    handlePageLoaded(page) {
        if (typeof page !== 'number' || Number.isNaN(page)) {
            return;
        }
        if (this.grid && this.grid.lastPager && this.grid.lastPager.count != null) {
            const total = parseInt(this.grid.lastPager.count, 10);
            if (!Number.isNaN(total)) {
                this.pageList.totalPages = total;
            }
        }
        this.pageList.currentPage = page;
        if (typeof this.pageList.setCurrent === 'function') {
            this.pageList.setCurrent(page);
        }
    }

    /**
     * Compose the data endpoint expected by Energine backends.
     */
    buildRequestURL(pageNum, sort = this.grid ? this.grid.sort : null) {
        const sortField = sort && sort.field ? sort.field : null;
        const sortOrder = sort && sort.order ? sort.order : null;
        if (sortField && sortOrder) {
            return `${this.singlePath}get-data/${sortField}-${sortOrder}/page-${pageNum}`;
        }
        return `${this.singlePath}get-data/page-${pageNum}`;
    }

    /**
     * Keep query, language and filter parameters compatible with the legacy PHP controllers.
     */
    buildRequestPostBody() {
        const parts = [];
        if (this.langId) {
            parts.push(`languageID=${encodeURIComponent(this.langId)}`);
        }
        if (this.filterQuery) {
            parts.push(this.filterQuery);
        } else if (this.filter && typeof this.filter.getValue === 'function') {
            const value = this.filter.getValue();
            if (value) parts.push(value);
        }
        return parts.join('&');
    }

    /**
     * Called after Tabulator finishes loading remote data.
     * Responsible for keeping toolbar controls and pagination widgets in sync.
     */
    processServerResponse(result) {
        let control = false;
        if (this.toolbar && this.toolbar.getControlById) {
            control = this.toolbar.getControlById('add');
        }

        if (result && result.pager) {
            this.pageList.build(result.pager.count, result.pager.current, result.pager.records);
            if (typeof result.pager.current === 'number') {
                this.pageList.currentPage = result.pager.current;
            }
        }
        if (this.grid.isEmpty()) {
            if (this.toolbar && this.toolbar.disableControls) {
                this.toolbar.disableControls();
            }
            this.pageList.disable();
        } else {
            if (this.toolbar && this.toolbar.enableControls) {
                this.toolbar.enableControls();
            }
            this.pageList.enable();
        }
        if (control && typeof control.enable === 'function') {
            control.enable();
        }
        hideLoader();
    }

    /**
     * Mirror legacy error handling by showing an alert and re-enabling UI controls.
     */
    processServerError(error) {
        let message = '';
        if (error) {
            if (typeof error === 'string') {
                message = error;
            } else if (error.responseText) {
                message = error.responseText;
            } else if (error.statusText) {
                message = error.statusText;
            } else if (error.message) {
                message = error.message;
            } else {
                try {
                    message = JSON.stringify(error);
                } catch (e) {
                    message = String(error);
                }
            }
        }
        if (!message) {
            message = 'Request failed.';
        }
        alert(message);
        if (this.toolbar && this.toolbar.enableControls) {
            this.toolbar.enableControls();
        }
        this.pageList.enable();
        hideLoader();
    }

    /**
     * Handle modal callbacks that request additional actions after closing.
     */
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

    _getTranslation(key, fallback = '') {
        if (!key) return fallback;
        try {
            const translations = window.Energine && window.Energine.translations;
            if (!translations) return fallback;
            if (typeof translations.get === 'function') {
                const value = translations.get(key);
                if (value != null && value !== key) {
                    return value;
                }
            }
            if (Object.prototype.hasOwnProperty.call(translations, key)) {
                const value = translations[key];
                if (value != null) {
                    return value;
                }
            }
        } catch (e) {
            // ignore lookup errors, fall back to provided default
        }
        return fallback;
    }

    _alertMissingSelection() {
        const message = this._getTranslation('MSG_SELECT_RECORD', 'Please select a record first.');
        if (message) {
            alert(message);
        }
    }

    _normalizeActionArgument(value) {
        if (value === undefined || value === null) {
            return null;
        }
        if (typeof value === 'object') {
            return null;
        }
        const normalized = String(value).trim();
        if (!normalized || normalized.toLowerCase() === 'nan') {
            return null;
        }
        return normalized;
    }

    _requireSelectedRecord() {
        if (!this.grid || typeof this.grid.getSelectedRecord !== 'function') {
            return null;
        }
        const record = this.grid.getSelectedRecord();
        if (record) {
            return record;
        }
        this._alertMissingSelection();
        return null;
    }

    _requireSelectedKey() {
        if (!this.grid || typeof this.grid.getSelectedRecordKey !== 'function') {
            return null;
        }
        const record = this._requireSelectedRecord();
        if (!record) {
            return null;
        }
        const key = this.grid.getSelectedRecordKey();
        if (key === undefined || key === null || (typeof key === 'string' && key.trim() === '')) {
            const message = this._getTranslation('MSG_INVALID_RECORD', 'Selected record does not have an identifier.');
            if (message) {
                alert(message);
            }
            return null;
        }
        return key;
    }

    _resolveMoveSource(candidate) {
        let source = this._normalizeActionArgument(candidate);
        if (!source) {
            source = this._normalizeActionArgument(this.getMvElementId());
        }
        if (!source) {
            source = this._requireSelectedKey();
        }
        if (!source) {
            return null;
        }
        this.setMvElementId(source);
        return source;
    }

    // --- Actions ---
    view() {
        const key = this._requireSelectedKey();
        if (!key) return;
        ModalBox.open({ url: `${this.singlePath}${key}` });
    }
    add() {
        ModalBox.open({
            url: `${this.singlePath}add/`,
            onClose: this.processAfterCloseAction.bind(this)
        });
    }
    edit(id) {
        let key = this._normalizeActionArgument(id);
        if (!key) {
            key = this._requireSelectedKey();
        }
        if (!key) return;
        ModalBox.open({
            url: `${this.singlePath}${key}/edit`,
            onClose: this.processAfterCloseAction.bind(this)
        });
    }
    move(id) {
        const key = this._resolveMoveSource(id);
        if (!key) return;
        ModalBox.open({
            url: `${this.singlePath}move/${key}`,
            onClose: this.processAfterCloseAction.bind(this)
        });
    }
    moveFirst() { this.moveTo('first'); }
    moveLast() { this.moveTo('last'); }
    moveAbove(id) {
        this.moveTo('above', null, id);
    }
    moveBelow(id) {
        this.moveTo('below', null, id);
    }
    moveTo(dir, fromId, toId) {
        const source = this._resolveMoveSource(fromId);
        if (!source) return;
        let target = '';
        if (dir === 'above' || dir === 'below') {
            target = this._normalizeActionArgument(toId);
            if (!target) {
                target = this._requireSelectedKey();
                if (!target) return;
            }
        }
        showLoader();
        Energine.request(
            `${this.singlePath}move/${source}/${dir}/${target || ''}/`,
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
        const prev = this.grid.selectPrevRow();
        if (prev) {
            this.edit();
        }
    }
    editNext() {
        const next = this.grid.selectNextRow();
        if (next) {
            this.edit();
        }
    }
    del() {
        const key = this._requireSelectedKey();
        if (!key) return;
        const confirmMessage = this._getTranslation('MSG_CONFIRM_DELETE', 'Do you really want to delete the chosen record?');
        if (confirm(confirmMessage)) {
            showLoader();
            Energine.request(
                `${this.singlePath}${key}/delete/`,
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
        const record = this._requireSelectedRecord();
        if (!record) return;
        ModalBox.setReturnValue(record);
        ModalBox.close();
    }
    close() {
        ModalBox.close();
    }
    up() {
        const key = this._requireSelectedKey();
        if (!key) return;
        Energine.request(
            `${this.singlePath}${key}/up/`,
            (this.filter && this.filter.getValue) ? this.filter.getValue() : null,
            this.loadPage.bind(this, this.pageList.currentPage)
        );
    }
    down() {
        const key = this._requireSelectedKey();
        if (!key) return;
        Energine.request(
            `${this.singlePath}${key}/down/`,
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
    constructor(gridManager) {
        this.manager = gridManager;
        this.element = gridManager.element.querySelector('[data-role="grid-filter"]');
        if (!this.element) {
            throw new Error('Element for GridManager.Filter was not found.');
        }

        this.fieldSelect = this.element.querySelector('[data-role="filter-field"]');
        this.conditionSelect = this.element.querySelector('[data-role="filter-condition"]');
        this.queryContainers = Array.from(this.element.querySelectorAll('[data-role="filter-query"]'));
        this.queryInputs = this.queryContainers.map(container =>
            container.querySelector('[data-role="filter-query-input"]') || container.querySelector('input')
        );
        this.applyButton = this.element.querySelector('[data-action="apply-filter"]');
        this.resetButton = this.element.querySelector('[data-action="reset-filter"]');

        if (!this.fieldSelect || !this.conditionSelect || !this.queryInputs.length) {
            throw new Error('Filter: required controls are missing.');
        }

        this.active = false;
        this.value = '';

        this.conditionOptions = Array.from(this.conditionSelect.options || []);
        this.conditionOptions.forEach(option => {
            const types = option.getAttribute('data-types');
            if (types) {
                option.dataset.types = types;
            }
        });

        this._bindEvents();
        this._syncFromManager();
        this._updateConditionVisibility();
        this._updateInputControls();
    }

    _bindEvents() {
        if (this.applyButton) {
            this.applyButton.addEventListener('click', () => {
                const isActive = this.use();
                if (isActive) {
                    this.manager.applyFilter(this.value);
                } else {
                    this.manager.resetFilter();
                }
            });
        }
        if (this.resetButton) {
            this.resetButton.addEventListener('click', (event) => {
                event.preventDefault();
                this.remove();
                this.manager.resetFilter();
            });
        }

        this.fieldSelect.addEventListener('change', () => {
            this._updateConditionVisibility();
            this._updateInputControls();
        });
        this.conditionSelect.addEventListener('change', () => this._updateInputControls());

        this.queryInputs.forEach(input => {
            if (!input) return;
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    if (this.applyButton) {
                        this.applyButton.click();
                    }
                }
            });
        });
    }

    _syncFromManager() {
        const stored = this.manager.getFilterQuery();
        if (stored) {
            this.value = stored;
            this.active = true;
            this.element.classList.add('active');
        }
    }

    _getSelectedFieldType() {
        const option = this.fieldSelect.selectedOptions && this.fieldSelect.selectedOptions[0];
        return option ? (option.getAttribute('type') || '').toLowerCase() : '';
    }

    _updateConditionVisibility() {
        const fieldType = this._getSelectedFieldType();
        let selected = this.conditionSelect.value;
        let firstEnabled = null;
        this.conditionOptions.forEach(option => {
            if (!option) return;
            const types = (option.dataset.types || '').split('|').map(s => s.trim()).filter(Boolean);
            const allowed = !types.length || !fieldType || types.includes(fieldType);
            option.disabled = !allowed;
            option.classList.toggle('d-none', !allowed);
            if (allowed && !firstEnabled) {
                firstEnabled = option;
            }
        });
        const selectedOption = this.conditionSelect.selectedOptions && this.conditionSelect.selectedOptions[0];
        if (!selectedOption || selectedOption.disabled) {
            if (firstEnabled) {
                this.conditionSelect.value = firstEnabled.value;
                selected = firstEnabled.value;
            }
        }
        return selected;
    }

    _updateInputControls() {
        const condition = this.conditionSelect.value;
        const fieldType = this._getSelectedFieldType();
        const showSecond = condition === 'between' || condition === 'range';

        this.queryContainers.forEach((container, index) => {
            if (!container) return;
            if (index === 0) {
                container.classList.remove('d-none');
            } else {
                container.classList.toggle('d-none', !showSecond);
            }
        });

        const inputType = (fieldType === 'date' || fieldType === 'datetime') ? 'date' : 'text';
        const disable = fieldType === 'boolean';
        this.queryInputs.forEach((input, index) => {
            if (!input) return;
            input.type = inputType;
            input.disabled = disable;
            if (disable) {
                input.value = '';
            }
        });
    }

    _visibleInputs() {
        return this.queryInputs.filter((input, index) => {
            const container = this.queryContainers[index];
            return input && container && !container.classList.contains('d-none') && !input.disabled;
        });
    }

    _composeQuery() {
        const values = this._visibleInputs()
            .map(input => (input.value != null ? input.value.trim() : ''))
            .filter(value => value !== '');
        if (!values.length) {
            return '';
        }
        const fieldName = this.fieldSelect.value;
        if (!fieldName) {
            return '';
        }
        const parts = values.map(value => `filter${fieldName}[]=${encodeURIComponent(value)}`);
        const condition = this.conditionSelect.value;
        if (condition) {
            parts.push(`filter[condition]=${encodeURIComponent(condition)}`);
        }
        return parts.join('&');
    }

    use() {
        const query = this._composeQuery();
        if (query) {
            this.value = query;
            this.active = true;
            this.element.classList.add('active');
        } else {
            this.value = '';
            this.active = false;
            this.element.classList.remove('active');
        }
        return this.active;
    }

    remove() {
        this._visibleInputs().forEach(input => { input.value = ''; });
        this.value = '';
        this.active = false;
        this.element.classList.remove('active');
        this.manager.clearFilterQuery();
        this._updateInputControls();
    }

    getValue() {
        return this.value;
    }
}

GridManager.Filter = Filter;

