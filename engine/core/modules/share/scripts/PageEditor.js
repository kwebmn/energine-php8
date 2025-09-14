ScriptLoader.load('ckeditor/ckeditor', 'ModalBox');

class PageEditor {
    editorClassName = 'nrgnEditor';
    editors = [];

    constructor() {
        PageEditor.loadCSS('stylesheets/pageeditor.css');
        CKEDITOR.config.versionCheck = false;
        CKEDITOR.disableAutoInline = true;
        CKEDITOR.config.extraPlugins = 'sourcedialog,codemirror,energineimage,energinefile';
        CKEDITOR.config.removePlugins = 'exportpdf';
        CKEDITOR.config.allowedContent = true;
        CKEDITOR.config.toolbar = [
            { name: 'document', groups: [ 'mode' ], items: [ 'Sourcedialog' ] },
            { name: 'clipboard', groups: [ 'clipboard', 'undo' ], items: [ 'Cut', 'Copy', 'Paste', 'PasteText', 'PasteFromWord', '-', 'Undo', 'Redo' ] },
            { name: 'editing', groups: [ 'find', 'selection' ], items: [ 'Find', 'Replace', '-', 'SelectAll' ] },
            { name: 'links', items: [ 'Link', 'Unlink', 'Anchor' ] },
            { name: 'insert', items: [ 'Image', 'Flash', 'Table', 'EnergineImage', 'EnergineVideo', 'EnergineFile' ] },
            { name: 'tools', items: [ 'ShowBlocks' ] },
            '/',
            { name: 'basicstyles', groups: [ 'basicstyles', 'cleanup' ], items: [ 'Bold', 'Italic', 'Underline', 'Strike', 'Subscript', 'Superscript', '-', 'RemoveFormat' ] },
            { name: 'paragraph', groups: [ 'list', 'indent', 'align' ], items: [ 'NumberedList', 'BulletedList', '-', 'Outdent', 'Indent', '-', 'JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock' ] },
            { name: 'styles', items: [ 'Styles', 'Format', 'Font', 'FontSize' ] },
            { name: 'colors', items: [ 'TextColor', 'BGColor' ] }
        ];

        // Стили CKEditor
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
        CKEDITOR.stylesSet.add('energine', styles);
        CKEDITOR.config.stylesSet = 'energine';

        // Инициализация редакторов для всех областей
        document.querySelectorAll('.' + this.editorClassName).forEach(element => {
            this.editors.push(new PageEditor.BlockEditor(element));
        });

        window.nrgPageEditor = this;
    }

    static loadCSS(file) {
        if (!document.querySelector(`link[href$="${file}"]`)) {
            const link = document.createElement('link');
            link.rel = "stylesheet";
            link.href = file;
            document.head.appendChild(link);
        }
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
            this.editor = CKEDITOR.inline(area.id);
            this.editor.singleTemplate = this.singlePath;
            this.editor.editorId = area.id;
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
            if (this.editor.checkDirty()) {
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
         * @type {CKEDITOR}
         */
        this.editor = CKEDITOR.inline(this.area.id);
        this.editor.singleTemplate = this.area.getAttribute('single_template');
        this.editor.editorId = this.area.id;

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
        if (this.editor.checkDirty()) {
            if (!async) {
                showLoader();
            }

            // Формируем объект данных для Energine.request
            const params = {
                data: this.editor.getData(),
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
                },
                // async (true по умолчанию, но явно укажем)
                async
            );
        }
    }
}

// Чтобы было как PageEditor.BlockEditor (экспортируйте, если надо)
if (typeof window.PageEditor === 'undefined') {
    window.PageEditor = {};
}
window.PageEditor.BlockEditor = BlockEditor;
;
