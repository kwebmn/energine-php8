import Energine, { showLoader, hideLoader } from './Energine.js';
import RichTextEditor from './RichTextEditor.js';
import ModalBox from './ModalBox.js';

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
        const customStyles = PageEditor.getCustomStyles();

        document.querySelectorAll('.' + this.editorClassName).forEach(element => {
            this.editors.push(new BlockEditor(element, { customStyles }));
        });

        window.nrgPageEditor = this;
    }

    static getCustomStyles() {
        const styles = [];
        if (globalScope && globalScope.wysiwyg_styles) {
            Object.values(globalScope.wysiwyg_styles).forEach(style => {
                styles.push({
                    caption: style['caption'],
                    element: style['element'],
                    class: style['class'],
                    attributes: style['attributes'] || {},
                });
            });
        }
        return styles;
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
     * @param {{ customStyles?: Array }} [options]
     */
    constructor(area, options = {}) {
        /**
         * Area element.
         * @type {HTMLElement}
         */
        this.area = area;

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

        this.container = document.createElement('div');
        this.container.className = 'rich-text-editor rich-text-editor--inline';
        this.area.parentNode.insertBefore(this.container, this.area);
        this.container.appendChild(this.area);

        this.editor = new RichTextEditor({
            container: this.container,
            editableElement: this.area,
            content: this.area.innerHTML,
            customStyles: options.customStyles || [],
            singleTemplate: this.singlePath,
            openImagePicker: this.handleInsertImage.bind(this),
            openFilePicker: this.handleInsertFile.bind(this),
            openVideoPicker: this.handleInsertVideo.bind(this),
            onUpdate: () => {
                this._isDirty = true;
            },
        });

        applyEditorOutline(this.area, this.editor);
        this._isDirty = false;
        this.editor.resetDirty();

        /**
         * Overlay.
         * @type {Overlay}
         */
        //this.overlay = new Overlay();

        // События редактора (закомментировано, как в оригинале)
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
        if (this.editor && this.editor.isDirty()) {
            if (!async) {
                showLoader();
            }

            // Формируем объект данных для Energine.request
            const params = {
                data: this.editor.getHTML(),
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
                    this.editor.resetDirty && this.editor.resetDirty();
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

    restorePanelZIndex(original) {
        if (this.container) {
            this.container.style.zIndex = original || '';
        }
    }

    handleInsertImage(editorInstance) {
        const panel = this.container;
        const originalZIndex = panel.style.zIndex;
        panel.style.zIndex = '1';

        ModalBox.open({
            url: (this.singlePath || '') + 'file-library/',
            onClose: (imageData) => {
                if (!imageData) {
                    this.restorePanelZIndex(originalZIndex);
                    return;
                }

                ModalBox.open({
                    url: (this.singlePath || '') + 'imagemanager',
                    extraData: imageData,
                    onClose: (image) => {
                        this.restorePanelZIndex(originalZIndex);
                        if (!image) {
                            return;
                        }

                        let src = image.filename;
                        if (src && !src.match(/^https?:\/\//i)) {
                            src = Energine.media + src;
                        }

                        const attrs = [];
                        if (image.width) attrs.push(`width="${image.width}"`);
                        if (image.height) attrs.push(`height="${image.height}"`);
                        if (image.align) attrs.push(`align="${image.align}"`);
                        if (image.alt) attrs.push(`alt="${image.alt}"`);
                        attrs.push('border="0"');

                        let style = '';
                        ['margin-left', 'margin-right', 'margin-top', 'margin-bottom'].forEach(prop => {
                            if (image[prop] && Number(image[prop]) !== 0) {
                                style += `${prop}:${image[prop]}px;`;
                            }
                        });

                        const styleAttr = style ? ` style="${style}"` : '';
                        const html = `<img src="${src}" ${attrs.join(' ')}${styleAttr} />`;
                        editorInstance.insertHTML(html);
                    },
                });
            },
        });
    }

    handleInsertFile(editorInstance) {
        const panel = this.container;
        const originalZIndex = panel.style.zIndex;
        panel.style.zIndex = '1';

        ModalBox.open({
            url: (this.singlePath || '') + 'file-library',
            onClose: (data) => {
                this.restorePanelZIndex(originalZIndex);
                if (!data) {
                    return;
                }

                let filename = data['upl_path'];
                if (filename && !filename.match(/^https?:\/\//i)) {
                    filename = Energine.media + filename;
                }

                const editor = editorInstance.getEditor();
                if (!editor) {
                    return;
                }

                const { empty } = editor.state.selection;
                if (empty) {
                    const title = data['upl_title'] || filename;
                    editor.chain().focus().insertContent(`<a href="${filename}">${title}</a>`).run();
                } else {
                    editor.chain().focus().extendMarkRange('link').setLink({ href: filename }).run();
                }
            },
        });
    }

    handleInsertVideo(editorInstance) {
        const panel = this.container;
        const originalZIndex = panel.style.zIndex;
        panel.style.zIndex = '1';

        ModalBox.open({
            url: (this.singlePath || '') + 'file-library/',
            onClose: (fileInfo) => {
                if (!fileInfo) {
                    this.restorePanelZIndex(originalZIndex);
                    return;
                }

                if (fileInfo['upl_internal_type'] !== 'video') {
                    alert(Energine.translations.get('TXT_ERROR_NOT_VIDEO_FILE'));
                    this.restorePanelZIndex(originalZIndex);
                    return;
                }

                ModalBox.open({
                    url: (this.singlePath || '') + `file-library/${fileInfo['upl_id']}/put-video/`,
                    onClose: (player) => {
                        this.restorePanelZIndex(originalZIndex);
                        if (!player) {
                            return;
                        }

                        const iframe = `<iframe src="${Energine.base}single/pageToolBar/embed-player/${fileInfo['upl_id']}/" width="${player.width}" height="${player.height}" frameborder="0"></iframe>`;
                        editorInstance.insertHTML(iframe);
                    },
                });
            },
        });
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
