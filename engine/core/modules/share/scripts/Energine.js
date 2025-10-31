import { initializeToolbars, registerToolbarComponent } from './Toolbar.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

const existingRuntime = (globalScope && globalScope.Energine && typeof globalScope.Energine === 'object'
    && typeof globalScope.Energine.createConfigFromScriptDataset === 'function'
    && typeof globalScope.Energine.consumeTranslationScripts === 'function')
    ? globalScope.Energine
    : null;

const translationScriptSelector = 'script[type="application/json"][data-energine-translations]';

const Config = {
    allowedKeys: [
        'debug',
        'base',
        'static',
        'resizer',
        'media',
        'root',
        'lang',
        'singleMode',
    ],
    mergeInto(target, values = {}) {
        if (!target || !values || typeof values !== 'object') {
            return;
        }

        this.allowedKeys.forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(values, key)) {
                target[key] = values[key];
            }
        });
    },
};

const Notifications = {
    iconMap: {
        success: {
            variant: 'success',
            icon: 'fa-circle-check',
            toastClasses: ['bg-success', 'text-white'],
        },
        error: {
            variant: 'danger',
            icon: 'fa-circle-xmark',
            toastClasses: ['bg-danger', 'text-white'],
        },
        warning: {
            variant: 'warning',
            icon: 'fa-triangle-exclamation',
            toastClasses: ['bg-warning', 'text-dark'],
        },
        info: {
            variant: 'info',
            icon: 'fa-circle-info',
            toastClasses: ['bg-info', 'text-white'],
        },
        question: {
            variant: 'primary',
            icon: 'fa-circle-question',
            toastClasses: ['bg-primary', 'text-white'],
        },
    },
    resolveIconConfig(icon) {
        return this.iconMap[icon] || this.iconMap.info;
    },
};

const BooleanUtils = {
    truthyValues: new Set(['1', 'true', 'yes', 'on']),
    normalize(value, { truthyValues = null, falseValues = null, defaultValue = false } = {}) {
        if (typeof value === 'boolean') {
            return value;
        }

        if (typeof value === 'number') {
            return value !== 0;
        }

        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();

            if (falseValues && falseValues.has(normalized)) {
                return false;
            }

            if (truthyValues) {
                return truthyValues.has(normalized);
            }

            if (falseValues) {
                return normalized.length > 0;
            }

            return this.truthyValues.has(normalized);
        }

        if (value === null || typeof value === 'undefined') {
            return defaultValue;
        }

        return Boolean(value);
    },
};

const Dataset = {
    falseValues: new Set(['0', 'false', 'no', 'off']),
    normalizeBoolean(value) {
        return BooleanUtils.normalize(value, { falseValues: this.falseValues });
    },
};

const UIHelpers = {
    resolveBootstrap(scope) {
        if (scope && scope.bootstrap) {
            return scope.bootstrap;
        }

        if (typeof bootstrap !== 'undefined') {
            return bootstrap;
        }

        return null;
    },

    resolveMDB(scope) {
        if (scope && scope.mdb) {
            return scope.mdb;
        }

        if (typeof mdb !== 'undefined') {
            return mdb;
        }

        return null;
    },

    resolveLibrary(scope) {
        const bootstrapLib = this.resolveBootstrap(scope);
        if (bootstrapLib) {
            return { type: 'bootstrap', lib: bootstrapLib };
        }

        const mdbLib = this.resolveMDB(scope);
        if (mdbLib) {
            return { type: 'mdb', lib: mdbLib };
        }

        return { type: null, lib: null };
    },

    ensureModalElement(id, template, templateId) {
        if (typeof document === 'undefined') {
            return null;
        }

        let element = document.getElementById(id);
        if (element) {
            if (templateId && element.dataset.energineTemplate !== templateId) {
                element.remove();
                element = null;
            } else {
                if (templateId) {
                    element.dataset.energineTemplate = templateId;
                }
                return element;
            }
        }

        const wrapper = document.createElement('div');
        wrapper.innerHTML = template.trim();
        element = wrapper.firstElementChild;
        if (element) {
            if (templateId) {
                element.dataset.energineTemplate = templateId;
            }
            document.body.appendChild(element);
        }

        return element;
    },

    getToastContainer() {
        if (typeof document === 'undefined') {
            return null;
        }

        let container = document.getElementById('energine-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'energine-toast-container';
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            container.style.zIndex = '11000';
            document.body.appendChild(container);
        }

        return container;
    },

    renderModal({ scope, id, template, templateId, onShow, fallback }) {
        const { lib, type } = this.resolveLibrary(scope);
        if (!lib || typeof document === 'undefined') {
            return typeof fallback === 'function' ? fallback() : null;
        }

        const modal = this.ensureModalElement(id, template, templateId);
        if (!modal) {
            return typeof fallback === 'function' ? fallback() : null;
        }

        if (!lib.Modal) {
            return typeof fallback === 'function' ? fallback() : null;
        }

        const ModalConstructor = lib.Modal;
        let instance = null;

        if (typeof ModalConstructor.getOrCreateInstance === 'function') {
            instance = ModalConstructor.getOrCreateInstance(modal, { backdrop: 'static', focus: true });
        } else {
            instance = new ModalConstructor(modal, { backdrop: 'static', focus: true });
        }

        if (typeof onShow === 'function') {
            onShow({ modal, instance, library: lib, framework: type });
        }

        if (instance && typeof instance.show === 'function') {
            instance.show();
        } else if (instance && typeof instance.open === 'function') {
            instance.open();
        }

        return modal;
    },
};

