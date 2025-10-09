import './styles/vendor.css';

import '../../core/modules/share/scripts/jquery.min.js';

if (typeof window !== 'undefined') {
    const jqueryInstance = window.jQuery || window.$;
    if (jqueryInstance) {
        window.jQuery = window.jQuery || jqueryInstance;
        window.$ = window.$ || jqueryInstance;
    }
}

import '../../core/modules/share/scripts/bootstrap.bundle.min.js';
import '../../core/modules/share/scripts/ckeditor/ckeditor.js';
import '../../core/modules/share/scripts/FileAPI/FileAPI.js';
import '../../core/modules/share/scripts/FileAPI/jquery.fileapi.min.js';
import '../../core/modules/share/scripts/jstree/jstree.js';
import '../../core/modules/share/scripts/jstree/jstree.min.js';
import '../../core/modules/share/scripts/codemirror/lib/codemirror.js';
import '../../core/modules/share/scripts/codemirror/mode/xml/xml.js';
import '../../core/modules/share/scripts/codemirror/mode/javascript/javascript.js';
import '../../core/modules/share/scripts/codemirror/mode/css/css.js';
import '../../core/modules/share/scripts/codemirror/mode/htmlmixed/htmlmixed.js';
