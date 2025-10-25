import Energine, { showLoader, hideLoader, registerBehavior as registerEnergineBehavior } from './Energine.js';
import loadCKEditor from './ckeditor/loader.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

function applyEditorOutline(area, editor) {
    if (!area) {
        return;
    }
    area.style.outline = '1px dashed #f00';
    area.style.outlineOffset = '2px';
    if (editor && typeof editor.on === 'function') {
        editor.on('focus', () => {
            area.style.outline = '2px dashed #0d0';
            area.style.outlineOffset = '2px';
        });
        editor.on('blur', () => {
            area.style.outline = '1px dashed #f00';
            area.style.outlineOffset = '2px';
        });
    }
}

class PageEditor {
    editorClassName = 'nrgnEditor';
    editors = [];

    constructor() {
        this.readyPromise = loadCKEditor()
            .then((CKEDITOR) => {
                if (!CKEDITOR) {
                    throw new Error('PageEditor requires CKEditor to be loaded globally.');
                }

                PageEditor.configureCKEditor(CKEDITOR);

                document.querySelectorAll(`.${this.editorClassName}`).forEach(element => {
                    this.editors.push(new PageEditor.BlockEditor(element, CKEDITOR));
                });

                window.nrgPageEditor = this;
                return CKEDITOR;
            })
            .catch((error) => {
                console.warn('PageEditor initialization failed', error);
                return null;
            });
    }

    static configureCKEditor(CKEDITOR) {
        CKEDITOR.config.versionCheck = false;
        CKEDITOR.disableAutoInline = true;
        CKEDITOR.config.extraPlugins = 'sourcedialog,codemirror,colorbutton,font,iframe,energineimage,energinefile';
        CKEDITOR.config.removePlugins = 'exportpdf';
        CKEDITOR.config.allowedContent = true;
        CKEDITOR.config.toolbar = [
            { name: 'document', groups: [ 'mode' ], items: [ 'Sourcedialog' ] },
            { name: 'clipboard', groups: [ 'clipboard', 'undo' ], items: [ 'Cut', 'Copy', 'Paste', 'PasteText', 'PasteFromWord', '-', 'Undo', 'Redo' ] },
            { name: 'editing', groups: [ 'find', 'selection' ], items: [ 'Find', 'Replace', '-', 'SelectAll' ] },
            { name: 'links', items: [ 'Link', 'Unlink', 'Anchor' ] },
            { name: 'insert', items: [ 'Image', 'Flash', 'Table', 'Iframe', 'EnergineImage', 'EnergineFile' ] },
            { name: 'tools', items: [ 'ShowBlocks' ] },
            '/',
            { name: 'basicstyles', groups: [ 'basicstyles', 'cleanup' ], items: [ 'Bold', 'Italic', 'Underline', 'Strike', 'Subscript', 'Superscript', '-', 'RemoveFormat' ] },
            { name: 'paragraph', groups: [ 'list', 'indent', 'align' ], items: [ 'NumberedList', 'BulletedList', '-', 'Outdent', 'Indent', '-', 'JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock' ] },
            { name: 'styles', items: [ 'Styles', 'Format', 'Font', 'FontSize' ] },
            { name: 'colors', items: [ 'TextColor', 'BGColor' ] }
        ];

        const styles = [];
        if (window['wysiwyg_styles']) {
            Object.values(window['wysiwyg_styles']).forEach(style => {
                styles.push({
                    name: style['caption'],
                    element: style['element'],
                    attributes: { 'class': style['class'] }
                });
            });
        }
        if (!CKEDITOR.stylesSet.registered || !Object.prototype.hasOwnProperty.call(CKEDITOR.stylesSet.registered, 'energine')) {
            CKEDITOR.stylesSet.add('energine', styles);
        } else {
            CKEDITOR.stylesSet.registered.energine = styles;
        }
        CKEDITOR.config.stylesSet = 'energine';
    }

