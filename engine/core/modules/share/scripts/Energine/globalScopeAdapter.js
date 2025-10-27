/**
 * Utilities for interacting with global execution context and DOM APIs.
 * @module Energine/globalScopeAdapter
 */

/**
 * @typedef {Window & typeof globalThis} GlobalLike
 */

/**
 * Resolve runtime global scope, falling back to the most widely available option.
 *
 * @returns {GlobalLike|undefined}
 */
export const resolveGlobalScope = () => {
    if (typeof window !== 'undefined') {
        return window;
    }
    if (typeof globalThis !== 'undefined') {
        return /** @type {GlobalLike} */ (globalThis);
    }
    return undefined;
};

/**
 * Resolve document reference from provided scope.
 *
 * @param {GlobalLike|undefined} [scope]
 * @returns {Document|null}
 */
export const resolveDocument = (scope = resolveGlobalScope()) => {
    if (!scope || typeof scope.document === 'undefined') {
        return null;
    }
    return scope.document;
};

/**
 * Check whether DOM APIs are available.
 *
 * @param {GlobalLike|undefined} [scope]
 * @returns {boolean}
 */
export const hasDOMEnvironment = (scope = resolveGlobalScope()) => Boolean(resolveDocument(scope));

/**
 * Expose runtime helpers to the global scope in a controlled manner.
 *
 * @template T
 * @param {T} runtime
 * @param {GlobalLike|undefined} target
 * @returns {T}
 */
export const exposeRuntimeToScope = (runtime, target = resolveGlobalScope()) => {
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
