import 'vendor/components/jstree/jstree.js';

export const ensureJsTreeGlobals = () => {
    if (typeof window === 'undefined') {
        return;
    }

    const jqueryInstance = window.jQuery || window.$;
    if (!jqueryInstance || !jqueryInstance.fn) {
        return;
    }

    if (jqueryInstance.fn.jstree && !jqueryInstance.jstree) {
        jqueryInstance.jstree = jqueryInstance.fn.jstree;
    }
};

ensureJsTreeGlobals();
