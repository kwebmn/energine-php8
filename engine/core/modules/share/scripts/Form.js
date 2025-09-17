ScriptLoader.load('ckeditor/ckeditor', 'TabPane', 'Toolbar', 'Validator', 'ModalBox', 'AcplField', 'Cookie');

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
     * Переинициализирует floating labels из MDB.
     * @param {Document|DocumentFragment|Element|Array<Element>|NodeList} [context=document]
     */
    static initializeInputs(context = document) {
        const inputModule = window?.mdb?.Input;
        if (!inputModule || typeof inputModule.init !== 'function') {
            return;
        }

        const collectTargets = (source) => {
            const result = [];
            if (!source) {
                return result;
            }

            if ((source instanceof Element || source instanceof DocumentFragment) && typeof source.matches === 'function') {
                if (source.matches('.form-outline')) {
                    result.push(source);
                }
            }

            if (typeof source.querySelectorAll === 'function') {
                result.push(...source.querySelectorAll('.form-outline'));
            }

            return result;
        };

        let nodes = [];
        if (Form.isNodeCollection(context)) {
            nodes = context ? Array.from(context).flatMap((item) => collectTargets(item)) : [];
        } else {
            nodes = collectTargets(context);
        }

        const uniqueNodes = Array.from(new Set(nodes));

        if (!uniqueNodes.length) {
            try {
                inputModule.init();
            } catch (error) {
                console.warn('Form.init: failed to initialize MDB inputs', error);
            }
            return;
        }

        let lastError = null;
        const attempts = [
            () => inputModule.init(uniqueNodes),
            () => uniqueNodes.forEach((node) => inputModule.init(node)),
            () => inputModule.init(),
        ];

        for (const attempt of attempts) {
            try {
                attempt();
                lastError = null;
                break;
            } catch (error) {
                lastError = error;
            }
        }

        if (lastError) {
            console.warn('Form.init: failed to initialize MDB inputs', lastError);
        }
    }

    request(...args) {
        return Energine.request(...args);
    }

    constructor(element) {
        // Загрузка стилей (имитируем Asset.css)
        Form.loadCSS('stylesheets/form.mdb.css');

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
        this.form.querySelectorAll('[data-role="code-editor"]').forEach(textarea => {
            this.codeEditors.push(
                CodeMirror.fromTextArea(textarea, {
                    mode: "text/html",
                    tabMode: "indent",
                    lineNumbers: true,
                    theme: 'elegant'
                })
            );
        });

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

                ModalBox.open({
                    url: `${this.singlePath}${dataField}-${dataEditor}/crud/`,
                    onClose: (result) => {
                        const selectedValue = result?.key;
                        if (result?.dirty) {
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
                                        });
                                        if (selectedValue) {
                                            control.value = selectedValue;
                                        }
                                    }
                                },
                                this.processServerError.bind(this),
                                this.processServerError.bind(this)
                            );
                        } else if (selectedValue) {
                            control.value = selectedValue;
                        }
                    }
                });
            });
        });

        Form.initializeInputs(this.form || this.componentElement);

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
        const targetId = button?.dataset?.target || button?.dataset?.link;
        const previewId = button?.dataset?.preview;
        const captionId = button?.dataset?.caption;
        const segmentId = button?.dataset?.segment;
        const linkInput = targetId ? document.getElementById(targetId) : null;
        if (linkInput) {
            linkInput.value = '';
            try {
                linkInput.dispatchEvent(new Event('change', { bubbles: true }));
            } catch {
                /* empty */
            }
        }
        if (captionId) {
            const captionElement = document.getElementById(captionId);
            if (captionElement) {
                if ('value' in captionElement) {
                    captionElement.value = '';
                } else {
                    captionElement.textContent = '';
                    captionElement.setAttribute('hidden', 'hidden');
                }
            }
        }
        const preview = previewId ? document.getElementById(previewId) : null;
        if (preview) {
            const anchor = preview.tagName.toLowerCase() === 'a' ? preview : preview.querySelector('a');
            if (anchor) {
                anchor.removeAttribute('href');
            }
            const image = preview.querySelector('img');
            if (image) {
                image.removeAttribute('src');
            }
            preview.setAttribute('hidden', 'hidden');
        }
        if (segmentId) {
            const segmentElement = document.getElementById(segmentId);
            if (segmentElement) {
                segmentElement.textContent = '';
            }
        }
        if (button) {
            button.setAttribute('hidden', 'hidden');
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
        let image = null;
        if (previewEl) {
            image = previewEl.querySelector('img');
            if (!image && previewEl.tagName.toLowerCase() === 'img') {
                image = previewEl;
            }
        }
        if (image) {
            let src;
            switch (result['upl_internal_type']) {
                case 'image':
                    src = Energine.media + result['upl_path'];
                    break;
                case 'video':
                    src = Energine.resizer + 'w0-h0/' + result['upl_path'];
                    break;
                default:
                    src = Energine['static'] + 'images/icons/icon_undefined.gif';
            }
            image.setAttribute('src', src);
            if (anchor) {
                anchor.setAttribute('href', Energine.media + result['upl_path']);
            }
            previewEl?.removeAttribute('hidden');
        }

        const clearButton = linkId
            ? this.form.querySelector(`[data-action="clear-file"][data-target="${linkId}"]`)
            : null;
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

    static loadCSS(href) {
        if (![...document.querySelectorAll('link[rel=stylesheet]')].some(l => l.href.includes(href))) {
            let link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            document.head.appendChild(link);
        }
    }

    static toQueryString(form) {
        // Преобразовать форму в queryString
        const data = new FormData(form);
        return Array.from(data.entries())
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');
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
        const baseRaw = (control.id || control.name || 'field').toString();
        const base = baseRaw.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'field';
        let id = `${base}-feedback`;
        while (document.getElementById(id)) {
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
        this.smap = {
            id: null,
            name: null,
            caption: null,
            segment: null,
            clearButton: null
        };
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

            const linkId = target.dataset.link;
            const smapIdName = target.dataset.id || target.getAttribute('smap_id') || linkId;
            const smapNameName = target.dataset.name || target.getAttribute('smap_name');
            const smapCaptionName = target.dataset.caption || smapNameName;
            const smapSegmentName = target.dataset.segment || target.getAttribute('smap_segment');

            this.smap.id = smapIdName ? document.getElementById(smapIdName) : null;
            this.smap.name = smapNameName ? document.getElementById(smapNameName) : null;
            this.smap.caption = smapCaptionName ? document.getElementById(smapCaptionName) : null;
            if (!this.smap.caption && this.smap.name) {
                this.smap.caption = this.smap.name;
            }

            const defaultSegmentId = smapSegmentName || 'smap_pid_segment';
            this.smap.segment = defaultSegmentId ? document.getElementById(defaultSegmentId) : null;

            const wrapper = target.closest('[data-role="form-field"]');
            this.smap.clearButton = wrapper ? wrapper.querySelector('[data-action="clear-file"]') : null;

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
            if (result.smap_name) {
                name += result.smap_name;
            }

            const updateElement = (element, value) => {
                if (!element) return;
                if ('value' in element) {
                    element.value = value;
                } else {
                    element.textContent = value;
                }
                if (typeof element.removeAttribute === 'function' && element.hasAttribute('hidden')) {
                    element.removeAttribute('hidden');
                }
            };

            updateElement(this.smap.name, name);
            if (this.smap.caption && this.smap.caption !== this.smap.name) {
                updateElement(this.smap.caption, name);
            }

            if (this.smap.id) {
                this.smap.id.value = result.smap_id ?? '';
                try {
                    this.smap.id.dispatchEvent(new Event('change', { bubbles: true }));
                } catch {
                    /* empty */
                }
            }

            if (this.smap.segment) {
                this.smap.segment.textContent = result.smap_segment ?? '';
            }

            if (this.smap.clearButton) {
                this.smap.clearButton.removeAttribute('hidden');
            }
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
        this.setupEditors();

        this.textarea = (typeof textarea === 'string')
            ? document.getElementById(textarea) || document.querySelector(textarea)
            : textarea;

        this.form = form;

        try {
            this.editor = CKEDITOR.replace(this.textarea.id);
            this.editor.editorId = this.textarea.id;
            this.editor.singleTemplate = this.form.singlePath;
        } catch (e) {
            console.warn(e);
        }
    }

    /**
     * CKEditor initialization (однократная на проект)
     */
    setupEditors() {
        if (!FormRichEditor.ckeditor_init) {
            CKEDITOR.config.versionCheck = false;
            CKEDITOR.config.extraPlugins = 'energineimage,energinefile';
            CKEDITOR.config.removePlugins = 'exportpdf';
            CKEDITOR.config.allowedContent = true;
            CKEDITOR.config.toolbar = [
                { name: 'document', groups: [ 'mode' ], items: [ 'Source' ] },
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
            CKEDITOR.stylesSet.add('energine', styles);
            CKEDITOR.config.stylesSet = 'energine';

            FormRichEditor.ckeditor_init = true;
        }
    }

    /**
     * Сохраняет текст редактора обратно в textarea перед submit
     */
    onSaveForm() {
        try {
            const data = this.editor.getData();
            this.textarea.value = data;
        } catch (e) {
            console.warn(e);
        }
    }
}

// Для обратной совместимости:
Form.RichEditor = FormRichEditor;
;