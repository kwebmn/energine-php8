const globalScope = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined);

const FONT_FAMILIES = [
    { label: 'По умолчанию', value: 'inherit' },
    { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
    { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
    { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
];

const FONT_SIZES = [
    { label: '10px', value: '1' },
    { label: '12px', value: '2' },
    { label: '14px', value: '3' },
    { label: '16px', value: '4' },
    { label: '18px', value: '5' },
    { label: '24px', value: '6' },
    { label: '32px', value: '7' },
];

const FORMAT_BLOCKS = [
    { label: 'Абзац', value: 'P' },
    { label: 'Заголовок 1', value: 'H1' },
    { label: 'Заголовок 2', value: 'H2' },
    { label: 'Заголовок 3', value: 'H3' },
    { label: 'Заголовок 4', value: 'H4' },
    { label: 'Заголовок 5', value: 'H5' },
    { label: 'Заголовок 6', value: 'H6' },
    { label: 'Цитата', value: 'BLOCKQUOTE' },
    { label: 'Код', value: 'PRE' },
];

function createElement(tag, className, attributes = {}) {
    const element = document.createElement(tag);
    if (className) {
        element.className = className;
    }
    Object.entries(attributes).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            element.setAttribute(key, value);
        }
    });
    return element;
}

function normalizeTarget(target) {
    if (!target) {
        return null;
    }
    if (typeof target === 'string') {
        return document.getElementById(target) || document.querySelector(target);
    }
    return target;
}

function wrapElement(element, wrapper) {
    if (!element || !element.parentNode) {
        return;
    }
    element.parentNode.insertBefore(wrapper, element);
    wrapper.appendChild(element);
}

function execCommand(command, value = null) {
    const selection = document.getSelection();
    if (!selection || selection.rangeCount === 0) {
        return document.execCommand(command, false, value);
    }
    return document.execCommand(command, false, value);
}

class SunEditorInstance {
    constructor(target, options = {}) {
        this.options = options;
        this.originElement = normalizeTarget(target);
        if (!this.originElement) {
            throw new Error('SunEditor: target element not found');
        }

        this.mode = options.mode || (this.originElement.tagName === 'TEXTAREA' ? 'classic' : 'classic');
        this.editable = null;
        this.toolbar = null;
        this.wrapper = null;
        this.codeTextarea = null;
        this.isCodeView = false;
        this.isFullScreen = false;
        this.isShowBlocks = false;

        this.init();
    }

    init() {
        if (this.mode === 'inline') {
            this.initInlineMode();
        } else {
            this.initClassicMode();
        }
        this.buildToolbar();
        this.applyMinHeight();
        this.registerEvents();
    }

    initClassicMode() {
        this.wrapper = createElement('div', 'se-wrapper');
        this.toolbar = createElement('div', 'se-toolbar');
        this.editable = createElement('div', 'se-editor-area', { contenteditable: 'true' });
        this.editable.innerHTML = this.originElement.value || '';

        this.wrapper.appendChild(this.toolbar);
        this.wrapper.appendChild(this.editable);

        this.originElement.classList.add('se-hidden');
        this.originElement.setAttribute('aria-hidden', 'true');
        this.originElement.after(this.wrapper);

        this.core = {
            context: {
                element: {
                    originElement: this.originElement,
                    wysiwyg: this.editable,
                    editorArea: this.editable,
                },
                tool: {
                    bar: this.toolbar,
                    toolbar: this.toolbar,
                    element: this.toolbar,
                },
            },
        };
        this.context = this.core.context;
    }

    initInlineMode() {
        this.wrapper = createElement('div', 'se-wrapper se-wrapper-inline');
        this.toolbar = createElement('div', 'se-toolbar');

        wrapElement(this.originElement, this.wrapper);
        this.wrapper.insertBefore(this.toolbar, this.originElement);

        this.originElement.contentEditable = 'true';
        this.originElement.classList.add('se-editor-area');
        this.editable = this.originElement;

        this.core = {
            context: {
                element: {
                    originElement: this.originElement,
                    wysiwyg: this.editable,
                    editorArea: this.editable,
                },
                tool: {
                    bar: this.toolbar,
                    toolbar: this.toolbar,
                    element: this.toolbar,
                },
            },
        };
        this.context = this.core.context;
    }

    applyMinHeight() {
        if (!this.editable) {
            return;
        }
        const minHeight = Number(this.options.minHeight);
        if (!Number.isNaN(minHeight) && minHeight > 0) {
            this.editable.style.minHeight = `${minHeight}px`;
        }
    }

