import './styles/vendor.css';

import 'engine/core/modules/share/scripts/jquery.min.js';

if (typeof window !== 'undefined') {
    const jqueryInstance = window.jQuery || window.$;
    if (jqueryInstance) {
        window.jQuery = window.jQuery || jqueryInstance;
        window.$ = window.$ || jqueryInstance;
    }
}

import 'vendor/twbs/bootstrap/dist/js/bootstrap.bundle.min.js';
