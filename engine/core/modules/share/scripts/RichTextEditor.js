import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';

import '../stylesheets/rich-text-editor.css';

const ALIGN_OPTIONS = ['left', 'center', 'right', 'justify'];

const isBlockElement = (tagName) => {
    return ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes((tagName || '').toLowerCase());
};

class RichTextEditor {
    constructor(options) {
        const {
            container,
            editableElement = null,
            content = null,
            placeholder = '',
            editable = true,
            onUpdate = null,
            customStyles = [],
            singleTemplate = '',
            openImagePicker = null,
            openFilePicker = null,
            openVideoPicker = null,
        } = options || {};

        if (!container) {
            throw new Error('RichTextEditor requires a container element.');
        }

        this.container = container;
        this.container.classList.add('rich-text-editor');

        this.customStyles = Array.isArray(customStyles) ? customStyles : [];
        this.openImagePicker = openImagePicker;
        this.openFilePicker = openFilePicker;
        this.openVideoPicker = openVideoPicker;
        this.singleTemplate = singleTemplate;

        this.toolbarControls = [];

        this.toolbarElement = this.createToolbar();

        if (editableElement) {
            this.contentElement = editableElement;
            this.contentElement.classList.add('rich-text-editor__content');
        } else {
            this.contentElement = document.createElement('div');
            this.contentElement.className = 'rich-text-editor__content';
            this.container.appendChild(this.contentElement);
        }

        const resolvedContent = content !== null && content !== undefined
            ? content
            : this.contentElement.innerHTML;

        this.editor = new Editor({
            element: this.contentElement,
            editable,
            extensions: [
                StarterKit.configure({
                    heading: {
                        levels: [1, 2, 3, 4, 5, 6],
                    },
                }),
                Link.configure({
                    openOnClick: false,
                    autolink: true,
                }),
                Underline,
                TextStyle,
                Color,
                Highlight.configure({ multicolor: true }),
                TextAlign.configure({
                    types: ['heading', 'paragraph'],
                }),
                Image,
                Placeholder.configure({
                    placeholder,
                }),
            ],
            content: resolvedContent,
            onUpdate: ({ editor }) => {
                this._isDirty = true;
                this.updateToolbarState(editor);
                if (onUpdate) {
                    onUpdate(editor);
                }
            },
            onSelectionUpdate: ({ editor }) => {
                this.updateToolbarState(editor);
            },
        });

        this._isDirty = false;
        this.initialHTML = this.getHTML();

        this.updateToolbarState(this.editor);
    }

    getHTML() {
        return this.editor?.getHTML?.() ?? '';
    }

    setHTML(html) {
        if (!this.editor) {
            return;
        }
        this.editor.commands.setContent(html, false);
        this.initialHTML = this.getHTML();
        this._isDirty = false;
        this.updateToolbarState(this.editor);
    }

    insertHTML(html) {
        if (!this.editor) {
            return;
        }
        this.editor.chain().focus().insertContent(html).run();
    }

    isDirty() {
        if (!this.editor) {
            return false;
        }
        return this._isDirty || this.getHTML() !== this.initialHTML;
    }

    resetDirty() {
        this._isDirty = false;
        this.initialHTML = this.getHTML();
    }

    focus() {
        this.editor?.commands.focus?.();
    }

    on(event, callback) {
        if (!this.editor) {
            return () => {};
        }
        return this.editor.on(event, callback);
    }

    destroy() {
        if (this.editor) {
            this.editor.destroy();
            this.editor = null;
        }
    }

    getEditor() {
        return this.editor;
    }

    getContainer() {
        return this.container;
    }

    createToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'rich-text-editor__toolbar';
        this.container.prepend(toolbar);

        const addGroup = () => {
            const group = document.createElement('div');
            group.className = 'rich-text-editor__toolbar-group';
            toolbar.appendChild(group);
            return group;
        };

        const registerControl = (element, updater = null) => {
            this.toolbarControls.push({ element, updater });
        };

        const createButton = (group, iconClass, title, action, isActive = null, isEnabled = null) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'rich-text-editor__button';
            button.title = title;
            button.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
            button.addEventListener('mousedown', (event) => event.preventDefault());
            button.addEventListener('click', (event) => {
                event.preventDefault();
                if (!this.editor) return;
                if (isEnabled && !isEnabled(this.editor)) {
                    return;
                }
                action(this.editor);
                this.updateToolbarState(this.editor);
            });
            group.appendChild(button);

