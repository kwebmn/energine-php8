# Admin UI layout guidelines

The admin templates in this folder rely on MDBootstrap 5 components. When extending the markup, keep the following conventions in mind:

- **Behavior hooks**: JavaScript modules only target `data-*` attributes. Do not reintroduce visual class names into JS selectors.
  - `data-role="pane"` – root container (`.card`).
  - `data-pane-part="header|body|footer"` – card sections.
  - `data-role="tabs"`, `data-role="tab"`, `data-role="tab-link"`, `data-role="tab-meta"`, `data-role="tab-content"`, `data-role="pane-item"` – tab navigation and panels.
  - `data-role="grid"`, `data-role="grid-toolbar"`, `data-role="grid-filter"`, `data-role="grid-table"` and `data-role="filter-*"` – grid widgets.
  - `data-action="apply-filter"`, `data-action="reset-filter"` – filter buttons.
- **MDB utility classes**: Use Bootstrap 5 / MDB spacing, flex and typography utilities for layout (e.g. `d-flex`, `gap-*`, `btn`, `form-control`). Avoid bespoke legacy class names.
- **Structure**: Wrap tab sets inside `.card-header > ul.nav.nav-tabs` and `.card-body > .tab-content`. Tables should be wrapped with `.table-responsive` and use `.table.table-striped.table-hover.table-sm`.
- **Styling overrides**: Shared tweaks live in `engine/core/modules/share/stylesheets/*.css`. Extend them instead of adding inline styles.
- **Hidden logic**: toggle visibility via the `.hidden` utility class or dedicated data attributes; do not rely on presentation classes.

Following these rules keeps the admin theme consistent and compatible with the updated JavaScript modules.
