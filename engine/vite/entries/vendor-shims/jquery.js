import 'vendor/components/jquery/jquery.js';

export const ensureJQueryGlobal = () => {
    if (typeof window === 'undefined') {
        return;
    }

    const jqueryInstance = window.jQuery || window.$;
    if (!jqueryInstance) {
        return;
    }

    window.jQuery = jqueryInstance;
    window.$ = jqueryInstance;
};

ensureJQueryGlobal();