    registerEvents() {
        if (!this.editable) {
            return;
        }
        this.editable.addEventListener('input', () => {
            if (this.mode !== 'inline') {
                this.originElement.value = this.getContents();
            }
        });
    }

    buildToolbar() {
        if (!this.toolbar) {
            return;
        }

        this.toolbar.innerHTML = '';
        const buttonGroups = Array.isArray(this.options.buttonList) ? this.options.buttonList : [];
        buttonGroups.forEach((group, index) => {
            const commands = Array.isArray(group) ? group : [group];
            const groupName = this.resolveGroupName(commands, index);
            const groupElement = createElement('div', 'se-btn-group', { 'data-command-group': groupName });

            commands.forEach((command) => {
                if (!command) {
                    return;
                }
                const controls = this.createControl(command);
                const controlList = Array.isArray(controls) ? controls : [controls];
                controlList.filter(Boolean).forEach((control) => {
                    groupElement.appendChild(control);
                });
            });

            if (groupElement.childNodes.length > 0) {
                this.toolbar.appendChild(groupElement);
            }
        });
    }

    resolveGroupName(commands, index) {
        if (!commands || commands.length === 0) {
            return `group-${index}`;
        }
        const set = new Set(commands);
        if (['undo', 'redo'].some((cmd) => set.has(cmd))) {
            return 'history';
        }
        if (['font', 'fontSize', 'formatBlock'].some((cmd) => set.has(cmd))) {
            return 'font';
        }
        if (['bold', 'underline', 'italic', 'strike', 'removeFormat'].some((cmd) => set.has(cmd))) {
            return 'style';
        }
        if (['fontColor', 'hiliteColor'].some((cmd) => set.has(cmd))) {
            return 'color';
        }
        if (['list', 'align', 'outdent', 'indent'].some((cmd) => set.has(cmd))) {
            return 'paragraph';
        }
        if (['link', 'table', 'image', 'video'].some((cmd) => set.has(cmd))) {
            return 'insert';
        }
        if (['showBlocks', 'codeView', 'fullScreen'].some((cmd) => set.has(cmd))) {
            return 'view';
        }
        return commands[0];
    }

    createControl(command) {
        switch (command) {
            case 'undo':
                return this.createButton(command, '<i class="fa-solid fa-rotate-left"></i>', 'Отменить', () => this.exec('undo'));
            case 'redo':
                return this.createButton(command, '<i class="fa-solid fa-rotate-right"></i>', 'Повторить', () => this.exec('redo'));
            case 'bold':
                return this.createButton(command, '<i class="fa-solid fa-bold"></i>', 'Полужирный', () => this.exec('bold'));
            case 'underline':
                return this.createButton(command, '<i class="fa-solid fa-underline"></i>', 'Подчеркнутый', () => this.exec('underline'));
            case 'italic':
                return this.createButton(command, '<i class="fa-solid fa-italic"></i>', 'Курсив', () => this.exec('italic'));
            case 'strike':
                return this.createButton(command, '<i class="fa-solid fa-strikethrough"></i>', 'Зачеркнутый', () => this.exec('strikeThrough'));
            case 'removeFormat':
                return this.createButton(command, '<i class="fa-solid fa-eraser"></i>', 'Очистить форматирование', () => this.exec('removeFormat'));
            case 'outdent':
                return this.createButton(command, '<i class="fa-solid fa-outdent"></i>', 'Уменьшить отступ', () => this.exec('outdent'));
            case 'indent':
                return this.createButton(command, '<i class="fa-solid fa-indent"></i>', 'Увеличить отступ', () => this.exec('indent'));
            case 'link':
                return this.createButton(command, '<i class="fa-solid fa-link"></i>', 'Ссылка', () => this.handleLink());
            case 'table':
                return this.createButton(command, '<i class="fa-solid fa-table"></i>', 'Таблица', () => this.handleTable());
            case 'image':
                return this.createButton(command, '<i class="fa-solid fa-image"></i>', 'Изображение', () => this.handleImage());
            case 'video':
                return this.createButton(command, '<i class="fa-solid fa-film"></i>', 'Видео', () => this.handleVideo());
            case 'showBlocks':
                return this.createToggleButton(command, '<i class="fa-solid fa-border-all"></i>', 'Границы блоков', () => this.toggleShowBlocks());
            case 'codeView':
                return this.createToggleButton(command, '<i class="fa-solid fa-code"></i>', 'Режим кода', () => this.toggleCodeView());
            case 'fullScreen':
                return this.createToggleButton(command, '<i class="fa-solid fa-maximize"></i>', 'Во весь экран', () => this.toggleFullScreen());
            case 'font':
                return this.createFontFamilySelect();
            case 'fontSize':
                return this.createFontSizeSelect();
            case 'formatBlock':
                return this.createFormatBlockSelect();
            case 'fontColor':
                return this.createColorPicker(command, 'Цвет текста', (value) => this.exec('foreColor', value));
            case 'hiliteColor':
                return this.createColorPicker(command, 'Цвет фона', (value) => this.exec('hiliteColor', value));
            case 'list':
                return [
                    this.createButton('insertUnorderedList', '<i class="fa-solid fa-list-ul"></i>', 'Маркированный список', () => this.exec('insertUnorderedList')),
                    this.createButton('insertOrderedList', '<i class="fa-solid fa-list-ol"></i>', 'Нумерованный список', () => this.exec('insertOrderedList')),
                ];
            case 'align':
                return [
                    this.createButton('justifyLeft', '<i class="fa-solid fa-align-left"></i>', 'По левому краю', () => this.exec('justifyLeft')),
                    this.createButton('justifyCenter', '<i class="fa-solid fa-align-center"></i>', 'По центру', () => this.exec('justifyCenter')),
                    this.createButton('justifyRight', '<i class="fa-solid fa-align-right"></i>', 'По правому краю', () => this.exec('justifyRight')),
                    this.createButton('justifyFull', '<i class="fa-solid fa-align-justify"></i>', 'По ширине', () => this.exec('justifyFull')),
                ];
            default:
                return null;
        }
    }

