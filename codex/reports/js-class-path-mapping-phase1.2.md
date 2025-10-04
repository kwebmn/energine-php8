# Energine JS class → file mapping (Phase 1.2)

## Purpose
To let the PHP runtime resolve `data-energine-js` component names into concrete script URLs during development mode, we propose a deterministic lookup rule backed by a small exception table. The rule must succeed for any class name emitted by existing XSLT templates without depending on `system.jsmap.php`.

## Default resolution rule
1. **Base directories.** Search the module script roots in priority order:
   1. `engine/core/modules/share/scripts`
   2. `engine/core/modules/user/scripts`
   3. `engine/core/modules/wizard/scripts`
   4. `engine/core/modules/apps/scripts`
   5. `engine/core/modules/auto/scripts`
2. **File naming.** For each directory, look for a file whose basename matches the requested class name with the suffix `.js`, preserving case (e.g. `GridManager` → `GridManager.js`).
3. **Module hints (optional optimisation).** When multiple matches exist, prefer the directory hinted by the class prefix:
   - `User*`, `Group*`, `SignIn`, `RecoverPassword` → `user`
   - `Template*`, `DefaultTemplate*` → `wizard`
   - `Feed*` → `apps`
   - `Test*` → `auto`
   Classes without an explicit hint fall back to `share`.
4. **Resolution outcome.** The first existing file path yielded by steps 1–3 is served. If no path is found, consult the explicit exception map below.

This rule covers the one-file-per-class structure used by the vast majority of Energine component scripts and removes the need for handwritten dependency chains.

## Coverage snapshot
The lookup rule above resolves all of the primary admin/site classes directly from their filenames:

| Class name | Resolved path |
| --- | --- |
| `AcplField` | `engine/core/modules/share/scripts/AcplField.js` |
| `AttachmentEditor` | `engine/core/modules/share/scripts/AttachmentEditor.js` |
| `Cookie` | `engine/core/modules/share/scripts/Cookie.js` |
| `DivForm` | `engine/core/modules/share/scripts/DivForm.js` |
| `DivManager` | `engine/core/modules/share/scripts/DivManager.js` |
| `DivSidebar` | `engine/core/modules/share/scripts/DivSidebar.js` |
| `DivTree` | `engine/core/modules/share/scripts/DivTree.js` |
| `FileRepoForm` | `engine/core/modules/share/scripts/FileRepoForm.js` |
| `FileRepository` | `engine/core/modules/share/scripts/FileRepository.js` |
| `FiltersTreeEditor` | `engine/core/modules/share/scripts/FiltersTreeEditor.js` |
| `Form` | `engine/core/modules/share/scripts/Form.js` |
| `GridManager` | `engine/core/modules/share/scripts/GridManager.js` |
| `ImageManager` | `engine/core/modules/share/scripts/ImageManager.js` |
| `ModalBox` | `engine/core/modules/share/scripts/ModalBox.js` |
| `PageEditor` | `engine/core/modules/share/scripts/PageEditor.js` |
| `PageList` | `engine/core/modules/share/scripts/PageList.js` |
| `PageToolbar` | `engine/core/modules/share/scripts/PageToolbar.js` |
| `SiteManager` | `engine/core/modules/share/scripts/SiteManager.js` |
| `TabPane` | `engine/core/modules/share/scripts/TabPane.js` |
| `TagEditor` | `engine/core/modules/share/scripts/TagEditor.js` |
| `Toolbar` | `engine/core/modules/share/scripts/Toolbar.js` |
| `ValidForm` | `engine/core/modules/share/scripts/ValidForm.js` |
| `Validator` | `engine/core/modules/share/scripts/Validator.js` |
| `UserManager` | `engine/core/modules/user/scripts/UserManager.js` |
| `GroupForm` | `engine/core/modules/user/scripts/GroupForm.js` |
| `UserProfile` | `engine/core/modules/user/scripts/UserProfile.js` |
| `RecoverPassword` | `engine/core/modules/user/scripts/RecoverPassword.js` |
| `SignIn` | `engine/core/modules/user/scripts/SignIn.js` |
| `TemplateWizard` | `engine/core/modules/wizard/scripts/TemplateWizard.js` |
| `DefaultTemplateJs` | `engine/core/modules/wizard/scripts/DefaultTemplateJs.js` |
| `FeedToolbar` | `engine/core/modules/apps/scripts/FeedToolbar.js` |
| `Testfeed` | `engine/core/modules/auto/scripts/Testfeed.js` |

The class-prefix hints ensure the correct module directory is chosen before the fallback search kicks in. For example, `TemplateWizard` is resolved in the `wizard` module because of the `Template*` prefix, while `FeedToolbar` matches the `Feed*` → `apps` hint.

## Exception map (non 1:1 filenames)
A small subset of classes live inside helper bundles or expose multiple classes per file. These names fall back to the explicit map:

| Class name | File path | Notes |
| --- | --- | --- |
| `Grid` | `engine/core/modules/share/scripts/GridManager.js` | Core grid helper co-located with `GridManager`. |
| `GridWithPopImage` | `engine/core/modules/share/scripts/FileRepository.js` | Utility grid inside the repository module. |
| `FormUploader` | `engine/core/modules/share/scripts/Form.js` | Upload helper declared alongside `Form`. |
| `FormSmapSelector` | `engine/core/modules/share/scripts/Form.js` | Selector widget embedded in `Form.js`. |
| `FormAttachmentSelector` | `engine/core/modules/share/scripts/Form.js` | Attachment picker defined in `Form.js`. |
| `FormRichEditor` | `engine/core/modules/share/scripts/Form.js` | Rich-text bridge defined in `Form.js`. |
| `BlockEditor` | `engine/core/modules/share/scripts/PageEditor.js` | Block-level editor declared within `PageEditor.js`. |
| `Words` | `engine/core/modules/share/scripts/AcplField.js` | Internal autocomplete helper used by `AcplField`. |
| `ActiveList` | `engine/core/modules/share/scripts/AcplField.js` | Base class for autocomplete lists. |
| `DropBoxList` | `engine/core/modules/share/scripts/AcplField.js` | Specialised autocomplete dropdown. |
| `ModalBoxClass` | `engine/core/modules/share/scripts/ModalBox.js` | Singleton implementation backing the `ModalBox` global. |
| `PathList` | `engine/core/modules/share/scripts/FileRepository.js` | Repository path helper bundled with `FileRepository`. |

The exception table can be converted into a PHP associative array (class name → relative path) for direct inclusion in the new loader. When a class name is missing from both the default rule and the exception map, the resolver should raise a descriptive error so new components get registered explicitly.

## Next steps
- Implement the resolver in PHP, replacing `system.jsmap.php` by combining the default rule with the exception dictionary above.
- Extend the exception map as new shared helpers (e.g. utility classes declared inside another file) are introduced.
- Align production builds so the bundler emits the same relative paths (or alias table) to keep dev/prod parity.
