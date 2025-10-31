import Energine, { showLoader, hideLoader, registerBehavior as registerEnergineBehavior } from './Energine.js';
import TabPane from './TabPane.js';
import Toolbar from './Toolbar.js';
import Validator from './Validator.js';
import ModalBox from './ModalBox.js';
import AcplField from './AcplField.js';
import Cookie from './Cookie.js';
import loadCKEditor from './ckeditor/loader.js';
import ValidFormModule from './ValidForm.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

const ValidForm = ValidFormModule || globalScope?.ValidForm;
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

    static resolveElementById(id) {
        if (!id) {
            return null;
        }
        return document.getElementById(id) || null;
    }

    static resolveLinkedElements(source, mapping = {}) {
        if (!source) {
            return {};
        }

        const dataset = source.dataset || {};
        return Object.entries(mapping).reduce((result, [prop, datasetKey]) => {
            result[prop] = Form.resolveElementById(dataset[datasetKey]);
            return result;
        }, {});
    }

    static findPreviewAnchor(previewEl) {
        if (!previewEl) {
            return null;
        }
        const tagName = previewEl.tagName?.toLowerCase() || '';
        if (tagName === 'a') {
            return previewEl;
        }
        return previewEl.querySelector?.('a') || null;
    }

    static updatePreview(previewEl, { type, href, previewSrc, title } = {}) {
        if (!previewEl) {
            return;
        }

        const anchor = Form.findPreviewAnchor(previewEl);
        if (anchor) {
            if (href) {
                anchor.setAttribute('href', href);
            } else {
                anchor.removeAttribute('href');
            }
        }

        if (!type) {
            Form.resetPreview(previewEl);
            return;
        }

        switch (type) {
            case 'image':
            case 'video':
                Form.showImagePreview(previewEl, previewSrc || href || '', title || '');
                break;
            default:
                Form.showIconPreview(previewEl, Form.getPreviewIconKey(type));
                break;
        }
    }

    static togglePreviewElement(element, shouldShow) {
        if (!element) {
            return;
        }

        element.classList?.toggle('d-none', !shouldShow);
        if (shouldShow) {
            element.classList?.remove('hidden');
            element.removeAttribute?.('hidden');
            element.setAttribute?.('aria-hidden', 'false');
        } else {
            element.setAttribute?.('hidden', 'hidden');
            element.setAttribute?.('aria-hidden', 'true');
        }
    }

    static showPreviewElement(element) {
        Form.togglePreviewElement(element, true);
    }

    static hidePreviewElement(element) {
        Form.togglePreviewElement(element, false);
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
            Form.togglePreviewElement(image, false);
        }

        Form.togglePreviewElement(wrapper, true);
        if (previewEl !== wrapper) {
            Form.togglePreviewElement(previewEl, true);
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
            Form.togglePreviewElement(image, true);
        }

        const icon = wrapper.querySelector?.('.file-preview-icon');
        icon?.remove();

        Form.togglePreviewElement(wrapper, true);
        if (previewEl !== wrapper) {
            Form.togglePreviewElement(previewEl, true);
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
            Form.togglePreviewElement(image, false);
        }

        Form.togglePreviewElement(wrapper, false);
        if (previewEl !== wrapper) {
            Form.togglePreviewElement(previewEl, false);
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
        this._initializeComponentElement(element);
        this._initTabPane();
        Form.loadCSS('stylesheets/form.css');
        this._initValidator();
        this._initRichEditors();
        this._initCodeEditors();
        this._initAutocompleteFields();
        this._initCustomSelectors();
        this._bindActionHandlers();
        this._initUploaders();
        this._initDateControls();
        this._initCrudActions();
        this._enhanceEmbeddedGridIframes();
        this._registerGlobalListeners();

        Form.initializeInputs(this.form || this.componentElement);
        Form.applyRequiredHighlights(this.form || this.componentElement);
    }

    _forEachElement(selector, callback, root = null) {
        const scope = root || this.form || this.componentElement;
        if (!scope || typeof scope.querySelectorAll !== 'function') {
            return [];
        }

        const elements = typeof selector === 'string'
            ? Array.from(scope.querySelectorAll(selector))
            : Array.from(selector || []);

        if (typeof callback === 'function') {
            elements.forEach((element, index) => callback(element, index));
        }

        return elements;
    }

    _initializeCollection(property, selector, factory, options = {}) {
        const { root = this.componentElement } = options;
        const collection = [];

        this._forEachElement(selector, (element) => {
            const instance = factory(element);
            if (instance !== undefined) {
                collection.push(instance);
            }
        }, root);

        if (property) {
            this[property] = collection;
        }

        return collection;
    }

    _registerHandlers(configs, defaultRoot = this.componentElement) {
        configs.forEach(({ selector, event = 'click', handler, preventDefault = true, root = defaultRoot }) => {
            if (!selector || typeof handler !== 'function') {
                return;
            }

            this._forEachElement(selector, (element) => {
                element.addEventListener(event, (evt) => {
                    if (preventDefault) {
                        evt.preventDefault?.();
                    }

                    handler(evt.currentTarget || element, evt);
                });
            }, root);
        });
    }

    _initializeComponentElement(element) {
        this.componentElement = (typeof element === 'string')
            ? document.querySelector(element)
            : element;

        if (!this.componentElement) {
            throw new Error('Form: не найден componentElement по селектору или элементу: ' + element);
        }

        const dataset = this.componentElement.dataset || {};
        this.singlePath = dataset.eSingleTemplate
            || this.componentElement.getAttribute('data-e-single-template');

        this.form = this.componentElement.closest('form');
        if (!this.form) {
            throw new Error('Form: не найдена родительская форма для компонента.');
        }

        this.state = this.form.querySelector('#componentAction')?.value;
    }

    _initTabPane() {
        this.tabPane = new TabPane(this.componentElement, {
            onTabChange: this.onTabChange.bind(this)
        });
    }

    _initValidator() {
        this.validator = new Validator(this.form, this.tabPane);
        this.configureValidatorStyling();
    }

    _initRichEditors() {
        this._initializeCollection('richEditors', '[data-role="rich-editor"]', (textarea) => new Form.RichEditor(textarea, this));
    }

    _initCodeEditors() {
        const codeMirror = getCodeMirror();
        if (!codeMirror) {
            this.codeEditors = [];
            return;
        }

        this._initializeCollection('codeEditors', '[data-role="code-editor"]', (textarea) => (
            codeMirror.fromTextArea(textarea, {
                mode: 'text/html',
                tabMode: 'indent',
                lineNumbers: true,
                theme: 'elegant'
            })
        ));
    }

    _initAutocompleteFields() {
        this._initializeCollection('autocompleteFields', '[data-role="acpl"]', (element) => new AcplField(element));
    }

    _initCustomSelectors() {
        this._initializeCollection(null, '[data-action="open-smap"]', (element) => new Form.SmapSelector(element, this));
        this._initializeCollection(null, '[data-action="open-attachment"]', (element) => new Form.AttachmentSelector(element, this));
    }

    _bindActionHandlers() {
        this._registerHandlers([
            { selector: '[data-action="open-filelib"]', handler: (element) => this.openFileLib(element) },
            { selector: '[data-action="quick-upload"]', handler: (element) => this.openQuickUpload(element) },
            { selector: '[data-action="clear-file"]', handler: (element) => this.clearFileField(element) }
        ]);
    }

    _initUploaders() {
        this.fileUploaderMap = new Map();
        this._initializeCollection('fileUploaders', '[data-role="file-uploader"]', (uploader) => {
            const instance = new Form.Uploader(uploader, this, 'upload/');
            if (instance?.targetId) {
                this.fileUploaderMap.set(instance.targetId, instance);
            }
            return instance;
        }, { root: this.componentElement });
    }

    _initDateControls() {
        this._initializeCollection('dateControls', '[data-role="date"], [data-role="datetime"]', (dateControl) => {
            const wrapper = dateControl.closest('[data-role="form-field"]');
            const isNullable = wrapper ? wrapper.getAttribute('data-required') !== 'true' : true;
            return dateControl.getAttribute('data-role') === 'datetime'
                ? Energine.createDateTimePicker(dateControl, isNullable)
                : Energine.createDatePicker(dateControl, isNullable);
        }, { root: this.componentElement });
    }

    _initCrudActions() {
        this._registerHandlers([
            { selector: '[data-action="crud"]', handler: (trigger) => this._handleCrudAction(trigger) }
        ], this.componentElement);
    }

    _handleCrudAction(trigger) {
        const context = this._createCrudContext(trigger);
        if (!context) {
            return;
        }

        ModalBox.open({
            url: `${this.singlePath}${context.field}-${context.editor}/crud/`,
            onClose: (result) => this._processCrudResult(context, result)
        });
    }

    _createCrudContext(trigger) {
        if (!trigger) {
            return null;
        }

        const dataset = trigger.dataset || {};
        const field = dataset.field;
        const editor = dataset.editor;
        if (!field || !editor) {
            return null;
        }

        const control = this.form.querySelector(`[name="${field}"], [id="${field}"]`);
        if (!control) {
            return null;
        }

        const isSelectElement = control instanceof HTMLSelectElement;
        return {
            trigger,
            field,
            editor,
            control,
            isSelectElement,
            isMultiSelect: isSelectElement && control.multiple
        };
    }

    _processCrudResult(context, result) {
        if (!context?.control) {
            return;
        }

        const selectedValue = result?.key;
        const wasDirty = Boolean(result?.dirty);

        const shouldReload = this._shouldReloadCrudControl(context, { selectedValue, wasDirty });

        if (shouldReload && context.isSelectElement) {
            const previousSelection = this._capturePreviousSelection(context);
            this._reloadForeignKeyControl(context, { previousSelection, selectedValue });
        } else if (selectedValue) {
            this._applySelectedValue(context, selectedValue);
        }
    }

    _shouldReloadCrudControl(context, { selectedValue, wasDirty }) {
        if (!context.isSelectElement) {
            return wasDirty;
        }

        if (wasDirty) {
            return true;
        }

        if (!selectedValue) {
            return false;
        }

        return !Array.from(context.control.options || []).some((option) => option.value == selectedValue);
    }

    _capturePreviousSelection({ control, isSelectElement, isMultiSelect }) {
        if (!isSelectElement) {
            return null;
        }

        if (isMultiSelect) {
            return Array.from(control.selectedOptions || []).map((option) => option.value);
        }

        return control.value;
    }

    _reloadForeignKeyControl(context, { previousSelection, selectedValue }) {
        const { field, control, isSelectElement, isMultiSelect } = context;
        if (!isSelectElement) {
            return;
        }

        Energine.request(
            `${this.singlePath}${field}/fk-values/`,
            null,
            (data) => {
                if (!data?.result) {
                    return;
                }

                const [rows, idField, titleField] = data.result;
                control.innerHTML = '';

                rows.forEach((row) => {
                    const option = document.createElement('option');
                    Object.entries(row).forEach(([key, value]) => {
                        if (key === idField) {
                            option.value = value;
                        } else if (key === titleField) {
                            option.textContent = value;
                        } else {
                            option.setAttribute(key, value);
                        }
                    });

                    if (isMultiSelect) {
                        if (previousSelection?.includes(option.value)) {
                            option.selected = true;
                        }
                    } else if (previousSelection && option.value === previousSelection) {
                        option.selected = true;
                    }

                    control.appendChild(option);
                });

                if (selectedValue && isSelectElement) {
                    this._applySelectedValue(context, selectedValue);
                } else {
                    control.dispatchEvent(new Event('change', { bubbles: true }));
                }
            },
            this.processServerError.bind(this),
            this.processServerError.bind(this)
        );
    }

    _applySelectedValue({ control, isSelectElement, isMultiSelect }, selectedValue) {
        if (!control || !selectedValue) {
            return;
        }

        if (isMultiSelect) {
            const optionToSelect = Array.from(control.options || [])
                .find((option) => option.value == selectedValue);
            if (optionToSelect) {
                optionToSelect.selected = true;
            }
        } else if (isSelectElement) {
            control.value = selectedValue;
        } else if ('value' in control) {
            control.value = selectedValue;
        }

        control.dispatchEvent(new Event('change', { bubbles: true }));
    }

    _registerGlobalListeners() {
        this._registerModalEscapeHandler();
        this._registerTranslateShortcut();
    }

    _registerModalEscapeHandler() {
        if (window.parent.ModalBox?.initialized && window.parent.ModalBox.getCurrent()) {
            document.body.addEventListener('keypress', (evt) => {
                if (evt.key === 'Escape' || evt.key === 'esc') {
                    window.parent.ModalBox.close();
                }
            });
        }
    }

    _registerTranslateShortcut() {
        window.addEventListener('keydown', async (evt) => {
            const context = this._extractTranslateContext(evt);
            if (!context) {
                return;
            }

            try {
                evt.preventDefault();
                evt.stopPropagation();
                const translated = await this._fetchTranslation(context);
                if (translated && 'value' in context.targetField) {
                    context.targetField.value = translated;
                }
            } catch (error) {
                console.error('Google Translate request failed', error);
            }
        });
    }

    _extractTranslateContext(evt) {
        if (!this._isTranslateShortcut(evt)) {
            return null;
        }

        if (!(evt?.target instanceof Element)) {
            return null;
        }

        if (evt.repeat) {
            return null;
        }

        const targetField = evt.target;
        if (!this._isTranslatableField(targetField)) {
            return null;
        }

        const fieldId = targetField.id;
        if (!fieldId || fieldId.length < 2) {
            return null;
        }

        const separatorIndex = fieldId.lastIndexOf('_');
        if (separatorIndex === -1) {
            return null;
        }

        const fieldBase = fieldId.substring(0, separatorIndex);
        const targetLangSuffix = fieldId.substring(separatorIndex + 1);
        const parent = targetField.closest('[data-role="pane-item"]');
        const toLangAbbr = parent?.id
            ? this._resolveTargetLanguage(parent.id)
            : this._normalizeLanguageAbbr(targetLangSuffix);
        if (!toLangAbbr) {
            return null;
        }

        const srcTextElement = this._resolveSourceField(fieldBase, targetLangSuffix, targetField, parent);
        if (!srcTextElement || !('value' in srcTextElement)) {
            return null;
        }

        const srcText = srcTextElement.value;
        if (!srcText) {
            return null;
        }

        return {
            targetField,
            toLangAbbr,
            srcText
        };
    }

    _resolveSourceField(fieldBase, targetLangSuffix, targetField, targetPane) {
        if (!fieldBase || !targetField) {
            return null;
        }

        const searchRoots = [
            targetField.closest('[data-role="pane"]'),
            targetField.form,
            document
        ].filter(Boolean);

        const { defaultTabLink, defaultPane, defaultLanguageId } = this._resolveDefaultLanguageLink(searchRoots, targetPane);

        const defaultPaneField = this._findFieldInContainer(fieldBase, defaultPane, targetField);
        if (defaultPaneField) {
            return defaultPaneField;
        }

        const candidateSuffixes = [];
        const addCandidate = (suffix) => {
            if (!suffix || suffix === targetLangSuffix || candidateSuffixes.includes(suffix)) {
                return;
            }
            candidateSuffixes.push(suffix);
        };

        const defaultLangSuffix = defaultTabLink?.getAttribute('lang_abbr');
        addCandidate(defaultLangSuffix);
        addCandidate(this._normalizeLanguageAbbr(defaultLangSuffix));
        addCandidate(defaultLanguageId);

        for (const suffix of candidateSuffixes) {
            const candidate = this._findFieldBySuffix(fieldBase, suffix);
            if (candidate && candidate !== targetField && this._isTranslatableField(candidate)) {
                return candidate;
            }
        }

        const bareField = this._findFieldBySuffix(fieldBase, '');
        if (bareField && bareField !== targetField && this._isTranslatableField(bareField)) {
            return bareField;
        }

        for (const root of searchRoots) {
            const candidate = this._findFieldInContainer(fieldBase, root, targetField);
            if (candidate) {
                return candidate;
            }
        }

        return null;
    }

    _findFieldInContainer(fieldBase, container, excludeField) {
        if (!fieldBase || !container) {
            return null;
        }

        const prefix = `${fieldBase}_`;
        const selector = 'input[id], textarea[id]';
        const fields = Array.from(container.querySelectorAll?.(selector) || []);

        for (const field of fields) {
            if (field === excludeField || !this._isTranslatableField(field)) {
                continue;
            }

            if (field.id === fieldBase || field.id.startsWith(prefix)) {
                return field;
            }
        }

        return null;
    }

    _resolveTargetLanguage(paneId) {
        const anchor = this._findTabLinkForPane(paneId);
        const lang = anchor?.getAttribute('lang_abbr');
        return this._normalizeLanguageAbbr(lang);
    }

    _normalizeLanguageAbbr(lang) {
        if (!lang) {
            return null;
        }

        return lang === 'ua' ? 'uk' : lang;
    }

    _resolveDefaultLanguageLink(searchRoots, targetPane) {
        const targetPaneId = targetPane?.id;
        if (targetPaneId) {
            const currentTabLink = this._findTabLinkForPane(targetPaneId);
            const tabsContainer = currentTabLink?.closest?.('[data-role="tabs"]') || null;
            if (tabsContainer) {
                const defaultTabLink = tabsContainer.querySelector?.('[data-role="tab-link"][lang_abbr]') || null;
                if (defaultTabLink) {
                    const paneId = defaultTabLink.getAttribute('href')
                        || defaultTabLink.getAttribute('data-bs-target')
                        || defaultTabLink.getAttribute('data-mdb-target');
                    const defaultPane = paneId
                        ? document.getElementById(paneId.replace(/^#/, ''))
                        : null;

                    return {
                        defaultTabLink,
                        defaultPane,
                        defaultLanguageId: this._extractLanguageIdFromTab(defaultTabLink)
                    };
                }
            }
        }

        for (const root of searchRoots) {
            const tabsContainer = root.querySelector?.('[data-role="tabs"]');
            if (!tabsContainer) {
                continue;
            }

            const defaultTabLink = tabsContainer.querySelector?.('[data-role="tab-link"][lang_abbr]') || null;
            if (!defaultTabLink) {
                continue;
            }

            const paneId = defaultTabLink.getAttribute('href');
            const defaultPane = paneId ? document.getElementById(paneId.replace(/^#/, '')) : null;

            return {
                defaultTabLink,
                defaultPane,
                defaultLanguageId: this._extractLanguageIdFromTab(defaultTabLink)
            };
        }

        return { defaultTabLink: null, defaultPane: null, defaultLanguageId: null };
    }

    _findTabLinkForPane(paneId) {
        if (!paneId) {
            return null;
        }

        const targetRef = `#${paneId}`;
        const anchors = document.querySelectorAll('[data-role="tab-link"][href], [data-role="tab-link"][data-bs-target], [data-role="tab-link"][data-mdb-target]');
        return Array.from(anchors).find((link) => {
            const href = link.getAttribute('href');
            const bsTarget = link.getAttribute('data-bs-target');
            const mdbTarget = link.getAttribute('data-mdb-target');
            return href === targetRef || bsTarget === targetRef || mdbTarget === targetRef;
        }) || null;
    }

    _extractLanguageIdFromTab(tabLink) {
        if (!tabLink) {
            return null;
        }

        const metaNode = tabLink.parentElement?.querySelector?.('[data-role="tab-meta"]');
        if (!metaNode) {
            return null;
        }

        const metaText = metaNode.textContent || '';
        const match = /lang:\s*([\w-]+)/i.exec(metaText);
        return match ? match[1] : null;
    }

    _findFieldBySuffix(fieldBase, suffix) {
        if (!fieldBase || suffix === null || suffix === undefined) {
            return null;
        }

        const fieldId = suffix ? `${fieldBase}_${suffix}` : fieldBase;
        return document.getElementById(fieldId) || null;
    }

    _isTranslatableField(element) {
        if (!element) {
            return false;
        }

        const tagName = element.tagName?.toLowerCase();
        return tagName === 'input' || tagName === 'textarea';
    }

    _isTranslateShortcut(evt) {
        if (!evt) {
            return false;
        }

        const isDigitAsterisk = evt.code === 'Digit8' && evt.shiftKey;
        const isNumpadMultiply = evt.code === 'NumpadMultiply';
        const isStarKey = evt.key === '*';

        return (isDigitAsterisk || isNumpadMultiply || isStarKey) && (evt.target instanceof Element);
    }

    async _fetchTranslation({ srcText, toLangAbbr }) {
        const params = new URLSearchParams({
            client: 'gtx',
            sl: 'ru',
            tl: toLangAbbr,
            dt: 't',
            q: srcText
        });

        const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`);
        const resultText = await response.text();
        return this._parseTranslationResponse(resultText);
    }

    _parseTranslationResponse(resultText) {
        if (!resultText) {
            return '';
        }

        const prefixLength = 4;
        let translated = resultText.length > prefixLength
            ? resultText.substring(prefixLength)
            : resultText;

        const endIndex = translated.indexOf('","');
        if (endIndex !== -1) {
            translated = translated.substring(0, endIndex);
        }

        if (!translated) {
            return '';
        }

        return translated.charAt(0).toUpperCase() + translated.slice(1);
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
            iframe.style.height = '99%';
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
        const dataset = button?.dataset || {};
        const targetInput = Form.resolveElementById(dataset.target);
        const { linkInput, previewEl, fileInput } = Form.resolveLinkedElements(button, {
            linkInput: 'link',
            previewEl: 'preview',
            fileInput: 'input'
        });

        [targetInput, linkInput].filter(Boolean).forEach((input) => {
            if ('value' in input) {
                input.value = '';
            }
        });

        Form.updatePreview(previewEl);

        if (button) {
            button.classList.add('d-none');
        }

        if (fileInput) {
            fileInput.value = '';
        }

        const uploader = dataset.target ? this.fileUploaderMap?.get(dataset.target) : null;
        uploader?.reset();
    }

    // processFileResult
    processFileResult(result, button) {
        if (!result) return;

        const dataset = button?.dataset || {};
        const { linkInput, previewEl } = Form.resolveLinkedElements(button, {
            linkInput: 'link',
            previewEl: 'preview'
        });

        if (linkInput) {
            linkInput.value = result['upl_path'];
        } else if (dataset.link) {
            console.warn('processFileResult: Не найден элемент для id:', dataset.link, button, result);
        }

        const path = result['upl_path'] || '';
        const type = result['upl_internal_type'];
        const href = path ? Energine.media + path : '';
        const previewSrc = path
            ? (type === 'video' ? `${Energine.resizer}w0-h0/${path}` : href)
            : '';

        Form.updatePreview(previewEl, {
            type,
            href,
            previewSrc,
            title: result['upl_title'] || ''
        });

        const clearButton = dataset.link
            ? this.form.querySelector(`[data-action="clear-file"][data-target="${dataset.link}"]`)
            : null;
        clearButton?.classList.remove('d-none', 'hidden');
        clearButton?.removeAttribute('hidden');
    }

    // openFileLib
    openFileLib(button) {
        const dataset = button?.dataset || {};
        const linkInput = Form.resolveElementById(dataset.link);
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
        const dataset = button?.dataset || {};
        const fileInput = Form.resolveElementById(dataset.input);
        if (fileInput) {
            fileInput.click();
            return;
        }

        const linkInput = Form.resolveElementById(dataset.link);
        const path = linkInput ? (linkInput.value || null) : null;
        const quickUploadPid = dataset.quickUploadPid;
        const quickUploadEnabled = dataset.quickUploadEnabled === '1';
        // let overlay = this.overlay;
        let processResult = this.processFileResult.bind(this);

        if (!quickUploadEnabled || !quickUploadPid) return;

        ModalBox.open({
            url: this.singlePath + 'file-library/' + quickUploadPid + '/add',
            extraData: path,
            onClose: async (result) => {
                const uploadId = result?.data;
                if (!uploadId) {
                    return;
                }

                try {
                    showLoader();
                    const response = await fetch(this.singlePath + `file-library/${quickUploadPid}/get-data/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: `json=1&filter=${encodeURIComponent(JSON.stringify({
                            condition: '=',
                            share_uploads: { upl_id: [uploadId] }
                        }))}`
                    });

                    const data = await response.json();
                    if (data?.data?.length === 2) {
                        processResult(data.data[1], button);
                    }
                } catch (error) {
                    console.error('Quick upload fetch failed', error);
                } finally {
                    hideLoader();
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
     * and sets iframe height to 100%.
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
            iframe.style.flex = '1 1 auto';
            iframe.style.minHeight = '0';

            // Ensure parent chain can allocate height
            const paneBody = iframe.closest('[data-pane-part="body"]');
            const tabContent = iframe.closest('.tab-content');
            const tabPane = iframe.closest('.tab-pane');
            ensureFlexChain(paneBody);
            ensureFlexChain(tabContent);
            ensureFlexChain(tabPane);

            // Ensure iframe parent can stretch while preventing cumulative inline heights.
            try {
                const host = iframe.parentElement;
                if (host) {
                    const hostStyle = window.getComputedStyle(host);
                    if (hostStyle.display.indexOf('flex') === -1) {
                        host.style.display = 'flex';
                        host.style.flexDirection = 'column';
                    }
                    if (!host.style.minHeight || host.style.minHeight === '' || host.style.minHeight === 'auto') {
                        host.style.minHeight = '0';
                    }
                    if (!host.style.flex || host.style.flex === '') {
                        host.style.flex = '1 1 auto';
                    }
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
        const dataset = this.form.componentElement.dataset || {};
        const template = dataset.eTemplate
            || this.form.componentElement.getAttribute('data-e-template');
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
        const dataset = this.form.componentElement.dataset || {};
        const template = dataset.eTemplate
            || this.form.componentElement.getAttribute('data-e-template');

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
try {
    if (typeof registerEnergineBehavior === 'function') {
        registerEnergineBehavior('Form', Form);
        registerEnergineBehavior('ValidForm', ValidForm);
    }
} catch (error) {
    if (Energine && typeof Energine.safeConsoleError === 'function') {
        Energine.safeConsoleError(error, '[Form] Failed to register behaviors');
    } else if (typeof console !== 'undefined' && console.warn) {
        console.warn('[Form] Failed to register behaviors', error);
    }
}
