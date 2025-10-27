import { initializeToolbars, registerToolbarComponent } from './Toolbar.js';
import { createRequestClient, serializeToFormEncoded } from './Energine/request.js';
import createUIHelpers from './Energine/ui.js';
import createBehaviorRuntime from './Energine/behaviorRegistry.js';
import { allowedConfigKeys, createConfigFactory } from './Energine/config.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

const resolveFetchImplementation = (scope) => {
    if (scope && typeof scope.fetch === 'function') {
        return scope.fetch.bind(scope);
    }
    if (typeof fetch === 'function') {
        const owner = typeof globalThis !== 'undefined' ? globalThis : undefined;
        return owner ? fetch.bind(owner) : fetch;
    }
    throw new Error('Global fetch implementation is not available for Energine requests');
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

const translationScriptSelector = 'script[type="application/json"][data-energine-translations]';

const applyTranslationsFromScripts = (runtime, doc = (typeof document !== 'undefined' ? document : null)) => {
    if (!doc || !runtime || typeof runtime.stageTranslations !== 'function') {
        return;
    }

    const scripts = doc.querySelectorAll(translationScriptSelector);
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
            runtime.safeConsoleError(error, '[Energine.autoBootstrap] Failed to parse staged translations');
        }
    });
};

export const createAutoBootstrap = (doc, {
    runtime,
    exposeRuntime,
    scanForComponents,
    scheduleRetry,
    getPendingBehaviorNames,
    initializeToolbars: initializeToolbarsFn,
    applyTranslations = applyTranslationsFromScripts,
    datasetFalseValues = new Set(['0', 'false', 'no', 'off']),
} = {}) => {
    let executed = false;

    return () => {
        if (executed || !doc || !runtime) {
            return;
        }

        const scriptEl = runtime.resolveModuleScriptElement();
        if (!scriptEl || !scriptEl.dataset) {
            return;
        }

        const { dataset } = scriptEl;
        if (dataset.run && datasetFalseValues.has(dataset.run.toLowerCase())) {
            return;
        }

        executed = true;

        const config = runtime.createConfigFromScriptDataset();
        const bootedRuntime = runtime.boot(config);
        const exposedRuntime = exposeRuntime(bootedRuntime);

        if (typeof scheduleRetry !== 'function' || typeof scanForComponents !== 'function') {
            runtime.safeConsoleError(
                new Error('Missing dependencies for auto bootstrap execution'),
                '[Energine.autoBootstrap] Dependency resolution',
            );
            return;
        }

        const bootstrapDom = () => {
            applyTranslations(exposedRuntime, doc);

            let toolbarsInitialized = false;

            scheduleRetry(
                () => {
                    const initialized = scanForComponents(doc);
                    const pending = initialized && typeof initialized.pending === 'number'
                        ? initialized.pending
                        : 0;
                    const ready = Array.isArray(initialized) && pending === 0;

                    if (ready && typeof initializeToolbarsFn === 'function' && !toolbarsInitialized) {
                        try {
                            initializeToolbarsFn(doc);
                            toolbarsInitialized = true;
                        } catch (error) {
                            runtime.safeConsoleError(error, '[Energine.autoBootstrap] Failed to initialize toolbars');
                        }
                    }

                    return ready;
                },
                {
                    attempts: 20,
                    delay: 150,
                    onError: (error) => runtime.safeConsoleError(error, '[Energine.autoBootstrap] Component bootstrap failed'),
                    onGiveUp: () => {
                        if (typeof initializeToolbarsFn === 'function' && !toolbarsInitialized) {
                            try {
                                initializeToolbarsFn(doc);
                                toolbarsInitialized = true;
                            } catch (error) {
                                runtime.safeConsoleError(error, '[Energine.autoBootstrap] Failed to initialize toolbars');
                            }
                        }

                        const unresolved = getPendingBehaviorNames();
                        if (Array.isArray(unresolved) && unresolved.length) {
                            const details = unresolved.join(', ');
                            runtime.safeConsoleError(new Error(`Unresolved behaviors after bootstrap: ${details}`), '[Energine.autoBootstrap] Behavior registry');
                        }
                    },
                },
            );
        };

        if (doc.readyState === 'loading') {
            doc.addEventListener('DOMContentLoaded', () => {
                bootstrapDom();
            }, { once: true });
        } else {
            bootstrapDom();
        }
    };
};