const RequestHelpers = {
    buildFetchOptions({ runtime, uri, data, method = 'post' }) {
        const normalizedMethod = (method || 'post').toUpperCase();
        const isGet = normalizedMethod === 'GET';

        const headers = {
            'X-Request': 'json',
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json, text/plain, */*',
        };

        const fetchOpts = { method: normalizedMethod, headers };
        let url = uri;

        if (runtime.forceJSON) {
            headers['Content-Type'] = 'application/json';

            if (!isGet) {
                fetchOpts.body = JSON.stringify(data);
            } else if (data) {
                const params = new URLSearchParams(data).toString();
                url += (url.includes('?') ? '&' : '?') + params;
            }

            return { url, fetchOpts };
        }

        if (typeof data === 'string') {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            fetchOpts.body = data;
            return { url, fetchOpts };
        }

        const formEncoded = runtime.serializeToFormEncoded(data || {});
        if (isGet) {
            url += (url.includes('?') ? '&' : '?') + formEncoded;
        } else {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            fetchOpts.body = formEncoded;
        }

        return { url, fetchOpts };
    },

    handleJsonResponse({ text, onSuccess, onUserError, onServerError }) {
        let response;

        try {
            response = JSON.parse(text);
        } catch {
            response = null;
        }

        if (!response) {
            if (typeof onServerError === 'function') {
                onServerError(text);
            }
            return;
        }

        if (response.result) {
            if (typeof onSuccess === 'function') {
                onSuccess(response);
            }
            return;
        }

        let msg = response.title || 'Произошла ошибка:\n';
        if (Array.isArray(response.errors)) {
            response.errors.forEach((error) => {
                if (typeof error.field !== 'undefined') {
                    msg += `${error.field} :\t`;
                }
                if (typeof error.message !== 'undefined') {
                    msg += `${error.message}\n`;
                } else {
                    msg += `${error}\n`;
                }
            });
        }

        alert(msg);
        if (typeof onUserError === 'function') {
            onUserError(response);
        }
    },
};

const exposeRuntimeToGlobal = (runtime, target = globalScope) => {
    if (!runtime || !target) {
        return runtime;
    }

    if (typeof runtime.safeConsoleError === 'function') {
        target.safeConsoleError = runtime.safeConsoleError.bind(runtime);
    }

    if (typeof runtime.showLoader === 'function') {
        target.showLoader = runtime.showLoader.bind(runtime);
    }

    if (typeof runtime.hideLoader === 'function') {
        target.hideLoader = runtime.hideLoader.bind(runtime);
    }

    target.Energine = runtime;

    return runtime;
};

class EnergineCore {
    constructor(scope) {
        this.globalScope = scope;

        this.debug = false;
        this.base = '';
        this.static = '';
        this.resizer = '';
        this.media = '';
        this.root = '';
        this.lang = '';
        this.singleMode = false;
        this.forceJSON = false;
        this.supportContentEdit = true;

        this.__isEnergineRuntime = true;

        this.moduleUrl = (typeof import.meta !== 'undefined' && import.meta && import.meta.url)
            ? import.meta.url
            : '';
        this.moduleScriptElement = null;

        this.translationStore = {};
        this.translations = this.createTranslationsFacade();
    }

    createTranslationsFacade() {
        const store = this.translationStore;
        const runtime = this;
        return {
            get(constant) {
                if (Object.prototype.hasOwnProperty.call(store, constant)) {
                    return store[constant];
                }

                if (runtime && typeof runtime.consumeTranslationScripts === 'function') {
                    const loaded = runtime.consumeTranslationScripts();
                    if (loaded && Object.prototype.hasOwnProperty.call(store, constant)) {
                        return store[constant];
                    }
                }

                return null;
            },
            set(constant, value) {
                store[constant] = value;
            },
            extend(values) {
                if (!values || typeof values !== 'object') {
                    return;
                }
                Object.assign(store, values);
            },
        };
    }

    resolveModuleScriptElement() {
        if (typeof document === 'undefined') {
            return null;
        }
        if (this.moduleScriptElement && document.contains(this.moduleScriptElement)) {
            return this.moduleScriptElement;
        }
        if (this.moduleUrl) {
            const scripts = document.getElementsByTagName('script');
            for (let i = scripts.length - 1; i >= 0; i -= 1) {
                const script = scripts[i];
                if (script.type !== 'module' || !script.src) {
                    continue;
                }

                try {
                    const normalizedSrc = new URL(script.src, document.baseURI).href;
                    if (normalizedSrc === this.moduleUrl) {
                        this.moduleScriptElement = script;
                        return script;
                    }
                } catch {
                    // ignore malformed URLs
                }
            }
        }

        if (typeof document !== 'undefined' && typeof document.querySelector === 'function') {
            const fallback = document.querySelector('script[type="module"][data-run][data-base]');
            if (fallback) {
                this.moduleScriptElement = fallback;
                if (fallback.src) {
                    try {
                        this.moduleUrl = new URL(fallback.src, document.baseURI).href;
                    } catch {
                        // ignore malformed URLs
                    }
                }
                return fallback;
            }
        }

        return null;
    }

    readConfigFromScriptDataset() {
        if (typeof document === 'undefined') {
            return {};
        }

        const scriptEl = this.resolveModuleScriptElement();
        if (!scriptEl || !scriptEl.dataset) {
            return {};
        }

        const config = {};
        Config.allowedKeys.forEach((key) => {
            if (typeof scriptEl.dataset[key] === 'undefined') {
                return;
            }

            const value = scriptEl.dataset[key];
            if (key === 'debug' || key === 'singleMode') {
                config[key] = BooleanUtils.normalize(value, { truthyValues: BooleanUtils.truthyValues });
            } else {
                config[key] = value;
            }
        });

        if (typeof scriptEl.dataset.translations !== 'undefined') {
            config.translations = scriptEl.dataset.translations;
        }

        return config;
    }

    mergeConfigValues(values = {}) {
        Config.mergeInto(this, values);
    }

    serializeToFormEncoded(obj, prefix) {
        const str = [];

        for (const key in obj) {
            if (!Object.prototype.hasOwnProperty.call(obj, key)) {
                continue;
            }

            const propKey = prefix ? `${prefix}[${key}]` : key;
            const value = obj[key];

            if (typeof value === 'object' && value !== null && !(value instanceof File)) {
                str.push(this.serializeToFormEncoded(value, propKey));
            } else {
                str.push(`${encodeURIComponent(propKey)}=${encodeURIComponent(value)}`);
            }
        }

        return str.join('&');
    }

    async request(uri, data, onSuccess, onUserError, onServerError = () => {}, method = 'post') {
        const { url, fetchOpts } = RequestHelpers.buildFetchOptions({
            runtime: this,
            uri,
            data,
            method,
        });

        try {
            const res = await fetch(url, fetchOpts);
            const text = await res.text();

            RequestHelpers.handleJsonResponse({
                text,
                onSuccess,
                onUserError,
                onServerError,
            });
        } catch (error) {
            console.error(error);
            onServerError(error.toString());
        }
    }

    cancelEvent(e) {
        const event = e || (this.globalScope ? this.globalScope.event : undefined);
        try {
            if (event && event.preventDefault) {
                event.stopPropagation();
                event.preventDefault();
            } else if (event) {
                event.returnValue = false;
                event.cancelBubble = true;
            }
        } catch (err) {
            console.warn(err);
        }
    }

    resize(img, src, w, h, r = '') {
        if (!img) return;
        img.setAttribute('src', `${this.resizer}${r}w${w}-h${h}/${src}`);
    }

    confirmBox(message, yes, no) {
        const fallback = () => {
            if (confirm(message)) {
                if (yes) yes();
            } else if (no) {
                no();
            }
        };

        const modal = UIHelpers.renderModal({
            scope: this.globalScope,
            id: 'energine-confirm-modal',
            templateId: 'swal-confirm-v1',
            template: `
            <div class="modal fade" id="energine-confirm-modal" data-energine-template="swal-confirm-v1" tabindex="-1" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="energine-confirm-modal-title" aria-describedby="energine-confirm-modal-message">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header border-0 pb-0">
                            <div class="d-flex align-items-center gap-2">
                                <i class="fa-solid fa-triangle-exclamation text-warning fs-3"></i>
                                <h5 class="modal-title mb-0" id="energine-confirm-modal-title" data-role="title">Подтверждение</h5>
                            </div>
                            <button type="button" class="btn-close" data-role="close" data-bs-dismiss="modal" data-mdb-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body" id="energine-confirm-modal-message" data-role="message"></div>
                        <div class="modal-footer border-0 pt-0">
                            <button type="button" class="btn btn-outline-secondary" data-role="cancel" data-bs-dismiss="modal" data-mdb-dismiss="modal" data-mdb-ripple-color="dark">Нет</button>
                            <button type="button" class="btn btn-primary" data-role="confirm" data-bs-dismiss="modal" data-mdb-dismiss="modal" data-mdb-ripple-color="light">Да</button>
                        </div>
                    </div>
                </div>
            </div>
        `,
            fallback,
            onShow: ({ modal }) => {
                const messageContainer = modal.querySelector('[data-role="message"]');
                if (messageContainer) {
                    messageContainer.textContent = message;
                }

                const confirmBtn = modal.querySelector('[data-role="confirm"]');
                const cancelBtn = modal.querySelector('[data-role="cancel"]');
                const closeBtn = modal.querySelector('[data-role="close"]');
                let resolved = false;

                const handleConfirm = () => {
                    resolved = true;
                    if (yes) yes();
                };
                const handleCancel = () => {
                    resolved = true;
                    if (no) no();
                };

                if (confirmBtn) {
                    confirmBtn.addEventListener('click', handleConfirm, { once: true });
                }
                [cancelBtn, closeBtn].forEach((btn) => {
                    if (btn) {
                        btn.addEventListener('click', handleCancel, { once: true });
                    }
                });

                const handleHidden = () => {
                    if (!resolved && no) {
                        resolved = true;
                        no();
                    }
                };

                ['hidden.bs.modal', 'hidden.mdb.modal'].forEach((eventName) => {
                    modal.addEventListener(eventName, handleHidden, { once: true });
                });

                setTimeout(() => {
                    if (confirmBtn && typeof confirmBtn.focus === 'function') {
                        confirmBtn.focus();
                    }
                }, 120);
            },
        });

        if (!modal) {
            return;
        }
    }

    alertBox(message) {
        const fallback = () => {
            alert(message);
        };

        const modal = UIHelpers.renderModal({
            scope: this.globalScope,
            id: 'energine-alert-modal',
            templateId: 'swal-alert-v1',
            template: `
            <div class="modal fade" id="energine-alert-modal" data-energine-template="swal-alert-v1" tabindex="-1" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="energine-alert-modal-title" aria-describedby="energine-alert-modal-message">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header border-0 pb-0">
                            <div class="d-flex align-items-center gap-2">
                                <i class="fa-solid fa-circle-exclamation text-danger fs-3"></i>
                                <h5 class="modal-title mb-0" id="energine-alert-modal-title" data-role="title">Внимание</h5>
                            </div>
                            <button type="button" class="btn-close" data-role="close" data-bs-dismiss="modal" data-mdb-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body" id="energine-alert-modal-message" data-role="message"></div>
                        <div class="modal-footer border-0 pt-0">
                            <button type="button" class="btn btn-primary" data-role="confirm" data-bs-dismiss="modal" data-mdb-dismiss="modal" data-mdb-ripple-color="light">Ок</button>
                        </div>
                    </div>
                </div>
            </div>
        `,
            fallback,
            onShow: ({ modal }) => {
                const messageContainer = modal.querySelector('[data-role="message"]');
                if (messageContainer) {
                    messageContainer.textContent = message;
                }

                const closeBtn = modal.querySelector('[data-role="close"]');
                const confirmBtn = modal.querySelector('[data-role="confirm"]');

                if (closeBtn && confirmBtn) {
                    const syncClick = () => {
                        confirmBtn.click();
                    };
                    closeBtn.addEventListener('click', syncClick, { once: true });
                }

                setTimeout(() => {
                    if (confirmBtn && typeof confirmBtn.focus === 'function') {
                        confirmBtn.focus();
                    }
                }, 120);
            },
        });

        if (!modal) {
            return;
        }
    }

    noticeBox(message, icon, callback) {
        const { lib } = UIHelpers.resolveLibrary(this.globalScope);
        if (!lib || typeof document === 'undefined') {
            alert(message);
            if (callback) callback();
            return;
        }

        if (!lib.Toast) {
            alert(message);
            if (callback) callback();
            return;
        }

        const container = UIHelpers.getToastContainer();
        if (!container) {
            alert(message);
            if (callback) callback();
            return;
        }

        const { variant, icon: iconClass, toastClasses = [] } = Notifications.resolveIconConfig(icon);

        const toast = document.createElement('div');
        toast.className = 'toast fade shadow border-0';
        toast.dataset.variant = variant;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        toast.innerHTML = `
            <div class="d-flex align-items-center gap-3 px-3 py-2">
                <span class="fs-5"><i class="fa-solid ${iconClass}"></i></span>
                <span class="flex-grow-1" data-role="message"></span>
                <button type="button" class="btn-close" data-role="close" data-bs-dismiss="toast" data-mdb-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

        toastClasses.forEach((className) => {
            toast.classList.add(className);
        });

        if (!toastClasses.some((className) => className.startsWith('text-'))) {
            toast.classList.add('text-white');
        }

        const messageContainer = toast.querySelector('[data-role="message"]');
        if (messageContainer) {
            messageContainer.textContent = message;
        }

        const closeButton = toast.querySelector('[data-role="close"]');
        if (closeButton && !toast.classList.contains('text-dark')) {
            closeButton.classList.add('btn-close-white');
        }

        container.appendChild(toast);

        const ToastConstructor = lib.Toast;
        const toastOptions = { delay: 2000, autohide: true };
        const toastInstance = typeof ToastConstructor.getOrCreateInstance === 'function'
            ? ToastConstructor.getOrCreateInstance(toast, toastOptions)
            : new ToastConstructor(toast, toastOptions);

        const handleHidden = () => {
            if (toastInstance && typeof toastInstance.dispose === 'function') {
                toastInstance.dispose();
            }
            toast.remove();
            if (callback) {
                callback();
            }
        };

        ['hidden.bs.toast', 'hidden.mdb.toast'].forEach((eventName) => {
            toast.addEventListener(eventName, handleHidden, { once: true });
        });

        if (toastInstance && typeof toastInstance.show === 'function') {
            toastInstance.show();
        }
    }

    createDatePicker() {
        // Placeholder for date picker integration
    }

    createDateTimePicker() {
        // Placeholder for date-time picker integration
    }

    loadCSS(file) {
        if (typeof document === 'undefined') return;
        if (!document.querySelector(`link[href$="${file}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = file;
            document.head.appendChild(link);
        }
    }

    boot(config = {}) {
        const { translations: translationsConfig, ...rest } = config;

        this.mergeConfigValues(rest);

        if (translationsConfig) {
            this.stageTranslations(translationsConfig);
        }

        return this;
    }

    stageTranslations(values) {
        if (values === null || typeof values === 'undefined') {
            return;
        }

        let normalized = values;

        if (typeof normalized === 'string') {
            const payload = normalized.trim();
            if (!payload) {
                return;
            }

            try {
                normalized = JSON.parse(payload);
            } catch (error) {
                this.safeConsoleError(error, '[Energine.translations] Failed to parse staged translations payload');
                return;
            }
        }

        if (!normalized || typeof normalized !== 'object' || Array.isArray(normalized)) {
            return;
        }

        this.translations.extend(normalized);
    }

    consumeTranslationScripts() {
        if (typeof document === 'undefined') {
            return false;
        }

        const scripts = document.querySelectorAll(translationScriptSelector);
        if (!scripts || !scripts.length) {
            return false;
        }

        let consumed = false;

        scripts.forEach((script) => {
            if (!script || (script.dataset && script.dataset.energineTranslationsProcessed === '1')) {
                return;
            }

            const payload = script.textContent ? script.textContent.trim() : '';
            if (!payload) {
                if (script.dataset) {
                    script.dataset.energineTranslationsProcessed = '1';
                }
                return;
            }

            try {
                const parsed = JSON.parse(payload);
                this.stageTranslations(parsed);
                consumed = true;
                if (script.dataset) {
                    script.dataset.energineTranslationsProcessed = '1';
                }
                if (typeof script.remove === 'function') {
                    script.remove();
                } else {
                    script.textContent = '';
                }
            } catch (error) {
                this.safeConsoleError(error, '[Energine.translations] Failed to parse staged translations payload');
            }
        });

        return consumed;
    }

    createConfigFromProps(props = {}) {
        const config = { ...props };

        ['debug', 'forceJSON', 'supportContentEdit', 'singleMode'].forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(config, key)) {
                config[key] = BooleanUtils.normalize(config[key], { truthyValues: BooleanUtils.truthyValues });
            }
        });

        return config;
    }

    createConfigFromScriptDataset(overrides = {}) {
        const baseConfig = this.readConfigFromScriptDataset();
        return this.createConfigFromProps({ ...baseConfig, ...overrides });
    }

    safeConsoleError(e, context = '') {
        if (typeof console === 'undefined' || !console.error || !console.groupCollapsed) {
            return;
        }

        const message = (e && e.message) ? e.message : e;

        console.groupCollapsed(
            `%c[App Error]%c ${context ? `[${context}] ` : ''}%c${message}`,
            'color:#fff; background:#dc3545; padding:2px 6px; border-radius:3px;',
            'color:#aaa; font-size:11px;',
            'color:#dc3545;',
        );

        if (e && e.stack) {
            console.error('%cStack trace:', 'color:#888');
            console.error(`%c${e.stack}`, 'color:#dc3545; font-size:12px;');
        } else {
            console.error(e);
        }

        console.info(
            `%c${new Date().toLocaleString()}`,
            'color:#888; font-size:10px;',
        );

        console.groupEnd();
    }

    showLoader(container = (typeof document !== 'undefined' ? document.body : undefined)) {
        if (!container || typeof document === 'undefined') {
            return;
        }

        if (!container.querySelector('.global-loader')) {
            const loader = document.createElement('div');
            loader.className = 'global-loader d-flex justify-content-center align-items-center position-absolute top-0 start-0 w-100 h-100 bg-white bg-opacity-75';
            loader.style.zIndex = 9999;
            loader.innerHTML = `
                <div class="spinner-border text-primary" role="status" style="width:3rem; height:3rem;">
                    <span class="visually-hidden">Loading...</span>
                </div>
            `;
            const computeStyle = (this.globalScope && this.globalScope.getComputedStyle)
                ? this.globalScope.getComputedStyle(container)
                : (typeof window !== 'undefined' && window.getComputedStyle
                    ? window.getComputedStyle(container)
                    : null);
            if (computeStyle && (computeStyle.position === 'static' || !computeStyle.position)) {
                container.style.position = 'relative';
            }
            container.appendChild(loader);
        }
    }

    hideLoader(container = (typeof document !== 'undefined' ? document.body : undefined)) {
        if (!container || typeof document === 'undefined') {
            return;
        }

        const loader = container.querySelector('.global-loader');
        if (loader) {
            loader.remove();
        }
    }

}

const Energine = existingRuntime && existingRuntime.__isEnergineRuntime
    ? existingRuntime
    : new EnergineCore(globalScope);

exposeRuntimeToGlobal(Energine, globalScope);

const applyTranslationsFromScripts = (runtime) => {
    if (!runtime || typeof runtime.consumeTranslationScripts !== 'function') {
        return;
    }

    runtime.consumeTranslationScripts();
};

const scheduleRetry = (task, options = {}) => {
    if (typeof task !== 'function') {
        return null;
    }

    const {
        attempts = 5,
        delay = 50,
        onError = null,
        onGiveUp = null,
    } = options;

    const schedule = (globalScope && typeof globalScope.setTimeout === 'function')
        ? globalScope.setTimeout.bind(globalScope)
        : (typeof setTimeout === 'function' ? setTimeout : null);

    let remainingAttempts = Number.isFinite(attempts)
        ? (attempts > 0 ? attempts : 0)
        : Infinity;

    const execute = () => {
        let result = null;
        try {
            result = task();
        } catch (error) {
            if (typeof onError === 'function') {
                onError(error);
            } else {
                Energine.safeConsoleError(error, '[Energine.autoBootstrap] Retriable task threw an error');
            }
        }

        if (result || !schedule || remainingAttempts <= 0) {
            if (!result && (remainingAttempts <= 0 || !schedule) && typeof onGiveUp === 'function') {
                try {
                    onGiveUp();
                } catch (error) {
                    Energine.safeConsoleError(error, '[Energine.autoBootstrap] onGiveUp callback failed');
                }
            }
            return result;
        }

        remainingAttempts -= 1;
        schedule(execute, delay);
        return result;
    };

    return execute();
};

const BehaviorRegistry = {
    storage: new Map(),
    pending: new Map(),
    debugThreshold: 5,
    recordPending(name) {
        if (!name) {
            return null;
        }

        if (!this.pending.has(name)) {
            this.pending.set(name, {
                count: 0,
                lastSeen: Date.now(),
            });
        }

        const entry = this.pending.get(name);
        entry.count += 1;
        entry.lastSeen = Date.now();
        return entry;
    },
    clearPending(name) {
        if (!name || !this.pending.has(name)) {
            return;
        }

        this.pending.delete(name);
    },
    getPendingNames() {
        return Array.from(this.pending.keys()).sort();
    },
    getPendingInfo(name) {
        if (!name) {
            return null;
        }

        return this.pending.get(name) || null;
    },
    resolve(name) {
        if (!name || typeof name !== 'string') {
            return null;
        }

        return this.storage.get(name) || null;
    },
    has(name) {
        return this.storage.has(name);
    },
    set(name, ClassRef) {
        this.storage.set(name, ClassRef);
    },
};

const PENDING_BEHAVIOR = Symbol('Energine.pendingBehavior');

const disposeExistingBehaviorInstance = (element) => {
    if (!element) {
        return;
    }

    const existing = element.__energineBehavior;
    if (existing && typeof existing.destroy === 'function') {
        try {
            existing.destroy();
        } catch (error) {
            Energine.safeConsoleError(error, '[Energine.autoBootstrap] Failed to dispose existing component instance');
        }
    }

    element.__energineBehavior = null;
    if (element.dataset) {
        delete element.dataset.eReady;
    }
};

const attachToolbarBinding = (element, instance) => {
    if (!element || typeof registerToolbarComponent !== 'function') {
        return;
    }

    const dataset = element.dataset || {};
    const componentRef = dataset.eToolbarComponent
        || element.getAttribute('data-e-toolbar-component');

    if (!componentRef) {
        return;
    }

    try {
        registerToolbarComponent(componentRef, instance);
    } catch (error) {
        Energine.safeConsoleError(error, `[Energine.autoBootstrap] Failed to register toolbar component "${componentRef}"`);
    }
};

const instantiateBehaviorForElement = (element, explicitBehaviorName = null, options = {}) => {
    if (!(element instanceof HTMLElement)) {
        return null;
    }

    const dataset = element.dataset || {};
    const shouldRefresh = Dataset.normalizeBoolean(dataset.eRefresh);
    const isReady = Dataset.normalizeBoolean(dataset.eReady);

    const { silentOnMissing = false } = options || {};

    if (isReady && !shouldRefresh && element.__energineBehavior) {
        return element.__energineBehavior;
    }

    const behaviorName = explicitBehaviorName || dataset.eJs || element.getAttribute('data-e-js');
    if (!behaviorName) {
        return null;
    }

    const Constructor = BehaviorRegistry.resolve(behaviorName);
    if (!Constructor) {
        const pendingInfo = BehaviorRegistry.recordPending(behaviorName) || BehaviorRegistry.getPendingInfo(behaviorName);
        const pendingCount = pendingInfo ? pendingInfo.count : 0;
        const message = `[Energine.autoBootstrap] Behavior "${behaviorName}" is not registered yet. Waiting for registration.`;

        if (
            pendingCount <= 1
            && !silentOnMissing
            && typeof console !== 'undefined'
            && console.info
        ) {
            console.info(message);
        }

        const shouldThrow = Boolean(
            Energine
            && typeof Energine.debug === 'boolean'
            && Energine.debug
            && pendingCount >= BehaviorRegistry.debugThreshold,
        );

        if (shouldThrow) {
            const error = new Error(`${message} Enable and import the module that registers this behavior via registerBehavior.`);
            error.element = element;
            throw error;
        }

        return PENDING_BEHAVIOR;
    }

    if (shouldRefresh && element.__energineBehavior) {
        disposeExistingBehaviorInstance(element);
        if (element.dataset) {
            delete element.dataset.eRefresh;
        }
    }

    try {
        const instance = new Constructor(element, dataset);
        element.__energineBehavior = instance;
        if (element.dataset) {
            element.dataset.eReady = '1';
        }

        attachToolbarBinding(element, instance);

        BehaviorRegistry.clearPending(behaviorName);

        if (globalScope && element.id && typeof globalScope[element.id] === 'undefined') {
            const diagnostic = `[Energine.autoBootstrap] Behavior "${behaviorName}" attached to #${element.id}. Global exposure via window["${element.id}"] is no longer supported.`;
            if (typeof console !== 'undefined' && console.warn) {
                console.warn(diagnostic);
            }
        }

        return instance;
    } catch (error) {
        Energine.safeConsoleError(error, `[Energine.autoBootstrap] Failed to instantiate behavior "${behaviorName}"`);
    }

    return null;
};

const createScanResultContainer = () => {
    const container = [];
    container.metrics = { initialized: 0, failed: 0, skipped: 0, pending: 0 };
    container.pending = 0;
    container.failed = 0;
    container.skipped = 0;
    return container;
};

const scanForComponents = (root = (typeof document !== 'undefined' ? document : null)) => {
    const emptyResult = createScanResultContainer();

    if (!root || typeof root.querySelectorAll !== 'function') {
        return emptyResult;
    }

    const nodes = Array.from(root.querySelectorAll('[data-e-js]'));
    const instantiated = createScanResultContainer();

    nodes.forEach((element) => {
        if (!(element instanceof HTMLElement)) {
            return;
        }

        const dataset = element.dataset || {};
        const shouldRefresh = Dataset.normalizeBoolean(dataset.eRefresh);
        const alreadyReady = Dataset.normalizeBoolean(dataset.eReady);

        if (alreadyReady && !shouldRefresh && element.__energineBehavior) {
            instantiated.metrics.skipped += 1;
            instantiated.skipped = instantiated.metrics.skipped;
            return;
        }

        const instance = instantiateBehaviorForElement(element, null, { silentOnMissing: true });
        if (instance && instance !== PENDING_BEHAVIOR) {
            instantiated.push(instance);
            instantiated.metrics.initialized += 1;
        } else if (instance === PENDING_BEHAVIOR) {
            instantiated.metrics.pending += 1;
            instantiated.pending = instantiated.metrics.pending;
        } else {
            instantiated.metrics.failed += 1;
            instantiated.failed = instantiated.metrics.failed;
        }
    });

    instantiated.failed = instantiated.metrics.failed;
    instantiated.pending = instantiated.metrics.pending;
    instantiated.skipped = instantiated.metrics.skipped;

    return instantiated;
};

let autoBootstrapExecuted = false;

const autoBootstrapRuntime = () => {
    if (autoBootstrapExecuted || typeof document === 'undefined') {
        return;
    }

    const scriptEl = Energine.resolveModuleScriptElement();
    if (!scriptEl || !scriptEl.dataset) {
        return;
    }

    const { dataset } = scriptEl;
    if (typeof dataset.run !== 'undefined' && !Dataset.normalizeBoolean(dataset.run)) {
        return;
    }

    autoBootstrapExecuted = true;

    const config = Energine.createConfigFromScriptDataset();
    const runtime = Energine.boot(config);
    const exposedRuntime = exposeRuntimeToGlobal(runtime, globalScope);

    const bootstrapDom = () => {
        applyTranslationsFromScripts(exposedRuntime);

        let toolbarsInitialized = false;

        scheduleRetry(
            () => {
                const initialized = scanForComponents(document);
                const pending = initialized && typeof initialized.pending === 'number'
                    ? initialized.pending
                    : 0;
                const ready = Array.isArray(initialized) && pending === 0;

                if (ready && typeof initializeToolbars === 'function' && !toolbarsInitialized) {
                    try {
                        initializeToolbars(document);
                        toolbarsInitialized = true;
                    } catch (error) {
                        Energine.safeConsoleError(error, '[Energine.autoBootstrap] Failed to initialize toolbars');
                    }
                }

                return ready;
            },
            {
                attempts: 20,
                delay: 150,
                onError: (error) => Energine.safeConsoleError(error, '[Energine.autoBootstrap] Component bootstrap failed'),
                onGiveUp: () => {
                    if (typeof initializeToolbars === 'function' && !toolbarsInitialized) {
                        try {
                            initializeToolbars(document);
                            toolbarsInitialized = true;
                        } catch (error) {
                            Energine.safeConsoleError(error, '[Energine.autoBootstrap] Failed to initialize toolbars');
                        }
                    }

                    const unresolved = BehaviorRegistry.getPendingNames();
                    if (Array.isArray(unresolved) && unresolved.length) {
                        const details = unresolved.join(', ');
                        Energine.safeConsoleError(new Error(`Unresolved behaviors after bootstrap: ${details}`), '[Energine.autoBootstrap] Behavior registry');
                    }
                },
            },
        );
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            bootstrapDom();
        }, { once: true });
    } else {
        bootstrapDom();
    }
};

autoBootstrapRuntime();

export const serializeToFormEncoded = (obj, prefix) => Energine.serializeToFormEncoded(obj, prefix);

export const safeConsoleError = (error, context = '') => Energine.safeConsoleError(error, context);

export const showLoader = (container) => Energine.showLoader(container);

export const hideLoader = (container) => Energine.hideLoader(container);

export const registerBehavior = (name, ClassRef, options = {}) => {
    if (!name || typeof name !== 'string' || typeof ClassRef !== 'function') {
        return false;
    }

    const normalizedName = name.trim();
    if (!normalizedName) {
        return false;
    }

    const { force = false } = options || {};
    if (BehaviorRegistry.has(normalizedName) && !force) {
        console.warn(`[Energine.autoBootstrap] Behavior "${normalizedName}" is already registered. Pass { force: true } to overwrite.`);
        return false;
    }

    BehaviorRegistry.clearPending(normalizedName);
    BehaviorRegistry.set(normalizedName, ClassRef);
    return true;
};

export const getRegisteredBehavior = (name) => BehaviorRegistry.resolve(name);

export default Energine;
