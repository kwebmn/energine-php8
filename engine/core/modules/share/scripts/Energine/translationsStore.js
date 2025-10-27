/**
 * Create translation store facade with getter/setter helpers.
 * @module Energine/translationsStore
 */

/**
 * @typedef {{
 *   get: (constant: string) => string|null,
 *   set: (constant: string, value: string) => void,
 *   extend: (values: Record<string, any>) => void
 * }} TranslationsFacade
 */

/**
 * @returns {{ facade: TranslationsFacade, store: Record<string, any> }}
 */
export const createTranslationsStore = () => {
    const store = {};

    /** @type {TranslationsFacade} */
    const facade = {
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

    return { facade, store };
};
