# Energine JS Loading Inventory (Phase 0)

## Layout and global script injection templates
| Path | Scope / role | Current script handling | Debug-specific behavior |
| --- | --- | --- | --- |
| `engine/core/modules/share/transformers/document.xslt` | Core document layout for admin/editor modes; builds `<head>`/`<body>` skeletons consumed by module transformers. | Injects `Energine.js`, assigns runtime config via `Object.assign(Energine, …)`, enqueues dependency `<script>` tags from `<document/javascript>`, loops through component `javascript/behavior` nodes to `new` JS classes by generated ids, wires `componentToolbars` globals, and hooks `DOMContentLoaded` to `Energine.run`. Also streams translations into JS and toolbars via inline `<script>` blocks. | Reads `document/@debug` to toggle `Energine.debug` flag in the inline config blob; legacy comments show prior Mootools branching. |
| `site/modules/default/transformers/energine.xslt` | Public site layout delegating to `document` templates. | Calls `START_ENERGINE_JS`, injects Bootstrap/SweetAlert assets with `defer`, loads `scripts/default/default.js`, and ensures default CSS/Google Fonts. | No branching besides wrapping existing debug controls in `START_ENERGINE_JS` (currently unconditional call). |
| `engine/core/modules/share/transformers/error_page.xslt` | Standalone error document (404 etc.). | Minimal layout with Bootstrap bundle `defer` script at end of `<body>`. | Uses `$IN_DEBUG_MODE` to reveal stack traces but script loading identical across modes. |
| `engine/core/modules/share/transformers/embed_player.xslt` | Standalone video embed page. | Includes Mootools core/more/ext plus JWPlayer + custom `Player.js`, sets OG meta, renders video container. | Chooses between debug (`mootools-debug.js` trio) and minified scripts based on `document/@debug`. |
| `engine/core/modules/share/transformers/form.xslt` | Generic form/grid renderer. | For grid forms with `field[@type='code']`, pulls CodeMirror CSS/JS stack. Generates per-form containers with IDs via `generate-id()` for JS binding. | No conditional minification toggles beyond CodeMirror include triggered by field presence. |
| `engine/core/modules/share/transformers/list.xslt` | Grid/list renderer. | Emits translation extender script for component-scoped strings; grid view wrappers use generated IDs for JS behaviors/toolbars. | No explicit debug branches. |
| `engine/core/modules/share/transformers/file.xslt` | Image manager modal/form. | Builds toolbar via inline `Energine.addTask` script, instantiates `Toolbar` for generated element IDs. | No debug toggle. |
| `engine/core/modules/share/transformers/toolbar.xslt` | Toolbar renderer for grid components. | Inline `Energine.addTask` adds `Toolbar` instances and appends controls, referencing generated IDs. Handles DOM resizing for narrow viewports. | None. |
| `engine/core/modules/share/transformers/media.xslt` | Shared video player snippet. | Loads `jwplayer.js` and `Player.js`, instantiates `new Player` inline with generated element id. | None. |
| `engine/core/modules/share/transformers/divisionEditor.xslt` | Division/site tree editor view. | Extends translations on DOM ready, renders containers with generated IDs for `DivManager`/`DivSidebar` JS behaviors. | None beyond translation script. |
| `engine/core/modules/share/transformers/tagEditor.xslt` | Tag editor grid. | Extends translations inline when present. | None. |
| `engine/core/modules/user/transformers/user.xslt` | User-facing auth/profile widgets. | Injects FB/VK auth helpers via inline `<script>` (uses `FBL.set`/`VKI.set`) and includes VK OpenAPI script. | None. |
| `engine/core/modules/share/transformers/error_page.xslt` | Error layout (listed above for completeness). | (see above) | (see above) |

