# GridManager → Tabulator Migration: Task 2 Architecture Blueprint

## 1. Target Tabulator build and loading strategy
- **Chosen version**: Tabulator **6.3.0** UMD bundles (core JS + `tabulator_bootstrap5.min.css`). This matches the dependency already vendored in `engine/core/modules/share/scripts/lib/tabulator/` and keeps the Bootstrap 5 visual integration requested by the product owner.
- **Loading order**: expose the Tabulator assets through the Energine `ScriptLoader` manifest so they load before `GridManager.js`. Consumers keep calling `ScriptLoader.load('GridManager')` and automatically receive Tabulator in the dependency chain.
- **Global availability**: Tabulator registers itself on `window.TabulatorFull`. The adapter (`TabulatorGrid`) will guard against missing globals and surface a descriptive error to fail fast if the asset pipeline changes.

## 2. Future component layout
```
+--------------------- GridManager (controller) ----------------------+
|  - owns toolbar, filter, pagination (PageList), modal integration   |
|  - orchestrates data requests via Energine.request                  |
|  - passes metadata/data to adapter & listens to its events          |
|                                                                     |
|  +----------- TabulatorGrid (adapter) ----------+                   |
|  |  - wraps new Tabulator(table) instance       |                   |
|  |  - converts meta → columns, pager → stats    |                   |
|  |  - re-exposes selection/sort events          |                   |
|  |  - provides CRUD-friendly helper methods     |                   |
|  +----------------------------------------------+                   |
|                                                                     |
|  Existing helpers kept in place:                                    |
|    • Filter (server query builder)                                  |
|    • PageList (footer pager markup)                                 |
|    • Toolbar (CRUD buttons)                                         |
+---------------------------------------------------------------------+
```

## 3. Data contract → Tabulator configuration mapping

| Server contract piece | Sample value (`translation_page1.json`) | Tabulator property / usage |
| --- | --- | --- |
| `meta[FIELD].title` | `"Назва"` | `columns[].title` |
| `meta[FIELD].field` | `"translation_name"` | `columns[].field` (data key) |
| `meta[FIELD].key` | `true` | store as `primaryKey` inside adapter for record lookup |
| `meta[FIELD].visible` | `false`/`true` | `columns[].visible` |
| `meta[FIELD].sort` | `1` | `columns[].headerSort` (`true` when server allows sorting) |
| `meta[FIELD].type` | `"checkbox"`, `"image"`, etc. | choose Tabulator formatter: checkbox → `formatter:"tickCross"`; file/image → custom formatter using `Energine.resizer`; raw HTML → `formatter:"html"`; default → text |
| `meta[FIELD].align` (if present) | `"right"` | `columns[].hozAlign` |
| `meta[FIELD].width` (if present) | `150` | `columns[].width` |
| `data[]` records | JSON rows | fed to `table.setData(rows)` |
| `pager.current` | `1` | saved to `PageList.build()` + `table.setPage(1)` when using Tabulator pagination |
| `pager.count` | `112` | `PageList.totalRecords = count` (still rendered by Energine footer) |
| `pager.records` | `"Всього: 1113"` | mirrored in footer status label |
| `mode` / `result` | e.g. `"select"`, `true` | used for conditional UI (disabled states) – Tabulator stores for reference only |

Additional mapping helpers:
- Adapter keeps `metadata` cache exactly as server sends it for reuse by toolbar dialog builders.
- Key field detection: first entry with `meta[*].key === true` (fallback to `meta.id`). This becomes `options.primaryKey` for selection helpers.

## 4. Request & pagination flow

1. `GridManager.reload()` / `loadPage(page)` still assemble URL & POST body using the filter, language, and move context.
2. Instead of manually handling `Energine.request` success, the controller now calls `tabulatorGrid.requestData({ url, body, page })`.
3. `TabulatorGrid` invokes `Tabulator` with remote Ajax mode:
   - `ajaxURL` = URL from `GridManager.buildRequestURL(page)`.
   - `ajaxConfig` = `{ method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }`.
   - `ajaxContentType` = `'form'`; `ajaxRequestFunc` pipes request through `Energine.request` to keep global interceptors.
   - `ajaxParams` merges `GridManager.buildRequestPostBody()` output with `field-order` when a sort is active.
4. `ajaxResponse` handler transforms the Energine payload into `{ data, last_page, current_page }` that Tabulator expects under remote pagination mode; simultaneously it forwards `meta` and `pager` back to `GridManager.processServerResponse` to keep the existing toolbar and footer logic.
5. `PageList` remains source of truth for pagination controls displayed in the footer. When user clicks a page button, `GridManager.loadPage(n)` updates Tabulator by calling `table.setPage(n)` which triggers a fresh AJAX cycle.

