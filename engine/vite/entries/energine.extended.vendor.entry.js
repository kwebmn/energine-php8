import './styles/extended-vendor.css';

import 'engine/core/modules/share/scripts/ckeditor/ckeditor.js';
//import 'engine/core/modules/share/scripts/jstree/jstree.js';

import 'engine/core/modules/share/scripts/jquery.min.js';

if (typeof window !== 'undefined') {
    const jqueryInstance = window.jQuery || window.$;
    if (jqueryInstance) {
        window.jQuery = window.jQuery || jqueryInstance;
        window.$ = window.$ || jqueryInstance;
    }
}

import 'engine/core/modules/share/scripts/jstree/jstree.min.js';
import 'engine/core/modules/share/scripts/codemirror/lib/codemirror.js';
import 'engine/core/modules/share/scripts/codemirror/mode/xml/xml.js';
import 'engine/core/modules/share/scripts/codemirror/mode/javascript/javascript.js';
import 'engine/core/modules/share/scripts/codemirror/mode/css/css.js';
import 'engine/core/modules/share/scripts/codemirror/mode/htmlmixed/htmlmixed.js';
