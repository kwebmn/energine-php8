import Energine, { showLoader, hideLoader } from './Energine.js';
import TabPane from './TabPane.js';
import Toolbar from './Toolbar.js';
import Validator from './Validator.js';
import ModalBox from './ModalBox.js';
import AcplField from './AcplField.js';
import Cookie from './Cookie.js';
import loadCKEditor from './ckeditor/loader.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

const getCodeMirror = () => globalScope?.CodeMirror;

/**
 * @file Contain the description of the next classes:
 * <ul>
 *     <li>[Form]{@link Form}</li>
 *     <li>[Form.Uploader]{@link Form.Uploader}</li>
 *     <li>[Form.Sked]{@link Form.Sked}</li>
 *     <li>[Form.SmapSelector]{@link Form.SmapSelector}</li>
 *     <li>[Form.AttachmentSelector]{@link Form.AttachmentSelector}</li>
 *     <li>[Form.Label]{@link Form.Label}</li>
 *     <li>[Form.RichEditor]{@link Form.RichEditor}</li>
 * </ul>
 *
 * @requires Energine
 * @requires ckeditor/ckeditor
 * @requires TabPane
 * @requires Toolbar
 * @requires Validator
 * @requires ModalBox
 * @requires Overlay
 * @requires datepicker
*
 * @author Pavel Dubenko
 *
 * @version 1.0.1
 */

class Form {
    // Класс Energine.request как статическое свойство
    static request = Energine.request;

    static previewIconMap = {
        default: 'fa-solid fa-file text-secondary',
        file: 'fa-solid fa-file text-secondary',
        image: 'fa-solid fa-file-image text-info',
        video: 'fa-solid fa-file-video text-info',
        audio: 'fa-solid fa-file-audio text-info',
        zip: 'fa-solid fa-file-zipper text-warning',
        text: 'fa-solid fa-file-lines text-secondary',
        folder: 'fa-solid fa-folder text-warning',
        folderup: 'fa-solid fa-arrow-up text-secondary',
        repo: 'fa-solid fa-database text-primary',
        unknown: 'fa-solid fa-file text-secondary',
        error: 'fa-solid fa-triangle-exclamation text-danger',
        spinner: 'fa-solid fa-spinner fa-spin text-secondary'
    };

    static getPreviewIconKey(type) {
        switch (type) {
            case 'image':
            case 'video':
            case 'audio':
            case 'zip':
            case 'text':
            case 'folder':
            case 'folderup':
            case 'repo':
            case 'unknown':
                return type;
            default:
                return 'file';
        }
    }

    static findPreviewWrapper(previewEl) {
        if (!previewEl) return null;
        if (previewEl.classList && previewEl.classList.contains('file-preview-wrapper')) {
            return previewEl;
        }
        if (typeof previewEl.closest === 'function') {
            return previewEl.closest('.file-preview-wrapper');
        }
        return null;
    }