## Inline Energine initialisers and generated IDs
| Path | Purpose | Inline JS hooks | Generated IDs for JS |
| --- | --- | --- | --- |
| `engine/core/modules/share/transformers/document.xslt` | Global runtime bootstrap. | `Object.assign(Energine, …)`, `Energine.addTask`, `document.addEventListener('DOMContentLoaded', Energine.run)`, translation injection. | `generate-id()` for `componentToolbars`, component recordsets. |
| `engine/core/modules/share/transformers/toolbar.xslt` | Toolbar wiring. | `Energine.addTask` to construct `Toolbar` and attach to holders. | Extensive use of `generate-id(../recordset)` for toolbar mapping. |
| `engine/core/modules/share/transformers/file.xslt` | Image/file manager modals. | `Energine.addTask` to build modal toolbar. | `generate-id(recordset)` for modal pane + toolbar lookups. |
| `engine/core/modules/share/transformers/list.xslt` | Grid containers. | Translation extend scripts on DOM ready. | Pane wrappers use `generate-id(.)`; grid tab IDs built via `generate-id(record)`. |
| `engine/core/modules/share/transformers/form.xslt` | Forms (standalone + grid). | Conditional CodeMirror includes; toolbars rely on JS to bind by ID. | Form wrappers: `concat('form-', generate-id())`, tab IDs, preview IDs. |
| `engine/core/modules/share/transformers/divisionEditor.xslt` | Division editor + sidebar. | DOM ready translation extend. | Pane IDs via `generate-id(record[1])` etc. |
| `engine/core/modules/share/transformers/tagEditor.xslt` | Tag editor grid. | Translation extend inline. | Pane ID `generate-id(.)`. |
| `engine/core/modules/share/transformers/media.xslt` | Player embed snippet. | Instantiates `Player` inline. | `player_<generate-id()>`. |
| `engine/core/modules/user/transformers/user.xslt` | Login/register/profile. | Inline auth provider initialisers (`FBL.set`, `VKI.set`). | Login/record wrappers via `generate-id(.)`. |
| `engine/core/modules/share/transformers/embed_player.xslt` | Video embed page. | Loads Mootools/JWPlayer stack inside `<head>`. | N/A (player id from template). |

## Component JavaScript classes and ScriptLoader dependencies
| JS path | Declared classes | `ScriptLoader.load` arguments |
| --- | --- | --- |
| `engine/core/modules/share/scripts/GridManager.js` | `Grid`, `GridManager` | `'TabPane', 'PageList', 'Toolbar', 'ModalBox'` |
| `engine/core/modules/share/scripts/DivManager.js` | `DivManager` | `'TabPane', 'Toolbar', 'ModalBox', 'jquery.min', 'jstree/jstree'` |
| `engine/core/modules/share/scripts/DivTree.js` | `DivTree` | `'DivManager', 'jquery.min', 'jstree/jstree'` |
| `engine/core/modules/share/scripts/DivSidebar.js` | `DivSidebar` | `'DivManager', 'jquery.min', 'jstree/jstree'` |
| `engine/core/modules/share/scripts/PageToolbar.js` | `PageToolbar` | `'Toolbar', 'ModalBox', 'Cookie'` |
| `engine/core/modules/share/scripts/PageList.js` | `PageList` | *(no ScriptLoader call; consumed by others)* |
| `engine/core/modules/share/scripts/Toolbar.js` | `Toolbar`, toolbar control classes | *(global utility)* |
| `engine/core/modules/share/scripts/Form.js` | `Form`, `FormUploader`, `FormSmapSelector` | `'ckeditor/ckeditor', 'TabPane', 'Toolbar', 'Validator', 'ModalBox', 'AcplField', 'Cookie'` |
| `engine/core/modules/share/scripts/ValidForm.js` | `ValidForm` | `'Validator'` |
| `engine/core/modules/share/scripts/Validator.js` | `Validator` | *(none)* |
| `engine/core/modules/share/scripts/PageEditor.js` | `PageEditor`, `BlockEditor` | `'ckeditor/ckeditor', 'ModalBox'` |
| `engine/core/modules/share/scripts/ImageManager.js` | `ImageManager` | `'Form', 'ModalBox'` |
| `engine/core/modules/share/scripts/FileRepository.js` | `FileRepository`, helpers | `'GridManager', 'Cookie', 'FileAPI/FileAPI'` |
| `engine/core/modules/share/scripts/FileRepoForm.js` | `FileRepoForm` | `'Form', 'FileAPI/FileAPI'` |
| `engine/core/modules/share/scripts/AttachmentEditor.js` | `AttachmentEditor` | `'GridManager', 'FileAPI/FileAPI'` |
| `engine/core/modules/share/scripts/TagEditor.js` | `TagEditor` | `'GridManager'` |
| `engine/core/modules/share/scripts/FiltersTreeEditor.js` | `FiltersTreeEditor` | `'ModalBox', 'jquery.min', 'jstree/jstree.min'` |
| `engine/core/modules/share/scripts/SiteManager.js` | `SiteManager` | `'GridManager'` |
| `engine/core/modules/share/scripts/DivForm.js` | `DivForm` | `'Form', 'ModalBox'` |
| `engine/core/modules/share/scripts/AttachmentEditor.js` | (duplicate entry above) |  |
| `engine/core/modules/apps/scripts/FeedToolbar.js` | `FeedToolbar` | `'Toolbar', 'ModalBox'` |
| `engine/core/modules/user/scripts/UserManager.js` | `UserManager` | `'GridManager'` |
| `engine/core/modules/user/scripts/GroupForm.js` | `GroupForm` | `'Form'` |
| `engine/core/modules/user/scripts/UserProfile.js` | `UserProfile` | *(no loader)* |
| `engine/core/modules/user/scripts/RecoverPassword.js` | `RecoverPassword` | *(no loader)* |
| `engine/core/modules/user/scripts/SignIn.js` | `SignIn` | *(no loader)* |
| `engine/core/modules/wizard/scripts/TemplateWizard.js` | `TemplateWizard` | `'GridManager'` |
| `engine/core/modules/wizard/scripts/DefaultTemplateJs.js` | `DefaultTemplateJs` | *(no loader)* |
| `engine/core/modules/auto/scripts/Testfeed.js` | `Testfeed` | *(no loader)* |

