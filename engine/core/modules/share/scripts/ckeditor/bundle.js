import 'vendor/ckeditor/ckeditor/ckeditor.js';

const ensureBasePath = () => {
    if (typeof window === 'undefined') {
        return '';
    }

    let basePath = window.CKEDITOR_BASEPATH || '';

    if (!basePath) {
        const currentScript = document.currentScript;
        if (currentScript?.src) {
            try {
                const scriptUrl = new URL(currentScript.src, window.location.href);
                basePath = new URL('./ckeditor/', scriptUrl).toString();
            } catch {
                basePath = '';
            }
        }
    }

    if (basePath) {
        window.CKEDITOR_BASEPATH = basePath;
        if (window.CKEDITOR && window.CKEDITOR.basePath !== basePath) {
            window.CKEDITOR.basePath = basePath;
        }
    }

    return basePath;
};

const registerExternalPlugins = (basePath) => {
    if (typeof window === 'undefined' || !window.CKEDITOR) {
        return;
    }
    const pluginBase = basePath || window.CKEDITOR_BASEPATH || '';
    if (!pluginBase) {
        return;
    }

    const register = (name) => {
        const external = window.CKEDITOR.plugins && window.CKEDITOR.plugins.external;
        if (external && Object.prototype.hasOwnProperty.call(external, name)) {
            return;
        }
        window.CKEDITOR.plugins.addExternal(
            name,
            `${pluginBase}plugins/${name}/`,
            'plugin.js'
        );
    };

    register('energinefile');
    register('energineimage');
    register('codemirror');
};

const basePath = ensureBasePath();
registerExternalPlugins(basePath);

export {};
