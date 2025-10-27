/**
 * Centralized logging helpers for Energine runtime.
 * @module Energine/logger
 */

/**
 * @typedef {{
 *   console?: Console
 * }} LoggerEnvironment
 */

/**
 * @typedef {{
 *   error: (error: unknown, context?: string) => void
 * }} Logger
 */

/**
 * Create logger instance bound to provided console implementation.
 *
 * @param {LoggerEnvironment} env
 * @returns {Logger}
 */
export const createLogger = (env) => {
    const consoleRef = env?.console;

    const error = (errorObj, context = '') => {
        if (!consoleRef || typeof consoleRef.error !== 'function' || typeof consoleRef.groupCollapsed !== 'function') {
            return;
        }

        const message = (errorObj && typeof errorObj === 'object' && 'message' in errorObj)
            ? /** @type {{ message: string }} */ (errorObj).message
            : String(errorObj);

        consoleRef.groupCollapsed(
            `%c[App Error]%c ${context ? `[${context}] ` : ''}%c${message}`,
            'color:#fff; background:#dc3545; padding:2px 6px; border-radius:3px;',
            'color:#aaa; font-size:11px;',
            'color:#dc3545;',
        );

        if (errorObj && typeof errorObj === 'object' && 'stack' in errorObj && errorObj.stack) {
            consoleRef.error('%cStack trace:', 'color:#888');
            consoleRef.error(`%c${errorObj.stack}`, 'color:#dc3545; font-size:12px;');
        } else {
            consoleRef.error(errorObj);
        }

        consoleRef.info(
            `%c${new Date().toLocaleString()}`,
            'color:#888; font-size:10px;',
        );

        consoleRef.groupEnd();
    };

    return { error };
};
