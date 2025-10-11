const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

if (globalScope && !globalScope.__suneditorLoader) {
    const CSS_URL = 'https://cdn.jsdelivr.net/npm/suneditor@2.46.1/dist/css/suneditor.min.css';
    const JS_URL = 'https://cdn.jsdelivr.net/npm/suneditor@2.46.1/dist/suneditor.min.js';

    const ensureCss = () => {
        if (!globalScope?.document) {
            return;
        }

        const doc = globalScope.document;
        const existing = doc.querySelector('link[data-energine-suneditor="stylesheet"]');
        if (existing) {
            return;
        }

        const link = doc.createElement('link');
        link.rel = 'stylesheet';
        link.href = CSS_URL;
        link.setAttribute('data-energine-suneditor', 'stylesheet');
        doc.head?.appendChild(link);
    };

    const ensureScript = () => new Promise((resolve, reject) => {
        if (!globalScope?.document) {
            reject(new Error('SunEditor loader: document is not available'));
            return;
        }

        if (typeof globalScope.SUNEDITOR !== 'undefined') {
            resolve(globalScope.SUNEDITOR);
            return;
        }

        const doc = globalScope.document;
        const existing = doc.querySelector('script[data-energine-suneditor="script"]');

        const finalize = () => {
            if (typeof globalScope.SUNEDITOR === 'undefined') {
                reject(new Error('SunEditor loader: SUNEDITOR global is missing after script load'));
                return;
            }
            resolve(globalScope.SUNEDITOR);
        };

        if (existing) {
            existing.addEventListener('load', finalize, { once: true });
            existing.addEventListener('error', () => reject(new Error('SunEditor loader: failed to load script')));
            return;
        }

        const script = doc.createElement('script');
        script.src = JS_URL;
        script.defer = true;
        script.setAttribute('data-energine-suneditor', 'script');
        script.addEventListener('load', finalize, { once: true });
        script.addEventListener('error', () => reject(new Error('SunEditor loader: failed to load script')));
        doc.head?.appendChild(script);
    });

    const registerHelpers = (SUNEDITOR) => {
        if (!SUNEDITOR || SUNEDITOR.__energineHelpers) {
            return;
        }

        const helpers = {};

        helpers.createButton = function createButton(editor, config) {
            if (!editor || !config || !editor.core || !editor.core.context) {
                return null;
            }

            const toolbar = editor.core.context.tool?.bar || editor.core.context.tool?.toolbar || editor.core.context.tool?.element;
            if (!toolbar || !toolbar.querySelector) {
                return null;
            }

            const group = toolbar.querySelector('.se-btn-group[data-command-group="' + (config.group || 'insert') + '"]')
                || toolbar.querySelector('.se-btn-group');
            const button = globalScope.document.createElement('button');
            button.type = 'button';
            button.className = 'se-btn se-tooltip';
            button.setAttribute('data-command', config.command);
            button.setAttribute('data-tooltip', config.title || '');
            button.innerHTML = config.innerHTML;

            if (typeof config.onClick === 'function') {
                button.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    config.onClick(editor, button, event);
                });
            }

            if (group && typeof group.appendChild === 'function') {
                group.appendChild(button);
            } else if (typeof toolbar.appendChild === 'function') {
                toolbar.appendChild(button);
            }

            return button;
        };

        helpers.applyStyleSet = function applyStyleSet(editor, styles) {
            if (!editor || !Array.isArray(styles) || styles.length === 0) {
                return;
            }

            const selectWrapper = globalScope.document.createElement('div');
            selectWrapper.className = 'se-btn-group se-select-style';

            const select = globalScope.document.createElement('select');
            select.className = 'form-select form-select-sm';
            select.style.minWidth = '140px';
            const defaultOption = globalScope.document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = select.getAttribute('data-placeholder') || 'Стиль';
            select.appendChild(defaultOption);

            styles.forEach((style) => {
                const option = globalScope.document.createElement('option');
                option.value = JSON.stringify(style);
                option.textContent = style.name || style.caption || style.element || 'Стиль';
                select.appendChild(option);
            });

            select.addEventListener('change', () => {
                const value = select.value;
                if (!value) {
                    return;
                }

                let data = null;
                try {
                    data = JSON.parse(value);
                } catch (e) {
                    console.warn('SunEditor style parse error', e);
                }

                if (!data || !data.element) {
                    return;
                }

                const attributes = data.attributes || {};
                let html = `<${data.element}`;
                Object.entries(attributes).forEach(([key, attrValue]) => {
                    html += ` ${key}="${attrValue}"`;
                });
                html += '>' + editor.getSelectedText() + `</${data.element}>`;
                editor.insertHTML(html);
                select.value = '';
            });

            selectWrapper.appendChild(select);

            const toolbar = editor.core.context.tool?.bar || editor.core.context.tool?.toolbar || editor.core.context.tool?.element;
            if (toolbar && typeof toolbar.insertBefore === 'function') {
                toolbar.insertBefore(selectWrapper, toolbar.firstChild);
            } else if (toolbar && typeof toolbar.appendChild === 'function') {
                toolbar.appendChild(selectWrapper);
            }
        };

        helpers.registerImageButton = function registerImageButton(editor, options) {
            if (!editor || !options) {
                return;
            }

            helpers.createButton(editor, {
                command: 'energineImage',
                title: options.title || 'Energine image',
                innerHTML: '<i class="fa-solid fa-image"></i>',
                group: options.group,
                onClick: options.onClick,
            });
        };

        helpers.registerFileButton = function registerFileButton(editor, options) {
            if (!editor || !options) {
                return;
            }

            helpers.createButton(editor, {
                command: 'energineFile',
                title: options.title || 'Energine file',
                innerHTML: '<i class="fa-solid fa-paperclip"></i>',
                group: options.group,
                onClick: options.onClick,
            });
        };

        SUNEDITOR.__energineHelpers = helpers;
    };

    ensureCss();

    const readyPromise = ensureScript()
        .then((SUNEDITOR) => {
            registerHelpers(SUNEDITOR);
            return SUNEDITOR;
        })
        .catch((error) => {
            console.error(error);
            throw error;
        });

    globalScope.__suneditorLoader = {
        ready: readyPromise,
    };
} else if (globalScope?.__suneditorLoader && globalScope.__suneditorLoader.ready) {
    if (typeof globalScope.document !== 'undefined') {
        const doc = globalScope.document;
        if (!doc.querySelector('link[data-energine-suneditor="stylesheet"]')) {
            const link = doc.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/suneditor@2.46.1/dist/css/suneditor.min.css';
            link.setAttribute('data-energine-suneditor', 'stylesheet');
            doc.head?.appendChild(link);
        }
    }
}

const loaderPromise = globalScope?.__suneditorLoader?.ready || Promise.resolve(globalScope?.SUNEDITOR);

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = loaderPromise;
}
