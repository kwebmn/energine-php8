import Energine, { showLoader, hideLoader } from './Energine.js';
import ModalBox from './ModalBox.js';
import './suneditor/loader.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

const getSunEditor = () => globalScope?.SUNEDITOR;
const marginProperties = ['margin-left', 'margin-right', 'margin-top', 'margin-bottom'];

function escapeAttribute(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function resolveMediaUrl(path) {
    if (!path) {
        return '';
    }

    if (/^(?:https?:)?\/\//i.test(path)) {
        return path;
    }

    return `${Energine.media || ''}${path}`;
}

function applyEditorOutline(area, editor) {
    if (!area) {
        return;
    }

    const setOutline = (isActive) => {
        area.style.outline = isActive ? '2px dashed #0d0' : '1px dashed #f00';
        area.style.outlineOffset = '2px';
    };

    setOutline(false);

    const focusTarget = editor?.core?.context?.element?.wysiwyg
        || editor?.context?.element?.wysiwyg
        || area;

    if (focusTarget && typeof focusTarget.addEventListener === 'function') {
        focusTarget.addEventListener('focus', () => setOutline(true));
        focusTarget.addEventListener('blur', () => setOutline(false));
    }
}

class PageEditor {
    editorClassName = 'nrgnEditor';

    editors = [];

    constructor() {
        this.sunEditorPromise = null;
        this.SUNEDITOR = null;
        this.helpers = null;
        this.styleSet = [];

        this.ensureSunEditor()
            .then((SUNEDITOR) => {
                if (!SUNEDITOR) {
                    throw new Error('PageEditor requires SunEditor to be loaded globally.');
                }

                this.SUNEDITOR = SUNEDITOR;
                this.helpers = SUNEDITOR.__energineHelpers || null;
                this.styleSet = this.collectStyleSet();
                this.initEditors();

                if (globalScope) {
                    globalScope.nrgPageEditor = this;
                }
            })
            .catch((error) => {
                console.error('PageEditor initialisation failed', error);
            });
    }

    ensureSunEditor() {
        if (!this.sunEditorPromise) {
            const loader = globalScope?.__suneditorLoader?.ready;
            const resolveInstance = () => getSunEditor();

            this.sunEditorPromise = Promise.resolve(loader ?? resolveInstance())
                .then((SUNEDITOR) => SUNEDITOR || resolveInstance())
                .catch((error) => {
                    console.error('SunEditor loader error', error);
                    return resolveInstance();
                });
        }

        return this.sunEditorPromise;
    }

    collectStyleSet() {
        const styles = [];
        const registry = globalScope?.wysiwyg_styles;

        if (registry && typeof registry === 'object') {
            Object.values(registry).forEach((style) => {
                if (!style || typeof style !== 'object') {
                    return;
                }

                const element = style.element || 'span';
                const className = style.class || '';
                const caption = style.caption || style.name || element;

                styles.push({
                    name: caption,
                    element,
                    attributes: className ? { class: className } : {},
                });
            });
        }

        return styles;
    }

    initEditors() {
        if (!this.SUNEDITOR) {
            return;
        }

        const areas = document.querySelectorAll(`.${this.editorClassName}`);
        areas.forEach((area) => {
            const editor = new PageEditorBlock(area, this);
            this.editors.push(editor);
        });
    }
}

class PageEditorBlock {
    constructor(area, pageEditor) {
        this.area = area;
        this.pageEditor = pageEditor;
        this.singlePath = area.getAttribute('single_template') || '';
        this.ID = area.getAttribute('eID') || '';
        this.num = area.getAttribute('num') || '';
        this.isDirty = false;

        if (!this.area.id) {
            this.area.id = `suneditor-area-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        }

        this.editor = this.createEditorInstance();
        applyEditorOutline(this.area, this.editor);
        this.registerCustomisations();
        this.bindChangeTracking();
    }

    createEditorInstance() {
        const options = {
            mode: 'inline',
            minHeight: 120,
            buttonList: [
                ['undo', 'redo'],
                ['font', 'fontSize', 'formatBlock'],
                ['bold', 'underline', 'italic', 'strike', 'removeFormat'],
                ['fontColor', 'hiliteColor'],
                ['list', 'align', 'outdent', 'indent'],
                ['link', 'table', 'image', 'video'],
                ['showBlocks', 'codeView'],
            ],
            katex: globalScope?.katex,
            resizingBar: false,
            charCounter: true,
            defaultTag: 'p',
        };

        const editor = this.pageEditor.SUNEDITOR.create(this.area, options);
        editor.editorId = this.area.id;
        editor.singleTemplate = this.singlePath;
        return editor;
    }

    registerCustomisations() {
        const helpers = this.pageEditor.helpers;

        if (!helpers) {
            return;
        }

        if (this.pageEditor.styleSet.length > 0) {
            helpers.applyStyleSet(this.editor, this.pageEditor.styleSet);
        }

        helpers.registerImageButton(this.editor, {
            title: 'Медиа-библиотека: изображение',
            group: 'insert',
            onClick: () => this.openImageLibrary(),
        });

        helpers.registerFileButton(this.editor, {
            title: 'Медиа-библиотека: файл',
            group: 'insert',
            onClick: () => this.openFileLibrary(),
        });
    }

    bindChangeTracking() {
        const wysiwyg = this.editor?.core?.context?.element?.wysiwyg
            || this.editor?.context?.element?.wysiwyg
            || this.area;

        if (wysiwyg && typeof wysiwyg.addEventListener === 'function') {
            wysiwyg.addEventListener('input', () => {
                this.isDirty = true;
            });
        }
    }

    openImageLibrary() {
        if (!ModalBox || !this.singlePath) {
            return;
        }

        const panel = this.getEditorPanel();
        const restorePanelZ = PageEditorBlock.raisePanel(panel);

        ModalBox.open({
            url: `${this.singlePath}file-library/`,
            onClose: (imageData) => {
                restorePanelZ();
                if (!imageData) {
                    return;
                }

                const restoreManagerZ = PageEditorBlock.raisePanel(panel);
                ModalBox.open({
                    url: `${this.singlePath}imagemanager`,
                    extraData: imageData,
                    onClose: (image) => {
                        restoreManagerZ();
                        if (!image) {
                            return;
                        }

                        this.insertImageMarkup(image);
                    },
                });
            },
        });
    }

    openFileLibrary() {
        if (!ModalBox || !this.singlePath) {
            return;
        }

        const panel = this.getEditorPanel();
        const restorePanelZ = PageEditorBlock.raisePanel(panel);

        ModalBox.open({
            url: `${this.singlePath}file-library`,
            onClose: (fileData) => {
                restorePanelZ();
                if (!fileData) {
                    return;
                }

                this.insertFileLink(fileData);
            },
        });
    }

    getEditorPanel() {
        if (this.editor?.wrapper) {
            return this.editor.wrapper;
        }

        const origin = this.editor?.core?.context?.element?.originElement || this.area;
        if (!origin) {
            return null;
        }

        if (typeof origin.closest === 'function') {
            return origin.closest('.se-wrapper') || origin.parentElement || null;
        }

        return origin.parentElement || null;
    }

    static raisePanel(panel) {
        if (!panel) {
            return () => {};
        }

        const previous = panel.style.zIndex;
        panel.dataset.prevZIndex = previous || '';
        panel.style.zIndex = '1';

        return () => {
            if (panel.dataset.prevZIndex) {
                panel.style.zIndex = panel.dataset.prevZIndex;
            } else {
                panel.style.removeProperty('z-index');
            }
            delete panel.dataset.prevZIndex;
        };
    }

    insertImageMarkup(image) {
        if (!image || !this.editor || typeof this.editor.insertHTML !== 'function') {
            return;
        }

        const filename = resolveMediaUrl(image.filename || '');

        const styleParts = marginProperties
            .filter((marginProp) => Number(image[marginProp]) !== 0 && image[marginProp] !== null && image[marginProp] !== undefined)
            .map((marginProp) => `${marginProp}:${Number(image[marginProp])}px`);

        const styleAttr = styleParts.length > 0 ? ` style="${escapeAttribute(styleParts.join(';'))}"` : '';
        const width = image.width ? ` width="${escapeAttribute(image.width)}"` : '';
        const height = image.height ? ` height="${escapeAttribute(image.height)}"` : '';
        const align = image.align ? ` align="${escapeAttribute(image.align)}"` : '';
        const alt = ` alt="${escapeAttribute(image.alt || '')}"`;

        const html = `<img src="${escapeAttribute(filename)}"${width}${height}${align}${alt} border="0"${styleAttr}>`;
        this.editor.insertHTML(html);
        this.isDirty = true;
    }

    insertFileLink(fileData) {
        if (!fileData || !this.editor || typeof this.editor.insertHTML !== 'function') {
            return;
        }

        const filename = resolveMediaUrl(fileData.upl_path || fileData.path || '');
        if (!filename) {
            return;
        }

        let linkText = '';
        try {
            const selected = this.editor.getSelectedText ? this.editor.getSelectedText() : '';
            linkText = selected || fileData.upl_title || fileData.title || fileData.name || filename;
        } catch (e) {
            linkText = fileData.upl_title || fileData.title || fileData.name || filename;
        }

        const html = `<a href="${escapeAttribute(filename)}">${escapeHtml(linkText)}</a>`;
        this.editor.insertHTML(html);
        this.isDirty = true;
    }

    save(async = true, onSuccess) {
        if (!this.isDirty) {
            if (typeof onSuccess === 'function') {
                onSuccess.call(this);
            }
            return;
        }

        if (!async) {
            showLoader();
        }

        const params = {
            data: this.editor.getContents(),
        };

        if (this.ID) {
            params.ID = this.ID;
        }
        if (this.num) {
            params.num = this.num;
        }

        Energine.request(
            `${this.singlePath}save-text`,
            params,
            (response) => {
                this.isDirty = false;
                if (typeof onSuccess === 'function') {
                    onSuccess.call(this, response);
                }
                if (!async) {
                    hideLoader();
                }
            },
            () => {
                if (!async) {
                    hideLoader();
                }
            },
            () => {
                if (!async) {
                    hideLoader();
                }
            },
        );
    }
}

PageEditor.BlockEditor = PageEditorBlock;

export { PageEditor, PageEditorBlock as BlockEditor };
export default PageEditor;

export function attachToWindow(target = globalScope) {
    if (!target) {
        return PageEditor;
    }

    target.PageEditor = PageEditor;
    target.PageEditor.BlockEditor = PageEditorBlock;
    return PageEditor;
}

attachToWindow();