    createButton(command, innerHTML, title, handler) {
        const button = createElement('button', 'se-btn se-tooltip', {
            type: 'button',
            'data-command': command,
            'data-tooltip': title || '',
        });
        button.innerHTML = innerHTML;
        button.title = title || '';
        button.addEventListener('click', (event) => {
            event.preventDefault();
            this.focus();
            handler();
        });
        return button;
    }

    createToggleButton(command, innerHTML, title, handler) {
        const button = this.createButton(command, innerHTML, title, () => {
            handler();
            button.classList.toggle('se-active', this.isCommandActive(command));
        });
        return button;
    }

    isCommandActive(command) {
        switch (command) {
            case 'codeView':
                return this.isCodeView;
            case 'fullScreen':
                return this.isFullScreen;
            case 'showBlocks':
                return this.isShowBlocks;
            default:
                return false;
        }
    }

    createFontFamilySelect() {
        const select = createElement('select', 'se-select', { title: 'Шрифт' });
        const defaultOption = createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Шрифт';
        select.appendChild(defaultOption);

        FONT_FAMILIES.forEach(({ label, value }) => {
            const option = createElement('option');
            option.value = value;
            option.textContent = label;
            select.appendChild(option);
        });

        select.addEventListener('change', () => {
            if (!select.value) {
                return;
            }
            this.focus();
            this.exec('fontName', select.value);
            select.value = '';
        });

        return select;
    }

    createFontSizeSelect() {
        const select = createElement('select', 'se-select', { title: 'Размер шрифта' });
        const defaultOption = createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Размер';
        select.appendChild(defaultOption);

        FONT_SIZES.forEach(({ label, value }) => {
            const option = createElement('option');
            option.value = value;
            option.textContent = label;
            select.appendChild(option);
        });

        select.addEventListener('change', () => {
            if (!select.value) {
                return;
            }
            this.focus();
            this.exec('fontSize', select.value);
            select.value = '';
        });

        return select;
    }

    createFormatBlockSelect() {
        const select = createElement('select', 'se-select', { title: 'Формат' });
        const defaultOption = createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Формат';
        select.appendChild(defaultOption);

        FORMAT_BLOCKS.forEach(({ label, value }) => {
            const option = createElement('option');
            option.value = value;
            option.textContent = label;
            select.appendChild(option);
        });

        select.addEventListener('change', () => {
            if (!select.value) {
                return;
            }
            this.focus();
            this.exec('formatBlock', `<${select.value}>`);
            select.value = '';
        });

        return select;
    }

    createColorPicker(command, title, handler) {
        const input = createElement('input', '', { type: 'color', title });
        input.value = '#000000';
        input.addEventListener('change', () => {
            this.focus();
            handler(input.value);
        });
        return input;
    }

    handleLink() {
        const url = globalScope?.prompt ? globalScope.prompt('Введите URL ссылки', 'https://') : '';
        if (!url) {
            return;
        }
        this.exec('createLink', url);
    }

