# XSLT Migration Playbook — Declarative JS Initialisation (Phase 3.1)

This document describes how to convert every Energine XSLT template that currently relies on inline JavaScript and `generate-id()` placeholders into the declarative data-attribute scheme agreed in Phase 1. It is organised by functional component groups. For each group we capture the "current" inline hooks, the declarative "target" markup, toolbar placement, and any required exceptions where legacy `id` attributes must remain for CSS or anchor compatibility.

## Legend and shared rules
- **Data attributes**: use `data-energine-js="ClassName"` to declare the component class and `data-energine-param-*` keys for required constructor options from the Phase 1 registry.
- **Toolbar containers**: each interactive component places an adjacent `<div data-energine-toolbar>` element (or `data-energine-toolbar="name"` when multiple toolbars are needed) that the runtime loader binds to the component instance.
- **Translation scopes**: replace inline `Energine.translations.extend` calls with `<div data-energine-translations="namespace">…</div>` nodes populated by server-side JSON fragments, so the loader can hydrate them uniformly.
- **Generated IDs**: eliminate `generate-id()` usages except where explicitly noted in the "Exceptions" column; retain semantic IDs that external CSS or anchors depend on.

## Migration matrix by component family

| Component family | Templates | Current inline hooks | Target declarative markup | Toolbar strategy | Exceptions |
| --- | --- | --- | --- | --- | --- |
| **Global document bootstrapping** | `engine/core/modules/share/transformers/document.xslt` | Inline `Object.assign(Energine, …)`, `Energine.addTask` queue, `DOMContentLoaded` listener, translation injection scripts. | Move runtime config into `<meta data-energine-config>` or JSON blob inside a hidden `<script type="application/json" data-energine-config>`; expose component placeholders with `data-energine-js` directly in rendered markup; trigger loader via a single `<script data-energine-autostart>` that the new runtime ships. | Global toolbar registry becomes a data attribute on each component container; document template only wraps shared toolbars via `<div data-energine-toolbar-portal>`. | Keep existing IDs for legacy CSS hooks like `#componentToolbars` until CSS can migrate; mark as temporary in rollout notes. |
| **Lists, grids, recordsets** | `engine/core/modules/share/transformers/list.xslt`, `divisionEditor.xslt`, `tagEditor.xslt`, `FiltersTreeEditor` list panels | Inline translation extension and `Energine.addTask` for `Grid`/`GridManager`; containers built from `generate-id(.)`. | Wrap each grid root with `<section data-energine-js="GridManager" data-energine-param-component="{component/@name}" …>`; reuse stable structural classes instead of generated IDs; embed translations as `<div data-energine-translations>` children. | Insert `<div data-energine-toolbar="grid">` adjacent to each grid; additional contextual toolbars (filters/tree) get named slots like `data-energine-toolbar="tree"`. | Retain explicit `id` on tab anchors that are referenced in CSS (`#tab-grid`, `#tab-tree`). Document each case so runtime can map them without `generate-id()`. |
| **Forms and validators** | `engine/core/modules/share/transformers/form.xslt`, `ValidForm` templates | Inline CodeMirror includes; form wrappers rely on `generate-id()`; toolbars scheduled via `Energine.addTask`. | Assign `<form data-energine-js="Form" data-energine-param-id="{component/@id}" …>` and mirror upload widgets with nested `data-energine-js="FormUploader"`; load CodeMirror declaratively by flagging `<form data-energine-param-codemirror="1">`. | Dedicated `<div data-energine-toolbar="form">` placed immediately before the form footer; sub-forms (tabs) expose nested toolbar slots if required. | Keep form `id` attributes that double as `for` targets for `<label>`s; where `generate-id()` produced `form-XXXX`, replace with deterministic `id` derived from component key (e.g. `form-{component/@id}`). |
| **File and media managers** | `engine/core/modules/share/transformers/file.xslt`, `media.xslt`, `FileRepository` popups | Inline `Energine.addTask` to instantiate `ImageManager`, `AttachmentEditor`, or `Player`; player templates call `new Player(generate-id())`. | Mark modal containers with `data-energine-js` per class (`ImageManager`, `FileRepository`, `Player`); supply file identifiers via `data-energine-param-resource`, etc.; media players place playback config in `data-energine-param-*` attributes read by the runtime. | Use `<div data-energine-toolbar="modal">` within modal header/footer; file chooser lists expose a secondary toolbar slot `data-energine-toolbar="files"`. | Preserve `id="player"` or other targets consumed by external scripts (JWPlayer embed API). Replace other generated IDs with class-based selectors. |
| **Tree editors** | `divisionEditor.xslt`, `DivTree` fragments, site structure wizards | Inline `Energine.translations.extend`, manual JS scheduling for `DivManager`, `DivSidebar`, `DivTree`; heavy reliance on generated IDs for panes. | For each pane container, emit `<div data-energine-js="DivManager" data-energine-param-tree="…">`; sidebars declare `data-energine-js="DivSidebar"` with shared `data-energine-param-manager` keys to link instances. Use deterministic IDs derived from division IDs where anchors required. | Provide `<aside data-energine-toolbar="tree">` for structural actions and `<div data-energine-toolbar="sidebar">` for contextual controls. | Maintain anchor IDs used by deep links (e.g. `#div-tree`) but document them so PHP renderer can precompute instead of `generate-id()`. |
| **Rich text editors** | `PageEditor` sections inside `list.xslt`/`form.xslt`, WYSIWYG widgets | Inline CKEditor initialisation via `Energine.addTask`; script loader resolves dependencies at runtime. | Set `<textarea data-energine-js="PageEditor" data-energine-param-toolbar="{toolbarType}">`; supply configuration via additional `data-energine-param-*` keys rather than inline `CKEDITOR.replace`. | Editor toolbars live inside `<div data-energine-toolbar="editor">` nested near the textarea; shared translation data flows through `data-energine-translations`. | No exceptions; CKEditor instances do not require static IDs when using declarative loader. |
| **Authentication widgets** | `engine/core/modules/user/transformers/user.xslt` | Inline FB/VK helper scripts (`FBL.set`, `VKI.set`) plus manual event wiring. | Introduce `<div data-energine-js="UserManager" …>` with params for enabled providers; external SDK URLs queued by PHP loader per component. Replace inline provider setup with `data-energine-param-provider-*` attributes. | Toolbars generally not used; when present, expose `<div data-energine-toolbar="auth">`. | Preserve `id="vk_auth"` and similar anchors if CSS/SDK expect them; migrate to deterministic IDs where possible. |
| **Standalone layouts** | `site/modules/default/transformers/energine.xslt`, `error_page.xslt`, `embed_player.xslt` | Ad-hoc `<script>` tags (Bootstrap, SweetAlert, Mootools) and inline initialisers. | Convert vendor includes into PHP-side loader entries flagged by layout component; markup only references declarative component roots (e.g. `<div data-energine-js="SiteLayout">`). | Layout-level toolbars handled via shared portal `data-energine-toolbar-portal`. | Allow `id="player-container"` etc. when third-party widgets demand them. |

