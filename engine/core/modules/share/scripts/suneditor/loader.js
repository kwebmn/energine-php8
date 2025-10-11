import SunEditor from './vendor/suneditor.js';
import './vendor/suneditor.css';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

if (globalScope) {
    if (!globalScope.SUNEDITOR) {
        globalScope.SUNEDITOR = SunEditor;
    }

    if (!globalScope.__suneditorLoader) {
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

                const groupName = config.group || 'insert';
                let group = toolbar.querySelector(`.se-btn-group[data-command-group="${groupName}"]`);
                if (!group) {
                    group = document.createElement('div');
                    group.className = 'se-btn-group';
                    group.setAttribute('data-command-group', groupName);
                    toolbar.appendChild(group);
                }

                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'se-btn se-tooltip';
                button.setAttribute('data-command', config.command || 'customCommand');
                if (config.title) {
                    button.setAttribute('data-tooltip', config.title);
                    button.title = config.title;
                }
                button.innerHTML = config.innerHTML || '';

                if (typeof config.onClick === 'function') {
                    button.addEventListener('click', (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        try {
                            editor.focus?.();
                        } catch (e) {
                            // ignore focus errors
                        }
                        config.onClick(editor, button, event);
                    });
                }

                group.appendChild(button);
                return button;
            };

            helpers.applyStyleSet = function applyStyleSet(editor, styles) {
                if (!editor || !Array.isArray(styles) || styles.length === 0) {
                    return;
                }

                const selectWrapper = document.createElement('div');
                selectWrapper.className = 'se-btn-group se-select-style';

                const select = document.createElement('select');
                select.className = 'se-select form-select form-select-sm';
                select.style.minWidth = '140px';
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'Стиль';
                select.appendChild(defaultOption);

                styles.forEach((style) => {
                    if (!style) {
                        return;
                    }
                    const option = document.createElement('option');
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
                    } catch (error) {
                        console.warn('SunEditor style parse error', error);
                    }

                    if (!data || !data.element) {
                        select.value = '';
                        return;
                    }

                    const attributes = data.attributes || {};
                    let html = `<${data.element}`;
                    Object.entries(attributes).forEach(([key, attrValue]) => {
                        html += ` ${key}="${attrValue}"`;
                    });
                    html += '>' + (editor.getSelectedText ? editor.getSelectedText() : '') + `</${data.element}>`;
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
                    innerHTML: options.innerHTML || '<i class="fa-solid fa-image"></i>',
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
                    innerHTML: options.innerHTML || '<i class="fa-solid fa-paperclip"></i>',
                    group: options.group,
                    onClick: options.onClick,
                });
            };

            SUNEDITOR.__energineHelpers = helpers;
        };

        const readyPromise = Promise.resolve(globalScope.SUNEDITOR)
            .then((instance) => {
                registerHelpers(instance);
                return instance;
            });

        globalScope.__suneditorLoader = {
            ready: readyPromise,
        };
    }
}

const loaderPromise = globalScope?.__suneditorLoader?.ready || Promise.resolve(globalScope?.SUNEDITOR);

export default loaderPromise;
