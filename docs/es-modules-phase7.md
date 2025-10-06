# ES Modules Migration — Phase 7: Documentation & Enablement

## Module topology and loading rules
- Page XML now lists every JavaScript asset under a `<library>` node with a `loader` hint so templates can keep global vendors (`loader="classic"`) while switching Energine bundles to modules (`loader="module"`).【F:engine/core/modules/share/gears/Document.class.php†L269-L293】
- `document.xslt` emits `<script type="module">` tags for Energine runtime and feature bundles while leaving legacy globals untouched, preserving the existing per-file inclusion order.【F:engine/core/modules/share/transformers/document.xslt†L262-L304】【F:engine/core/modules/share/transformers/document.xslt†L382-L402】
- Continue storing application modules under `{$STATIC_URL}scripts/` using one file per feature; imports should remain relative within that tree so `system.jsmap.php` stays in sync with module edges resolved by the setup rebuild tasks.【F:engine/core/modules/share/transformers/document.xslt†L262-L402】【F:engine/setup/Setup.class.php†L516-L569】

## Energine.js module contract
- The runtime exports serialization helpers, the task queue, and loader utilities alongside the singleton state object that replaces the legacy global.【F:engine/core/modules/share/scripts/Energine.js†L1-L214】
- `bootEnergine(config)` merges structured config payloads, applies staged translations, and returns the live runtime so templates can attach it or inspect state during bootstrap.【F:engine/core/modules/share/scripts/Energine.js†L237-L274】
- `stageTranslations(values)` and `queueTask(task, priority)` cooperate with the inline bridge that runs before the module loads, letting XSLT stage work without relying on `window.Energine`.【F:engine/core/modules/share/scripts/Energine.js†L276-L307】【F:engine/core/modules/share/transformers/document.xslt†L244-L304】
- `createConfigFromProps(props)` normalises boolean-like values coming from XSLT attributes before passing them to `bootEnergine`, while `attachToWindow(target, runtime)` is the only supported way to expose globals (`Energine`, `ScriptLoader`, loaders).【F:engine/core/modules/share/scripts/Energine.js†L309-L366】【F:engine/core/modules/share/scripts/Energine.js†L368-L412】
- The module re-attaches itself automatically when imported (default export is the runtime state) but downstream code must import named helpers rather than assuming globals.【F:engine/core/modules/share/scripts/Energine.js†L402-L412】

## Bootstrap flow for pages and components
- `START_ENERGINE_JS` builds configuration via `createConfigFromProps`, boots the runtime, calls the bridge hook, and then rebinds the runtime to `window` so toolbar code and behaviours can queue tasks before `DOMContentLoaded`.【F:engine/core/modules/share/transformers/document.xslt†L291-L358】
- Component scripts are still instantiated inline after `bootEnergine` resolves; failures funnel through `safeConsoleError` so module consumers should throw errors instead of silent failures.【F:engine/core/modules/share/transformers/document.xslt†L332-L372】
- When adding new page bundles, import shared utilities directly (e.g. `import { bootEnergine } from '/static/scripts/Energine.js';`) and avoid mutating `window` except via `attachToWindow` if a global escape hatch is mandatory.【F:engine/core/modules/share/transformers/document.xslt†L291-L372】【F:engine/core/modules/share/scripts/Energine.js†L368-L412】

## Developer quick-start for ES module additions
1. Add your module under `engine/*/modules/scripts/` or `site/default/modules/scripts/` and export explicit APIs (named exports for helpers, default export for primary class if needed).
2. Import shared runtime helpers from `{$STATIC_URL}scripts/Energine.js` or other module files instead of referencing globals; ensure vendor globals like `window.jQuery` are passed in as parameters if required.
3. Update the relevant component template so it queues behaviour constructors after bootstrap, mirroring the existing `START_ENERGINE_JS` pattern when wiring DOM hooks.【F:engine/core/modules/share/transformers/document.xslt†L291-L372】
4. Run the setup rebuild command to refresh `system.jsmap.php`, ensuring dependency edges align with new `import` statements.【F:engine/setup/Setup.class.php†L516-L569】
5. Document the module’s exports and expected bootstrap hook in the component README or relevant spec so future updates keep imports stable.

## Team enablement cheat sheet
- **Module skeleton:**
  ```js
  import { Energine, attachToWindow } from '/static/scripts/Energine.js';

  export function initMyWidget(node) {
      // ...component code...
  }

  if (typeof window !== 'undefined') {
      attachToWindow(window);
  }
  ```
  Use named exports for functionality and only call `attachToWindow` when a legacy integration requires globals.
- **Config ingestion:** Templates should gather props/flags and pass them to `createConfigFromProps` before calling `bootEnergine`, matching the inline bootstrap snippet in `document.xslt` so server-rendered values stay authoritative.【F:engine/core/modules/share/transformers/document.xslt†L291-L332】
- **Task queue usage:** Prefer `queueTask` for deferred initialisation that depends on DOM availability; the bridge ensures tasks registered before module evaluation are preserved.【F:engine/core/modules/share/scripts/Energine.js†L276-L307】

## Roadmap: Vite integration
1. **Dev server proxy:** Reuse the existing `<library loader>` metadata to decide which assets Vite should serve via its dev server, keeping vendor globals on the PHP side while pointing module entries at `http://localhost:5173`.【F:engine/core/modules/share/gears/Document.class.php†L269-L293】
2. **Module graph ingestion:** Extend the setup tooling that already parses `import` specifiers when rebuilding `system.jsmap.php` so it can output a Vite manifest or feed the dependency graph into Vite’s `optimizeDeps`.【F:engine/setup/Setup.class.php†L516-L569】
3. **Build output wiring:** Mirror the `type="module"` script emission in `document.xslt`, swapping the static `.js` URLs for Vite’s hashed bundle names in production while leaving the loader hints intact for vendors.【F:engine/core/modules/share/transformers/document.xslt†L262-L402】
4. **Progressive adoption:** Pilot a single page bundle under Vite to validate hot-module reloading against the Energine bootstrap contract before migrating the remaining entries; once stable, replace manual asset injection with Vite’s generated HTML snippets using the same START_ENERGINE_JS hook.
