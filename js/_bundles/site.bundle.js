import jquerySource from '../../engine/core/modules/share/scripts/jquery.min.js?raw';
import bootstrapSource from '../../site/modules/default/scripts/bootstrap.bundle.min.js?raw';
import sweetalertSource from '../../site/modules/default/scripts/sweetalert2.min.js?raw';
import energineSource from '../../engine/core/modules/share/scripts/Energine.js?raw';
import cookieSource from '../../engine/core/modules/share/scripts/Cookie.js?raw';
import validatorSource from '../../engine/core/modules/share/scripts/Validator.js?raw';
import validFormSource from '../../engine/core/modules/share/scripts/ValidForm.js?raw';
import acplFieldSource from '../../engine/core/modules/share/scripts/AcplField.js?raw';
import modalBoxSource from '../../engine/core/modules/share/scripts/ModalBox.js?raw';
import toolbarSource from '../../engine/core/modules/share/scripts/Toolbar.js?raw';
import tabPaneSource from '../../engine/core/modules/share/scripts/TabPane.js?raw';
import pageListSource from '../../engine/core/modules/share/scripts/PageList.js?raw';
import gridManagerSource from '../../engine/core/modules/share/scripts/GridManager.js?raw';
import formSource from '../../engine/core/modules/share/scripts/Form.js?raw';
import divFormSource from '../../engine/core/modules/share/scripts/DivForm.js?raw';
import divManagerSource from '../../engine/core/modules/share/scripts/DivManager.js?raw';
import divTreeSource from '../../engine/core/modules/share/scripts/DivTree.js?raw';
import divSidebarSource from '../../engine/core/modules/share/scripts/DivSidebar.js?raw';
import pageToolbarSource from '../../engine/core/modules/share/scripts/PageToolbar.js?raw';
import pageEditorSource from '../../engine/core/modules/share/scripts/PageEditor.js?raw';
import fileApiSource from '../../engine/core/modules/share/scripts/FileAPI/FileAPI.js?raw';
import fileApiHtml5Source from '../../engine/core/modules/share/scripts/FileAPI/FileAPI.html5.js?raw';
import fileApiJquerySource from '../../engine/core/modules/share/scripts/FileAPI/jquery.fileapi.min.js?raw';
import fileRepoFormSource from '../../engine/core/modules/share/scripts/FileRepoForm.js?raw';
import fileRepositorySource from '../../engine/core/modules/share/scripts/FileRepository.js?raw';
import attachmentEditorSource from '../../engine/core/modules/share/scripts/AttachmentEditor.js?raw';
import tagEditorSource from '../../engine/core/modules/share/scripts/TagEditor.js?raw';
import imageManagerSource from '../../engine/core/modules/share/scripts/ImageManager.js?raw';
import siteManagerSource from '../../engine/core/modules/share/scripts/SiteManager.js?raw';
import filtersTreeEditorSource from '../../engine/core/modules/share/scripts/FiltersTreeEditor.js?raw';
import jstreeSource from '../../engine/core/modules/share/scripts/jstree/jstree.min.js?raw';
import defaultSource from '../../site/modules/default/scripts/default.js?raw';

const legacyScripts = [
  ['engine/core/modules/share/scripts/jquery.min.js', jquerySource],
  ['site/modules/default/scripts/bootstrap.bundle.min.js', bootstrapSource],
  ['site/modules/default/scripts/sweetalert2.min.js', sweetalertSource],
  ['engine/core/modules/share/scripts/Energine.js', energineSource],
  ['engine/core/modules/share/scripts/Cookie.js', cookieSource],
  ['engine/core/modules/share/scripts/Validator.js', validatorSource],
  ['engine/core/modules/share/scripts/ValidForm.js', validFormSource],
  ['engine/core/modules/share/scripts/AcplField.js', acplFieldSource],
  ['engine/core/modules/share/scripts/ModalBox.js', modalBoxSource],
  ['engine/core/modules/share/scripts/Toolbar.js', toolbarSource],
  ['engine/core/modules/share/scripts/TabPane.js', tabPaneSource],
  ['engine/core/modules/share/scripts/PageList.js', pageListSource],
  ['engine/core/modules/share/scripts/GridManager.js', gridManagerSource],
  ['engine/core/modules/share/scripts/Form.js', formSource],
  ['engine/core/modules/share/scripts/DivForm.js', divFormSource],
  ['engine/core/modules/share/scripts/DivManager.js', divManagerSource],
  ['engine/core/modules/share/scripts/DivTree.js', divTreeSource],
  ['engine/core/modules/share/scripts/DivSidebar.js', divSidebarSource],
  ['engine/core/modules/share/scripts/PageToolbar.js', pageToolbarSource],
  ['engine/core/modules/share/scripts/PageEditor.js', pageEditorSource],
  ['engine/core/modules/share/scripts/FileAPI/FileAPI.js', fileApiSource],
  ['engine/core/modules/share/scripts/FileAPI/FileAPI.html5.js', fileApiHtml5Source],
  ['engine/core/modules/share/scripts/FileAPI/jquery.fileapi.min.js', fileApiJquerySource],
  ['engine/core/modules/share/scripts/FileRepoForm.js', fileRepoFormSource],
  ['engine/core/modules/share/scripts/FileRepository.js', fileRepositorySource],
  ['engine/core/modules/share/scripts/AttachmentEditor.js', attachmentEditorSource],
  ['engine/core/modules/share/scripts/TagEditor.js', tagEditorSource],
  ['engine/core/modules/share/scripts/ImageManager.js', imageManagerSource],
  ['engine/core/modules/share/scripts/SiteManager.js', siteManagerSource],
  ['engine/core/modules/share/scripts/FiltersTreeEditor.js', filtersTreeEditorSource],
  ['engine/core/modules/share/scripts/jstree/jstree.min.js', jstreeSource],
  ['site/modules/default/scripts/default.js', defaultSource],
];

function runLegacyScript(code, label) {
  if (!code) {
    return;
  }

  const executed = (window.__legacyScriptsExecuted ||= new Set());
  if (executed.has(label)) {
    return;
  }

  try {
    const executor = new Function(`${code}\n//# sourceURL=${label}`);
    executor.call(window);
    executed.add(label);
  } catch (error) {
    console.error(`[site.bundle] Failed to execute ${label}:`, error);
  }
}

legacyScripts.forEach(([label, code]) => runLegacyScript(code, label));

if (window.jQuery && !window.$) {
  window.$ = window.jQuery;
}
if (window.$ && !window.jQuery) {
  window.jQuery = window.$;
}

if (typeof window.Energine === 'undefined' && typeof globalThis.Energine !== 'undefined') {
  window.Energine = globalThis.Energine;
}