    // --------- Вложенный BlockEditor ---------
    static BlockEditor = class {
        constructor(area, CKEDITOR) {
            PageEditor.configureCKEditor(CKEDITOR);
            this.area = area;
            const dataset = area.dataset || {};
            area.setAttribute('contenteditable', true);
            this.isActive = false;
            this.singlePath = dataset.eSingleTemplate
                || area.getAttribute('data-e-single-template')
                || area.getAttribute('single_template');
            this.ID = area.getAttribute('eID') || '';
            this.num = area.getAttribute('num') || '';
            if (!area.id) {
                area.id = `nrg-editor-${Math.random().toString(36).slice(2)}`;
            }
            this.editor = CKEDITOR.inline(area.id);
            this.editor.singleTemplate = this.singlePath;
            this.editor.editorId = area.id;
            applyEditorOutline(this.area, this.editor);
            //this.overlay = new Overlay();
            // Если нужны события blur/focus, можно раскомментировать:
            /*
            this.editor.on('blur', () => {
                area.classList.remove('activeEditor');
                this.save();
            });
            this.editor.on('focus', () => {
                area.classList.add('activeEditor');
            });
            */

        }

        /**
         * Сохраняет данные блока.
         * @param {boolean} [async = true] Асинхронно или нет
         * @param {function} [onSuccess] Колбэк после сохранения
         */
    save(async = true, onSuccess = undefined) {
        if (!this.editor || !this.editor.checkDirty()) {
            return;
        }

        if (!async) showLoader();

        let data = 'data=' + encodeURIComponent(this.editor.getData());
        if (this.ID) data += '&ID=' + this.ID;
        if (this.num) data += '&num=' + this.num;

        fetch(this.singlePath + 'save-text', {
            method: 'POST',
            body: data,
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        })
            .then(response => response.text())
            .then(response => {
                // this.editor.setData(response); // убрано как в оригинале
                if (onSuccess) onSuccess.call(this);
                if (this.editor.resetDirty) this.editor.resetDirty();
                if (!async) this.overlay.hide();
            });
    }
    }
}
/**
 * Block editor.
 *
 * @constructor
 * @param pageEditor
 * @param area
 */
class BlockEditor {
    /**
     * @param {HTMLElement} area - Area element.
     */
    constructor(area) {
        /**
         * Area element.
         * @type {HTMLElement}
         */
        this.area = area;
        this.area.setAttribute('contenteditable', 'true');

        /**
         * Defines whether the editor is active.
         * @type {boolean}
         */
        this.isActive = false;

        /**
         * Single path.
         * @type {string}
         */
        const dataset = this.area.dataset || {};
        this.singlePath = dataset.eSingleTemplate
            || this.area.getAttribute('data-e-single-template')
            || this.area.getAttribute('single_template');

        /**
         * Block editor ID.
         * @type {string}
         */
        this.ID = this.area.getAttribute('eID') || '';

        /**
         * Text block ID.
         * @type {string}
         */
        this.num = this.area.getAttribute('num') || '';

        /**
         * Editor.
         * @type {CKEDITOR}
         */
        this.editor = null;
        this.readyPromise = loadCKEditor()
            .then((CKEDITOR) => {
                if (!CKEDITOR) {
                    throw new Error('BlockEditor requires CKEditor to be loaded.');
                }

                PageEditor.configureCKEditor(CKEDITOR);

                if (!this.area.id) {
                    this.area.id = `nrg-editor-${Math.random().toString(36).slice(2)}`;
                }

                this.editor = CKEDITOR.inline(this.area.id);
                const dataset = this.area.dataset || {};
                this.editor.singleTemplate = dataset.eSingleTemplate
                    || this.area.getAttribute('data-e-single-template')
                    || this.area.getAttribute('single_template');
                this.editor.editorId = this.area.id;
                applyEditorOutline(this.area, this.editor);

                return this.editor;
            })
            .catch((error) => {
                console.warn('BlockEditor initialization failed', error);
                return null;
            });

        /**
         * Overlay.
         * @type {Overlay}
         */
        //this.overlay = new Overlay();

        // События CKEditor (закомментировано, как в оригинале)
        /*
        this.editor.on('blur', () => {
            // console.log(this.area);
            this.area.classList.remove('activeEditor');
            this.save();
        });
        this.editor.on('focus', () => {
            // console.log(this.area);
            this.area.classList.add('activeEditor');
        });
        */
    }

    /**
     * Save.
     *
     * @public
     * @param {boolean} [async=true] - Defines whether the request be asynchronous or not.
     * @param {function} [onSuccess=undefined] - User defined function that is called after success saving
     */
    save(async = true, onSuccess) {
        if (!this.editor || !this.editor.checkDirty()) {
            return;
        }

        if (!async) {
            showLoader();
        }

        const params = {
            data: this.editor.getData(),
        };
        if (this.ID) {
            params.ID = this.ID;
        }
        if (this.num) {
            params.num = this.num;
        }

        Energine.request(
            this.singlePath + 'save-text',
            params,
            (response) => {
                if (onSuccess) onSuccess.call(this, response);
                this.editor.resetDirty && this.editor.resetDirty();
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
            }
        );
    }
}

PageEditor.BlockEditor = BlockEditor;

export { PageEditor, BlockEditor };
export default PageEditor;

export function attachToWindow(target = globalScope) {
    if (!target) {
        return PageEditor;
    }

    target.PageEditor = PageEditor;
    target.PageEditor.BlockEditor = BlockEditor;
    return PageEditor;
}

attachToWindow();

try {
    if (typeof registerEnergineBehavior === 'function') {
        registerEnergineBehavior('PageEditor', PageEditor);
    }
} catch (error) {
    if (Energine && typeof Energine.safeConsoleError === 'function') {
        Energine.safeConsoleError(error, '[PageEditor] Failed to register behavior');
    } else if (typeof console !== 'undefined' && console.warn) {
        console.warn('[PageEditor] Failed to register behavior', error);
    }
}
;
