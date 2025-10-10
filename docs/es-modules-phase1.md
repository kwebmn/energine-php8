# ES Modules Migration – Phase 1 Audit

## 1. Script catalog

### 1.1 Core engine modules
- **engine/core/modules/share/scripts/** – base client framework classes used by admin UI (e.g. `Energine.js`, `Toolbar.js`, `ModalBox.js`, `GridManager.js`, `Form.js`, and related helpers). These files currently register globals such as `window.ScriptLoader`, `window.Energine`, `window.Toolbar`, `window.ModalBox`, and helper methods consumed across components.【F:engine/core/modules/share/scripts/Energine.js†L1-L260】【F:engine/core/modules/share/scripts/Toolbar.js†L1-L196】【F:engine/core/modules/share/scripts/ModalBox.js†L1-L172】【F:engine/core/modules/share/scripts/GridManager.js†L1-L206】【F:engine/core/modules/share/scripts/Form.js†L1-L120】
- **engine/core/modules/apps/scripts/** – per-module behaviour, currently only `FeedToolbar.js`, extending `Toolbar` and invoking `ModalBox` / `Energine.request` helpers.【F:engine/core/modules/apps/scripts/FeedToolbar.js†L1-L120】
- **engine/core/modules/user/scripts/** – user-management behaviours (`UserManager.js`, `GroupForm.js`, `SignIn.js`, `RecoverPassword.js`, `UserProfile.js`, etc.) built on `GridManager`/`Form` and the `Energine` helpers.【F:engine/core/modules/user/scripts/UserManager.js†L1-L34】【F:engine/core/modules/user/scripts/GroupForm.js†L1-L48】【F:engine/core/modules/user/scripts/SignIn.js†L1-L96】
- **engine/core/modules/wizard/scripts/** – wizard tooling (`TemplateWizard.js`, `DefaultTemplateJs.js`) that extend `GridManager` and interact with `ModalBox`, plus legacy MooTools era helpers still referencing `$`/`Class`.【F:engine/core/modules/wizard/scripts/TemplateWizard.js†L1-L32】【F:engine/core/modules/wizard/scripts/DefaultTemplateJs.js†L1-L10】
- **engine/core/modules/auto/scripts/** – legacy demo scripts still written against MooTools globals (`Class`, `$mt`).【F:engine/core/modules/auto/scripts/Test.js†L1-L7】【F:engine/core/modules/auto/scripts/TestFeed.js†L1-L7】

### 1.2 Site layer scripts
- **site/modules/default/scripts/** – public-facing placeholder (например, пустой `default.js`), тогда как Bootstrap попадает в `assets/energine.vendor.*` через Composer и Vite, не хранясь в репозитории.【F:site/modules/default/transformers/energine.xslt†L61-L88】【F:engine/vite/entries/energine.vendor.entry.js†L1-L14】

### 1.3 Third-party bundles distributed with the project
- **engine/core/modules/share/scripts/ckeditor/**, **fancytree/**, **jstree/**, and `jquery.min.js` – vendor sources kept as global scripts and now referenced directly from component XML via `<javascript><library loader="classic">…</library></javascript>`. CodeMirror ships through Composer (`vendor/components/codemirror`) and is bundled into the administrative vendor build instead of being stored in the repository, while still exposing the historical `CodeMirror` global.【3db03a†L12-L110】【935dbc†L1-L120】【F:engine/vite/config.js†L2-L50】

## 2. Dependency overview

Dependencies are declared through component configuration (`*.component.xml`) by listing `behavior` entries alongside explicit `<library>` nodes for any classic bundles. ES modules resolve their own imports at runtime, so no global `system.jsmap.php` is required. Key relationships:

| Script | Provides | Declared dependencies | Additional global usage |
| --- | --- | --- | --- |
| `Energine.js` | `window.ScriptLoader`, `window.Energine`, `window.safeConsoleError` | n/a (root) | Uses `fetch`, browser APIs, and optional `Swal` global for alerts.【F:engine/core/modules/share/scripts/Energine.js†L1-L236】 |
| `ModalBox.js` | `window.top.ModalBox` singleton | n/a | Relies on DOM APIs, optionally `bootstrap` tooltips, manipulates focus trapping.【F:engine/core/modules/share/scripts/ModalBox.js†L1-L160】【F:engine/core/modules/share/scripts/ModalBox.js†L174-L212】 |
| `Toolbar.js` | `window.Toolbar` plus nested control classes | n/a | Optionally consumes global `bootstrap` for tooltips/dropdowns.【F:engine/core/modules/share/scripts/Toolbar.js†L1-L196】 |
| `TabPane.js` | `TabPane` class (implicit global) | n/a | Manages DOM tabs without external deps.【F:engine/core/modules/share/scripts/TabPane.js†L1-L80】 |
| `PageList.js` | `PageList` class (implicit global) | n/a | DOM manipulation helpers for pagination.【F:engine/core/modules/share/scripts/PageList.js†L1-L120】 |
| `GridManager.js` | `GridManager`, `Grid`, `Filter` classes | `TabPane`, `PageList`, `Toolbar`, `ModalBox` via `ScriptLoader` | Calls `Energine.request`, `ModalBox`, uses `window` navigation for CSV/print, expects optional `Filter` override.【F:engine/core/modules/share/scripts/GridManager.js†L1-L40】【F:engine/core/modules/share/scripts/GridManager.js†L2001-L2042】 |
| `Form.js` | `Form` + nested helpers (`Uploader`, `RichEditor`, etc.) | `ckeditor/ckeditor`, `TabPane`, `Toolbar`, `Validator`, `ModalBox`, `AcplField`, `Cookie` | Relies on `Energine.request`, CKEditor globals, DOM APIs, optional parent `ModalBox` integration.【F:engine/core/modules/share/scripts/Form.js†L1-L64】【F:engine/core/modules/share/scripts/Form.js†L400-L460】 |
| `Validator.js` | `Validator` class (implicit global) | n/a | Validates form fields; used by `Form`/`ValidForm`.【F:engine/core/modules/share/scripts/Validator.js†L1-L80】 |
| `ValidForm.js` | `ValidForm` (extends `Validator`) | `Validator` | Hooks `Form` lifecycle with Validator results.【F:engine/core/modules/share/scripts/ValidForm.js†L1-L40】 |
| `Cookie.js` | `Cookie` helper (implicit global) | n/a | Wraps `document.cookie` for read/write/remove.【F:engine/core/modules/share/scripts/Cookie.js†L1-L40】 |
| `PageToolbar.js` | `PageToolbar` extends `Toolbar` | `Toolbar`, `ModalBox`, `Cookie` | Uses `Energine.request`, `ModalBox.open`, sets cookies for toolbar preferences.【F:engine/core/modules/share/scripts/PageToolbar.js†L1-L80】 |
| `PageEditor.js` | `PageEditor` class | `ckeditor/ckeditor`, `ModalBox` | Integrates CKEditor with `Energine` task queue and `ModalBox` resizing.【F:engine/core/modules/share/scripts/PageEditor.js†L1-L60】 |
| `FileRepository.js` | `FileRepository` extends `GridManager` | `GridManager`, `Cookie`, `native file helpers` | Uses native drag/drop upload utilities plus `ModalBox` integrations.【F:engine/core/modules/share/scripts/FileRepository.js†L1-L60】 |
| `FileRepoForm.js` | `FileRepoForm` extends `Form` | `Form`, `native file helpers` | Upload helpers built on native XHR + `FormData` utilities.【F:engine/core/modules/share/scripts/FileRepoForm.js†L1-L40】 |
| `ImageManager.js` | `ImageManager` extends `Form` | `Form`, `ModalBox` | Launches modal file pickers and CKEditor integration.【F:engine/core/modules/share/scripts/ImageManager.js†L1-L40】 |
| `AttachmentEditor.js` | `AttachmentEditor` extends `GridManager` | `GridManager`, `native file helpers` | Handles repository attachments with native drag-and-drop and progress helpers.【F:engine/core/modules/share/scripts/AttachmentEditor.js†L1-L60】 |
| `DivManager.js` | `DivManager` extends `Toolbar` mixins | `TabPane`, `Toolbar`, `ModalBox`, `jquery.min`, `jstree/jstree` | Relies on jQuery and jsTree globals for tree widgets.【F:engine/core/modules/share/scripts/DivManager.js†L1-L80】 |
| `DivTree.js` / `DivSidebar.js` | extend `DivManager` | `DivManager`, `jquery.min`, `jstree/jstree` | Use jsTree APIs and jQuery for DOM updates.【F:engine/core/modules/share/scripts/DivTree.js†L1-L40】【F:engine/core/modules/share/scripts/DivSidebar.js†L1-L40】 |
| `FiltersTreeEditor.js` | `FiltersTreeEditor` | `ModalBox`, `jquery.min`, `jstree/jstree.min` | Tree editor modal built on jsTree/jQuery globals.【F:engine/core/modules/share/scripts/FiltersTreeEditor.js†L1-L40】 |
| `SiteManager.js` | `SiteManager` extends `GridManager` | `GridManager` | Uses inherited toolbar/grid operations with `Energine.request` for CRUD.【F:engine/core/modules/share/scripts/SiteManager.js†L1-L40】 |
| `TagEditor.js` | `TagEditor` extends `GridManager` | `GridManager` | Provides tagging UI on top of GridManager.【F:engine/core/modules/share/scripts/TagEditor.js†L1-L40】 |
| `AcplField.js` | Autocomplete field helpers | n/a | Enhances inputs, expects `Energine.request` and DOM APIs.【F:engine/core/modules/share/scripts/AcplField.js†L1-L60】 |
| `Toolbar.js` consumers (`FeedToolbar.js`, `PageToolbar.js`, etc.) | Module-specific toolbars | `Toolbar`, optional `ModalBox`, `Cookie` | Rely on `Energine.translations`, `Energine.request`, DOM manipulation.【F:engine/core/modules/apps/scripts/FeedToolbar.js†L24-L100】【F:engine/core/modules/share/scripts/PageToolbar.js†L1-L80】 |
| `UserManager.js` | `window.UserManager` | `GridManager` | Uses `Energine.request`, manipulates `window.top.location`.【F:engine/core/modules/user/scripts/UserManager.js†L1-L34】 |
| `GroupForm.js` | `window.GroupForm` | `Form` | Manipulates DOM radio groups in admin UI.【F:engine/core/modules/user/scripts/GroupForm.js†L1-L48】 |
| `SignIn.js` | `SignIn` class (implicit global) | n/a | Uses `fetch`, `Energine.noticeBox/alertBox`, `FormData`; interacts with `Energine.lang` global.【F:engine/core/modules/user/scripts/SignIn.js†L1-L96】 |
| `RecoverPassword.js` / `UserProfile.js` | Additional ES classes | `Form`/`Energine` | Use `Energine.request`, DOM APIs (patterns mirror `SignIn.js`).【F:engine/core/modules/user/scripts/RecoverPassword.js†L1-L80】【F:engine/core/modules/user/scripts/UserProfile.js†L1-L80】 |
| `TemplateWizard.js` | `window.TemplateWizard` | `GridManager` | Calls `ModalBox`, jQuery `$`, and relies on `Energine.base` global path settings.【F:engine/core/modules/wizard/scripts/TemplateWizard.js†L1-L32】 |
| Legacy auto scripts | `Test`, `TestFeed`, etc. | Implicit MooTools globals | Depend on `Class` and `$mt` from the removed MooTools bundle; need special handling during migration.【F:engine/core/modules/auto/scripts/Test.js†L1-L7】【F:engine/core/modules/auto/scripts/TestFeed.js†L1-L7】 |

Historically `system.jsmap.php` aggregated these dependencies so that `<javascript/behavior>` nodes could be expanded into actual script URLs during page assembly. This role is now handled directly by component XML `<javascript>` declarations together with the module runtime.

## 3. Script inclusion and initialization flow
- `engine/core/modules/share/gears/Document.class.php` collects `<javascript/behavior>` declarations from component XML, expands classic `<library>` nodes, and outputs a `<javascript>` block with `<library path="...">` nodes — tagging vendor assets with `loader="classic"` and leaving module entries to rely on native `import` resolution.【F:engine/core/modules/share/gears/Document.class.php†L248-L360】
- `engine/core/modules/share/transformers/document.xslt` converts each `<library>` entry into `<script src="{$STATIC_URL}scripts/{path}.js">`, injects runtime variables onto `window`, and schedules `Energine.run` on `DOMContentLoaded`. This template also calls `START_ENERGINE_JS`, which configures the `Energine` global before loading component scripts.【F:engine/core/modules/share/transformers/document.xslt†L142-L214】【F:engine/core/modules/share/transformers/document.xslt†L244-L260】
- The public theme (`site/modules/default/transformers/energine.xslt`) now loads the prebuilt vendor bundle (`assets/energine.vendor.js`) ahead of the legacy `START_ENERGINE_JS` hook and the generic `scripts/default/default.js`, ensuring the Bootstrap globals required by Energine helpers are present while toast/modal messaging is implemented natively.【F:site/modules/default/transformers/energine.xslt†L52-L88】【F:engine/core/modules/share/scripts/Energine.js†L343-L490】

## 4. Globals that must remain accessible
The following names are read from `window` by templates or cross-frame integrations and therefore must keep a global facade even after modularisation:
- `ScriptLoader`, `Energine`, and `safeConsoleError` (core runtime, used by every component and by XSLT templates for task queues and logging).【F:engine/core/modules/share/scripts/Energine.js†L1-L236】【F:engine/core/modules/share/transformers/document.xslt†L154-L214】
- `ModalBox` (singleton stored on `window.top`, used to open modals from multiple scripts).【F:engine/core/modules/share/scripts/ModalBox.js†L164-L208】
- `Toolbar` and derived constructors (`FeedToolbar`, `PageToolbar`, etc.), referenced by name inside toolbar XML definitions and initialised via dynamically generated `new <behavior>()` calls in XSLT.【F:engine/core/modules/share/scripts/Toolbar.js†L1-L196】【F:engine/core/modules/share/transformers/document.xslt†L174-L210】
- `GridManager` family (`GridManager`, `SiteManager`, `TagEditor`, etc.) continues to be declared as behaviours in component XML; their ES modules import dependencies directly so runtime only needs to enqueue the entry behaviour script while classic vendors are listed separately via `<library>`.【F:engine/core/modules/share/transformers/document.xslt†L174-L210】
- CKEditor, jsTree, jQuery, Bootstrap – shipped as vendor globals and consumed directly (`CKEDITOR`, `$`, `bootstrap`). Bootstrap попадает через `assets/energine.vendor.*`, собираемый из Composer-пакета `twbs/bootstrap`. Font Awesome подключается тем же путём из Composer-пакета `fortawesome/font-awesome` и попадает в общий вендорный бандл Vite.【F:engine/core/modules/share/scripts/Form.js†L1-L64】【F:engine/core/modules/share/scripts/DivManager.js†L1-L60】【F:engine/core/modules/share/scripts/TemplateWizard.js†L21-L32】【F:engine/vite/entries/energine.vendor.entry.js†L1-L14】

## 5. HTML attribute hooks
Toolbar and editor configurations embed method names in attributes such as `onclick="add"`, `onclick="edit"`, etc., expecting the instantiated class to expose matching methods. These appear across admin component XML and XSLT templates (for example, division editor buttons calling `resetPageContentTemplate()`). Any module build must preserve method names on the exported instances or provide bridging logic.【68edad†L1-L200】【F:engine/core/modules/share/transformers/divisionEditor.xslt†L241-L258】

## 6. Infrastructure notes
- **MIME types:** All scripts are currently served as `.js` through relative URLs such as `assets/energine.vendor.js` and `{$STATIC_URL}scripts/{path}.js`. When switching to native modules ensure the HTTP server continues to return `text/javascript` for both `.js` and future `.mjs` files (no conflicting configuration found in the repository).【F:site/modules/default/transformers/energine.xslt†L61-L88】【F:engine/core/modules/share/transformers/document.xslt†L248-L260】
- **Linting/formatting:** The repository does not contain ESLint/Prettier configuration files; introducing a shared lint config can be considered once module conversion reaches implementation phases.【c8a83b†L1-L1】