    static ensurePreviewWrapper(previewEl) {
        if (!previewEl) return null;
        const existing = Form.findPreviewWrapper(previewEl);
        if (existing) {
            return existing;
        }

        const isImage = previewEl.tagName && previewEl.tagName.toLowerCase() === 'img';
        const width = parseInt(previewEl.getAttribute?.('width') || previewEl.width || 64, 10) || 64;
        const height = parseInt(previewEl.getAttribute?.('height') || previewEl.height || 64, 10) || 64;

        if (!isImage) {
            previewEl.classList?.add('file-preview-wrapper', 'd-inline-flex', 'align-items-center', 'justify-content-center', 'border', 'rounded', 'bg-body-tertiary', 'position-relative', 'overflow-hidden');
            previewEl.style.minWidth = previewEl.style.minWidth || `${width}px`;
            previewEl.style.minHeight = previewEl.style.minHeight || `${height}px`;
            previewEl.style.maxWidth = previewEl.style.maxWidth || `${width}px`;
            previewEl.style.maxHeight = previewEl.style.maxHeight || `${height}px`;
            return previewEl;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'file-preview-wrapper d-inline-flex align-items-center justify-content-center border rounded bg-body-tertiary position-relative overflow-hidden';
        wrapper.style.minWidth = `${width}px`;
        wrapper.style.minHeight = `${height}px`;
        wrapper.style.maxWidth = `${width}px`;
        wrapper.style.maxHeight = `${height}px`;

        if (previewEl.parentNode) {
            previewEl.parentNode.insertBefore(wrapper, previewEl);
        }

        wrapper.appendChild(previewEl);
        previewEl.classList?.add('img-fluid');
        previewEl.style.objectFit = previewEl.style.objectFit || 'contain';
        previewEl.style.maxWidth = '100%';
        previewEl.style.maxHeight = '100%';

        return wrapper;
    }

    static getPreviewImage(previewEl) {
        if (!previewEl) return null;
        if (previewEl.tagName && previewEl.tagName.toLowerCase() === 'img') {
            return previewEl;
        }
        return previewEl.querySelector ? previewEl.querySelector('img') : null;
    }

    static showPreviewElement(element) {
        if (!element) return;
        element.classList?.remove('d-none', 'hidden');
        element.removeAttribute?.('hidden');
        element.setAttribute?.('aria-hidden', 'false');
    }

    static hidePreviewElement(element) {
        if (!element) return;
        element.classList?.add('d-none');
        element.setAttribute?.('hidden', 'hidden');
        element.setAttribute?.('aria-hidden', 'true');
    }

    static showIconPreview(previewEl, iconKey = 'file') {
        if (!previewEl) return;
        const wrapper = Form.ensurePreviewWrapper(previewEl) || previewEl;
        const iconClass = Form.previewIconMap[iconKey] || Form.previewIconMap.file;
        let icon = wrapper.querySelector?.('.file-preview-icon') || null;
        if (!icon) {
            icon = document.createElement('i');
            icon.className = 'file-preview-icon fa-2x fa-fw';
            wrapper.appendChild(icon);
        }
        icon.className = `file-preview-icon fa-2x fa-fw ${iconClass}`;
        icon.setAttribute('aria-hidden', 'true');

        const image = Form.getPreviewImage(previewEl);
        if (image) {
            image.removeAttribute('src');
            Form.hidePreviewElement(image);
        }

        Form.showPreviewElement(wrapper);
        if (previewEl !== wrapper) {
            Form.showPreviewElement(previewEl);
        }
    }

    static showSpinner(previewEl) {
        Form.showIconPreview(previewEl, 'spinner');
    }

    static showImagePreview(previewEl, src, alt = '') {
        if (!previewEl) return;
        const wrapper = Form.ensurePreviewWrapper(previewEl) || previewEl;
        const image = Form.getPreviewImage(previewEl);

        if (image) {
            image.src = src;
            if (alt) {
                image.alt = alt;
            }
            image.classList?.remove('d-none', 'hidden');
            image.removeAttribute?.('hidden');
            image.setAttribute?.('aria-hidden', 'false');
        }

        const icon = wrapper.querySelector?.('.file-preview-icon');
        icon?.remove();

        Form.showPreviewElement(wrapper);
        if (previewEl !== wrapper) {
            Form.showPreviewElement(previewEl);
        }
    }

    static resetPreview(previewEl) {
        if (!previewEl) return;
        const wrapper = Form.findPreviewWrapper(previewEl) || previewEl;
        const icon = wrapper.querySelector?.('.file-preview-icon');
        icon?.remove();

        const image = Form.getPreviewImage(previewEl);
        if (image) {
            image.removeAttribute('src');
            Form.hidePreviewElement(image);
        }

        Form.hidePreviewElement(wrapper);
        if (previewEl !== wrapper) {
            Form.hidePreviewElement(previewEl);
        }
    }

    /**
     * Legacy helper. Initializes forms or re-triggers MDB input styling.
     * @param {Element|NodeList|string|Array<Element>} [target]
     * @returns {Form|Form[]|null}
     */
    static init(target) {
        if (typeof target === 'string' || target instanceof Element) {
            return new Form(target);
        }

        if (Form.isNodeCollection(target)) {
            return Array.from(target).map((item) => new Form(item));
        }

        Form.initializeInputs();
        return null;
    }

    /**
     * Проверяет, является ли аргумент коллекцией DOM-элементов.
     * @param {*} value
     * @returns {boolean}
     */
    static isNodeCollection(value) {
        if (!value) {
            return false;
        }
        if (Array.isArray(value)) {
            return true;
        }
        if (typeof NodeList !== 'undefined' && value instanceof NodeList) {
            return true;
        }
        if (typeof HTMLCollection !== 'undefined' && value instanceof HTMLCollection) {
            return true;
        }
        return false;
    }

    /**
     * Подготавливает элементы формы для корректного отображения в Bootstrap.
     * Добавляет недостающие служебные классы, настраивает form-floating и ARIA-атрибуты.
     * @param {Document|DocumentFragment|Element|Array<Element>|NodeList|string} [context=document]
     */
    static initializeInputs(context = document) {
        const selectors = 'input, textarea, select';
        const controls = new Set();

        const pushControls = (source) => {
            if (!source) {
                return;
            }

            if (typeof source === 'string') {
                pushControls((source ? document.querySelector(source) : null));
                return;
            }

            const nodeType = source.nodeType;
            const isElement = nodeType === 1;
            const isDocument = nodeType === 9;
            const isFragment = nodeType === 11;
            if (!isElement && !isDocument && !isFragment) {
                return;
            }

            if (isElement && typeof source.matches === 'function' && source.matches(selectors)) {
                controls.add(source);
            }

            if (typeof source.querySelectorAll === 'function') {
                source.querySelectorAll(selectors).forEach((el) => controls.add(el));
            }
        };

        if (Form.isNodeCollection(context)) {
            Array.from(context).forEach((item) => pushControls(item));
        } else {
            pushControls(context || document);
        }

        controls.forEach((control) => {
            Form.applyBootstrapControlClasses(control);
            Form.prepareFloatingLabel(control);
            Form.synchronizeInvalidState(control);
        });
    }

    request(...args) {
        return Energine.request(...args);
    }

    constructor(element) {
        // this.overlay = new Overlay();

        // Получаем элемент формы
        this.componentElement = (typeof element === 'string')
            ? document.querySelector(element)
            : element;

        // singlePath
        this.componentElement = (typeof element === 'string')
            ? document.querySelector(element)
            : element;

        if (!this.componentElement) {
            throw new Error('Form: не найден componentElement по селектору или элементу: ' + element);
        }

        this.singlePath = this.componentElement.getAttribute('single_template');

        // Внешний элемент формы
        this.form = this.componentElement.closest('form');

        // Состояние формы
        this.state = this.form.querySelector('#componentAction')?.value;

        // Панели с табами
        this.tabPane = new TabPane(this.componentElement, {
            onTabChange: this.onTabChange.bind(this)
        });

        // Подключаем CSS для подсветки обязательных полей (один раз на страницу)
        Form.loadCSS('stylesheets/form.css');

        // Валидатор
        this.validator = new Validator(this.form, this.tabPane);
        this.configureValidatorStyling();

        // Рич-редакторы
        this.richEditors = [];
        this.form.querySelectorAll('[data-role="rich-editor"]').forEach(textarea => {
            this.richEditors.push(new Form.RichEditor(textarea, this));
        });

        // CodeMirror
        this.codeEditors = [];
        const codeMirror = getCodeMirror();
        if (codeMirror) {
            this.form.querySelectorAll('[data-role="code-editor"]').forEach(textarea => {
                this.codeEditors.push(
                    codeMirror.fromTextArea(textarea, {
                        mode: "text/html",
                        tabMode: "indent",
                        lineNumbers: true,
                        theme: 'elegant'
                    })
                );
            });
        }

        // Acpl поля
        this.form.querySelectorAll('[data-role="acpl"]').forEach(el => {
            new AcplField(el);
        });

        // SmapSelector
        this.form.querySelectorAll('[data-action="open-smap"]').forEach(el => {
            new Form.SmapSelector(el, this);
        });

        // AttachmentSelector
        this.form.querySelectorAll('[data-action="open-attachment"]').forEach(el => {
            new Form.AttachmentSelector(el, this);
        });

        // File field actions
        this.form.querySelectorAll('[data-action="open-filelib"]').forEach(button => {
            button.addEventListener('click', () => this.openFileLib(button));
        });
        this.form.querySelectorAll('[data-action="quick-upload"]').forEach(button => {
            button.addEventListener('click', () => this.openQuickUpload(button));
        });
        this.form.querySelectorAll('[data-action="clear-file"]').forEach(button => {
            button.addEventListener('click', () => this.clearFileField(button));
        });

        // Uploaders
        this.fileUploaders = [];
        this.fileUploaderMap = new Map();
        this.componentElement.querySelectorAll('[data-role="file-uploader"]').forEach(uploader => {
            const instance = new Form.Uploader(uploader, this, 'upload/');
            if (instance) {
                this.fileUploaders.push(instance);
                if (instance.targetId) {
                    this.fileUploaderMap.set(instance.targetId, instance);
                }
            }
        });

        // Date controls
        this.dateControls = [];
        this.componentElement.querySelectorAll('[data-role="date"], [data-role="datetime"]').forEach(dateControl => {
            const wrapper = dateControl.closest('[data-role="form-field"]');
            const isNullable = wrapper ? wrapper.getAttribute('data-required') !== 'true' : true;
            if (dateControl.getAttribute('data-role') === 'datetime') {
                this.dateControls.push(Energine.createDateTimePicker(dateControl, isNullable));
            } else {
                this.dateControls.push(Energine.createDatePicker(dateControl, isNullable));
            }
        });

        // Ensure iframes that host grids expand to available height inside forms
        this._enhanceEmbeddedGridIframes();
        window.addEventListener('resize', () => this._enhanceEmbeddedGridIframes());

        // Если открыто в ModalBox
        if (window.parent.ModalBox?.initialized && window.parent.ModalBox.getCurrent()) {
            document.body.addEventListener('keypress', evt => {
                if (evt.key === 'Escape' || evt.key === 'esc') {
                    window.parent.ModalBox.close();
                }
            });
        }

        // GOOGLE TRANSLATE Ctrl + *
        window.addEventListener('keypress', (evt) => {
            if (!(evt.target instanceof Element)) {
                return;
            }

            if (evt.code === 'Digit8' && evt.shiftKey) { // shift + *
                const fieldId = evt.target.id;
                if (!fieldId || fieldId.length < 2) {
                    return;
                }

                const fieldBase = fieldId.substring(0, fieldId.length - 2);
                const parent = evt.target.closest('[data-role="pane-item"]');
                if (!parent || !parent.id) {
                    return;
                }

                const anchors = document.querySelectorAll('a[lang_abbr]');
                const parentHref = `#${parent.id}`;
                const anchor = Array.from(anchors).find((link) => link.getAttribute('href') === parentHref);
                let toLangAbbr = anchor?.getAttribute('lang_abbr');
                if (!toLangAbbr) {
                    return;
                }

                if (toLangAbbr === 'ua') {
                    toLangAbbr = 'uk';
                }

                const srcTextElement = document.getElementById(`${fieldBase}_1`);
                if (!srcTextElement || !('value' in srcTextElement)) {
                    return;
                }

                const srcText = srcTextElement.value;
                if (!srcText) {
                    return;
                }

                const params = new URLSearchParams({
                    client: 'gtx',
                    sl: 'ru',
                    tl: toLangAbbr,
                    dt: 't',
                    q: srcText
                });

                fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`)
                    .then((response) => response.text())
                    .then((resultText) => {
                        if (!resultText) {
                            return;
                        }

                        let translated = resultText.substring(4);
                        const endIndex = translated.indexOf('","');
                        if (endIndex !== -1) {
                            translated = translated.substring(0, endIndex);
                        }

                        if (!translated) {
                            return;
                        }

                        translated = translated.charAt(0).toUpperCase() + translated.slice(1);

                        if ('value' in evt.target) {
                            evt.target.value = translated;
                        }
                    })
                    .catch((error) => {
                        console.error('Google Translate request failed', error);
                    });
            }
        });

        // CRUD
        this.componentElement.querySelectorAll('[data-action="crud"]').forEach(crudEl => {
            crudEl.addEventListener('click', (event) => {
                const target = event.currentTarget || event.target;
                const dataField = target?.getAttribute('data-field');
                const dataEditor = target?.getAttribute('data-editor');
                if (!dataField || !dataEditor) {
                    return;
                }

                const control = this.form.querySelector(`[name="${dataField}"], [id="${dataField}"]`);
                if (!control) {
                    return;
                }

                const isSelectElement = control instanceof HTMLSelectElement;
                const isMultiSelect = isSelectElement && control.multiple;

                ModalBox.open({
                    url: `${this.singlePath}${dataField}-${dataEditor}/crud/`,
                    onClose: (result) => {
                        const selectedValue = result?.key;
                        if (result?.dirty) {
                            const previousSelection = isMultiSelect
                                ? Array.from(control.selectedOptions || []).map((option) => option.value)
                                : (isSelectElement ? control.value : null);
                            Energine.request(
                                `${this.singlePath}${dataField}/fk-values/`,
                                null,
                                (data) => {
                                    if (data.result) {
                                        control.innerHTML = '';
                                        const id = data.result[1];
                                        const title = data.result[2];
                                        data.result[0].forEach(row => {
                                            let option = document.createElement('option');
                                            Object.entries(row).forEach(([key, value]) => {
                                                if (key === id) {
                                                    option.value = value;
                                                } else if (key === title) {
                                                    option.textContent = value;
                                                } else {
                                                    option.setAttribute(key, value);
                                                }
                                            });
                                            control.appendChild(option);
                                            if (isMultiSelect) {
                                                if (previousSelection?.includes(option.value)) {
                                                    option.selected = true;
                                                }
                                            } else if (previousSelection && option.value === previousSelection) {
                                                option.selected = true;
                                            }
                                        });
                                        if (selectedValue && isSelectElement) {
                                            const optionToSelect = Array.from(control.options || []).find((option) => option.value == selectedValue);
                                            if (optionToSelect) {
                                                optionToSelect.selected = true;
                                            }
                                        }
                                    }
                                },
                                this.processServerError.bind(this),
                                this.processServerError.bind(this)
                            );
                        } else if (selectedValue) {
                            if (isMultiSelect) {
                                const optionToSelect = Array.from(control.options || []).find((option) => option.value == selectedValue);
                                if (optionToSelect) {
                                    optionToSelect.selected = true;
                                }
                            } else if (isSelectElement) {
                                control.value = selectedValue;
                            }
                        }
                    }
                });
            });
        });

        Form.initializeInputs(this.form || this.componentElement);
        Form.applyRequiredHighlights(this.form || this.componentElement);

    }

    // onTabChange
    onTabChange(tab) {
        if (tab && tab.getAttribute('data-src') && !tab.loaded) {
            const pane = tab['pane'];
            if (!pane) {
                return;
            }
            pane.innerHTML = '';
            let iframe = document.createElement('iframe');
            iframe.src = Energine['base'] + tab.getAttribute('data-src');
            iframe.frameBorder = 0;
            iframe.scrolling = 'no';
            iframe.style.width = '99%';
            iframe.style.height = '89%';
            pane.appendChild(iframe);
            tab.loaded = true;
        }
    }

    // attachToolbar
    attachToolbar(toolbar) {
        this.toolbar = toolbar;
        let toolbarContainer = this.componentElement.querySelector('[data-pane-part="footer"]');
        let afterSaveActionSelect = this.toolbar.getControlById('after_save_action');
        if (toolbarContainer) {
            toolbarContainer.appendChild(this.toolbar.getElement());
        } else {
            this.componentElement.appendChild(this.toolbar.getElement());
        }
        if (afterSaveActionSelect) {
            let savedActionState = Cookie.read('after_add_default_action');
            if (savedActionState) {
                afterSaveActionSelect.setSelected(savedActionState);
            }
        }
        toolbar.bindTo(this);
    }

    // buildSaveURL
    buildSaveURL() {
        return this.singlePath + 'save';
    }

    // save
    save() {
        this.richEditors.forEach(editor => editor.onSaveForm());
        this.codeEditors.forEach(editor => editor.save?.());

        if (!this.validator.validate()) return;

        // this.overlay.show();
        showLoader();

        Energine.request(
            this.buildSaveURL(),
            Form.toQueryString(this.form),
            this.processServerResponse.bind(this),
            this.processServerError.bind(this),
            this.processServerError.bind(this)
        );
    }

    // processServerResponse
    processServerResponse(response) {
        let nextActionSelector;
        if (response && (nextActionSelector = this.toolbar.getControlById('after_save_action'))) {
            Cookie.write('after_add_default_action', nextActionSelector.getValue(), {path: new URL(Energine.base).pathname, duration: 1});
            response.afterClose = nextActionSelector.getValue();
        }
        ModalBox.setReturnValue(response);
        // this.overlay.hide();
        hideLoader();
        this.close();
    }

    // processServerError
    processServerError(response) {
        // this.overlay.hide();
        hideLoader();
    }

    // close
    close() {
        ModalBox.close();
    }

    // clearFileField
    clearFileField(button) {
        const targetId = button?.dataset?.target;
        const previewId = button?.dataset?.preview;
        const linkInput = targetId ? document.getElementById(targetId) : null;
        if (linkInput) {
            linkInput.value = '';
        }
        const preview = previewId ? document.getElementById(previewId) : null;
        if (preview) {
            const anchor = preview.tagName.toLowerCase() === 'a' ? preview : preview.querySelector('a');
            if (anchor) {
                anchor.removeAttribute('href');
            }
            Form.resetPreview(preview);
        }
        if (button) {
            button.classList.add('d-none');
        }

        const inputId = button?.dataset?.input;
        const fileInput = inputId ? document.getElementById(inputId) : null;
        if (fileInput) {
            fileInput.value = '';
        }

        const uploader = targetId ? this.fileUploaderMap?.get(targetId) : null;
        uploader?.reset();
    }

    // processFileResult
    processFileResult(result, button) {
        if (!result) return;

        // получаем элемент по id, если передано id
        const linkId = button?.dataset?.link;
        const linkInput = linkId ? document.getElementById(linkId) : null;
        if (linkInput) {
            linkInput.value = result['upl_path'];
        } else {
            console.warn('processFileResult: Не найден элемент для id:', linkId, button, result);
        }

        const previewId = button?.dataset?.preview;
        const previewEl = previewId ? document.getElementById(previewId) : null;
        const anchor = previewEl && previewEl.tagName.toLowerCase() === 'a'
            ? previewEl
            : previewEl?.querySelector('a');
        if (previewEl) {
            const type = result['upl_internal_type'];
            const href = result['upl_path'] ? Energine.media + result['upl_path'] : '';

            if (anchor) {
                if (href) {
                    anchor.setAttribute('href', href);
                } else {
                    anchor.removeAttribute('href');
                }
            }

            switch (type) {
                case 'image':
                    Form.showImagePreview(previewEl, Energine.media + result['upl_path'], result['upl_title'] || '');
                    break;
                case 'video':
                    Form.showImagePreview(previewEl, Energine.resizer + 'w0-h0/' + result['upl_path'], result['upl_title'] || '');
                    break;
                default:
                    Form.showIconPreview(previewEl, Form.getPreviewIconKey(type));
                    break;
            }
        }

        const clearButton = linkId
            ? this.form.querySelector(`[data-action="clear-file"][data-target="${linkId}"]`)
            : null;
        clearButton?.classList.remove('d-none', 'hidden');
        clearButton?.removeAttribute('hidden');
    }

    // openFileLib
    openFileLib(button) {
        const linkId = button?.dataset?.link;
        const linkInput = linkId ? document.getElementById(linkId) : null;
        const path = linkInput ? (linkInput.value || null) : null;

        ModalBox.open({
            url: this.singlePath + 'file-library/',
            extraData: path,
            onClose: (result) => {
                this.processFileResult(result, button);
            }
        });
    }

    // openTagEditor
    openTagEditor(button) {
        // Получаем id связанного поля из data-атрибута
        const fieldId = button?.dataset?.target;
        const linkInput = fieldId ? document.getElementById(fieldId) : null;

        ModalBox.open({
            url: this.singlePath + 'tags/show/',
            //extraData: data.data,
            onClose: (result) => {
                if (result && linkInput) {
                    // Устанавливаем новое значение тегов в input
                    linkInput.value = result;
                }
            }
        });

    }

    // openQuickUpload
    openQuickUpload(button) {
        const inputId = button?.dataset?.input;
        const fileInput = inputId ? document.getElementById(inputId) : null;
        if (fileInput) {
            fileInput.click();
            return;
        }

        const linkId = button?.dataset?.link;
        const linkInput = linkId ? document.getElementById(linkId) : null;
        const path = linkInput ? (linkInput.value || null) : null;
        const quickUploadPid = button?.dataset?.quickUploadPid;
        const quickUploadEnabled = button?.dataset?.quickUploadEnabled === '1';
        // let overlay = this.overlay;
        let processResult = this.processFileResult.bind(this);

        if (!quickUploadEnabled || !quickUploadPid) return;

        ModalBox.open({
            url: this.singlePath + 'file-library/' + quickUploadPid + '/add',
            extraData: path,
            onClose: (result) => {
                if (result && result.data) {
                    let upl_id = result.data;
                    if (upl_id) {
                        // overlay.show();
                        showLoader();
                        fetch(this.singlePath + `file-library/${quickUploadPid}/get-data/`, {
                            method: 'POST',
                            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                            body: `json=1&filter=${encodeURIComponent(JSON.stringify({
                                condition: '=',
                                share_uploads: {'upl_id': [upl_id]}
                            }))}`
                        })
                            .then(response => response.json())
                            .then(data => {
                                if (data && data.data && data.data.length === 2) {
                                    // overlay.hide();
                                    hideLoader();
                                    processResult(data.data[1], button);
                                }
                            })
                            .catch(() => hideLoader());
                    }
                }
            }
        });
    }

    // --- Вспомогательные методы ---

    static applyBootstrapControlClasses(control) {
        if (!Form.isElement(control)) {
            return;
        }

        const tagName = (control.tagName || '').toLowerCase();
        if (!tagName) {
            return;
        }

        if (tagName === 'select') {
            if (!control.classList.contains('form-select') && !control.classList.contains('form-control')) {
                control.classList.add('form-select');
            }
            return;
        }

        if (tagName === 'textarea') {
            if (!control.classList.contains('form-control')) {
                control.classList.add('form-control');
            }
            return;
        }

        if (tagName !== 'input') {
            return;
        }

        const type = (control.getAttribute('type') || 'text').toLowerCase();
        if (['hidden', 'submit', 'reset', 'button', 'image'].includes(type)) {
            return;
        }

        if (type === 'checkbox' || type === 'radio') {
            control.classList.add('form-check-input');
            return;
        }

        if (type === 'range') {
            control.classList.add('form-range');
            return;
        }

        if (type === 'file') {
            control.classList.add('form-control');
            return;
        }

        if (type === 'color') {
            control.classList.add('form-control');
            control.classList.add('form-control-color');
            return;
        }

        if (!control.classList.contains('form-control')) {
            control.classList.add('form-control');
        }
    }

    static prepareFloatingLabel(control) {
        if (!Form.isElement(control)) {
            return;
        }

        const wrapper = Form.safeClosest(control, '.form-floating');
        if (!wrapper) {
            return;
        }

        if (!control.hasAttribute('placeholder') || control.getAttribute('placeholder') === '') {
            control.setAttribute('placeholder', ' ');
        }

        const label = wrapper.querySelector('label');
        if (Form.isElement(label) && !label.getAttribute('for')) {
            const controlId = Form.ensureControlId(control);
            label.setAttribute('for', controlId);
        }
    }

    static synchronizeInvalidState(control) {
        if (!Form.isElement(control)) {
            return;
        }

        if (control.classList.contains('is-invalid')) {
            control.setAttribute('aria-invalid', 'true');
        } else {
            control.removeAttribute('aria-invalid');
        }

        const feedbacks = Form.findInvalidFeedbacks(control);
        if (!feedbacks.length) {
            return;
        }

        const controlId = Form.ensureControlId(control);
        const describedBy = new Set((control.getAttribute('aria-describedby') || '')
            .split(/\s+/)
            .map(token => token.trim())
            .filter(Boolean));

        feedbacks.forEach((feedback) => {
            if (!feedback.id) {
                const generatedId = Form.generateFeedbackId(control);
                feedback.id = generatedId;
                if (!control.dataset.feedbackId) {
                    control.dataset.feedbackId = generatedId;
                }
            }
            if (feedback.dataset && !feedback.dataset.feedbackFor) {
                feedback.dataset.feedbackFor = controlId;
            }
            if (!feedback.hasAttribute('aria-live')) {
                feedback.setAttribute('aria-live', 'polite');
            }
            describedBy.add(feedback.id);
        });

        if (describedBy.size) {
            control.setAttribute('aria-describedby', Array.from(describedBy).join(' '));
        }
    }

    static findInvalidFeedbacks(control) {
        if (!Form.isElement(control)) {
            return [];
        }

        const wrappers = new Set([
            Form.safeClosest(control, '[data-role="form-field"]'),
            Form.safeClosest(control, '.form-floating'),
            Form.safeClosest(control, '.input-group'),
            control.parentElement,
        ]);

        const feedbacks = new Set();

        wrappers.forEach((wrapper) => {
            if (!Form.isElement(wrapper) && !(wrapper && typeof wrapper.querySelectorAll === 'function')) {
                return;
            }
            wrapper.querySelectorAll?.('.invalid-feedback').forEach((feedback) => {
                if (Form.isFeedbackForControl(feedback, control)) {
                    feedbacks.add(feedback);
                }
            });
        });

        return Array.from(feedbacks);
    }

    static isFeedbackForControl(feedback, control) {
        if (!Form.isElement(feedback) || !Form.isElement(control)) {
            return false;
        }

        const target = feedback.dataset ? feedback.dataset.feedbackFor : null;
        if (target) {
            const controlId = control.id;
            if (controlId && target === controlId) {
                return true;
            }
            if (!controlId && control.name && target === control.name) {
                return true;
            }
            return false;
        }

        const feedbackField = Form.safeClosest(feedback, '[data-role="form-field"]');
        const controlField = Form.safeClosest(control, '[data-role="form-field"]');
        if (feedbackField || controlField) {
            return feedbackField === controlField;
        }

        const floatingWrapper = Form.safeClosest(control, '.form-floating');
        if (floatingWrapper) {
            return Form.safeClosest(feedback, '.form-floating') === floatingWrapper;
        }

        const groupWrapper = Form.safeClosest(control, '.input-group');
        if (groupWrapper) {
            return Form.safeClosest(feedback, '.input-group') === groupWrapper;
        }

        return feedback.parentElement === control.parentElement;
    }

    static ensureControlId(control) {
        if (!Form.isElement(control)) {
            return '';
        }

        if (control.id) {
            return control.id;
        }

        const ownerDoc = control.ownerDocument || document;
        const baseRaw = (control.name || control.getAttribute('data-role') || 'field').toString();
        const base = baseRaw.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'field';
        let candidate = base;
        let counter = 1;

        while (ownerDoc.getElementById(candidate)) {
            candidate = `${base}-${counter}`;
            counter += 1;
        }

        control.id = candidate;
        return candidate;
    }

    static isElement(node) {
        return !!(node && typeof node === 'object' && node.nodeType === 1);
    }

    static safeClosest(element, selector) {
        if (!Form.isElement(element) || typeof element.closest !== 'function' || !selector) {
            return null;
        }
        try {
            return element.closest(selector);
        } catch (e) {
            return null;
        }
    }

    static loadCSS(href) {
        if (![...document.querySelectorAll('link[rel=stylesheet]')].some(l => l.href.includes(href))) {
            let link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            document.head.appendChild(link);
        }
    }

    /**
     * Проставляет класс подсветки для обязательных полей ввода в заданном контексте.
     * Контекстом может быть форма, контейнер компонента или документ.
     * Основано на data-required="true" у обёртки [data-role="form-field"].
     */
    static applyRequiredHighlights(context = document) {
        const root = (typeof context === 'string') ? document.querySelector(context) : (context || document);
        if (!root) return;

        const wrappers = root.querySelectorAll('[data-role="form-field"][data-required="true"]');
        wrappers.forEach(wrapper => {
            const controls = wrapper.querySelectorAll('input, textarea, select');
            controls.forEach(control => {
                if (!control || typeof control.classList === 'undefined') {
                    return;
                }

                // Не подсвечиваем отключенные поля
                if (control.disabled) {
                    return;
                }

                const controlType = (control.getAttribute('type') || control.type || '').toLowerCase();
                if (controlType === 'checkbox' || controlType === 'radio') {
                    control.classList.remove('e-required-control');
                    return;
                }

                control.classList.add('e-required-control');
            });
        });
    }

    static toQueryString(form) {
        // Преобразовать форму в queryString
        const data = new FormData(form);

        // Совместимость с TagManager: требуется корневой ключ 'tags'
        // Если в форме нет 'tags', но есть поле вида '*[tags]', продублируем значение в 'tags'.
        let hasRootTags = false;
        for (const key of data.keys()) {
            if (key === 'tags') {
                hasRootTags = true;
                break;
            }
        }
        if (!hasRootTags && form && form.querySelector) {
            const tagInput = form.querySelector('input[name="tags"], input[name$="[tags]"]');
            if (tagInput && typeof tagInput.value === 'string' && tagInput.value !== '') {
                data.append('tags', tagInput.value);
            }
        }

        return Array.from(data.entries())
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');
    }

    /**
     * Make embedded iframes that host grids stretch to the full available height
     * of their container. Applies safe flex/min-height fixes to ancestor containers
     * and sets iframe height to 100% with responsive recalculation.
     */
    _enhanceEmbeddedGridIframes() {
        if (!this.form) return;

        const iframes = Array.from(this.form.querySelectorAll('iframe'));
        if (!iframes.length) return;

        const ensureFlexChain = (node) => {
            if (!node) return;
            try {
                if (node.matches && (node.matches('[data-pane-part="body"]') || node.matches('.tab-content') || node.matches('.tab-pane'))) {
                    if (window.getComputedStyle(node).display.indexOf('flex') === -1) {
                        node.style.display = 'flex';
                        node.style.flexDirection = 'column';
                    }
                    if (!node.style.minHeight || node.style.minHeight === '' || node.style.minHeight === 'auto') {
                        node.style.minHeight = '0';
                    }
                    if (!node.style.flex || node.style.flex === '') {
                        node.style.flex = '1 1 auto';
                    }
                }
            } catch (e) { /* ignore layout issues */ }
        };

        const adjustIframe = (iframe) => {
            if (!iframe || !iframe.parentElement) return;

            // Apply safe sizing on iframe element
            iframe.style.display = 'block';
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';

            // Ensure parent chain can allocate height
            const paneBody = iframe.closest('[data-pane-part="body"]');
            const tabContent = iframe.closest('.tab-content');
            const tabPane = iframe.closest('.tab-pane');
            ensureFlexChain(paneBody);
            ensureFlexChain(tabContent);
            ensureFlexChain(tabPane);

            // If explicit pixel sizing is needed (older browsers), set height to parent height
            try {
                const host = iframe.parentElement;
                const rect = host.getBoundingClientRect();
                if (rect && rect.height > 0) {
                    iframe.style.height = rect.height + 'px';
                }
            } catch (e) { /* ignore */ }

            // If same-origin and content is a grid, hint its document to use enhanced layout
            try {
                const doc = iframe.contentDocument || iframe.contentWindow?.document;
                if (doc) {
                    const hasGrid = !!doc.querySelector('[data-role="grid"]');
                    if (hasGrid && doc.body && !doc.body.classList.contains('e-grid-layout-enhanced')) {
                        doc.body.classList.add('e-grid-layout-enhanced');
                    }
                }
            } catch (e) { /* cross-origin, ignore */ }
        };

        iframes.forEach((iframe) => {
            if (iframe.dataset._gridEnhanced === '1') {
                adjustIframe(iframe);
                return;
            }
            iframe.dataset._gridEnhanced = '1';

            // Adjust now
            adjustIframe(iframe);

            // And after load (when content exists)
            iframe.addEventListener('load', () => adjustIframe(iframe));
        });
    }

    configureValidatorStyling() {
        if (!this.validator) {
            return;
        }

        const originalShowError = this.validator.showError?.bind(this.validator);
        const originalRemoveError = this.validator.removeError?.bind(this.validator);

        this.validator.showError = (field, message = 'Ошибка заполнения') => {
            const control = this.resolveControlElement(field);
            if (!control || !this.applyInvalidAppearance(control, message)) {
                originalShowError?.(field, message);
            }
        };

        this.validator.removeError = (field) => {
            const control = this.resolveControlElement(field);
            if (!control || !this.resetInvalidAppearance(control)) {
                originalRemoveError?.(field);
            }
        };
    }

    resolveControlElement(field) {
        if (!field || !(field instanceof Element)) {
            return null;
        }
        const tagName = field.tagName?.toLowerCase();
        if (['input', 'textarea', 'select'].includes(tagName)) {
            return field;
        }
        return field.querySelector?.('input, textarea, select') || null;
    }

    applyInvalidAppearance(control, message) {
        if (!this.isValidatableControl(control)) {
            return false;
        }

        this.resetInvalidAppearance(control);

        control.classList.add('is-invalid');
        control.setAttribute('aria-invalid', 'true');

        const feedback = this.getInvalidFeedbackElement(control, true);
        if (feedback) {
            feedback.textContent = message ?? feedback.textContent ?? '';
            this.showInvalidFeedback(feedback);
        }
        return true;
    }

    resetInvalidAppearance(control) {
        if (!this.isValidatableControl(control)) {
            return false;
        }

        control.classList.remove('is-invalid');
        control.removeAttribute('aria-invalid');

        const feedback = this.getInvalidFeedbackElement(control, false);
        if (feedback) {
            feedback.textContent = '';
            this.hideInvalidFeedback(feedback);
        }
        return true;
    }

    isValidatableControl(control) {
        if (!control || !(control instanceof Element)) {
            return false;
        }
        const tagName = control.tagName?.toLowerCase();
        return ['input', 'textarea', 'select'].includes(tagName);
    }

    getInvalidFeedbackElement(control, create = true) {
        if (!control) {
            return null;
        }

        const existingById = this.lookupFeedbackById(control.dataset.feedbackId);
        if (existingById) {
            return existingById;
        }

        const wrapper = control.closest('[data-role="form-field"]') || control.parentElement;
        if (!wrapper) {
            return null;
        }

        const existing = this.findExistingInvalidFeedback(wrapper, control);
        if (existing) {
            if (existing.id && !control.dataset.feedbackId) {
                control.dataset.feedbackId = existing.id;
            }
            return existing;
        }

        if (!create) {
            return null;
        }

        const feedback = document.createElement('div');
        feedback.className = 'invalid-feedback';

        const feedbackId = Form.generateFeedbackId(control);
        feedback.id = feedbackId;
        control.dataset.feedbackId = feedbackId;

        if (control.id) {
            feedback.dataset.feedbackFor = control.id;
        } else if (control.name) {
            feedback.dataset.feedbackFor = control.name;
        }

        const reference = control.closest('.input-group')
            || control.closest('.form-check')
            || control;
        const parent = reference.parentNode || wrapper;
        if (parent) {
            if (reference.nextSibling) {
                parent.insertBefore(feedback, reference.nextSibling);
            } else {
                parent.appendChild(feedback);
            }
        }

        return feedback;
    }

    lookupFeedbackById(feedbackId) {
        if (!feedbackId) {
            return null;
        }
        try {
            return document.getElementById(feedbackId) || null;
        } catch (e) {
            return null;
        }
    }

    findExistingInvalidFeedback(wrapper, control) {
        const selectorParts = [];
        if (control.id) {
            selectorParts.push(`[data-feedback-for="${Form.escapeSelector(control.id)}"]`);
        }
        if (control.name) {
            selectorParts.push(`[data-feedback-for="${Form.escapeSelector(control.name)}"]`);
        }

        for (const part of selectorParts) {
            try {
                const candidate = wrapper.querySelector(`.invalid-feedback${part}`);
                if (candidate) {
                    return candidate;
                }
            } catch (e) {
                continue;
            }
        }

        const direct = wrapper.querySelector('.invalid-feedback');
        return direct || null;
    }

    showInvalidFeedback(feedback) {
        if (!feedback) {
            return;
        }
        if (feedback.hasAttribute('hidden')) {
            feedback.dataset.wasHidden = feedback.dataset.wasHidden || 'true';
            feedback.removeAttribute('hidden');
        }
        if (feedback.classList.contains('d-none')) {
            feedback.dataset.wasDnone = feedback.dataset.wasDnone || 'true';
            feedback.classList.remove('d-none');
        }
    }

    hideInvalidFeedback(feedback) {
        if (!feedback) {
            return;
        }
        if (feedback.dataset.wasHidden === 'true') {
            feedback.setAttribute('hidden', 'hidden');
        }
        if (feedback.dataset.wasDnone === 'true') {
            feedback.classList.add('d-none');
        }
    }

    static escapeSelector(value) {
        if (typeof value !== 'string') {
            return '';
        }
        if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
            return CSS.escape(value);
        }
        return value.replace(/([\\:.#\[\],=])/g, '\\$1');
    }

    static generateFeedbackId(control) {
        const ownerDoc = control?.ownerDocument || document;
        const baseRaw = (control?.id || control?.name || 'field').toString();
        const base = baseRaw.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'field';
        let id = `${base}-feedback`;
        while (ownerDoc.getElementById(id)) {
            id = `${base}-feedback-${Math.random().toString(36).slice(2, 8)}`;
        }
        return id;
    }
}
/**
 * File uploader.
 *
 * @constructor
 * @param uploaderElement
 * @param form
 * @param path
 */
class FormUploader {
    /**
     * @param {Element|string} uploaderElement
     * @param {Form} form
     * @param {string} path
     */
    constructor(uploaderElement, form, path) {
        this.container = (typeof uploaderElement === 'string')
            ? document.querySelector(uploaderElement)
            : uploaderElement;
        if (!this.container) {
            return;
        }

        this.form = form;
        this.path = path;

        this.fileInput = this.container.querySelector('input[type="file"][data-action="upload-file"]')
            || this.container.querySelector('input[type="file"]');

        if (!this.fileInput) {
            return;
        }

        this.targetId = this.fileInput.dataset.target || this.container.dataset.target || null;
        this.hiddenInput = this.targetId ? document.getElementById(this.targetId) : null;
        this.previewId = this.fileInput.dataset.preview || this.container.dataset.preview || null;

        const progressSelector = this.targetId
            ? `[data-role="upload-progress"][data-target="${this.targetId}"]`
            : null;
        this.progressElement = progressSelector
            ? this.form.componentElement.querySelector(progressSelector)
            : null;
        this.progressBar = this.progressElement ? this.progressElement.querySelector('.progress-bar') : null;

        const errorSelector = this.targetId
            ? `[data-role="upload-error"][data-target="${this.targetId}"]`
            : null;
        this.errorElement = errorSelector
            ? this.form.componentElement.querySelector(errorSelector)
            : null;

        this.quickUploadButton = this.targetId
            ? this.form.form.querySelector(`[data-action="quick-upload"][data-link="${this.targetId}"]`)
            : null;

        this.clearButton = this.targetId
            ? this.form.form.querySelector(`[data-action="clear-file"][data-target="${this.targetId}"]`)
            : null;

        this.quickUploadPid = this.fileInput.dataset.quickUploadPid
            || this.container.dataset.quickUploadPid
            || '';
        this.quickUploadPath = this.fileInput.dataset.quickUploadPath
            || this.container.dataset.quickUploadPath
            || '';
        const enabledAttr = this.fileInput.dataset.quickUploadEnabled
            || this.container.dataset.quickUploadEnabled
            || '1';
        this.quickUploadEnabled = ['1', 'true', 'yes'].includes((enabledAttr || '').toString().toLowerCase());

        if (!this.quickUploadPid) {
            this.quickUploadEnabled = false;
        }

        this.fileInput.addEventListener('change', this.handleFileChange);

        if (!this.quickUploadEnabled) {
            this.fileInput.disabled = true;
        }
    }

    handleFileChange = (event) => {
        const files = event?.target?.files;
        if (!files || !files.length) {
            return;
        }

        if (!this.quickUploadEnabled) {
            this.showError('Быстрая загрузка недоступна для этого поля');
            event.target.value = '';
            return;
        }

        const file = files[0];
        if (!file) {
            return;
        }

        this.resetError();
        this.setButtonsDisabled(true);
        this.toggleProgress(true);
        this.setProgress(0);

        this.uploadTempFile(file)
            .then((temp) => this.saveTempFile(temp, file))
            .then((record) => {
                this.form.processFileResult(record, this.quickUploadButton || this.container);
                this.fileInput.value = '';
                this.resetError();
            })
            .catch((error) => {
                const message = error instanceof Error ? error.message : 'Не удалось загрузить файл';
                this.showError(message);
            })
            .finally(() => {
                this.toggleProgress(false);
                this.setButtonsDisabled(false);
            });
    };

    uploadTempFile(file) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const url = `${this.form.singlePath}file-library/upload-temp/?json`;
            xhr.open('POST', url);
            xhr.responseType = 'json';
            xhr.withCredentials = true;

            if (this.progressBar) {
                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        const percent = Math.round((event.loaded / event.total) * 100);
                        this.setProgress(percent);
                    }
                });
            }

            xhr.addEventListener('load', () => {
                const response = xhr.response ?? this.safeParseJSON(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300 && response && !response.error) {
                    resolve(response);
                } else {
                    const message = this.extractErrorMessage(response, `Ошибка загрузки файла (HTTP ${xhr.status})`);
                    reject(new Error(message));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Ошибка сети при загрузке файла'));
            });

            xhr.addEventListener('abort', () => {
                reject(new Error('Загрузка файла была отменена'));
            });

            const formData = new FormData();
            formData.append('key', 'file');
            if (this.quickUploadPid) {
                formData.append('pid', this.quickUploadPid);
            }
            formData.append('file', file);

            xhr.send(formData);
        });
    }

    saveTempFile(tempResponse, file) {
        const fileName = tempResponse?.name || file.name;
        const title = this.extractTitle(fileName);

        const formData = new FormData();
        formData.append('json', '1');
        if (this.quickUploadPid) {
            formData.append('share_uploads[upl_pid]', this.quickUploadPid);
        }
        formData.append('share_uploads[upl_title]', title);
        formData.append('share_uploads[upl_name]', fileName);
        formData.append('share_uploads[upl_filename]', fileName);
        formData.append('share_uploads[upl_path]', tempResponse.tmp_name);

        return fetch(`${this.form.singlePath}file-library/save/?json`, {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
        })
            .then((response) => this.parseJsonResponse(response, 'Не удалось сохранить файл'))
            .then((data) => {
                if (!data || !data.result || !data.data) {
                    throw new Error('Не удалось сохранить файл');
                }
                return this.fetchFileRecord(data.data);
            });
    }

    fetchFileRecord(uploadId) {
        const filter = {
            condition: '=',
            share_uploads: { upl_id: [Number(uploadId)] }
        };
        const body = `json=1&filter=${encodeURIComponent(JSON.stringify(filter))}`;
        const url = `${this.form.singlePath}file-library/${this.quickUploadPid}/get-data/`;

        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
            body,
            credentials: 'same-origin'
        })
            .then((response) => this.parseJsonResponse(response, 'Не удалось получить данные файла'))
            .then((result) => {
                if (result && Array.isArray(result.data) && result.data.length >= 2) {
                    return result.data[1];
                }
                throw new Error('Не удалось получить данные файла');
            });
    }

    parseJsonResponse(response, errorMessage) {
        if (!response.ok) {
            throw new Error(`${errorMessage} (HTTP ${response.status})`);
        }
        return response.json().catch(() => {
            throw new Error('Сервер вернул некорректный ответ');
        });
    }

    safeParseJSON(text) {
        if (!text) {
            return null;
        }
        try {
            return JSON.parse(text);
        } catch (e) {
            return null;
        }
    }

    extractErrorMessage(response, defaultMessage) {
        if (!response) {
            return defaultMessage;
        }
        if (typeof response === 'string') {
            return response;
        }
        if (response.error_message) {
            return response.error_message;
        }
        if (response.message) {
            return response.message;
        }
        return defaultMessage;
    }

    extractTitle(fileName) {
        if (!fileName) {
            return '';
        }
        const position = fileName.lastIndexOf('.');
        return position > 0 ? fileName.substring(0, position) : fileName;
    }

    setButtonsDisabled(disabled) {
        if (disabled) {
            this.fileInput.disabled = true;
        } else {
            this.fileInput.disabled = this.quickUploadEnabled ? false : true;
        }
        if (this.quickUploadButton) {
            this.quickUploadButton.disabled = disabled;
        }
    }

    toggleProgress(visible) {
        if (!this.progressElement) {
            return;
        }
        if (visible) {
            this.progressElement.classList.remove('d-none');
        } else {
            this.progressElement.classList.add('d-none');
            this.setProgress(0);
        }
    }

    setProgress(value) {
        if (!this.progressBar) {
            return;
        }
        const percent = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
        this.progressBar.style.width = `${percent}%`;
        this.progressBar.textContent = `${percent}%`;
        this.progressBar.setAttribute('aria-valuenow', String(percent));
    }

    showError(message) {
        if (this.errorElement) {
            this.errorElement.textContent = message;
            this.errorElement.classList.remove('d-none');
        }
        if (this.form.validator && typeof this.form.validator.showError === 'function') {
            this.form.validator.showError(this.fileInput, message);
        }
    }

    resetError() {
        if (this.errorElement) {
            this.errorElement.textContent = '';
            this.errorElement.classList.add('d-none');
        }
        if (this.form.validator && typeof this.form.validator.removeError === 'function') {
            this.form.validator.removeError(this.fileInput);
        }
    }

    reset() {
        this.resetError();
        this.toggleProgress(false);
        if (this.fileInput) {
            this.fileInput.value = '';
            if (!this.quickUploadEnabled) {
                this.fileInput.disabled = true;
            }
        }
    }

    removeFilePreview(fieldId) {
        const field = document.getElementById(fieldId) || document.querySelector(fieldId);
        if (field) field.value = '';
        const preview = document.querySelector(`${fieldId}_preview`);
        if (preview && preview.tagName.toLowerCase() === 'img') {
            preview.src = '';
        }
        const link = document.querySelector(`${fieldId}_link`);
        if (link) link.innerHTML = '';
    }
}

// Для совместимости со старым API:
Form.Uploader = FormUploader;


/**
 * The smap (parent ID selector) selector.
 *
 * @constructor
 * @param {string|Element} selector The element id.
 * @param {Form} form The form.
 */
class FormSmapSelector {
    /**
     * @param {Element|string} selector - элемент или его селектор
     * @param {Form} form
     */
    constructor(selector, form) {
        this.smap = { id: '', name: '' };
        // Получаем сам элемент
        this.selector = (typeof selector === 'string')
            ? document.querySelector(selector)
            : selector;

        this.form = form;

        // Получаем имя поля из data-атрибута или обычного атрибута
        this.field = this.selector.getAttribute('field') || this.selector.dataset.field;

        // Вешаем клик
        this.selector.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.currentTarget;
            // Найдем target по data-атрибуту
            const smapIdName = target.dataset.id || target.getAttribute('smap_id');
            const smapNameName = target.dataset.name || target.getAttribute('smap_name');

            // Поля для записи результатов (элементы input или т.п.)
            this.smap.id = smapIdName ? document.getElementById(smapIdName) : null;
            this.smap.name = smapNameName ? document.getElementById(smapNameName) : null;

            this.showSelector();
        });
    }

    showSelector() {
        // Предполагаем, что у componentElement есть атрибут 'template' (или data-template)
        const template = this.form.componentElement.getAttribute('template') ||
            this.form.componentElement.dataset.template;
        ModalBox.open({
            url: template + 'selector/',
            onClose: this.setName.bind(this)
        });
    }

    setName(result) {
                if (result) {
            let name = '';
            if (result.site_name) {
                name += result.site_name + ' : ';
            }
            name += result.smap_name;

            // Заполняем input'ы, если они существуют
            if (this.smap.name) this.smap.name.value = name;
            if (this.smap.id) this.smap.id.value = result.smap_id;
        }
    }
}

// Для совместимости:
Form.SmapSelector = FormSmapSelector;
;

/**
 * AttachmentSelector.
 *
 * @constructor
 * @param {string|Element} selector The element id.
 * @param {Form} form The form.
 */
class FormAttachmentSelector {
    /**
     * @param {Element|string} selector - Элемент или селектор
     * @param {Form} form
     */
    constructor(selector, form) {
        this.selector = (typeof selector === 'string')
            ? document.querySelector(selector)
            : selector;

        this.form = form;
        this.field = this.selector.getAttribute('field') || this.selector.dataset.field;

        this.selector.addEventListener('click', (e) => {
            e.preventDefault();

            // Определяем id полей из data-атрибутов или обычных атрибутов
            const target = e.currentTarget;
            const uplNameId = target.dataset.name || target.getAttribute('upl_name');
            const uplIdId   = target.dataset.id || target.getAttribute('upl_id');

            // Получаем реальные элементы (input'ы и т.п.)
            this.uplName = uplNameId ? document.getElementById(uplNameId) : null;
            this.uplId   = uplIdId   ? document.getElementById(uplIdId)   : null;

            this.showSelector();
        });
    }

    showSelector() {
        // Получаем шаблон из атрибута или data-атрибута
        const template = this.form.componentElement.getAttribute('template') ||
            this.form.componentElement.dataset.template;

        ModalBox.open({
            url: template + 'file-library/',
            onClose: this.setName.bind(this)
        });
    }

    setName(result) {
        if (result) {
            if (this.uplName) this.uplName.value = result.upl_path;
            if (this.uplId)   this.uplId.value   = result.upl_id;
        }
    }
}

// Для совместимости:
Form.AttachmentSelector = FormAttachmentSelector;


// Предназначен для последующей имплементации
// Содержит метод setLabel использующийся для привязки кнопки выбора разделов
/**
 * Contain the methods that will be implemented in other classes.
 *
 * @namespace
 */
Form.Label = {
    /**
     * Устанавливает label.
     * @param {Object} result
     */
    setLabel(result) {
        let id = '', name = '', segment = '';

        // Проверка на null или undefined
        if (result != null) {
            if (result) {
                id = result.smap_id;
                name = result.smap_name;
                segment = result.smap_segment;
            }

            // Получаем элементы через id из this.obj атрибутов
            const hiddenFieldId = this.obj?.getAttribute('hidden_field');
            const spanFieldId = this.obj?.getAttribute('span_field');

            const hiddenField = hiddenFieldId ? document.getElementById(hiddenFieldId) : null;
            const spanField = spanFieldId ? document.getElementById(spanFieldId) : null;

            if (hiddenField) hiddenField.value = id;
            if (spanField) {
                if ('value' in spanField) {
                    spanField.value = name;
                } else {
                    spanField.textContent = name;
                }
            }

            const segmentObject = document.getElementById('smap_pid_segment');
            if (segmentObject) segmentObject.textContent = segment;

            Cookie.write(
                'last_selected_smap',
                JSON.stringify({ id, name, segment }),
                { path: new URL(Energine.base).pathname, duration: 1 }
            );
        }
    },

    /**
     * Готовит label.
     * @param {string} treeURL
     * @param {boolean} restore
     */
    prepareLabel(treeURL, restore = false) {
        // selector element
        this.obj = document.getElementById('sitemap_selector');
        if (this.obj) {
            // Навесим обработчик, прокидывая URL как аргумент
            this.obj.addEventListener('click', this.showTree.bind(this, treeURL));
            if (restore) {
                this.restoreLabel();
            }
        }
    },

    /**
     * Показывает дерево.
     * @param {string} url
     */
    showTree(url) {
        ModalBox.open({
            url: this.singlePath + url,
            onClose: this.setLabel.bind(this)
        });
    },

    /**
     * Восстанавливает label из Cookie.
     */
    restoreLabel() {
        let savedData = Cookie.read('last_selected_smap');
        if (this.obj && savedData) {
            try {
                savedData = JSON.parse(savedData);
            } catch {
                return;
            }

            const hiddenFieldId = this.obj.getAttribute('hidden_field');
            const spanFieldId = this.obj.getAttribute('span_field');

            const hiddenField = hiddenFieldId ? document.getElementById(hiddenFieldId) : null;
            const spanField = spanFieldId ? document.getElementById(spanFieldId) : null;

            if (hiddenField) hiddenField.value = savedData.id;
            if (spanField) {
                if ('value' in spanField) {
                    spanField.value = savedData.name;
                } else {
                    spanField.textContent = savedData.name;
                }
            }

            const segmentObject = document.getElementById('smap_pid_segment');
            if (segmentObject) segmentObject.textContent = savedData.segment;
        }
    }
};

/**
 * The rich editor form.
 *
 * @constructor
 * @param {} textarea
 * @param {Form} form
 * @param {} fallback_ie
 */
class FormRichEditor {
    /**
     * @param {Element|string} textarea - Элемент textarea или селектор
     * @param {Form} form
     */
    constructor(textarea, form) {
        this.textarea = (typeof textarea === 'string')
            ? document.getElementById(textarea) || document.querySelector(textarea)
            : textarea;

        if (!this.textarea) {
            throw new Error('Form.RichEditor: textarea element not found');
        }

        if (!this.textarea.id) {
            Form.ensureControlId(this.textarea);
        }

        this.form = form;
        this.editor = null;
        this.readyPromise = this.initializeEditor();
    }

    /**
     * Асинхронная инициализация CKEditor с ленивой загрузкой бандла.
     * @returns {Promise<CKEDITOR.editor|null>}
     */
    async initializeEditor() {
        try {
            const CKEDITOR = await loadCKEditor();
            if (!CKEDITOR) {
                return null;
            }

            this.setupEditors(CKEDITOR);

            this.editor = CKEDITOR.replace(this.textarea.id);
            this.editor.editorId = this.textarea.id;
            this.editor.singleTemplate = this.form.singlePath;

            return this.editor;
        } catch (e) {
            console.warn('CKEditor initialization failed', e);
            return null;
        }
    }

    /**
     * CKEditor initialization (однократная на проект)
     */
    setupEditors(CKEDITOR) {
        if (!FormRichEditor.ckeditor_init) {
            CKEDITOR.config.versionCheck = false;
            CKEDITOR.config.extraPlugins = 'colorbutton,font,iframe,energineimage,energinefile';
            CKEDITOR.config.removePlugins = 'exportpdf';
            CKEDITOR.config.allowedContent = true;
            CKEDITOR.config.toolbar = [
                { name: 'document', items: [ 'Source' ] },
                { name: 'clipboard', items: [ 'Cut', 'Copy', 'Paste', 'PasteText', 'PasteFromWord', '-', 'Undo', 'Redo' ] },
                { name: 'editing', items: [ 'Find', 'Replace', '-', 'SelectAll' ] },
                '/',
                { name: 'basicstyles', items: [ 'Bold', 'Italic', 'Underline', 'Strike', 'Subscript', 'Superscript', 'RemoveFormat' ] },
                { name: 'paragraph', items: [ 'NumberedList', 'BulletedList', '-', 'Outdent', 'Indent', '-', 'JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock' ] },
                { name: 'links', items: [ 'Link', 'Unlink', 'Anchor' ] },
                { name: 'insert', items: [ 'Image', 'Table', 'Iframe', 'EnergineImage', 'EnergineFile' ] },
                { name: 'tools', items: [ 'ShowBlocks' ] },
                '/',
                { name: 'styles', items: [ 'Styles', 'Format', 'Font', 'FontSize' ] },
                { name: 'colors', items: [ 'TextColor', 'BGColor' ] },
            ];

            // Стили для wysiwyg
            let styles = [];
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

            FormRichEditor.ckeditor_init = true;
        }
    }

    /**
     * Сохраняет текст редактора обратно в textarea перед submit
     */
    onSaveForm() {
        try {
            if (!this.editor) {
                return;
            }

            const data = this.editor.getData();
            this.textarea.value = data;
        } catch (e) {
            console.warn(e);
        }
    }
}

// Для обратной совместимости:
Form.RichEditor = FormRichEditor;

export { Form };
export default Form;

export function attachToWindow(target = globalScope) {
    if (!target) {
        return Form;
    }

    target.Form = Form;
    return Form;
}

attachToWindow();
