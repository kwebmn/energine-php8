import { registerToolbarComponent } from './Toolbar.js';
import createBehaviorRuntime from './Energine/behaviorRegistry.js';
import { resolveGlobalScope, resolveDocument } from './Energine/globalScopeAdapter.js';
import { createRetryExecutor } from './Energine/retry.js';
import {
    setupLogger,
    setupConfigState,
    setupTranslationsStore,
    setupConfigFactory,
    setupRequestClient,
    setupUIHelpers,
    serializeToFormEncoded,
} from './Energine/factories.js';
import { resolveFetchImplementation } from './Energine/fetchImplementation.js';
import { createConfigRuntime } from './Energine/configRuntime.js';
import {
    createModuleScriptResolver,
    createEventCanceler,
    createCSSLoader,
    createImageResizer,
} from './Energine/domUtils.js';
import { createUIDelegates } from './Energine/uiDelegates.js';
import { buildBootstrapRuntime } from './Energine/bootstrapRuntime.js';

const globalScope = resolveGlobalScope();
const documentRef = resolveDocument(globalScope);

/**
 * Core runtime responsible for coordinating Energine helpers.
 */
class EnergineCore {
    /**
     * @param {ReturnType<typeof resolveGlobalScope>} scope
     * @param {{ logger?: ReturnType<typeof setupLogger> }} [options]
     */
    constructor(scope, options = {}) {
        this.globalScope = scope;

        this.logger = setupLogger(scope, options.logger);

        this.moduleUrl = (typeof import.meta !== 'undefined' && import.meta && import.meta.url)
            ? import.meta.url
            : '';
        this.moduleScriptElement = null;

        const { configState, descriptors } = setupConfigState();
        this.configState = configState;
        Object.defineProperties(this, descriptors);

        const { facade, store } = setupTranslationsStore();
        this.translationStore = store;
        this.translations = facade;

        this.resolveModuleScriptElement = createModuleScriptResolver({
            documentRef,
            getModuleUrl: () => this.moduleUrl,
            getCachedElement: () => this.moduleScriptElement,
            setCachedElement: (element) => {
                this.moduleScriptElement = element;
            },
        });

        this.configFactory = setupConfigFactory(() => this.resolveModuleScriptElement());

        Object.assign(this, createConfigRuntime({
            configState: this.configState,
            translations: this.translations,
            configFactory: this.configFactory,
        }));

        this.requestClient = setupRequestClient({
            scope,
            getForceJSON: () => Boolean(this.forceJSON),
            resolveFetch: (candidateScope) => resolveFetchImplementation(candidateScope, globalScope),
        });

        this.uiHelpers = setupUIHelpers(scope);
        Object.assign(this, createUIDelegates(this.uiHelpers));

        this.cancelEvent = createEventCanceler(scope);
        this.loadCSS = createCSSLoader(documentRef);
        this.resize = createImageResizer({ getResizerBase: () => this.resizer });

        this.serializeToFormEncoded = serializeToFormEncoded;
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
     * Resolve Bootstrap runtime from global scope.
     *
     * @returns {any}
     */
    resolveBootstrap() {
        return this.uiHelpers.resolveBootstrap();
    }
}

const EnergineRuntime = new EnergineCore(globalScope);

const behaviorRuntime = createBehaviorRuntime({
    globalScope,
    getDebugFlag: () => Boolean(EnergineRuntime.debug),
    safeConsoleError: (error, context) => EnergineRuntime.safeConsoleError(error, context),
    registerToolbarComponent,
});

EnergineRuntime.scanForComponents = (root) => behaviorRuntime.scanForComponents(root);

const retryExecutor = createRetryExecutor((task, options) => behaviorRuntime.scheduleRetry(task, options));

const createBootstrapRuntimeFactory = () => buildBootstrapRuntime({
    documentRef,
    runtime: EnergineRuntime,
    behaviorRuntime,
    retryExecutor,
    globalScope,
});

const EnergineAPI = {
    runtime: EnergineRuntime,
    serializeToFormEncoded,
    safeConsoleError: (error, context = '') => EnergineRuntime.safeConsoleError(error, context),
    showLoader: (container) => EnergineRuntime.showLoader(container),
    hideLoader: (container) => EnergineRuntime.hideLoader(container),
    registerBehavior: (name, ClassRef, options = {}) => behaviorRuntime.registerBehavior(name, ClassRef, options),
    getRegisteredBehavior: (name) => behaviorRuntime.getRegisteredBehavior(name),
    scanForComponents: (root) => behaviorRuntime.scanForComponents(root),
    createBootstrapRuntime: createBootstrapRuntimeFactory,
};

export const {
    runtime: Energine,
    serializeToFormEncoded: serializeToFormEncodedRequest,
    safeConsoleError,
    showLoader,
    hideLoader,
    registerBehavior,
    getRegisteredBehavior,
    scanForComponents,
    createBootstrapRuntime: createBootstrapRuntimeFactoryExport,
} = EnergineAPI;

export {
    serializeToFormEncodedRequest as serializeToFormEncoded,
    createBootstrapRuntimeFactoryExport as createBootstrapRuntime,
};

export default EnergineAPI;
