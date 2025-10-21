const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

const bridgeMethodNames = [
    'request',
    'cancelEvent',
    'resize',
    'confirmBox',
    'alertBox',
    'noticeBox',
    'loadCSS',
    'run',
    'createDatePicker',
    'createDateTimePicker',
];

const allowedConfigKeys = [
    'debug',
    'base',
    'static',
    'resizer',
    'media',
    'root',
    'lang',
    'singleMode',
];

const noticeIconMap = {
    success: { variant: 'success', icon: 'fa-circle-check' },
    error: { variant: 'danger', icon: 'fa-circle-xmark' },
    warning: { variant: 'warning', icon: 'fa-triangle-exclamation' },
    info: { variant: 'info', icon: 'fa-circle-info' },
    question: { variant: 'primary', icon: 'fa-circle-question' },
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
        this.tasks = [];

        this.moduleUrl = (typeof import.meta !== 'undefined' && import.meta && import.meta.url)
            ? import.meta.url
            : '';
        this.moduleScriptElement = null;

        this.translationStore = {};
        this.translations = this.createTranslationsFacade();

        this.bridge = this.initBridge();
        this.applyDatasetConfigToBridge();
    }

    createTranslationsFacade() {
        const store = this.translationStore;
        return {
            get(constant) {
                return Object.prototype.hasOwnProperty.call(store, constant)
                    ? store[constant]
                    : null;
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

    initBridge() {
        if (!this.globalScope) {
            return null;
        }
        if (this.globalScope.__energineBridge) {
            return this.globalScope.__energineBridge;
        }

        const pending = {
            config: {},
            tasks: [],
            translations: {},
        };
        let runtime = null;

        const translationFacade = {
            get: (constant) => {
                if (runtime && runtime.translations) {
                    return runtime.translations.get(constant);
                }
                return Object.prototype.hasOwnProperty.call(pending.translations, constant)
                    ? pending.translations[constant]
                    : null;
            },
            set: (constant, value) => {
                if (runtime && runtime.translations) {
                    runtime.translations.set(constant, value);
                } else {
                    pending.translations[constant] = value;
                }
            },
            extend: (values) => {
                if (runtime && runtime.translations) {
                    runtime.translations.extend(values);
                } else if (values && typeof values === 'object') {
                    Object.assign(pending.translations, values);
                }
            },
        };

        const queueTask = (task, priority = 5) => {
            if (typeof task !== 'function') {
                return;
            }

            if (runtime) {
                runtime.addTask(task, priority);
            } else {
                pending.tasks.push({ task, priority });
            }
        };

        const extendTranslations = (values) => {
            if (!values || typeof values !== 'object') {
                return;
            }
            translationFacade.extend(values);
        };

        const setRuntime = (instance) => {
            runtime = instance;

            if (runtime && typeof runtime.mergeConfigValues === 'function') {
                runtime.mergeConfigValues(pending.config);
            } else if (runtime && pending.config) {
                Object.assign(runtime, pending.config);
            }

            if (runtime
                && runtime.translations
                && typeof runtime.translations.extend === 'function'
                && Object.keys(pending.translations).length) {
                runtime.translations.extend(pending.translations);
                pending.translations = {};
            }

            if (runtime && pending.tasks.length) {
                pending.tasks.forEach(({ task, priority }) => runtime.addTask(task, priority));
                pending.tasks = [];
            }
        };

        const api = new Proxy(
            {},
            {
                get: (_, prop) => {
                    if (prop === '__setRuntime') {
                        return setRuntime;
                    }
                    if (prop === 'translations') {
                        return translationFacade;
                    }
                    if (prop === 'addTask') {
                        return queueTask;
                    }
                    if (prop === 'tasks') {
                        return runtime ? runtime.tasks : pending.tasks;
                    }
                    if (runtime) {
                        const value = runtime[prop];
                        return typeof value === 'function' ? value.bind(runtime) : value;
                    }
                    if (bridgeMethodNames.includes(prop)) {
                        return (...args) => {
                            if (!runtime || typeof runtime[prop] !== 'function') {
                                throw new Error('Energine runtime is not ready yet');
                            }
                            return runtime[prop](...args);
                        };
                    }
                    if (Object.prototype.hasOwnProperty.call(pending.config, prop)) {
                        return pending.config[prop];
                    }
                    return undefined;
                },
                set: (_, prop, value) => {
                    if (prop === 'translations') {
                        translationFacade.extend(value);
                        return true;
                    }
                    if (runtime) {
                        runtime[prop] = value;
                    } else {
                        pending.config[prop] = value;
                    }
                    return true;
                },
            },
        );

        this.globalScope.Energine = api;
        this.globalScope.__energineBridge = {
            setRuntime,
            pendingConfig: pending.config,
            queueTask,
            extendTranslations,
        };

        return this.globalScope.__energineBridge;
    }

    applyDatasetConfigToBridge() {
        if (!this.bridge || !this.bridge.pendingConfig) {
            return;
        }
        const datasetConfig = this.readConfigFromScriptDataset();
        if (Object.keys(datasetConfig).length) {
            Object.assign(this.bridge.pendingConfig, datasetConfig);
        }
    }

    resolveModuleScriptElement() {
        if (typeof document === 'undefined') {
            return null;
        }
        if (this.moduleScriptElement && document.contains(this.moduleScriptElement)) {
            return this.moduleScriptElement;
        }
        if (!this.moduleUrl) {
            return null;
        }

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
        allowedConfigKeys.forEach((key) => {
            if (typeof scriptEl.dataset[key] === 'undefined') {
                return;
            }
            if (key === 'debug' || key === 'singleMode') {
                config[key] = scriptEl.dataset[key] === 'true';
            } else {
                config[key] = scriptEl.dataset[key];
            }
        });

        return config;
    }

    mergeConfigValues(values = {}) {
        if (!values || typeof values !== 'object') {
            return;
        }

        allowedConfigKeys.forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(values, key)) {
                this[key] = values[key];
            }
        });
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
        let url = uri + (this.forceJSON ? '?json' : '');
        const isGet = method.toLowerCase() === 'get';
        const headers = { 'X-Request': 'json' };
        const fetchOpts = { method: method.toUpperCase(), headers };

        if (this.forceJSON) {
            headers['Content-Type'] = 'application/json';
            if (!isGet) {
                fetchOpts.body = JSON.stringify(data);
            } else if (data) {
                const params = new URLSearchParams(data).toString();
                url += (url.includes('?') ? '&' : '?') + params;
            }
        } else if (typeof data === 'string') {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            fetchOpts.body = data;
        } else {
            const formEncoded = this.serializeToFormEncoded(data || {});
            if (isGet) {
                url += (url.includes('?') ? '&' : '?') + formEncoded;
            } else {
                headers['Content-Type'] = 'application/x-www-form-urlencoded';
                fetchOpts.body = formEncoded;
            }
        }

        try {
            const res = await fetch(url, fetchOpts);
            const text = await res.text();
            let response;

            try {
                response = JSON.parse(text);
            } catch {
                response = null;
            }

            if (!response) {
                onServerError(text);
                return;
            }

            if (response.result) {
                onSuccess(response);
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
            if (onUserError) onUserError(response);
        } catch (e) {
            console.error(e);
            onServerError(e.toString());
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

    resolveBootstrap() {
        if (this.globalScope && this.globalScope.bootstrap) {
            return this.globalScope.bootstrap;
        }
        if (typeof bootstrap !== 'undefined') {
            return bootstrap;
        }
        return null;
    }

    ensureModalElement(id, template) {
        if (typeof document === 'undefined') {
            return null;
        }

        let element = document.getElementById(id);
        if (element) {
            return element;
        }

        const wrapper = document.createElement('div');
        wrapper.innerHTML = template.trim();
        element = wrapper.firstElementChild;
        if (element) {
            document.body.appendChild(element);
        }

        return element;
    }

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
    }

    confirmBox(message, yes, no) {
        const bootstrapLib = this.resolveBootstrap();
        if (!bootstrapLib || typeof document === 'undefined') {
            if (confirm(message)) {
                if (yes) yes();
            } else if (no) {
                no();
            }
            return;
        }

        const modal = this.ensureModalElement('energine-confirm-modal', `
            <div class="modal fade" id="energine-confirm-modal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header bg-warning text-dark">
                            <h5 class="modal-title">
                                <i class="fa-solid fa-triangle-exclamation me-2"></i>
                                <span data-role="title">Подтверждение</span>
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p class="mb-0" data-role="message"></p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-role="cancel" data-bs-dismiss="modal">
                                <i class="fa-solid fa-circle-xmark me-2"></i>Нет
                            </button>
                            <button type="button" class="btn btn-primary" data-role="confirm" data-bs-dismiss="modal">
                                <i class="fa-solid fa-circle-check me-2"></i>Да
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `);

        if (!modal) {
            if (confirm(message)) {
                if (yes) yes();
            } else if (no) {
                no();
            }
            return;
        }

        const messageContainer = modal.querySelector('[data-role="message"]');
        if (messageContainer) {
            messageContainer.textContent = message;
        }

        const confirmBtn = modal.querySelector('[data-role="confirm"]');
        const cancelBtn = modal.querySelector('[data-role="cancel"]');
        const instance = bootstrapLib.Modal.getOrCreateInstance(modal, { backdrop: 'static' });

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
        if (cancelBtn) {
            cancelBtn.addEventListener('click', handleCancel, { once: true });
        }

        modal.addEventListener('hidden.bs.modal', () => {
            if (!resolved && no) {
                no();
            }
        }, { once: true });

        instance.show();
    }

    alertBox(message) {
        const bootstrapLib = this.resolveBootstrap();
        if (!bootstrapLib || typeof document === 'undefined') {
            alert(message);
            return;
        }

        const modal = this.ensureModalElement('energine-alert-modal', `
            <div class="modal fade" id="energine-alert-modal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header bg-danger text-white">
                            <h5 class="modal-title">
                                <i class="fa-solid fa-circle-exclamation me-2"></i>
                                <span data-role="title">Внимание</span>
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p class="mb-0" data-role="message"></p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-danger" data-bs-dismiss="modal">
                                <i class="fa-solid fa-circle-check me-2"></i>Ок
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `);

        if (!modal) {
            alert(message);
            return;
        }

        const messageContainer = modal.querySelector('[data-role="message"]');
        if (messageContainer) {
            messageContainer.textContent = message;
        }

        const instance = bootstrapLib.Modal.getOrCreateInstance(modal, { backdrop: 'static' });
        instance.show();
    }

    noticeBox(message, icon, callback) {
        const bootstrapLib = this.resolveBootstrap();
        if (!bootstrapLib || typeof document === 'undefined') {
            alert(message);
            if (callback) callback();
            return;
        }

        const container = this.getToastContainer();
        if (!container) {
            alert(message);
            if (callback) callback();
            return;
        }

        const { variant, icon: iconClass } = noticeIconMap[icon] || noticeIconMap.info;

        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-bg-${variant} border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body d-flex align-items-center">
                    <i class="fa-solid ${iconClass} me-2"></i>
                    <span>${message}</span>
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

        container.appendChild(toast);

        const toastInstance = bootstrapLib.Toast.getOrCreateInstance(toast, {
            delay: 1500,
            autohide: true,
        });

        toast.addEventListener('hidden.bs.toast', () => {
            toastInstance.dispose();
            toast.remove();
            if (callback) {
                callback();
            }
        }, { once: true });

        toastInstance.show();
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

    addTask(task, priority = 5) {
        if (!this.tasks[priority]) {
            this.tasks[priority] = [];
        }
        this.tasks[priority].push(task);
    }

    run() {
        if (!this.tasks) {
            return;
        }

        for (const priority of this.tasks) {
            if (!priority) continue;
            for (const func of priority) {
                try {
                    func();
                } catch (e) {
                    this.safeConsoleError(e);
                }
            }
        }
    }

    boot(config = {}) {
        const { translations: translationsConfig, tasks, ...rest } = config;

        this.mergeConfigValues(rest);

        if (translationsConfig) {
            this.translations.extend(translationsConfig);
        }

        if (Array.isArray(tasks)) {
            this.tasks = tasks;
        }

        return this;
    }

    stageTranslations(values) {
        if (!values || typeof values !== 'object') {
            return;
        }

        if (this.bridge && typeof this.bridge.extendTranslations === 'function') {
            this.bridge.extendTranslations(values);
            return;
        }

        this.translations.extend(values);
    }

    queueTask(task, priority = 5) {
        if (typeof task !== 'function') {
            return;
        }

        if (this.bridge && typeof this.bridge.queueTask === 'function') {
            this.bridge.queueTask(task, priority);
            return;
        }

        this.addTask(task, priority);
    }

    createConfigFromProps(props = {}) {
        const config = { ...props };

        const normalizeBoolean = (value) => {
            if (typeof value === 'boolean') return value;
            if (typeof value === 'number') return value !== 0;
            if (typeof value === 'string') {
                return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
            }
            return Boolean(value);
        };

        if (Object.prototype.hasOwnProperty.call(config, 'debug')) {
            config.debug = normalizeBoolean(config.debug);
        }
        if (Object.prototype.hasOwnProperty.call(config, 'forceJSON')) {
            config.forceJSON = normalizeBoolean(config.forceJSON);
        }
        if (Object.prototype.hasOwnProperty.call(config, 'supportContentEdit')) {
            config.supportContentEdit = normalizeBoolean(config.supportContentEdit);
        }
        if (Object.prototype.hasOwnProperty.call(config, 'singleMode')) {
            config.singleMode = normalizeBoolean(config.singleMode);
        }

        return config;
    }

    createConfigFromScriptDataset(overrides = {}) {
        const baseConfig = this.readConfigFromScriptDataset();
        return this.createConfigFromProps({ ...baseConfig, ...overrides });
    }

    createConfigFromBridgePending(overrides = {}) {
        const bridgeConfig = (this.bridge && this.bridge.pendingConfig)
            ? { ...this.bridge.pendingConfig }
            : {};
        return this.createConfigFromProps({ ...bridgeConfig, ...overrides });
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

    attachToWindow(target = this.globalScope, runtime = this) {
        if (!target) {
            return runtime;
        }

        target.safeConsoleError = this.safeConsoleError.bind(this);
        target.showLoader = this.showLoader.bind(this);
        target.hideLoader = this.hideLoader.bind(this);
        target.Energine = runtime;

        return runtime;
    }
}

const Energine = new EnergineCore(globalScope);

const existingConfig = (() => {
    if (!globalScope) {
        return undefined;
    }
    if (globalScope.__energineBridge && globalScope.__energineBridge.pendingConfig) {
        return { ...globalScope.__energineBridge.pendingConfig };
    }
    if (typeof globalScope.Energine === 'object') {
        return { ...globalScope.Energine };
    }
    return undefined;
})();

if (existingConfig && Object.keys(existingConfig).length) {
    Energine.boot(existingConfig);
}

const TRUTHY_DATA_VALUES = ['1', 'true', 'yes', 'on'];

const bodyConfigKeyRemap = {
    forceJson: 'forceJSON',
};

const isTruthyDataValue = (value) => {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'number') {
        return value !== 0;
    }
    if (typeof value === 'string') {
        return TRUTHY_DATA_VALUES.includes(value.toLowerCase());
    }
    return Boolean(value);
};

const readBodyConfigOverrides = () => {
    if (typeof document === 'undefined') {
        return {};
    }

    const { body } = document;
    if (!body || !body.dataset) {
        return {};
    }

    const overrides = {};
    Object.keys(body.dataset).forEach((key) => {
        if (!key.startsWith('energine')) {
            return;
        }
        if (key === 'energineRun' || key === 'energineRuntime') {
            return;
        }

        const value = body.dataset[key];
        if (typeof value === 'undefined') {
            return;
        }

        const propName = key.slice('energine'.length);
        if (!propName) {
            return;
        }

        const normalizedKey = propName.charAt(0).toLowerCase() + propName.slice(1);
        const mappedKey = bodyConfigKeyRemap[normalizedKey] || normalizedKey;
        overrides[mappedKey] = value;
    });

    return overrides;
};

const resolveRuntimeDataRoot = () => {
    if (typeof document === 'undefined') {
        return null;
    }

    const { body } = document;
    if (body && body.dataset && body.dataset.energineRuntime) {
        const selector = body.dataset.energineRuntime;
        if (selector) {
            if (selector.startsWith('#')) {
                const element = document.getElementById(selector.slice(1));
                if (element) {
                    return element;
                }
            }
            try {
                const queried = document.querySelector(selector);
                if (queried) {
                    return queried;
                }
            } catch {
                if (selector.startsWith('#')) {
                    return document.getElementById(selector.slice(1));
                }
            }
        }
    }

    const fallbackById = document.getElementById('energine-runtime-data');
    if (fallbackById) {
        return fallbackById;
    }

    return document.querySelector('[data-energine-runtime]');
};

const stageTranslationsFromRoot = (runtime, root) => {
    if (!runtime || !root) {
        return;
    }

    const scripts = root.querySelectorAll('script[type="application/json"][data-kind="translations"]');
    scripts.forEach((script) => {
        const jsonText = script.textContent ? script.textContent.trim() : '';
        if (!jsonText) {
            return;
        }
        try {
            const values = JSON.parse(jsonText);
            runtime.stageTranslations(values);
        } catch (error) {
            runtime.safeConsoleError(error, 'translations');
        }
    });
};

const readControlElementConfig = (element) => {
    const control = {};
    if (!element) {
        return control;
    }

    element.querySelectorAll('[data-kind="control-attr"]').forEach((attr) => {
        const name = attr.getAttribute('data-name');
        if (!name) {
            return;
        }
        control[name] = attr.getAttribute('data-value') || '';
    });

    return control;
};

const instantiatePageToolbarFromElement = (runtime, element) => {
    if (!element || typeof document === 'undefined') {
        return null;
    }

    const className = element.getAttribute('data-class');
    if (!className || !globalScope) {
        return null;
    }

    const ToolbarCtor = globalScope[className];
    if (typeof ToolbarCtor !== 'function') {
        return null;
    }

    const url = element.getAttribute('data-url') || '';
    const pageId = element.getAttribute('data-page-id') || '';
    const toolbarName = element.getAttribute('data-toolbar') || '';

    const controls = [];
    element.querySelectorAll('[data-kind="control"]').forEach((controlEl) => {
        controls.push(readControlElementConfig(controlEl));
    });

    let properties;
    const propertiesContainer = element.querySelector('[data-kind="properties"]');
    if (propertiesContainer) {
        properties = {};
        propertiesContainer.querySelectorAll('[data-kind="property"]').forEach((propertyEl) => {
            const propertyName = propertyEl.getAttribute('data-name');
            if (!propertyName) {
                return;
            }
            properties[propertyName] = propertyEl.getAttribute('data-value') || '';
        });
    }

    try {
        if (properties && Object.keys(properties).length) {
            return new ToolbarCtor(url, pageId, toolbarName, controls, properties);
        }
        return new ToolbarCtor(url, pageId, toolbarName, controls);
    } catch (error) {
        runtime.safeConsoleError(error, className);
    }

    return null;
};

const instantiateBehaviorFromElement = (runtime, element) => {
    if (!element || typeof document === 'undefined') {
        return null;
    }

    const targetId = element.getAttribute('data-target');
    const className = element.getAttribute('data-class');
    if (!targetId || !className) {
        return null;
    }

    const targetElement = document.getElementById(targetId);
    if (!targetElement || !globalScope) {
        return null;
    }

    const BehaviorCtor = globalScope[className];
    if (typeof BehaviorCtor !== 'function') {
        return null;
    }

    try {
        const instance = new BehaviorCtor(targetElement);
        globalScope[targetId] = instance;
        return instance;
    } catch (error) {
        runtime.safeConsoleError(error, className);
    }

    return null;
};

const instantiatePageEditorFromElement = (runtime, element) => {
    if (!element || !globalScope) {
        return null;
    }

    const className = element.getAttribute('data-class') || 'PageEditor';
    const targetKey = element.getAttribute('data-target') || null;
    const EditorCtor = globalScope[className];
    if (typeof EditorCtor !== 'function') {
        return null;
    }

    try {
        const instance = new EditorCtor();
        if (targetKey) {
            globalScope[targetKey] = instance;
        }
        return instance;
    } catch (error) {
        runtime.safeConsoleError(error, className);
    }

    return null;
};

const applyRuntimeDataFromDOM = (runtime) => {
    if (!runtime || typeof document === 'undefined') {
        return;
    }

    const root = resolveRuntimeDataRoot();
    if (!root) {
        return;
    }

    stageTranslationsFromRoot(runtime, root);

    if (globalScope) {
        if (!Array.isArray(globalScope.componentToolbars)) {
            globalScope.componentToolbars = [];
        }
    }

    const pageToolbarElement = root.querySelector('[data-kind="page-toolbar"]');
    if (pageToolbarElement) {
        runtime.addTask(() => {
            const instance = instantiatePageToolbarFromElement(runtime, pageToolbarElement);
            if (instance && globalScope && Array.isArray(globalScope.componentToolbars)) {
                globalScope.componentToolbars.push(instance);
            }
        });
    }

    const behaviorElements = Array.from(root.querySelectorAll('[data-kind="behavior"]'));
    behaviorElements.forEach((element) => {
        const targetId = element.getAttribute('data-target');
        if (targetId && globalScope && typeof globalScope[targetId] === 'undefined') {
            globalScope[targetId] = null;
        }
    });
    behaviorElements.forEach((element) => {
        instantiateBehaviorFromElement(runtime, element);
    });

    const pageEditorElement = root.querySelector('[data-kind="page-editor"]');
    if (pageEditorElement) {
        const targetKey = pageEditorElement.getAttribute('data-target');
        if (targetKey && globalScope && typeof globalScope[targetKey] === 'undefined') {
            globalScope[targetKey] = null;
        }
        instantiatePageEditorFromElement(runtime, pageEditorElement);
    }
};

const shouldAutoBootstrap = () => {
    if (typeof document === 'undefined') {
        return false;
    }

    const { body } = document;
    if (!body || !body.dataset) {
        return false;
    }

    const flag = body.dataset.energineRun;
    return isTruthyDataValue(flag);
};

let autoBootstrapStarted = false;

const bootstrapFromDOM = () => {
    if (autoBootstrapStarted) {
        return;
    }
    if (!shouldAutoBootstrap()) {
        return;
    }

    autoBootstrapStarted = true;

    const configOverrides = readBodyConfigOverrides();
    const config = Energine.createConfigFromScriptDataset(configOverrides);
    const runtime = Energine.boot(config);

    if (globalScope && globalScope.__energineBridge && typeof globalScope.__energineBridge.setRuntime === 'function') {
        try {
            globalScope.__energineBridge.setRuntime(runtime);
        } catch (error) {
            runtime.safeConsoleError(error, 'bridge:setRuntime');
        }
    }

    const attachedRuntime = Energine.attachToWindow(globalScope, runtime);

    if (globalScope) {
        globalScope.componentToolbars = [];
    }

    applyRuntimeDataFromDOM(attachedRuntime);

    if (attachedRuntime && typeof attachedRuntime.run === 'function') {
        try {
            attachedRuntime.run();
        } catch (error) {
            attachedRuntime.safeConsoleError(error, 'Energine.run');
        }
    }
};

const scheduleAutoBootstrap = () => {
    if (typeof document === 'undefined') {
        return;
    }

    const trigger = () => {
        if (!autoBootstrapStarted && shouldAutoBootstrap()) {
            bootstrapFromDOM();
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', trigger, { once: true });
    } else {
        trigger();
    }
};

scheduleAutoBootstrap();

export const serializeToFormEncoded = (obj, prefix) => Energine.serializeToFormEncoded(obj, prefix);

export const bootEnergine = (config = {}) => Energine.boot(config);

export const stageTranslations = (values) => Energine.stageTranslations(values);

export const queueTask = (task, priority = 5) => Energine.queueTask(task, priority);

export const createConfigFromProps = (props = {}) => Energine.createConfigFromProps(props);

export const createConfigFromScriptDataset = (overrides = {}) => Energine.createConfigFromScriptDataset(overrides);

export const createConfigFromBridgePending = (overrides = {}) => Energine.createConfigFromBridgePending(overrides);

export const safeConsoleError = (error, context = '') => Energine.safeConsoleError(error, context);

export const showLoader = (container) => Energine.showLoader(container);

export const hideLoader = (container) => Energine.hideLoader(container);

export const attachToWindow = (target = globalScope, runtime = Energine) => Energine.attachToWindow(target, runtime);

export default Energine;
