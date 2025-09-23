# Tabulator Grid Developer Guide

This guide complements `docs/gridmanager-tabulator-architecture.md` with practical instructions for maintaining and extending the Energine grid after the Tabulator migration. It targets developers who already understand Energine modules and need concrete entry points for day-to-day work.

## Reference map

| Area | Location | Notes |
| --- | --- | --- |
| Asset bootstrap | `engine/core/modules/share/scripts/GridManager.js` (`ScriptLoader.load` block) | Loads the Tabulator JS bundle plus CSS themes before any grid code runs. |
| Tabulator adapter | `TabulatorGrid` in `GridManager.js` | Bridges legacy Grid API and Tabulator, exposes lifecycle hooks (`request`, `response`, `pageLoaded`, etc.). |
| Grid facade | `GridManager` in `GridManager.js` | Owns toolbar wiring, pagination, filter delegation, and CRUD helpers. |
| Filter UI | `GridManager.Filter` in `GridManager.js` | Parses the filter toolbar markup, composes query strings, and triggers reloads. |
| Grid markup | `engine/core/modules/share/transformers/list.xslt` | Renders toolbar/filter containers and the Tabulator host node (`data-role="grid-table"`). |
| Module customisations | Example: `engine/core/modules/share/scripts/FileRepository.js` | Demonstrates overriding `createColumnDefinition` via `GridManager.createGrid`. |

Use this table to quickly locate the code to adjust before making behavioural changes.

## Bootstrapping and dependencies

1. **Tabulator assets** live in `engine/core/modules/share/scripts/lib/tabulator/` and load through the ScriptLoader chain at the top of `GridManager.js`. The self-invoking block ensures both the base and Bootstrap themes are appended even when `Energine.loadCSS` is unavailable (for example in standalone demos). 
2. **Upgrading Tabulator**: replace the files in the `lib/tabulator/` directory, keep the MIT licence up to date, and verify the bundle still exposes the global `Tabulator` constructor (UMD build). Re-run the manual checklist from `docs/gridmanager-tabulator-testing.md` after upgrades.
3. **Script map**: confirm `system.jsmap.php` still points at `scripts/GridManager.js` so downstream modules fetch the updated bundle.

## Extension points at a glance

- `TabulatorGrid` fires custom events (`request`, `response`, `dataLoaded`, `loadError`, `sortChange`, `pageLoaded`) around Tabulator callbacks. Subscribe via `grid.on('event', handler)` to avoid touching Tabulator directly. 
- Override `GridManager.createGrid()` in specialised modules (see FileRepository) to instantiate a subclass of `Grid` with bespoke column logic, plugin setup, or Tabulator options. 
- The paginator (`PageList`) already syncs with Tabulator `pageLoaded`; listen to `GridManager.handlePageLoaded` or Tabulator events when building custom pagination UI. 
- Filter state is stored on `GridManager.filterQuery`; programmatic changes should call `GridManager.applyFilter()` or `GridManager.resetFilter()` to keep the UI and request payload aligned. 

## Adding or modifying columns

1. **Expose field metadata** from the backend (`meta[field]`) with the correct `name`, `title`, `type`, visibility, and sort flags. `TabulatorGrid.setMetadata` converts that structure into Tabulator column definitions, auto-detecting the key column. 
2. **Custom formatting**: extend `Grid` (alias of `TabulatorGrid`) and override `createColumnDefinition` or `createFormatter`. Return DOM nodes or strings as needed—see FileRepository for thumbnail and breadcrumb columns. 
3. **Column-specific behaviour** (widths, alignment, editors) can be set on the column object before returning it. Tabulator respects properties like `width`, `resizable`, `hozAlign`, `editor`, and `formatterParams`.
4. **Post-render hooks**: subscribe to `grid.on('dataLoaded', ...)` to run logic that depends on rendered DOM (e.g., tooltips or third-party widgets). The handler receives the last Tabulator response payload so you can check breadcrumbs or pager metadata. 

## Wiring Tabulator plugins or modules

1. Instantiate plugins when overriding `createGrid`. After calling `super(...)`, access the Tabulator instance via `grid.table` and register modules or set options:
   ```js
   class CustomRepository extends GridManager {
       createGrid(element) {
           const grid = new Grid(element, { /* handlers */ });
           grid.table.setOptions({ movableColumns: true });
           grid.table.registerModule('myPlugin', MyPluginModule);
           return grid;
       }
   }
   ```
   This keeps plugin setup isolated from core `GridManager` logic while preserving the legacy API surface. 
2. When a plugin needs lifecycle coordination (e.g., responsive layout recalculation after data load), subscribe to `grid.on('dataLoaded', ...)` or `grid.on('pageLoaded', ...)` rather than patching Tabulator callbacks directly. 
3. If a plugin introduces new assets, add them next to the existing Tabulator bundle and call `Energine.loadCSS` / `ScriptLoader.load` similarly to keep resource ordering deterministic.

## Configuring filters

1. The filter toolbar markup lives in the XSLT template under the `div[data-role="grid-filter"]` block; adjust available fields or operators there so the JS filter helper discovers them automatically. 
2. `GridManager.Filter` reads the markup on construction, validates operator compatibility with field types, and composes Energine-compatible query strings (e.g., `filter[field][]=value&filter[condition]=between`). Call `filter.use()` to persist selections or `filter.remove()` to clear them. 
3. To apply a filter programmatically (e.g., from a custom toolbar button), build the same query string and call `gridManager.applyFilter(query)`. The helper stores it in `filterQuery`, pushes it into Tabulator via `grid.setFilterQuery`, and reloads page 1. 
4. When integrating Tabulator header filters, ensure their `setFilter` calls ultimately hit `TabulatorGrid.setFilter` so the stored `filterQuery` stays in sync. Provide a `field: '__query__'` filter entry if you want to reuse the single query buffer maintained by `TabulatorGrid`. 

## Maintenance checklist

- Re-run the manual regression checklist after touching GridManager, TabulatorGrid, filters, or XSLT markup. (`docs/gridmanager-tabulator-testing.md`).
- Update `docs/gridmanager-tabulator-test-report.md` when the checklist runs, capturing new findings or confirming the block is resolved.
- Document architectural deviations or new extension points back in `docs/gridmanager-tabulator-architecture.md` so the high-level overview stays accurate.

## Recommendations for future development

- **Inline editing**: Tabulator supports cell editors—extend `createColumnDefinition` to set `editor` and update backend handlers to accept PATCH-style requests.
- **Export parity**: Replace the legacy CSV/print actions with Tabulator's `download` module to offer CSV/XLSX without custom endpoints.
- **Virtualisation & performance**: Evaluate Tabulator's progressive render and data tree modules for large datasets once backend APIs can supply range queries.
- **Filter UX**: Consider replacing the custom toolbar with Tabulator header filters backed by `GridManager.applyFilter` for live-search experiences.
- **Testing harness**: Add PHP fixtures and a docker-compose recipe so QA can execute the checklist locally without manual provisioning.

## Related documents

- Architectural background: `docs/gridmanager-tabulator-architecture.md`
- Manual QA checklist: `docs/gridmanager-tabulator-testing.md`
- Session reports: `docs/gridmanager-tabulator-test-report.md`

