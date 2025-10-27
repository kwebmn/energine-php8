import { initializeToolbars, registerToolbarComponent } from './Toolbar.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

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

        this.moduleUrl = (typeof import.meta !== 'undefined' && import.meta && import.meta.url)
            ? import.meta.url
            : '';
        this.moduleScriptElement = null;

        this.translationStore = {};
        this.translations = this.createTranslationsFacade();
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
        let url = uri;
        const isGet = method.toLowerCase() === 'get';
        const headers = {
            'X-Request': 'json',
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json, text/plain, */*',
        };
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

    boot(config = {}) {
        const { translations: translationsConfig, ...rest } = config;

        this.mergeConfigValues(rest);

        if (translationsConfig) {
            this.translations.extend(translationsConfig);
        }

        return this;
    }

    stageTranslations(values) {
        if (!values || typeof values !== 'object') {
            return;
        }

        this.translations.extend(values);
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

const Energine = new EnergineCore(globalScope);

exposeRuntimeToGlobal(Energine, globalScope);

const datasetFalseValues = new Set(['0', 'false', 'no', 'off']);

const translationScriptSelector = 'script[type="application/json"][data-energine-translations]';

const applyTranslationsFromScripts = (runtime) => {
    if (typeof document === 'undefined' || !runtime || typeof runtime.stageTranslations !== 'function') {
        return;
    }

    const scripts = document.querySelectorAll(translationScriptSelector);
    if (!scripts || !scripts.length) {
        return;
    }

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
            runtime.stageTranslations(parsed);
            if (script.dataset) {
                script.dataset.energineTranslationsProcessed = '1';
            }
            if (typeof script.remove === 'function') {
                script.remove();
            } else {
                script.textContent = '';
            }
        } catch (error) {
            Energine.safeConsoleError(error, '[Energine.autoBootstrap] Failed to parse staged translations');
        }
    });
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

const behaviorRegistry = new Map();
const pendingBehaviors = new Map();
const PENDING_BEHAVIOR_DEBUG_THRESHOLD = 5;
const PENDING_BEHAVIOR = Symbol('Energine.pendingBehavior');

const recordPendingBehavior = (name) => {
    if (!name) {
        return null;
    }

    if (!pendingBehaviors.has(name)) {
        pendingBehaviors.set(name, {
            count: 0,
            lastSeen: Date.now(),
        });
    }

    const entry = pendingBehaviors.get(name);
    entry.count += 1;
    entry.lastSeen = Date.now();
    return entry;
};

const clearPendingBehavior = (name) => {
    if (!name || !pendingBehaviors.has(name)) {
        return;
    }

    pendingBehaviors.delete(name);
};

const getPendingBehaviorNames = () => Array.from(pendingBehaviors.keys()).sort();

const resolveRegisteredBehavior = (name) => {
    if (!name || typeof name !== 'string') {
        return null;
    }

    return behaviorRegistry.get(name) || null;
};

const normalizeDatasetBoolean = (value) => {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        return !datasetFalseValues.has(value.trim().toLowerCase());
    }
    if (typeof value === 'number') {
        return value !== 0;
    }
    return Boolean(value);
};

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
    const shouldRefresh = normalizeDatasetBoolean(dataset.eRefresh);
    const isReady = normalizeDatasetBoolean(dataset.eReady);

    const { silentOnMissing = false } = options || {};

    if (isReady && !shouldRefresh && element.__energineBehavior) {
        return element.__energineBehavior;
    }

    const behaviorName = explicitBehaviorName || dataset.eJs || element.getAttribute('data-e-js');
    if (!behaviorName) {
        return null;
    }

    const Constructor = resolveRegisteredBehavior(behaviorName);
    if (!Constructor) {
        const pendingInfo = recordPendingBehavior(behaviorName) || pendingBehaviors.get(behaviorName);
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
            && pendingCount >= PENDING_BEHAVIOR_DEBUG_THRESHOLD,
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

        clearPendingBehavior(behaviorName);

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
        const shouldRefresh = normalizeDatasetBoolean(dataset.eRefresh);
        const alreadyReady = normalizeDatasetBoolean(dataset.eReady);

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
    if (dataset.run && datasetFalseValues.has(dataset.run.toLowerCase())) {
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

                    const unresolved = getPendingBehaviorNames();
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
    if (behaviorRegistry.has(normalizedName) && !force) {
        console.warn(`[Energine.autoBootstrap] Behavior "${normalizedName}" is already registered. Pass { force: true } to overwrite.`);
        return false;
    }

    clearPendingBehavior(normalizedName);
    behaviorRegistry.set(normalizedName, ClassRef);
    return true;
};

export const getRegisteredBehavior = (name) => resolveRegisteredBehavior(name);

export default Energine;
