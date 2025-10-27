import { initializeToolbars, registerToolbarComponent } from './Toolbar.js';
import { createRequestClient, serializeToFormEncoded } from './Energine/request.js';
import createUIHelpers from './Energine/ui.js';
import createBehaviorRuntime from './Energine/behaviorRegistry.js';
import { createConfigFactory } from './Energine/config.js';
import { resolveGlobalScope, resolveDocument, exposeRuntimeToScope } from './Energine/globalScopeAdapter.js';
import { createLogger } from './Energine/logger.js';
import { createRuntimeConfig, createConfigPropertyDescriptors } from './Energine/runtimeConfig.js';
import { createTranslationsStore } from './Energine/translationsStore.js';
import { createAutoBootstrap } from './Energine/autoBootstrap.js';
import { createRetryExecutor } from './Energine/retry.js';
import { applyTranslationsFromScripts } from './Energine/translationScripts.js';

const globalScope = resolveGlobalScope();
const documentRef = resolveDocument(globalScope);

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

/**
 * Core runtime responsible for coordinating Energine helpers.
 */
class EnergineCore {
    /**
     * @param {ReturnType<typeof resolveGlobalScope>} scope
     * @param {{ logger?: ReturnType<typeof createLogger> }} [options]
     */
    constructor(scope, options = {}) {
        this.globalScope = scope;

        /** @type {ReturnType<typeof createLogger>} */
        this.logger = options.logger || createLogger({ console: scope?.console || (typeof console !== 'undefined' ? console : undefined) });

        this.moduleUrl = (typeof import.meta !== 'undefined' && import.meta && import.meta.url)
            ? import.meta.url
            : '';
        this.moduleScriptElement = null;

        /** @type {ReturnType<typeof createRuntimeConfig>} */
        this.configState = createRuntimeConfig();
        Object.defineProperties(this, createConfigPropertyDescriptors(this.configState));

        const { facade, store } = createTranslationsStore();
        /** @type {Record<string, any>} */
        this.translationStore = store;
        /** @type {ReturnType<typeof createTranslationsStore>['facade']} */
        this.translations = facade;

        this.configFactory = createConfigFactory(() => this.resolveModuleScriptElement());
        this.requestClient = createRequestClient({
            fetchImpl: resolveFetchImplementation(scope || globalScope),
            getForceJSON: () => Boolean(this.forceJSON),
            serialize: serializeToFormEncoded,
        });
        this.uiHelpers = createUIHelpers({ globalScope: scope });
    }

    /**
     * Locate script element corresponding to Energine module.
     *
     * @returns {HTMLScriptElement|null}
     */
    resolveModuleScriptElement() {
        if (!documentRef) {
            return null;
        }
        if (this.moduleScriptElement && documentRef.contains(this.moduleScriptElement)) {
            return this.moduleScriptElement;
        }
        if (!this.moduleUrl) {
            return null;
        }

        const scripts = documentRef.getElementsByTagName('script');
        for (let i = scripts.length - 1; i >= 0; i -= 1) {
            const script = scripts[i];
            if (script.type !== 'module' || !script.src) {
                continue;
            }

            try {
                const normalizedSrc = new URL(script.src, documentRef.baseURI).href;
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

        this.configState.merge(values);
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
        this.logger.error(error, context);
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
            if (typeof console !== 'undefined' && console.warn) {
                console.warn(error);
            }
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
        if (!documentRef) return;
        if (!documentRef.querySelector(`link[href$="${file}"]`)) {
            const link = documentRef.createElement('link');
            link.rel = 'stylesheet';
            link.href = file;
            documentRef.head.appendChild(link);
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

const fallbackConsole = globalScope?.console || (typeof console !== 'undefined' ? console : undefined);

const Energine = new EnergineCore(globalScope, { logger: createLogger({ console: fallbackConsole }) });

const behaviorRuntime = createBehaviorRuntime({
    globalScope,
    getDebugFlag: () => Boolean(Energine.debug),
    safeConsoleError: (error, context) => Energine.safeConsoleError(error, context),
    registerToolbarComponent,
});

Energine.scanForComponents = (root) => behaviorRuntime.scanForComponents(root);

const retryExecutor = createRetryExecutor((task, options) => behaviorRuntime.scheduleRetry(task, options));

const autoBootstrapRuntime = createAutoBootstrap(
    documentRef,
    {
        runtime: Energine,
        exposeRuntime: (runtimeInstance) => exposeRuntimeToScope(runtimeInstance, globalScope),
        scanForComponents: (root) => behaviorRuntime.scanForComponents(root),
        scheduleRetry: (task, options) => retryExecutor.execute(task, options),
        getPendingBehaviorNames: () => behaviorRuntime.getPendingBehaviorNames(),
        initializeToolbars,
        applyTranslations: applyTranslationsFromScripts,
        datasetFalseValues: behaviorRuntime.datasetFalseValues,
        logger: Energine.logger,
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
