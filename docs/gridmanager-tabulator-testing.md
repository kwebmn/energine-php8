# GridManager + Tabulator Manual Test Checklist

Use this checklist to validate the Energine grid after the Tabulator migration. Execute every scenario in each supported browser and viewport to confirm parity with the legacy behaviour.

## Test environment
- **Browsers**: Latest stable Google Chrome, Mozilla Firefox, Microsoft Edge; Safari 16+ on macOS if the project targets macOS users.
- **Viewports**: Desktop width (~1440px), tablet width (992px breakpoint), and a narrow viewport (~768px). Confirm the grid card, paginator, and toolbar remain usable without horizontal scrolling except inside the Tabulator table.
- **Test data**: Use modules that exercise typical datasets (CRUD grids with filters, file repository, localized grids) plus a dataset that can return zero rows.
- **Accounts**: Prepare at least one user with full CRUD permissions and, if applicable, a restricted user to confirm toolbar disablement on denied actions.

## Base loading and pagination
1. Open a grid page and ensure Tabulator assets load without console errors.
2. Verify the initial dataset renders, including column headers, summary footer, and breadcrumb widgets (if available).
3. Move between pages using Tabulator's pager controls (if exposed) and the legacy footer PageList buttons. Confirm the record summary updates and the current page is highlighted in both controls.
4. Load the first, middle, and last page. Confirm the server is called once per navigation and there is no duplicate request during page changes.
5. Use the "Go to page" control in PageList (if configured) to jump to a specific page. Confirm Tabulator navigates to the requested page.

## Sorting
1. Click sortable column headers. Confirm Tabulator toggles sort order (ascending → descending → unsorted) and the sort indicator matches.
2. Ensure GridManager reloads data after each sort change, and the dataset reflects the new order.
3. Refresh the page; confirm the persisted sort (if any) re-applies on load.
4. If multi-column sorting is enabled, hold the modifier key (e.g., Shift) and apply a secondary sort. Confirm both sorters appear in the toolbar summaries and the dataset respects the priority chain.

## Filters
1. Open the filter toolbar and provide scalar values (text, number) for supported columns. Apply the filter; verify the loader appears, data reloads, and only matching records display.
2. Change filter operators (equals, contains, between) to confirm the correct input controls show/hide.
3. Reset the filter via the reset control; confirm the dataset returns to the unfiltered state and the reset button disables when no criteria exist.
4. Combine filters with paging and sorting to ensure all parameters are preserved across requests.
5. If header filters are enabled for specific columns, interact with them and confirm the external filter UI stays in sync (reset button state, summary text).

## Selection and row interactions
1. Click a row to select it. Confirm the highlight state persists when navigating between pages back to the row.
2. Ensure toolbar actions (view/edit/delete/use/etc.) enable only when a row is selected.
3. Double-click a row; confirm the default action (usually edit or view) opens.
4. For grids with checkbox or multi-select functionality, verify multiple selections work and the adapter reports the expected keys.
5. Confirm the selected row stays highlighted and the toolbar remains enabled after returning from a modal dialog until the grid reloads.

## Toolbar actions
1. Execute each CRUD action (view/add/edit/delete). Confirm they operate on the selected record, open the correct modal or navigation, and reload the grid after completion.
2. Test move-related actions (move above/below/to, move first/last) when available. Ensure the stored `mvElementId` carries over between operations and the grid reloads with the item in the new position.
3. Trigger auxiliary actions (use, up, down, custom module buttons). Confirm they respect selection guards and display success/error notices where appropriate.
4. If print or export (CSV) actions remain, verify they generate output without page errors or stale table markup.

## Modal lifecycle
1. From each toolbar action that opens a modal, submit a valid change and ensure the modal closes, the loader appears, and the grid reloads with the updated data.
2. Cancel the modal via the close button, Escape key, and clicking outside (if allowed). Confirm no request fires and the selection remains intact.
3. When the modal triggers a redirect (e.g., open in a new tab), ensure returning to the grid keeps the toolbar usable and does not cause stale state.

## Error handling
1. Simulate a server failure (disconnect backend or adjust the endpoint to return 500). Confirm the loader hides, an error message displays through `processServerError`, and toolbar/pagination controls re-enable once the error resolves.
2. Force a network timeout (e.g., using browser dev tools) and ensure the loader cancels gracefully with an appropriate notification.
3. Return an empty dataset (server responds with `data: []`). Confirm Tabulator renders the empty placeholder text, the record summary indicates zero items, and toolbar actions that require selection stay disabled.
4. Provide malformed metadata or missing key fields to confirm error logging occurs and the UI does not crash silently.

## Responsive behaviour
1. Resize the window to tablet width (~992px). Confirm the filter toolbar collapses/expands cleanly, Tabulator maintains horizontal scroll for wide tables, and the footer pager remains accessible.
2. At narrow width (~768px), confirm toolbar buttons wrap or overflow according to design expectations without overlapping the grid.
3. Test touch interactions on tablet/mobile devices (or simulator): tap to select rows, scroll within the Tabulator body, and trigger pagination.

## Regression guard
- Run through the checklist after upgrading Tabulator, changing GridManager APIs, or modifying XSLT markup for the grid pane.
- Record any deviations in a shared QA document and raise regressions to the development team.

