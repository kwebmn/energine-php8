# GridManager → Tabulator Migration: Task 1 Inventory

## 1. DOM structure produced by `list.xslt`
- **Wrapper form**: `<form method="post" action="…">` optionally tagged with `data-role="grid-form"` when `@exttype='grid'`. Hidden input `componentAction` persists.
- **Pane container**: `<div class="card …" data-role="pane">` holds dataset attributes for quick upload (`quick_upload_*`) and move-from id. Footer `<div class="card-footer" data-pane-part="footer" data-pane-toolbar="bottom"></div>` hosts toolbar/pagination.
- **Card header / tabs**: `<div class="card-header…" data-pane-part="header">` contains `<ul class="nav …" data-role="tabs">` with `<li data-role="tab">` entries. Each tab link `<a data-role="tab-link" data-bs-toggle="tab">` references `data-role="pane-item"` container, with hidden `<span data-role="tab-meta">` storing JSON-like metadata (language etc.).
- **Card body**: `<div class="card-body p-0" data-pane-part="body">` → `<div class="tab-content" data-role="tab-content">` → active `<div class="tab-pane…" data-role="pane-item">` for grid contents.
- **Grid wrapper**: `<div class="grid …" data-role="grid">` is the GridManager root. Inside:
  - Optional **toolbar/filter block**: `<div class="grid-toolbar …" data-role="grid-toolbar">` containing `<div class="grid-filter …" data-role="grid-filter">` with form controls: `select[data-role="filter-field"]`, `select[data-role="filter-condition"]`, repeating `.filter-query[data-role="filter-query"]` wrappers with inputs `data-role="filter-query-input"`, and action buttons `data-action="apply-filter"` / `data-action="reset-filter"`. File repository view injects `<div class="grid-breadcrumbs" id="breadcrumbs">`.
  - **Header table**: `<div class="grid-head …" data-grid-section="head">` → `<table class="…" data-role="grid-table" data-grid-part="head">` with optional `data-fixed-columns="true"`, `<col>` definitions per field, and `<th name="…">` captions.
  - **Body table**: `<div class="grid-body …" data-grid-section="body">` containing `<div data-grid-section="body-inner">` with `<table data-role="grid-table" data-grid-part="body">`, mirrored `<col>` set, hidden `<thead>` (duplicate headers for sizing), and empty `<tbody>` populated by JS.
【F:engine/core/modules/share/transformers/list.xslt†L32-L288】

## 2. Current JavaScript responsibilities (`GridManager.js`)

### 2.1 `Grid` class (table rendering & interaction)
- Manages DOM references for header/body tables, toolbar, pane sizing; applies Bootstrap classes on init.
- Stores `metadata`, `data`, `selectedItem`, `sort` state, key field detection (`setMetadata`), and exposes accessors (`getMetadata`, `getSelectedRecord`, `getSelectedRecordKey`, `isEmpty`).
- Event hub with `on/off/fireEvent`; fires `select`, `doubleClick`, `dirty`, `sortChange` hooks consumed by `GridManager` or external listeners.
- Rendering pipeline: `setData` → `build()` clears `<tbody>`, creates rows via `addRecord`/`iterateFields` respecting `metadata.visible`, formatting booleans (checkbox), values, multi-value textboxes, file thumbnails (via `Energine.resizer`), `select` deduping, default string rendering, and row selection persistence.
- User interaction: row hover highlighting, click-to-select, double-click event bridging; manual sort toggling on header click (`onChangeSort`) cycling through `'' → asc → desc` with CSS classes, calling `options.onSortChange`.
- Layout helpers: `adjustColumns()` syncs column widths between head/body using `<col>` elements and handles fixed-column mode, `fitGridSize()`/`fitGridFormSize()` compute heights against pane header/footer/toolbars with min height caching, and window `resize` listener.
【F:engine/core/modules/share/scripts/GridManager.js†L1-L472】

