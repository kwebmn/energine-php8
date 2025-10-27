import { createLogger } from './logger.js';
import { createRuntimeConfig, createConfigPropertyDescriptors } from './runtimeConfig.js';
import { createTranslationsStore } from './translationsStore.js';
import { createConfigFactory } from './config.js';
import { createRequestClient, serializeToFormEncoded } from './request.js';
import createUIHelpers from './ui.js';

const resolveConsole = (scope) => scope?.console || (typeof console !== 'undefined' ? console : undefined);

/**
 * Prepare logger instance for Energine runtime.
 *
 * @param {any} scope
 * @param {ReturnType<typeof createLogger>} [logger]
 * @returns {ReturnType<typeof createLogger>}
 */
export const setupLogger = (scope, logger) => logger || createLogger({ console: resolveConsole(scope) });

/**
 * Create runtime configuration state and property descriptors.
 *
 * @returns {{ configState: ReturnType<typeof createRuntimeConfig>, descriptors: PropertyDescriptorMap }}
 */
export const setupConfigState = () => {
    const configState = createRuntimeConfig();
    return {
        configState,
        descriptors: createConfigPropertyDescriptors(configState),
    };
};

/**
 * Prepare translations store and facade.
 *
 * @returns {ReturnType<typeof createTranslationsStore>}
 */
export const setupTranslationsStore = () => createTranslationsStore();

/**
 * Build configuration factory bound to module script resolver.
 *
 * @param {() => HTMLScriptElement | null} resolveModuleScriptElement
 * @returns {ReturnType<typeof createConfigFactory>}
 */
export const setupConfigFactory = (resolveModuleScriptElement) => createConfigFactory(resolveModuleScriptElement);

/**
 * Create request client tailored for Energine runtime.
 *
 * @param {{ scope: any, getForceJSON: () => boolean, resolveFetch: (scope: any, fallback?: any) => typeof fetch }} options
 * @returns {ReturnType<typeof createRequestClient>}
 */
export const setupRequestClient = ({ scope, getForceJSON, resolveFetch }) => createRequestClient({
    fetchImpl: resolveFetch(scope),
    getForceJSON,
    serialize: serializeToFormEncoded,
});

/**
 * Initialize UI helper facade bound to provided scope.
 *
 * @param {any} scope
 * @returns {ReturnType<typeof createUIHelpers>}
 */
export const setupUIHelpers = (scope) => createUIHelpers({ globalScope: scope });

export { serializeToFormEncoded };