    handleTable() {
        const rows = parseInt(globalScope?.prompt ? globalScope.prompt('Количество строк', '2') : '0', 10);
        const cols = parseInt(globalScope?.prompt ? globalScope.prompt('Количество столбцов', '2') : '0', 10);
        if (!rows || !cols) {
            return;
        }
        let html = '<table border="1" style="border-collapse:collapse;width:100%">';
        for (let r = 0; r < rows; r += 1) {
            html += '<tr>';
            for (let c = 0; c < cols; c += 1) {
                html += '<td>&nbsp;</td>';
            }
            html += '</tr>';
        }
        html += '</table>';
        this.insertHTML(html);
    }

    handleImage() {
        const url = globalScope?.prompt ? globalScope.prompt('URL изображения', 'https://') : '';
        if (!url) {
            return;
        }
        const html = `<img src="${url}" alt="" />`;
        this.insertHTML(html);
    }

    handleVideo() {
        const url = globalScope?.prompt ? globalScope.prompt('URL видео или embed код', '') : '';
        if (!url) {
            return;
        }
        if (url.trim().startsWith('<')) {
            this.insertHTML(url);
            return;
        }
        const html = `<iframe src="${url}" frameborder="0" allowfullscreen style="width:100%;min-height:240px"></iframe>`;
        this.insertHTML(html);
    }

    toggleShowBlocks() {
        this.isShowBlocks = !this.isShowBlocks;
        if (this.isShowBlocks) {
            this.editable.classList.add('se-show-blocks');
        } else {
            this.editable.classList.remove('se-show-blocks');
        }
    }

    toggleCodeView() {
        this.isCodeView = !this.isCodeView;
        if (this.isCodeView) {
            if (!this.codeTextarea) {
                this.codeTextarea = createElement('textarea', 'se-code-view');
                this.codeTextarea.value = this.editable.innerHTML;
                this.editable.classList.add('se-hidden');
                this.editable.after(this.codeTextarea);
            } else {
                this.codeTextarea.value = this.editable.innerHTML;
                this.codeTextarea.classList.remove('se-hidden');
            }
        } else {
            if (this.codeTextarea) {
                this.editable.innerHTML = this.codeTextarea.value;
                this.codeTextarea.classList.add('se-hidden');
            }
            this.editable.classList.remove('se-hidden');
        }
    }

    toggleFullScreen() {
        this.isFullScreen = !this.isFullScreen;
        if (!this.wrapper) {
            return;
        }
        if (this.isFullScreen) {
            this.wrapper.classList.add('se-fullscreen');
        } else {
            this.wrapper.classList.remove('se-fullscreen');
        }
    }

    exec(command, value = null) {
        if (this.isCodeView && this.codeTextarea) {
            // basic commands disabled in code view
            return;
        }
        switch (command) {
            case 'formatBlock':
                execCommand('formatBlock', value);
                break;
            case 'hiliteColor':
                if (!execCommand('hiliteColor', value)) {
                    execCommand('backColor', value);
                }
                break;
            default:
                execCommand(command, value);
                break;
        }
    }

    focus() {
        if (this.isCodeView && this.codeTextarea) {
            this.codeTextarea.focus();
            return;
        }
        if (this.editable) {
            this.editable.focus({ preventScroll: false });
        }
    }

    insertHTML(html) {
        if (!html) {
            return;
        }
        if (this.isCodeView && this.codeTextarea) {
            const start = this.codeTextarea.selectionStart || 0;
            const end = this.codeTextarea.selectionEnd || 0;
            const value = this.codeTextarea.value;
            this.codeTextarea.value = `${value.slice(0, start)}${html}${value.slice(end)}`;
            this.codeTextarea.selectionStart = start + html.length;
            this.codeTextarea.selectionEnd = start + html.length;
            return;
        }
        this.focus();
        execCommand('insertHTML', html);
    }

    getSelectedText() {
        if (this.isCodeView && this.codeTextarea) {
            const start = this.codeTextarea.selectionStart || 0;
            const end = this.codeTextarea.selectionEnd || 0;
            return this.codeTextarea.value.slice(start, end);
        }
        const selection = document.getSelection();
        return selection ? selection.toString() : '';
    }

    getContents() {
        if (this.isCodeView && this.codeTextarea) {
            return this.codeTextarea.value;
        }
        return this.editable ? this.editable.innerHTML : '';
    }

    setContents(html) {
        if (this.isCodeView && this.codeTextarea) {
            this.codeTextarea.value = html;
        }
        if (this.editable) {
            this.editable.innerHTML = html;
        }
    }
}

const SunEditor = {
    create(target, options) {
        return new SunEditorInstance(target, options || {});
    },
};

if (globalScope) {
    globalScope.SUNEDITOR = SunEditor;
}

export default SunEditor;
