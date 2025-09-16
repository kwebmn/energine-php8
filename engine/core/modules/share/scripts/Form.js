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
 * @requires Swiff.Uploader
 *
 * @author Pavel Dubenko
 *
 * @version 1.0.1
 */

class Form {
    // Класс Energine.request как статическое свойство
    static request = Energine.request;

    request(...args) {
        return Energine.request(...args);
    }

    constructor(element) {
        // Загрузка стилей (имитируем Asset.css)
        Form.loadCSS('stylesheets/form.css');

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
        this.form.classList.add('form');

        // Состояние формы
        this.state = this.form.querySelector('#componentAction')?.value;

        // Панели с табами
        this.tabPane = new TabPane(this.componentElement, {
            onTabChange: this.onTabChange.bind(this)
        });

        // Валидатор
        this.validator = new Validator(this.form, this.tabPane);

        // Рич-редакторы
        this.richEditors = [];
        this.form.querySelectorAll('textarea.richEditor').forEach(textarea => {
            this.richEditors.push(new Form.RichEditor(textarea, this));
        });

        // CodeMirror
        this.codeEditors = [];
        this.form.querySelectorAll('textarea.code').forEach(textarea => {
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
        this.form.querySelectorAll('input.acpl').forEach(el => {
            new AcplField(el);
        });

        // Показ/скрытие поля
        const showHideFunc = (e) => {
            e.preventDefault();
            let el = e.target;
            let field = el.closest('.field');
            if (field) {
                if (field.classList.contains('min')) {
                    field.classList.remove('min');
                    field.classList.add('max');
                } else if (el.classList.contains('icon_min_max') && field.classList.contains('max')) {
                    field.classList.remove('max');
                    field.classList.add('min');
                }
            }
        };

        this.form.querySelectorAll('.field .control.toggle').forEach(el => {
            el.addEventListener('click', showHideFunc);
        });
        this.form.querySelectorAll('.icon_min_max').forEach(el => {
            el.addEventListener('click', showHideFunc);
        });

        // SmapSelector
        this.form.querySelectorAll('.smap_selector').forEach(el => {
            new Form.SmapSelector(el, this);
        });

        // AttachmentSelector
        this.form.querySelectorAll('.attachment_selector').forEach(el => {
            new Form.AttachmentSelector(el, this);
        });

        // Uploaders
        this.uploaders = [];
        this.componentElement.querySelectorAll('.uploader').forEach(uploader => {
            this.uploaders.push(new Form.Uploader(uploader, this, 'upload/'));
        });

        // Date controls
        this.dateControls = [];
        let dates = [
            ...this.componentElement.querySelectorAll('.inp_date'),
            ...this.componentElement.querySelectorAll('.inp_datetime')
        ];
        dates.forEach(dateControl => {
            let isNullable = !dateControl.closest('.field')?.classList.contains('required');
            if (dateControl.classList.contains('inp_datetime')) {
                this.dateControls.push(Energine.createDateTimePicker(dateControl, isNullable));
            } else {
                this.dateControls.push(Energine.createDatePicker(dateControl, isNullable));
            }
        });

        // Оформление .pane
        this.componentElement.querySelectorAll('.pane').forEach(pane => {
            pane.style.border = '1px dotted #777';
            pane.style.overflow = 'auto';
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
        window.addEventListener('keypress', function (evt) {
            if (evt.code === 'Digit8' && evt.shiftKey) { // shift + *
                const fieldId = evt.target.id;
                const fieldBase = fieldId.substring(0, fieldId.length - 2);
                const parent = $(evt.target).closest('[data-role="pane-item"]');
                if (parent.length) {
                    const parentId = parent.attr('id');
                    let toLangAbbr = $(`a[href="#${parentId}"]`).attr('lang_abbr');
                    if (toLangAbbr === 'ua') toLangAbbr = 'uk';
                    const srcText = $(`#${fieldBase}_1`).val();
                    $.ajax({
                        url: 'https://translate.googleapis.com/translate_a/single',
                        data: {
                            client: 'gtx',
                            sl: 'ru',
                            tl: toLangAbbr,
                            dt: 't',
                            q: srcText
                        },
                        success: function (result) {
                            result = result.substring(4);
                            result = result.substring(0, result.indexOf('","'));
                            result = result.charAt(0).toUpperCase() + result.slice(1);
                            $(evt.target).val(result);
                        },
                        dataType: 'text'
                    });
                }
            }
        });

        // CRUD
        this.componentElement.querySelectorAll('.crud').forEach(crudEl => {
            crudEl.addEventListener('click', (e) => {
                let dataField = e.target.getAttribute('data-field');
                let dataEditor = e.target.getAttribute('data-editor');
                let control = this.form.querySelector(`[name="${dataField}"], [id="${dataField}"]`);
                if (control) {
                    ModalBox.open({
                        url: `${this.singlePath}${dataField}-${dataEditor}/crud/`,
                        onClose: (result) => {
                            const selectedValue = result.key;
                            if (result.dirty) {
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
                }
            });
        });

        // Controls с доп. элементами
        this.appendedControls = Array.from(this.form.querySelectorAll('.with_append'));
        this.appendedControls.forEach(el => {
            el.isOnFocus = false;
            el.controlEl = el;
            el.addEventListener('mouseenter', this.glow.bind(this));
            el.addEventListener('mouseleave', this.glow.bind(this));
        });

        this.appendedControls.forEach((parentEl, id) => {
            parentEl.querySelectorAll('input,select').forEach(el => {
                el.controlEl = parentEl;
                el.addEventListener('focus', this.glow.bind(this));
                el.addEventListener('blur', this.glow.bind(this));
            });
        });
    }

    // onTabChange
    onTabChange(tab) {
        if (tab && tab.getAttribute('data-src') && !tab.loaded) {
            tab.pane.innerHTML = '';
            let iframe = document.createElement('iframe');
            iframe.src = Energine['base'] + tab.getAttribute('data-src');
            iframe.frameBorder = 0;
            iframe.scrolling = 'no';
            iframe.style.width = '99%';
            iframe.style.height = '89%';
            tab.pane.appendChild(iframe);
            tab.loaded = true;
        }
    }

    // Glow effect
    glow(ev) {
        switch (ev.type) {
            case 'focus':
                ev.target.controlEl.isOnFocus = true;
            case 'mouseenter':
                ev.target.controlEl.classList.add('focus_block');
                ev.stopPropagation?.();
                break;
            case 'blur':
                ev.target.controlEl.isOnFocus = false;
            case 'mouseleave':
                if (!ev.target.controlEl.isOnFocus) {
                    ev.target.controlEl.classList.remove('focus_block');
                    ev.stopPropagation?.();
                }
                break;
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
    clearFileField(fieldId, lnk) {
        let preview;
        this.form.querySelector(`#${fieldId}`).value = '';
        preview = this.form.querySelector(`#${fieldId}_preview`);
        if (preview) {
            preview.removeAttribute('href');
            preview.style.display = 'none';
        }
        lnk.style.display = 'none';
    }

    // processFileResult
    processFileResult(result, button) {
        if (!result) return;

        // получаем элемент по id, если передано id
        let linkId = button.getAttribute('link');
        let linkInput = document.getElementById(linkId);
        if (linkInput) {
            linkInput.value = result['upl_path'];
        } else {
            console.warn('processFileResult: Не найден элемент для id:', linkId, button, result);
        }

        let previewId = button.getAttribute('preview');
        let previewEl = document.getElementById(previewId);

        let image = previewEl && previewEl.tagName.toLowerCase() === 'img'
            ? previewEl
            : previewEl?.querySelector('img');
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
            if (previewEl) {
                previewEl.setAttribute('href', Energine.media + result['upl_path']);
                previewEl.style.display = '';
            }
        }

        let nextClear = button.nextElementSibling;
        if (nextClear && nextClear.classList.contains('lnk_clear')) {
            nextClear.style.display = 'inline';
        }
    }

    // openFileLib
    openFileLib(button) {
        let selector = button.getAttribute('link');
        let linkInput = document.querySelector(selector);

        let path = null;
        if (linkInput) {
            path = linkInput.value || null;
        }

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
        // Получаем id связанного поля из атрибута link
        let fieldId = button.getAttribute('link');
        let linkInput = document.getElementById(fieldId);

        ModalBox.open({
            url: this.singlePath + 'tags/show/',
            //extraData: data.data,
            onClose: (result) => {
                if (result) {
                    // Устанавливаем новое значение тегов в input
                    linkInput.value = result;
                }
            }
        });

    }

    // openQuickUpload
    openQuickUpload(button) {
        let linkInput = document.querySelector(button.getAttribute('link'));
        let path = linkInput.value || null;
        let quick_upload_pid = button.getAttribute('quick_upload_pid');
        let quick_upload_enabled = button.getAttribute('quick_upload_enabled');
        // let overlay = this.overlay;
        let processResult = this.processFileResult.bind(this);

        if (!quick_upload_enabled) return;

        ModalBox.open({
            url: this.singlePath + 'file-library/' + quick_upload_pid + '/add',
            extraData: path,
            onClose: (result) => {
                if (result && result.data) {
                    let upl_id = result.data;
                    if (upl_id) {
                        // overlay.show();
                        showLoader();
                        fetch(this.singlePath + `file-library/${quick_upload_pid}/get-data/`, {
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
        this.element = (typeof uploaderElement === 'string')
            ? document.querySelector(uploaderElement)
            : uploaderElement;
        if (!this.element) return;

        this.form = form;

        // Для сохранения совместимости
        const extraData = typeof ModalBox.getExtraData === 'function'
            ? ModalBox.getExtraData()
            : '';

        this.swfUploader = new Swiff.Uploader({
            path: 'scripts/Swiff.Uploader.swf',
            url: `${this.form.singlePath}${path}?json`,
            verbose: !!Energine.debug,
            queued: false,
            multiple: false,
            target: this.element,
            instantStart: true,
            appendCookieData: false,
            timeLimit: 0,
            data: {
                'NRGNCookie': document.cookie,
                'path': (typeof extraData === 'string' ? extraData : ''),
                'element': this.element.getAttribute('nrgn:input')
            },
            typeFilter: {
                'All files (*.*)': '*.*',
                'Images (*.jpg, *.jpeg, *.gif, *.png)': '*.jpg; *.jpeg; *.gif; *.png',
                'Flash video (*.flv)': '*.flv'
            },
            onFileComplete: this.afterUpload.bind(this),
            onFileProgress: (uploadInfo) => {
                const indicator = this.form.form.querySelector('#indicator');
                if (indicator) indicator.textContent = uploadInfo.progress.percentLoaded + "%";
            },
            onFileOpen: () => {
                const loader = this.form.form.querySelector('#loader');
                const indicator = this.form.form.querySelector('#indicator');
                if (loader) loader.classList.remove('hidden');
                if (indicator) indicator.classList.remove('hidden');
            },
            onComplete: () => {
                const loader = this.form.form.querySelector('#loader');
                const indicator = this.form.form.querySelector('#indicator');
                if (loader) loader.classList.add('hidden');
                if (indicator) indicator.classList.add('hidden');
            },
            onFail: this.handleError.bind(this),
            onSelectFail: this.handleError.bind(this)
        });
    }

    /**
     * Callback after upload.
     * @param {Object} uploadInfo
     */
    afterUpload(uploadInfo) {
        this._show_preview(uploadInfo);
    }

    /**
     * Callback for error handling.
     */
    handleError() {
        this.form.validator.showError(this.element, 'При загрузке файла произошла ошибка');
    }

    /**
     * Show file preview after upload.
     * @param {Object} file
     */
    _show_preview(file) {
        if (!file.response.error) {
            let data = {};
            try {
                data = JSON.parse(file.response.text);
            } catch (e) {
                this.handleError();
                return;
            }
            const preview = document.querySelector(`${data.element}_preview`);
            const input = document.querySelector(`${data.element}`);
            if (preview && input) {
                input.value = data.file;
                const uplName = document.querySelector('#upl_name');
                if (uplName && !uplName.value) {
                    uplName.value = data.title;
                }
                let previewImg = preview.querySelector('img');
                if (!previewImg) {
                    previewImg = document.createElement('img');
                    previewImg.setAttribute('border', 0);
                    preview.appendChild(previewImg);
                }
                previewImg.src = data.preview;
            }
        } else {
            this.handleError();
        }
    }

    /**
     * Remove the file preview.
     * @param {string} fieldId
     * @param {Element} control
     */
    removeFilePreview(fieldId, control) {
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
            // Найдем target по data-атрибуту (как было через getProperty('smap_id') и getProperty('smap_name'))
            let smapIdName = e.target.getAttribute('smap_id') || e.target.dataset.smapId;
            let smapNameName = e.target.getAttribute('smap_name') || e.target.dataset.smapName;

            // Поля для записи результатов (элементы input или т.п.)
            this.smap.id = document.getElementById(smapIdName);
            this.smap.name = document.getElementById(smapNameName);

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
            const uplNameId = e.target.getAttribute('upl_name') || e.target.dataset.uplName;
            const uplIdId   = e.target.getAttribute('upl_id')   || e.target.dataset.uplId;

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
            if (spanField) spanField.innerHTML = name;

            const segmentObject = document.getElementById('smap_pid_segment');
            if (segmentObject) segmentObject.innerHTML = segment;

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
            if (spanField) spanField.innerHTML = savedData.name;

            const segmentObject = document.getElementById('smap_pid_segment');
            if (segmentObject) segmentObject.innerHTML = savedData.segment;
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