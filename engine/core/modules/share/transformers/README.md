# Admin UI layout guidelines

Admin templates in this folder rely on MDBootstrap 5 components. When extending the markup, follow the updated conventions below.

## Panels

- Panels are rendered as `.card` containers with `data-role="pane"`.
- Each section inside the card must declare `data-pane-part="header"`, `data-pane-part="body"` or `data-pane-part="footer"`.

**Legacy (неправильно)**

```html
<div class="panel">
    <div class="panel-heading">...</div>
    <div class="panel-body">...</div>
</div>
```

**Правильно**

```html
<div class="card" data-role="pane">
    <div class="card-header" data-pane-part="header">...</div>
    <div class="card-body" data-pane-part="body">...</div>
    <div class="card-footer" data-pane-part="footer">...</div>
</div>
```

## Tables

- Tables always combine `.table.table-striped.table-hover.table-sm` inside a `.table-responsive` wrapper.
- Supplementary controls (filters, toolbars) should live in the pane header/body above the table.

**Legacy (неправильно)**

```html
<table class="grid">
    ...
</table>
```

**Правильно**

```html
<div class="table-responsive">
    <table class="table table-striped table-hover table-sm" data-role="grid-table">
        ...
    </table>
</div>
```

## Forms

- Text inputs and textareas live inside `.form-outline`. Place the `<label>` immediately after the control so that MDB styles render correctly.
- Use `.form-select` for `<select>` elements.
- Use `.form-check`, `.form-check-input`, `.form-check-label` (and `.form-check-inline` if needed) for checkboxes and radio buttons.

**Legacy (неправильно)**

```html
<div class="field">
    <label for="name">Name</label>
    <input id="name" type="text" class="input-text" />
</div>
```

**Правильно**

```html
<div class="form-outline">
    <input id="name" type="text" class="form-control" />
    <label class="form-label" for="name">Name</label>
</div>

<select class="form-select" aria-label="Status">...</select>

<div class="form-check">
    <input class="form-check-input" type="checkbox" value="1" id="active" />
    <label class="form-check-label" for="active">Active</label>
</div>
```

## Validation errors

- Add `is-invalid` to the input, select or textarea that failed validation.
- Provide feedback with a sibling `.invalid-feedback` element.

```html
<div class="form-outline">
    <input id="email" type="email" class="form-control is-invalid" />
    <label class="form-label" for="email">Email</label>
    <div class="invalid-feedback">Введите корректный адрес электронной почты.</div>
</div>
```

## JavaScript hooks

- JavaScript modules target `data-role`/`data-action` attributes only. Do not bind behavior to visual class names.
- Available hooks include `data-role="pane"`, `data-pane-part="*"`, `data-role="tabs"`, `data-role="tab"`, `data-role="tab-link"`, `data-role="tab-meta"`, `data-role="tab-content"`, `data-role="pane-item"`, `data-role="grid"`, `data-role="grid-toolbar"`, `data-role="grid-filter"`, `data-role="grid-table"`, `data-role="filter-*"`, `data-action="apply-filter"`, and `data-action="reset-filter"`.

**Legacy (неправильно)**

```html
<button class="btn btn-primary js-apply">Apply</button>
```

**Правильно**

```html
<button class="btn btn-primary" data-action="apply-filter">Apply</button>
```

## Utility classes & styling

- Use Bootstrap 5 / MDB spacing, flex and typography utilities (`d-flex`, `gap-*`, `btn`, `form-control`, etc.). Avoid bespoke legacy class names.
- Shared CSS overrides live in `engine/core/modules/share/stylesheets/*.css`. Extend them instead of adding inline styles.
- Control visibility with the Bootstrap `.d-none` utility class or dedicated data attributes, not presentation-oriented class names.

Следуя этим правилам, вы сохраните единообразие административного интерфейса и совместимость с обновлёнными JavaScript-модулями.
