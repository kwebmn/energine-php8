# ES Modules Migration – Phase 2 Design

## 1. Modularity strategy
- **One module per legacy script:** keep the existing `system.jsmap.php` dependency graph and continue emitting a `<script type="module" src="…">` tag for every entry so that module boundaries remain aligned with the current PHP/XSLT assembly logic.【F:system.jsmap.php†L1-L73】【F:engine/core/modules/share/transformers/document.xslt†L141-L211】
- **Deterministic ordering without globals:** rely on native ESM resolution instead of the implicit global load order; every converted file replaces `window.*` lookups with explicit `import` statements that mirror the dependencies enumerated in the map.
- **Server integration:** reuse the same relative URLs under `{$STATIC_URL}scripts/…` while updating the XSLT template to set `type="module"`, ensuring the HTTP server continues serving `text/javascript` (see Phase 1 infrastructure note) without restructuring directories.【F:engine/core/modules/share/transformers/document.xslt†L141-L211】

## 2. Naming and file layout conventions
- Retain the current directory tree (`engine/*/modules/**/scripts/` and `site/modules/default/scripts/`) and file basenames to avoid touching PHP/XSLT references; modules stay as `.js` files flagged as ESM at load time.
- Use **PascalCase** default exports for constructor-centric modules (e.g. `Toolbar`, `GridManager`, `Form`) and **camelCase** named exports for helpers/constants. Supporting files (validators, utilities) continue to expose the class/function matching their filename.
- Introduce optional companion files only when wrapping vendor globals (see §4); otherwise no new entry points or bundler-specific directories are created.

## 3. Core runtime exports and window binding
| File | Default export | Named exports | `attachToWindow` responsibility |
| --- | --- | --- | --- |
| `Energine.js` | `initializeEnergine(options)` factory returning the singleton runtime | `ScriptLoader`, `serializeToFormEncoded`, `safeConsoleError`, `showLoader`, `hideLoader`, plus the `Energine` object reference | Replaces direct `window` mutation by exporting `attachToWindow(runtime)` that injects `{ ScriptLoader, Energine, safeConsoleError, showLoader, hideLoader }` into the desired global (defaulting to `window`).【F:engine/core/modules/share/scripts/Energine.js†L1-L292】 |
| `ModalBox.js` | `ModalBox` class (singleton controller) | `createModalBox(config)` factory returning the configured instance | `attachModalBoxToWindow(modalBox, target = window.top)` assigns the same singleton to `target.ModalBox`, keeping cross-frame behaviour.【F:engine/core/modules/share/scripts/ModalBox.js†L1-L208】 |
| `Toolbar.js` | `Toolbar` base class | `ToolbarControl`, `registerToolbarControl`, and concrete toolbar subclasses exported individually; shared utilities (tooltip helpers) stay named | `attachToolbarGlobals({ Toolbar, controls }, target = window)` adds `Toolbar` plus registered controls to the legacy namespace for XML-driven instantiation.【F:engine/core/modules/share/scripts/Toolbar.js†L1-L196】【F:engine/core/modules/share/transformers/document.xslt†L164-L210】 |
| `GridManager.js` | `GridManager` class | `Grid`, `Filter`, task helpers | `attachGridManagerGlobals(bundle, target = window)` exposes `GridManager`, `Grid`, `Filter`, and module-specific derivatives so XML `new GridManager(...)` still works.【F:engine/core/modules/share/scripts/GridManager.js†L1-L226】 |
| `Form.js` | `Form` class | `Uploader`, `RichEditor`, `FormField`, `useModalParent`, etc. | `attachFormGlobals(formApi, target = window)` publishes `Form` and selected helpers for components that call them dynamically (e.g. `new Form(...)`).【F:engine/core/modules/share/scripts/Form.js†L1-L460】 |
| `ValidForm.js` | `ValidForm` (default) | none | `attachValidFormToWindow(target = window)` keeps compatibility for templates referencing the global constructor.【F:engine/core/modules/share/scripts/ValidForm.js†L1-L40】 |
| `PageEditor.js` | `PageEditor` (default) | `createPageEditor` | `attachPageEditorToWindow(target = window)` preserves the instantiation path used by `document.xslt`.【F:engine/core/modules/share/scripts/PageEditor.js†L1-L60】【F:engine/core/modules/share/transformers/document.xslt†L187-L197】 |
| `SiteManager.js`, `TagEditor.js`, etc. | default export continues to be the existing class | optional named helpers per file | Each module exports its own `attachToWindow` helper delegating to parent `attachGridManagerGlobals` when applicable, keeping inheritance wiring intact.【F:engine/core/modules/share/scripts/SiteManager.js†L1-L40】【F:engine/core/modules/share/scripts/TagEditor.js†L1-L40】 |

The pattern ensures every module owns the decision to publish globals, avoiding cross-file mutations and keeping attach calls co-located with entrypoint registration logic executed once during bootstrap.

## 4. External global library access
- Add a lightweight `engine/core/modules/share/scripts/globals.js` shim exporting references to vendor globals, e.g.:
  ```js
  export const jQuery = window.jQuery;
  export const $ = window.jQuery;
  export const Swal = window.Swal;
  export const bootstrap = window.bootstrap;
  export const CKEDITOR = window.CKEDITOR;
  ```
  Modules import from this shim instead of touching `window` directly, improving discoverability and simplifying future replacements. Legacy vendor scripts continue to load beforehand via the existing theme template.【F:site/modules/default/transformers/energine.xslt†L52-L88】
- Provide dedicated wrappers when module-level setup is needed:
  - `ckeditor/index.js` exports `initCKEditor(element, config)` that asserts `CKEDITOR` is available, bridges promise-based initialisation, and re-exports `CKEDITOR` for advanced consumers.
  - `fileapi/index.js`, `jstree/index.js`, etc., expose the expected globals (`FileAPI`, `jstree`) to match current usage while offering typed helper functions where beneficial.
- For modules that must run without the vendor present (e.g. SweetAlert2 fallback in `Energine.confirmBox`), continue checking `typeof Swal === 'undefined'` after importing `Swal` from the shim to keep behaviour unchanged.【F:engine/core/modules/share/scripts/Energine.js†L134-L179】

## 5. CKEditor and other library initialisation
- Consolidate CKEditor boot logic into `engine/core/modules/share/scripts/ckeditor/init.js` exporting `initCKEditor(config)`; `Form.js` and `PageEditor.js` import this helper instead of referencing `window.CKEDITOR` directly, enabling centralised configuration (language, plugins, toolbar presets).【F:engine/core/modules/share/scripts/Form.js†L1-L460】【F:engine/core/modules/share/scripts/PageEditor.js†L1-L60】
- Maintain lazy activation by calling `initCKEditor` inside existing lifecycle hooks (e.g. `Form.RichEditor` constructor) so module loading stays synchronous but editor instantiation happens on demand.
- Other vendor integrations follow the same pattern: create per-library wrapper modules that expose a typed API (`initFileUploader`, `createJsTree`, etc.) while still delegating to the global binaries shipped with Energine. Attach functions remain unnecessary because vendors stay global-only and are merely proxied into ES modules.

This design keeps the migration scoped to module syntax, codifies the export surface for the core runtime, and documents how external globals will be accessed without altering the established build and inclusion flow.
