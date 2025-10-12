import Energine, { showLoader, hideLoader } from './Energine.js';
import { createEnergineSunEditor, isEditorDirty, markEditorClean } from './suneditorIntegration.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);


function applyEditorOutline(area, editor) {
    if (!area) {
        return;
    }
    area.style.outline = '1px dashed #f00';
    area.style.outlineOffset = '2px';
    if (editor) {
        const previousFocus = editor.onFocus;
        editor.onFocus = (event, core) => {
            area.style.outline = '2px dashed #0d0';
            area.style.outlineOffset = '2px';
            if (typeof previousFocus === 'function') {
                previousFocus(event, core);
            }
        };

        const previousBlur = editor.onBlur;
        editor.onBlur = (event, core) => {
            area.style.outline = '1px dashed #f00';
            area.style.outlineOffset = '2px';
            if (typeof previousBlur === 'function') {
                previousBlur(event, core);
            }
        };
    }
}

class PageEditor {
    editorClassName = 'nrgnEditor';
    editors = [];

    constructor() {
        document.querySelectorAll('.' + this.editorClassName).forEach(element => {
            this.editors.push(new PageEditor.BlockEditor(element));
        });

        window.nrgPageEditor = this;
    }

    // --------- Вложенный BlockEditor ---------
    static BlockEditor = class {
        constructor(area) {
            this.area = area;
            area.setAttribute('contenteditable', true);
            this.isActive = false;
            this.singlePath = area.getAttribute('single_template');
            this.ID = area.getAttribute('eID') || '';
            this.num = area.getAttribute('num') || '';
        this.editor = createEnergineSunEditor(area, {
            singleTemplate: this.singlePath,
            mode: 'inline',
            minHeight: Math.max(area.offsetHeight || 0, 100),
            height: 'auto',
            resizingBar: false,
        });
        applyEditorOutline(this.area, this.editor);
        markEditorClean(this.editor);
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
            if (isEditorDirty(this.editor)) {
                if (!async) showLoader();

                let data = 'data=' + encodeURIComponent(this.editor.getContents(true));
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
                        markEditorClean(this.editor);
                    })
                    .catch(error => console.error(error))
                    .finally(() => {
                        if (!async) hideLoader();
                    });
            }
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
        this.singlePath = this.area.getAttribute('single_template');

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
         */
        this.editor = createEnergineSunEditor(this.area, {
            singleTemplate: this.singlePath,
            mode: 'inline',
            minHeight: Math.max(this.area.offsetHeight || 0, 100),
            height: 'auto',
            resizingBar: false,
        });
        applyEditorOutline(this.area, this.editor);
        markEditorClean(this.editor);

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
        if (isEditorDirty(this.editor)) {
            if (!async) {
                showLoader();
            }

            // Формируем объект данных для Energine.request
            const params = {
                data: this.editor.getContents(true),
            };
            if (this.ID) {
                params.ID = this.ID;
            }
            if (this.num) {
                params.num = this.num;
            }

            // Вызов Energine.request
            Energine.request(
                this.singlePath + 'save-text',
                params,
                (response) => {
                    // onSuccess как в оригинале
                    if (onSuccess) onSuccess.call(this, response);
                    markEditorClean(this.editor);
                    if (!async) {
                        hideLoader();
                    }
                },
                // onUserError
                () => {
                    if (!async) {
                        hideLoader();
                    }
                },
                // onServerError
                () => {
                    if (!async) {
                        hideLoader();
                    }
                }
            );
        }
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
;
