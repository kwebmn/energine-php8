import { DATASET_FALSE_VALUES, normalizeDatasetBoolean } from './config.js';

const defaultGlobalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

const noop = () => {};

const PENDING_BEHAVIOR_DEBUG_THRESHOLD = 5;
const PENDING_BEHAVIOR = Symbol('Energine.pendingBehavior');

/**
 * Factory providing behavior registry utilities for Energine runtime.
 *
 * @param {Object} params
 * @param {any} [params.globalScope]
 * @param {() => boolean} [params.getDebugFlag]
 * @param {(error: unknown, context?: string) => void} [params.safeConsoleError]
 * @param {(name: string, instance: any) => void} [params.registerToolbarComponent]
 * @param {Set<string>} [params.datasetFalseValues]
 * @returns {{
 *   registerBehavior: (name: string, ClassRef: Function, options?: { force?: boolean }) => boolean,
 *   getRegisteredBehavior: (name: string) => Function|null,
 *   instantiateBehaviorForElement: (element: HTMLElement, explicitBehaviorName?: string|null, options?: { silentOnMissing?: boolean }) => any,
 *   scanForComponents: (root?: Document|HTMLElement|null) => any[],
 *   scheduleRetry: (task: Function, options?: { attempts?: number, delay?: number, onError?: Function, onGiveUp?: Function }) => any,
 *   getPendingBehaviorNames: () => string[],
 *   datasetFalseValues: Set<string>,
 * }}
 */
export const createBehaviorRuntime = ({
    globalScope = defaultGlobalScope,
    getDebugFlag = () => false,
    safeConsoleError = noop,
    registerToolbarComponent = noop,
    datasetFalseValues = DATASET_FALSE_VALUES,
} = {}) => {
    const behaviorRegistry = new Map();
    const pendingBehaviors = new Map();

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

    const disposeExistingBehaviorInstance = (element) => {
        if (!element) {
            return;
        }

        const existing = element.__energineBehavior;
        if (existing && typeof existing.destroy === 'function') {
            try {
                existing.destroy();
            } catch (error) {
                safeConsoleError(error, '[Energine.autoBootstrap] Failed to dispose existing component instance');
            }
        }

        element.__energineBehavior = null;
        if (element.dataset) {
            delete element.dataset.eReady;
        }
    };

    const attachToolbarBinding = (element, instance) => {
        if (!element) {
            return;
        }

        const dataset = element.dataset || {};
        const componentRef = dataset.eToolbarComponent || element.getAttribute('data-e-toolbar-component');

        if (!componentRef) {
            return;
        }

        try {
            registerToolbarComponent(componentRef, instance);
        } catch (error) {
            safeConsoleError(error, `[Energine.autoBootstrap] Failed to register toolbar component "${componentRef}"`);
        }
    };

    const instantiateBehaviorForElement = (element, explicitBehaviorName = null, options = {}) => {
        if (!(element instanceof HTMLElement)) {
            return null;
        }

        const dataset = element.dataset || {};
        const shouldRefresh = normalizeDatasetBoolean(dataset.eRefresh, datasetFalseValues);
        const isReady = normalizeDatasetBoolean(dataset.eReady, datasetFalseValues);

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

            if (pendingCount <= 1 && !silentOnMissing && typeof console !== 'undefined' && console.info) {
                console.info(message);
            }

            const shouldThrow = Boolean(getDebugFlag() && pendingCount >= PENDING_BEHAVIOR_DEBUG_THRESHOLD);

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
            safeConsoleError(error, `[Energine.autoBootstrap] Failed to instantiate behavior "${behaviorName}"`);
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
            const shouldRefresh = normalizeDatasetBoolean(dataset.eRefresh, datasetFalseValues);
            const alreadyReady = normalizeDatasetBoolean(dataset.eReady, datasetFalseValues);

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
                    safeConsoleError(error, '[Energine.autoBootstrap] Retriable task threw an error');
                }
            }

            if (result || !schedule || remainingAttempts <= 0) {
                if (!result && (remainingAttempts <= 0 || !schedule) && typeof onGiveUp === 'function') {
                    try {
                        onGiveUp();
                    } catch (error) {
                        safeConsoleError(error, '[Energine.autoBootstrap] onGiveUp callback failed');
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

    const registerBehavior = (name, ClassRef, options = {}) => {
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

    const getRegisteredBehavior = (name) => resolveRegisteredBehavior(name);

    return {
        registerBehavior,
        getRegisteredBehavior,
        instantiateBehaviorForElement,
        scanForComponents,
        scheduleRetry,
        getPendingBehaviorNames,
        datasetFalseValues,
    };
};

export default createBehaviorRuntime;
