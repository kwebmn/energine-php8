import { applyTranslationsFromScripts } from './translationScripts.js';

/**
 * @typedef {{
 *   runtime: any,
 *   exposeRuntime: (runtime: any) => any,
 *   scanForComponents: (root: Document|null) => any,
 *   scheduleRetry: (task: () => boolean, options: import('./retry.js').RetryOptions) => void,
 *   getPendingBehaviorNames: () => string[],
 *   initializeToolbars?: (doc: Document|null) => void,
 *   applyTranslations?: (runtime: any, doc: Document|null) => void,
 *   datasetFalseValues?: Set<string>,
 *   logger: { error: (error: unknown, context?: string) => void },
 * }} AutoBootstrapDependencies
 */

const defaultDatasetFalseValues = new Set(['0', 'false', 'no', 'off']);

/**
 * Create runtime initializer responsible for reading configuration and exposing runtime globally.
 *
 * @param {Document|null} doc
 * @param {AutoBootstrapDependencies} deps
 */
export const createRuntimeInitializer = (doc, deps) => () => {
    const { runtime, exposeRuntime, logger, datasetFalseValues = defaultDatasetFalseValues } = deps;

    if (!doc || !runtime || typeof runtime.resolveModuleScriptElement !== 'function') {
        return null;
    }

    const scriptEl = runtime.resolveModuleScriptElement();
    if (!scriptEl || !scriptEl.dataset) {
        return null;
    }

    const dataset = scriptEl.dataset;
    if (dataset.run && datasetFalseValues.has(dataset.run.toLowerCase())) {
        return null;
    }

    try {
        const config = runtime.createConfigFromScriptDataset();
        const bootedRuntime = runtime.boot(config);
        return exposeRuntime(bootedRuntime);
    } catch (error) {
        logger.error(error, '[Energine.autoBootstrap] Runtime initialization failed');
        return null;
    }
};

/**
 * Create DOM bootstrapper that performs component scanning, translations and toolbar init.
 *
 * @param {Document|null} doc
 * @param {AutoBootstrapDependencies} deps
 */
export const createDomBootstrapper = (doc, deps) => {
    const {
        scanForComponents,
        scheduleRetry,
        initializeToolbars,
        getPendingBehaviorNames,
        logger,
        applyTranslations = applyTranslationsFromScripts,
    } = deps;

    return (runtimeInstance) => {
        if (!doc || !runtimeInstance) {
            return;
        }

        let toolbarsInitialized = false;

        const runToolbarInitialization = () => {
            if (toolbarsInitialized || typeof initializeToolbars !== 'function') {
                return;
            }
            try {
                initializeToolbars(doc);
                toolbarsInitialized = true;
            } catch (error) {
                logger.error(error, '[Energine.autoBootstrap] Failed to initialize toolbars');
            }
        };

        const retryOptions = {
            attempts: 20,
            delay: 150,
            onError: (error) => logger.error(error, '[Energine.autoBootstrap] Component bootstrap failed'),
            onGiveUp: () => {
                runToolbarInitialization();
                const unresolved = getPendingBehaviorNames();
                if (Array.isArray(unresolved) && unresolved.length) {
                    const details = unresolved.join(', ');
                    logger.error(new Error(`Unresolved behaviors after bootstrap: ${details}`), '[Energine.autoBootstrap] Behavior registry');
                }
            },
        };

        const task = () => {
            applyTranslations(runtimeInstance, doc);

            const initialized = scanForComponents(doc);
            const pending = initialized && typeof initialized.pending === 'number'
                ? initialized.pending
                : 0;
            const ready = Array.isArray(initialized) && pending === 0;

            if (ready) {
                runToolbarInitialization();
            }

            return ready;
        };

        if (typeof scheduleRetry === 'function') {
            scheduleRetry(task, retryOptions);
        } else {
            logger.error(new Error('Missing retry scheduler for auto bootstrap'), '[Energine.autoBootstrap] Dependency resolution');
        }
    };
};

/**
 * Compose auto bootstrap runner.
 *
 * @param {Document|null} doc
 * @param {AutoBootstrapDependencies} deps
 */
export const createAutoBootstrap = (doc, deps) => {
    let executed = false;
    const initRuntime = createRuntimeInitializer(doc, deps);
    const bootstrapDom = createDomBootstrapper(doc, deps);

    return () => {
        if (executed) {
            return;
        }

        const runtimeInstance = initRuntime();
        if (!runtimeInstance) {
            return;
        }

        executed = true;

        if (doc && doc.readyState === 'loading') {
            doc.addEventListener('DOMContentLoaded', () => {
                bootstrapDom(runtimeInstance);
            }, { once: true });
        } else {
            bootstrapDom(runtimeInstance);
        }
    };
};
