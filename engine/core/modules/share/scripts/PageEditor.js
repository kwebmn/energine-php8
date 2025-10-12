import Energine, { showLoader, hideLoader } from './Energine.js';
import tinymce, { initTinyMCE, collectWysiwygStyles } from './tinymce/config.js';

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
        if (!tinymce) {
            throw new Error('PageEditor requires TinyMCE to be loaded globally.');
        }

        PageEditor.styles = PageEditor.styles || collectWysiwygStyles();

        // Инициализация редакторов для всех областей
        document.querySelectorAll('.' + this.editorClassName).forEach(element => {
            this.editors.push(new BlockEditor(element, PageEditor.styles));
        });

        window.nrgPageEditor = this;
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
     * @param {Array} styles - Style definitions for TinyMCE.
     */
    constructor(area, styles = collectWysiwygStyles()) {
        this.area = area;
        this.area.setAttribute('contenteditable', 'true');
        this.isActive = false;
        this.singlePath = this.area.getAttribute('single_template') || '';
        this.ID = this.area.getAttribute('eID') || '';
        this.num = this.area.getAttribute('num') || '';
        this.styles = styles;
        this.editor = null;
        this.initPromise = null;

        if (!this.area.id) {
            this.area.id = `tinymce-inline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        }

        this.initEditor();
    }

    initEditor() {
        const setupEditor = (editor) => {
            this.editor = editor;
            editor.editorId = this.area.id;
            editor.singleTemplate = this.singlePath;
            applyEditorOutline(this.area, editor);
        };

        this.initPromise = initTinyMCE({
            target: this.area,
            inline: true,
            singleTemplate: this.singlePath,
            styles: this.styles,
            additionalConfig: {
                toolbar_mode: 'wrap',
                setup: (editor) => {
                    setupEditor(editor);
                    if (typeof editor.on === 'function') {
                        editor.on('init', () => setupEditor(editor));
                    }
                },
                init_instance_callback: setupEditor
            }
        }).catch((error) => {
            console.warn(error);
            return null;
        });
    }

    /**
     * Save.
     *
     * @public
     * @param {boolean} [async=true] - Defines whether the request be asynchronous or not.
     * @param {function} [onSuccess=undefined] - User defined function that is called after success saving
     */
    save(async = true, onSuccess) {
        if (!this.editor || !this.editor.isDirty || !this.editor.isDirty()) {
            return;
        }

        if (!async) {
            showLoader();
        }

        const params = {
            data: this.editor.getContent({ format: 'html' }),
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
                if (typeof this.editor.setDirty === 'function') {
                    this.editor.setDirty(false);
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
