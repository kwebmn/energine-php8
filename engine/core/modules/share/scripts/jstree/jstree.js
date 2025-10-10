/**
 * Legacy stub for jsTree (unminified entry).
 *
 * See `jstree.min.js` in the same directory for details. The real
 * implementation lives in the Vite vendor bundle and is sourced from the
 * Composer package `components/jstree`.
 */
(function () {
    if (typeof window === 'undefined') {
        return;
    }

    var jqueryInstance = window.jQuery || window.$;
    if (!jqueryInstance || !jqueryInstance.fn) {
        if (typeof console !== 'undefined' && typeof console.warn === 'function') {
            console.warn('jsTree vendor bundle was not loaded before the legacy stub.');
        }
        return;
    }

    if (!jqueryInstance.fn.jstree || !jqueryInstance.jstree) {
        if (typeof console !== 'undefined' && typeof console.warn === 'function') {
            console.warn('jsTree plugin was not initialised on the global jQuery instance.');
        }
    }
}());