### 2.2 `GridManager` controller
- Initializes dependent widgets (`TabPane`, `PageList`, `Toolbar`, `ModalBox` via `ScriptLoader`), constructs `Grid` instance on `[data-role="grid"]`, `Filter` helper, and integrates pagination container into pane footer.
- Tracks language (`langId` from tab metadata), current move target (`mvElementId`), initialization flag, and `singlePath` derived from form attributes for building URLs.
- Data loading flow: `reload()`/`loadPage(pageNum)` disable UI, call `Energine.request` with URL from `buildRequestURL` (includes optional `field-order` sort suffix) and POST body assembled by `buildRequestPostBody` (language + serialized filter). Successful `processServerResponse` caches metadata once, pushes data into grid, rebuilds pagination (`PageList.build`), re-enables toolbar/page controls, and triggers `grid.build()`; errors surface via alert.
- Event wiring: delegates `Grid` callbacks to `onSelect`, `onDoubleClick` (prefers toolbar `edit` action fallback), `onSortChange`/`sortChange` to reload first page; `TabPane` `onTabChange` parses `data-role="tab-meta"` JSON stub, resets filter, and reloads.
- Toolbar actions: `view`, `add`, `edit`, `move`, `moveFirst/Last/Above/Below`, `editPrev/Next`, `del`, `use`, `close`, `up/down`, `print`, `csv`; most open `ModalBox` dialogs or send `Energine.request` to endpoints like `move/${id}/${dir}`. Ensure return handlers call `processAfterCloseAction` to refresh data and mark grid dirty.
- Public API consumed elsewhere includes accessor/mutator triad for move state (`setMvElementId`/`getMvElementId`/`clearMvElementId`), toolbar attachment `attachToolbar`, reload controls, pagination (`loadPage`), and record selection helpers used by toolbar buttons.
【F:engine/core/modules/share/scripts/GridManager.js†L477-L821】

### 2.3 `Filter` & query helpers
- `GridManager.Filter` class binds to `[data-role="grid-filter"]`, wiring selects and inputs, toggling filter state on apply/reset buttons, managing validation, and serializing query string via `getValue()` (adds `filter[field][]=…` pairs plus `filter[condition]`).
- Dynamically switches input layouts (scalar vs. between) using `QueryControls`, clones hidden date inputs for date fields, enforces option visibility per field type, and focuses first visible input. `remove()` clears values and `active` CSS class.
- `QueryControls` manages container visibility, Bootstrap classes, `Enter` key submission, building query strings, and datepicker toggling via `showDatePickers()` flag.
【F:engine/core/modules/share/scripts/GridManager.js†L823-L1129】

## 3. Server contract (HAR example)
- **Endpoint pattern**: POST `/…/single/<component>/get-data[/<field>-<order>]/page-<n>` with `Content-Type: application/x-www-form-urlencoded`. Request body optionally includes `languageID=<id>` and filter parameters from `Filter.getValue()`.
  - **Response schema** (`application/json`):
    - `meta`: object keyed by field name; each entry exposes `title`, `type`, `key` (boolean), `visible` (boolean), form `name`, backend `field`, `rights`, and `sort` flag (1 allows sorting). Used for column setup and key detection.【F:codex/network/samples/translation_page1.json†L1-L33】
    - `data`: array of records matching `meta` keys; values may be primitives, HTML strings, or nested objects (e.g., `{ value: … }`).【F:codex/network/samples/translation_page1.json†L34-L284】
    - `pager`: object with `current` page number, total `count`, and textual `records` summary (e.g., “Всього: 1113”).【F:codex/network/samples/translation_page1.json†L286-L292】
    - Additional flags: `result` (boolean), `mode` (`select` in sample).【F:codex/network/samples/translation_page1.json†L286-L288】
- **Related actions**: CRUD endpoints inferred from GridManager (`…/add/`, `…/<id>/edit`, `…/<id>/delete/`, `…/move/<id>/<dir>/<target>`, `…/<id>/up|down/`, exports `print/`, `csv/`). These expect to keep query params from active filter/language.

## 4. Public API surface to preserve during migration
- **Grid-like adapter must provide**: `setMetadata()`, `setData()`, `build()`, `clear()`, `on()/off()/fireEvent()`, selection helpers (`selectItem`, `deselectItem`, `getSelectedItem`, `getSelectedRecord`, `getSelectedRecordKey`), `isEmpty()`, `dataKeyExists()`, and emit events `select`, `doubleClick`, `dirty`, `sortChange` (or equivalent callbacks for `GridManager` hooks). Sorting state should be accessible via `grid.sort.field`/`grid.sort.order` or adapter methods consumed by `buildRequestURL`.
- **GridManager-facing methods to keep**: move ID setters/getters, `attachToolbar`, `reload()/loadPage()`, `buildRequestURL()`, `buildRequestPostBody()`, `processServerResponse()` (or equivalent data ingestion), `processServerError()`, `processAfterCloseAction()`, CRUD methods (`view`, `add`, `edit`, `move*`, `del`, `use`, `close`, `up/down`, `print`, `csv`), pagination callbacks, and filter delegation (`filter.getValue()`, `filter.remove()`). Toolbar buttons rely on these being stable.
- **Filter utility** should continue exposing `getValue()`, `remove()`, `use()`, `disableInputField()`, `switchInputs()`, `showDatePickers()` behaviour to keep existing UI interactions working until Tabulator-based filtering replaces them.