## 5. Tabulator events ↔ GridManager callbacks

| Tabulator event | Trigger | GridManager hook / behaviour |
| --- | --- | --- |
| `tableBuilt` (once) | Tabulator finished initial DOM render | `GridManager.onGridReady()` (new helper) → re-enable toolbar, call `fitGridFormSize()` once |
| `ajaxRequesting(url, params)` | before remote request | show loading overlay; optionally cancel when toolbar disabled |
| `ajaxResponse(url, params, response)` | raw server payload | parse `meta`, update adapter cache, call `GridManager.applyMetadata(meta)` before returning `response.data` to Tabulator |
| `ajaxError(error)` | network/server failure | route to `GridManager.processServerError(error)` |
| `dataSorting(sorters)` | user changed sort | convert to Energine `field-order`, call `GridManager.loadPage(1, { sort })` |
| `dataFiltered(filters, rows)` | client filter applied (optional future) | notify filter UI about counts, keep for analytics |
| `rowSelectionChanged(data, rows)` | selection toggled | call `GridManager.onSelect(record)`; disable toolbar when `data.length === 0` |
| `rowDblClick(e, row)` | double click | call `GridManager.onDoubleClick(record)` (default opens edit dialog) |
| `dataLoadError(error)` | server returned `result:false` or invalid data | bubble to `GridManager.processServerError` |

## 6. GridManager API surface to keep stable

| Area | Methods/events to preserve | Notes |
| --- | --- | --- |
| **Lifecycle** | `initialize()`, `reload()`, `loadPage(page)`, `setInitialized(flag)` | `reload()` now delegates to adapter but public signature stays identical. |
| **Selection** | `getSelectedRecord()`, `getSelectedRecordKey()`, `selectRecordById(id)`, `clearSelection()` | Under the hood these call `TabulatorGrid.getSelectedData()` / `selectRow(id)`. |
| **CRUD actions** | `view()`, `add()`, `edit()`, `del()`, `move*()`, `up()/down()`, `use()`, `print()`, `csv()` | Continue to rely on `GridManager.getSelectedRecordKey()` and `gridDirty` flag; no change for toolbar wiring. |
| **Modal callbacks** | `processAfterCloseAction()`, `setMvElementId()` suite | Keep state machine intact so cross-component workflows still function. |
| **Filter integration** | `filter.use()`, `filter.remove()`, `buildRequestPostBody()` | Filter object unchanged; Tabulator adapter simply consumes the serialized value. |
| **Sorting** | `sortChange` event (emitted) | Adapter emits the same event payload (`{ field, order }`) so existing listeners keep working. |
| **Events** | `grid.on('select'/'doubleClick'/'dirty')` | TabulatorGrid re-emits via its own event emitter facade to avoid mass refactor. |
| **UI toggles** | `disableToolbar()`, `enableToolbar()`, `disablePaging()`, `enablePaging()` | Called before/after remote operations; TabulatorGrid must respect disabled state by blocking user interaction (e.g., via `blockRedraw()` or overlay).

## 7. Adapter responsibilities checklist
- Initialise Tabulator with `layout: 'fitColumns'`, `height: '100%'` (or computed) so existing responsive styles remain effective.
- Provide `setMetadata(meta)` and `setData(rows)` shims for legacy callers; both internally delegate to Tabulator `setColumns`/`setData`.
- Maintain an internal map of `rowId → rowComponent` for fast updates when toolbar actions return patched records (`updateRecord(record)` → `table.updateRow(id, record)`).
- Expose `clear()` for toolbar reset actions (`grid.clear()`), which calls `table.clearData()` and resets pagination to page 1.
- Support `markDirty()`/`fireEvent('dirty')` when CRUD actions mutate data so external modules (e.g., tree reloaders) receive the same signal.

## 8. Low-effort future enhancements enabled by Tabulator
1. **Column visibility menu**: enable `columnHeaderMenu` to let admins hide/show columns without backend changes.
2. **Persisted layout**: switch on Tabulator persistence (`persistenceMode: 'local'`) keyed per component to remember order/width.
3. **Inline quick search**: add a toolbar input that calls `table.setFilter('global', 'like', query)` for instant filtering.
4. **CSV/XLSX export**: leverage `table.download('xlsx', ...)` for richer export options compared to current CSV endpoint.

---
This architecture blueprint keeps the existing Energine contracts intact while letting Tabulator own rendering, selection, sorting, and (optionally) pagination. The next implementation task can now focus on building the `TabulatorGrid` adapter and methodically swapping GridManager internals to use it.