            registerControl(button, (editor) => {
                if (!button) return;
                if (isEnabled) {
                    const enabled = isEnabled(editor);
                    button.disabled = !enabled;
                }
                if (isActive) {
                    button.classList.toggle('is-active', !!isActive(editor));
                }
            });
        };

        const historyGroup = addGroup();
        createButton(historyGroup, 'fa-rotate-left', 'Отменить', (editor) => editor.chain().focus().undo().run(), null, (editor) => editor.can().undo());
        createButton(historyGroup, 'fa-rotate-right', 'Повторить', (editor) => editor.chain().focus().redo().run(), null, (editor) => editor.can().redo());

        const blockGroup = addGroup();
        const headingSelect = document.createElement('select');
        headingSelect.className = 'rich-text-editor__select';
        headingSelect.innerHTML = `
            <option value="paragraph">Параграф</option>
            <option value="heading-1">Заголовок 1</option>
            <option value="heading-2">Заголовок 2</option>
            <option value="heading-3">Заголовок 3</option>
            <option value="heading-4">Заголовок 4</option>
            <option value="heading-5">Заголовок 5</option>
            <option value="heading-6">Заголовок 6</option>
        `;
        headingSelect.addEventListener('change', (event) => {
            if (!this.editor) return;
            const value = event.target.value;
            if (value === 'paragraph') {
                this.editor.chain().focus().setParagraph().run();
            } else if (value.startsWith('heading-')) {
                const level = Number(value.split('-')[1]);
                this.editor.chain().focus().toggleHeading({ level }).run();
            }
            this.updateToolbarState(this.editor);
        });
        blockGroup.appendChild(headingSelect);
        registerControl(headingSelect, (editor) => {
            if (editor.isActive('heading', { level: 1 })) headingSelect.value = 'heading-1';
            else if (editor.isActive('heading', { level: 2 })) headingSelect.value = 'heading-2';
            else if (editor.isActive('heading', { level: 3 })) headingSelect.value = 'heading-3';
            else if (editor.isActive('heading', { level: 4 })) headingSelect.value = 'heading-4';
            else if (editor.isActive('heading', { level: 5 })) headingSelect.value = 'heading-5';
            else if (editor.isActive('heading', { level: 6 })) headingSelect.value = 'heading-6';
            else headingSelect.value = 'paragraph';
        });

        if (this.customStyles.length) {
            const styleSelect = document.createElement('select');
            styleSelect.className = 'rich-text-editor__select';
            styleSelect.innerHTML = '<option value="">Стиль</option>' + this.customStyles
                .map((style, index) => `<option value="${index}">${style.caption || style.name || style.class || 'Стиль ' + (index + 1)}</option>`)
                .join('');
            styleSelect.addEventListener('change', (event) => {
                const value = event.target.value;
                if (!this.editor || value === '') {
                    return;
                }
                const style = this.customStyles[Number(value)];
                if (!style) {
                    return;
                }
                this.applyCustomStyle(style);
                styleSelect.value = '';
            });
            blockGroup.appendChild(styleSelect);
        }

        const marksGroup = addGroup();
        createButton(marksGroup, 'fa-bold', 'Полужирный', (editor) => editor.chain().focus().toggleBold().run(), (editor) => editor.isActive('bold'), (editor) => editor.can().toggleBold());
        createButton(marksGroup, 'fa-italic', 'Курсив', (editor) => editor.chain().focus().toggleItalic().run(), (editor) => editor.isActive('italic'), (editor) => editor.can().toggleItalic());
        createButton(marksGroup, 'fa-underline', 'Подчёркивание', (editor) => editor.chain().focus().toggleUnderline().run(), (editor) => editor.isActive('underline'));
        createButton(marksGroup, 'fa-strikethrough', 'Зачёркивание', (editor) => editor.chain().focus().toggleStrike().run(), (editor) => editor.isActive('strike'));
        createButton(marksGroup, 'fa-highlighter', 'Маркер', (editor) => editor.chain().focus().toggleHighlight().run(), (editor) => editor.isActive('highlight'));

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.className = 'rich-text-editor__color-input';
        colorInput.title = 'Цвет текста';
        colorInput.addEventListener('input', (event) => {
            if (!this.editor) return;
            const value = event.target.value;
            this.editor.chain().focus().setColor(value).run();
        });
        marksGroup.appendChild(colorInput);
        registerControl(colorInput, (editor) => {
            const color = editor.getAttributes('textStyle')?.color;
            if (color) {
                colorInput.value = color;
            }
        });

        createButton(marksGroup, 'fa-eraser', 'Очистить форматирование', (editor) => {
            editor.chain().focus().unsetAllMarks().clearNodes().run();
        });

        const listGroup = addGroup();
        createButton(listGroup, 'fa-list-ul', 'Маркированный список', (editor) => editor.chain().focus().toggleBulletList().run(), (editor) => editor.isActive('bulletList'));
        createButton(listGroup, 'fa-list-ol', 'Нумерованный список', (editor) => editor.chain().focus().toggleOrderedList().run(), (editor) => editor.isActive('orderedList'));
        createButton(listGroup, 'fa-quote-left', 'Цитата', (editor) => editor.chain().focus().toggleBlockquote().run(), (editor) => editor.isActive('blockquote'));

        const alignGroup = addGroup();
        ALIGN_OPTIONS.forEach((align) => {
            const iconMap = {
                left: 'fa-align-left',
                center: 'fa-align-center',
                right: 'fa-align-right',
                justify: 'fa-align-justify',
            };
            const titles = {
                left: 'Выровнять по левому краю',
                center: 'Выровнять по центру',
                right: 'Выровнять по правому краю',
                justify: 'Выровнять по ширине',
            };
            createButton(alignGroup, iconMap[align], titles[align], (editor) => {
                editor.chain().focus().setTextAlign(align).run();
            }, (editor) => editor.isActive({ textAlign: align }));
        });

        const mediaGroup = addGroup();
        createButton(mediaGroup, 'fa-link', 'Ссылка', (editor) => {
            const previous = editor.getAttributes('link').href || '';
            const url = window.prompt('Введите адрес ссылки', previous);
            if (url === null) {
                return;
            }
            if (url === '') {
                editor.chain().focus().extendMarkRange('link').unsetLink().run();
            } else {
                editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
            }
        }, (editor) => editor.isActive('link'));

        if (typeof this.openFilePicker === 'function') {
            createButton(mediaGroup, 'fa-paperclip', 'Вставить файл', () => {
                this.openFilePicker(this);
            });
        }

        if (typeof this.openImagePicker === 'function') {
            createButton(mediaGroup, 'fa-image', 'Вставить изображение', () => {
                this.openImagePicker(this);
            });
        }

        if (typeof this.openVideoPicker === 'function') {
            createButton(mediaGroup, 'fa-video', 'Вставить видео', () => {
                this.openVideoPicker(this);
            });
        }

        return toolbar;
    }

    updateToolbarState(editor) {
        if (!editor || !this.toolbarControls) {
            return;
        }
        this.toolbarControls.forEach(({ updater, element }) => {
            if (typeof updater === 'function') {
                updater(editor, element);
            }
        });
    }

    applyCustomStyle(style) {
        if (!this.editor || !style) {
            return;
        }
        const { element, class: className, attributes = {} } = style;
        const attrs = { ...attributes };
        if (className) {
            attrs.class = className;
        }

        const { from, to } = this.editor.state.selection;
        const selectedContent = this.editor.state.doc.textBetween(from, to, '\n') || '';

        const attrString = Object.entries(attrs)
            .map(([key, value]) => `${key}="${value}"`)
            .join(' ');

        const openingTag = attrString ? `<${element} ${attrString}>` : `<${element}>`;
        const closingTag = `</${element}>`;

        if (isBlockElement(element)) {
            this.editor.chain().focus().insertContentAt({ from, to }, `${openingTag}${selectedContent}</${element}>`).run();
        } else {
            this.editor.chain().focus().insertContentAt({ from, to }, `${openingTag}${selectedContent || '&nbsp;'}</${element}>`).run();
        }
    }
}

export default RichTextEditor;