## Toolbar markup blueprint
1. Component template renders primary container with `data-energine-js` and any required params.
2. Immediately after the container, output `<div data-energine-toolbar>` (or named variant) to host runtime-injected controls.
3. For nested toolbars (e.g. tabs, modal footers), place the slot as a sibling inside the relevant structural wrapper and annotate with `data-energine-toolbar="context"` so the loader can map controls to the correct location.
4. Remove all `Energine.addTask` calls; the runtime automatically discovers toolbar slots relative to each component instance.

## Handling legacy IDs and CSS dependencies
- Create a migration manifest enumerating every XSLT-generated `id` currently consumed by CSS/JS. During conversion, replace auto-generated values with deterministic strings derived from component names or record identifiers.
- For CSS selectors that reference `#componentToolbars` or similar global IDs, leave the attribute in place temporarily and mark it with `data-energine-legacy-id="true"` for future cleanup.
- Update documentation templates (`docs/`) to inform theme developers about the new deterministic IDs to avoid regressions.

## Rollout steps
1. For each template, replicate the "target" column structure in a staging branch without removing functionality.
2. Update PHP view models to emit the new data attributes and toolbar slots; ensure translations/toolbars are provided via server-side JSON payloads instead of inline scripts.
3. Validate that all components appear in the DOM with the expected `data-energine-js` markers so the Phase 2 loader can assemble dependencies.
4. After verification, delete obsolete inline `<script>` blocks and `generate-id()` calls that only served JavaScript binding.
5. Record any residual legacy IDs in the manifest for later CSS refactoring.

## Coverage checklist
- [x] Global document bootstrap & translation injection
- [x] Grid/list components and auxiliary editors
- [x] Forms (standard and validator-enhanced)
- [x] File/media management modals
- [x] Tree editors and wizards
- [x] Rich-text editor widgets
- [x] Authentication/user widgets
- [x] Standalone layout templates (public/error/embed)

This plan ensures every template catalogued in Phase 0 can migrate to declarative initialisation without inline scripting, while retaining compatibility with existing CSS anchors and external vendor SDKs.
