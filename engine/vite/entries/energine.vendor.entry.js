import './styles/vendor.css';

import '../../../site/modules/default/scripts/bootstrap.bundle.min.js';
import '../../core/modules/share/scripts/jquery.min.js';
import '../../core/modules/share/scripts/jstree/jstree.min.js';
import '../../core/modules/share/scripts/ckeditor/ckeditor.js';
import '../../core/modules/share/scripts/FileAPI/FileAPI.js';

if (typeof window !== 'undefined' && typeof window.jQuery === 'function') {
  window.$ = window.jQuery;
}

if (typeof window !== 'undefined' && typeof window.CKEDITOR_BASEPATH === 'undefined') {
  window.CKEDITOR_BASEPATH = '/engine/core/modules/share/scripts/ckeditor/';
}