> _Note: `system.jsmap.php` mirrors many of these dependencies for PHP-side resolution via `Document::createJavascriptDependencies`._

## Translations and toolbars
- `<document/translations>` nodes are assembled in `Document.class.php` (PHP) and rendered in XSLT:
  - `document.xslt` serialises them into JSON (`/document/translations/@json`) and injects inline scripts that call `Energine.translations.extend(...)` for editable components.
  - Component templates (`list.xslt`, `divisionEditor.xslt`, `tagEditor.xslt`) hook DOM ready events to extend translations into the client runtime.
- Toolbars are rendered by `toolbar.xslt`, which schedules `Toolbar` instances through `Energine.addTask` and stores them in the global `componentToolbars` array for later binding.

## External library touchpoints
| Library | Where loaded | Consumers |
| --- | --- | --- |
| CKEditor 4 + plugins | ScriptLoader dependencies from `Form.js` and `PageEditor.js`; translations for WYSIWYG pulled in `list.xslt` when HTML fields present. | Page editor, form WYSIWYG fields. |
| CodeMirror | Conditionally included in `form.xslt` when `field[@type='code']` exists. | Code fields inside admin grids. |
| jQuery + jsTree | Required via `ScriptLoader.load` in `DivManager.js`, `DivTree.js`, `DivSidebar.js`, `FiltersTreeEditor.js`; templates comment legacy `<script>` tags. | Site/division tree editors. |
| Fancytree | Bundled under `scripts/fancytree`; currently referenced from JS helpers (no direct template include yet). | Alternative tree widgets (check `Div*` managers). |
| FileAPI | Loaded via ScriptLoader in `AttachmentEditor.js`, `FileRepoForm.js`, `FileRepository.js`; sets `FileAPI.staticPath` to `scripts/FileAPI/`. | File uploads (grid attachments, repository). |
| Bootstrap, SweetAlert2, Font Awesome | Included by `site/modules/default/transformers/energine.xslt` and `error_page.xslt`. | Public site theme / admin shell. |
| JWPlayer | Loaded by `media.xslt` & `embed_player.xslt` alongside custom `Player.js`. | Media playback embeds. |
| Mootools | Legacy fallback used by `embed_player.xslt` (debug/minified switch). | Legacy player wrapper. |
| VK/Facebook auth helpers | Inlined by `user.xslt` (`//vk.com/js/api/openapi.js`, `FBL.set`). | Login form social auth. |

## Legacy dependency map
- `engine/core/modules/share/gears/Document.class.php` reads `system.jsmap.php` to resolve script dependency chains into `<document/javascript/library>` nodes during page build.
- `system.jsmap.php` currently enumerates component-to-script dependencies (e.g. `TagEditor => ['GridManager']`). Removing this file requires replacing the PHP-side resolution path.

## Current loading flow (textual)
```
[PHP Document build]
    -> collect components, translations, behaviors
    -> resolve JS deps via system.jsmap.php into <document/javascript/library>
    -> render XML for XSLT
[XSLT transformation]
    -> document.xslt lays out <head>/<body>, injects Energine.js + runtime config
    -> site/admin wrappers include theme CSS/JS (Bootstrap, SweetAlert2, etc.)
    -> component templates output markup with data attributes + generated IDs
    -> inline <script> blocks schedule Energine.addTask handlers/toolbars
[Client runtime]
    -> Energine.js bootstraps, executes queued tasks on DOMContentLoaded
    -> ScriptLoader fetches per-class dependencies (Mootools-era globals)
    -> Component classes instantiate against generated DOM IDs
```

### Debug vs production differences today
- `document.xslt` only toggles `Energine.debug` flag (`document/@debug`) but always loads the same `Energine.js` file.
- `embed_player.xslt` selects debug vs minified Mootools bundles.
- No dev-server; templates rely on static `scripts/...` URLs for both modes.

