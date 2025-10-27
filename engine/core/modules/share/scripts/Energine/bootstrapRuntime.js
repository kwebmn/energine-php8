import { createAutoBootstrap } from './autoBootstrap.js';
import { exposeRuntimeToScope } from './globalScopeAdapter.js';
import { applyTranslationsFromScripts } from './translationScripts.js';
import { initializeToolbars } from '../Toolbar.js';

/**
 * Create Energine bootstrap runtime with deferred execution.
 *
 * @param {{
 *   documentRef: Document | null,
 *   runtime: any,
 *   behaviorRuntime: {
 *     scanForComponents(root?: HTMLElement | Document): void,
 *     scheduleRetry(task: Function, options?: Record<string, any>): void,
 *     getPendingBehaviorNames(): string[],
 *     datasetFalseValues: Record<string, any>,
 *   },
 *   retryExecutor: { execute(task: Function, options?: Record<string, any>): void },
 *   globalScope: any,
 * }} dependencies
 * @returns {ReturnType<typeof createAutoBootstrap>}
 */
export const buildBootstrapRuntime = ({ documentRef, runtime, behaviorRuntime, retryExecutor, globalScope }) =>
    createAutoBootstrap(
        documentRef,
        {
            runtime,
            exposeRuntime: (runtimeInstance) => exposeRuntimeToScope(runtimeInstance, globalScope),
            scanForComponents: (root) => behaviorRuntime.scanForComponents(root),
            scheduleRetry: (task, options) => retryExecutor.execute(task, options),
            getPendingBehaviorNames: () => behaviorRuntime.getPendingBehaviorNames(),
            initializeToolbars,
            applyTranslations: applyTranslationsFromScripts,
            datasetFalseValues: behaviorRuntime.datasetFalseValues,
            logger: runtime.logger,
        },
    );