class EnergineCore {
    constructor(scope) {
        this.globalScope = scope;

        /** @type {boolean} */
        this.debug = false;
        /** @type {string} */
        this.base = '';
        /** @type {string} */
        this.static = '';
        /** @type {string} */
        this.resizer = '';
        /** @type {string} */
        this.media = '';
        /** @type {string} */
        this.root = '';
        /** @type {string} */
        this.lang = '';
        /** @type {boolean} */
        this.singleMode = false;
        /** @type {boolean} */
        this.forceJSON = false;
        /** @type {boolean} */
        this.supportContentEdit = true;

        this.moduleUrl = (typeof import.meta !== 'undefined' && import.meta && import.meta.url)
            ? import.meta.url
            : '';
        this.moduleScriptElement = null;

        this.translationStore = {};
        this.translations = this.createTranslationsFacade();

        this.configFactory = createConfigFactory(() => this.resolveModuleScriptElement());
        this.requestClient = createRequestClient({
            fetchImpl: resolveFetchImplementation(scope || globalScope),
            getForceJSON: () => this.forceJSON,
            serialize: serializeToFormEncoded,
        });
        this.uiHelpers = createUIHelpers({ globalScope: scope });
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

    /**
     * Locate script element corresponding to Energine module.
     *
     * @returns {HTMLScriptElement|null}
     */
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

    /**
     * Merge configuration values into runtime instance.
     *
     * @param {Record<string, any>} values
     */
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

    /**
     * Create configuration object from raw props.
     *
     * @param {Record<string, any>} props
     * @returns {Record<string, any>}
     */
    createConfigFromProps(props = {}) {
        return this.configFactory.createConfigFromProps(props);
    }

    /**
     * Read configuration from script dataset with optional overrides.
     *
     * @param {Record<string, any>} [overrides]
     * @returns {Record<string, any>}
     */
    createConfigFromScriptDataset(overrides = {}) {
        return this.configFactory.createConfigFromScriptDataset(overrides);
    }

    /**
     * Read configuration from embedded script dataset.
     *
     * @returns {Record<string, any>}
     */
    readConfigFromScriptDataset() {
        return this.configFactory.readConfigFromScriptDataset();
    }

    /**
     * Report errors in a consistent grouped format.
     *
     * @param {unknown} error
     * @param {string} [context]
     */
    safeConsoleError(error, context = '') {
        if (typeof console === 'undefined' || !console.error || !console.groupCollapsed) {
            return;
        }

        const message = (error && error.message) ? error.message : error;

        console.groupCollapsed(
            `%c[App Error]%c ${context ? `[${context}] ` : ''}%c${message}`,
            'color:#fff; background:#dc3545; padding:2px 6px; border-radius:3px;',
            'color:#aaa; font-size:11px;',
            'color:#dc3545;',
        );

        if (error && error.stack) {
            console.error('%cStack trace:', 'color:#888');
            console.error(`%c${error.stack}`, 'color:#dc3545; font-size:12px;');
        } else {
            console.error(error);
        }

        console.info(
            `%c${new Date().toLocaleString()}`,
            'color:#888; font-size:10px;',
        );

        console.groupEnd();
    }

    /**
     * Serialize data structures to form-encoded payloads.
     *
     * @param {Record<string, any>} obj
     * @param {string} [prefix]
     * @returns {string}
     */
    serializeToFormEncoded(obj, prefix) {
        return serializeToFormEncoded(obj, prefix);
    }

    /**
     * Perform HTTP request with Energine defaults.
     *
     * @param {string} uri
     * @param {any} data
     * @param {Function} onSuccess
     * @param {Function} [onUserError]
     * @param {Function} [onServerError]
     * @param {string} [method]
     * @returns {Promise<void>}
     */
    async request(uri, data, onSuccess, onUserError, onServerError = () => {}, method = 'post') {
        return this.requestClient(uri, data, onSuccess, onUserError, onServerError, method);
    }

    /**
     * Cancel DOM event in a cross-browser manner.
     *
     * @param {Event} [event]
     */
    cancelEvent(event) {
        const evt = event || (this.globalScope ? this.globalScope.event : undefined);
        try {
            if (evt && typeof evt.preventDefault === 'function') {
                evt.stopPropagation();
                evt.preventDefault();
            } else if (evt) {
                evt.returnValue = false;
                evt.cancelBubble = true;
            }
        } catch (error) {
            console.warn(error);
        }
    }

    /**
     * Resize image via configured resizer endpoint.
     *
     * @param {HTMLImageElement} img
     * @param {string} src
     * @param {number} w
     * @param {number} h
     * @param {string} [r]
     */
    resize(img, src, w, h, r = '') {
        if (!img) return;
        img.setAttribute('src', `${this.resizer}${r}w${w}-h${h}/${src}`);
    }

    /**
     * Resolve Bootstrap runtime from global scope.
     *
     * @returns {any}
     */
    resolveBootstrap() {
        return this.uiHelpers.resolveBootstrap();
    }

    /**
     * Display confirmation dialog.
     *
     * @param {string} message
     * @param {Function} [yes]
     * @param {Function} [no]
     */
    confirmBox(message, yes, no) {
        this.uiHelpers.confirmBox(message, yes, no);
    }

    /**
     * Display alert dialog.
     *
     * @param {string} message
     */
    alertBox(message) {
        this.uiHelpers.alertBox(message);
    }

    /**
     * Display toast notification.
     *
     * @param {string} message
     * @param {string} [icon]
     * @param {Function} [callback]
     */
    noticeBox(message, icon, callback) {
        this.uiHelpers.noticeBox(message, icon, callback);
    }

    /**
     * Show loader overlay for container.
     *
     * @param {HTMLElement} [container]
     */
    showLoader(container) {
        this.uiHelpers.showLoader(container);
    }

    /**
     * Hide loader overlay for container.
     *
     * @param {HTMLElement} [container]
     */
    hideLoader(container) {
        this.uiHelpers.hideLoader(container);
    }

    /**
     * Attach external CSS file.
     *
     * @param {string} file
     */
    loadCSS(file) {
        if (typeof document === 'undefined') return;
        if (!document.querySelector(`link[href$="${file}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = file;
            document.head.appendChild(link);
        }
    }

    /**
     * Boot runtime with provided configuration.
     *
     * @param {Record<string, any>} config
     * @returns {this}
     */
    boot(config = {}) {
        const { translations: translationsConfig, ...rest } = config;

        this.mergeConfigValues(rest);

        if (translationsConfig) {
            this.translations.extend(translationsConfig);
        }

        return this;
    }

    /**
     * Stage translation dictionary for later usage.
     *
     * @param {Record<string, any>} values
     */
    stageTranslations(values) {
        if (!values || typeof values !== 'object') {
            return;
        }

        this.translations.extend(values);
    }
}

const Energine = new EnergineCore(globalScope);

const behaviorRuntime = createBehaviorRuntime({
    globalScope,
    getDebugFlag: () => Boolean(Energine.debug),
    safeConsoleError: (error, context) => Energine.safeConsoleError(error, context),
    registerToolbarComponent,
});

Energine.scanForComponents = (root) => behaviorRuntime.scanForComponents(root);

const autoBootstrapRuntime = createAutoBootstrap(
    typeof document !== 'undefined' ? document : null,
    {
        runtime: Energine,
        exposeRuntime: (runtimeInstance) => exposeRuntimeToGlobal(runtimeInstance, globalScope),
        scanForComponents: (root) => behaviorRuntime.scanForComponents(root),
        scheduleRetry: (task, options) => behaviorRuntime.scheduleRetry(task, options),
        getPendingBehaviorNames: () => behaviorRuntime.getPendingBehaviorNames(),
        initializeToolbars,
        applyTranslations: applyTranslationsFromScripts,
        datasetFalseValues: behaviorRuntime.datasetFalseValues,
    },
);

autoBootstrapRuntime();

export { serializeToFormEncoded } from './Energine/request.js';

export const safeConsoleError = (error, context = '') => Energine.safeConsoleError(error, context);

export const showLoader = (container) => Energine.showLoader(container);

export const hideLoader = (container) => Energine.hideLoader(container);

export const registerBehavior = (name, ClassRef, options = {}) => behaviorRuntime.registerBehavior(name, ClassRef, options);

export const getRegisteredBehavior = (name) => behaviorRuntime.getRegisteredBehavior(name);

export default Energine;
