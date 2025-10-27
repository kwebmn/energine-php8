import { allowedConfigKeys } from './config.js';

/**
 * @typedef {Record<string, any>} ConfigRecord
 */

const DEFAULT_CONFIG = {
    debug: false,
    base: '',
    static: '',
    resizer: '',
    media: '',
    root: '',
    lang: '',
    singleMode: false,
    forceJSON: false,
    supportContentEdit: true,
};

/**
 * @typedef {{
 *   get: <T = any>(key: string) => T,
 *   set: (key: string, value: any) => void,
 *   merge: (values: ConfigRecord) => void,
 *   toObject: () => ConfigRecord
 * }} RuntimeConfigState
 */

/**
 * Create mutable configuration container.
 *
 * @param {ConfigRecord} [initial]
 * @returns {RuntimeConfigState}
 */
export const createRuntimeConfig = (initial = {}) => {
    const state = { ...DEFAULT_CONFIG, ...initial };

    const get = (key) => state[key];
    const set = (key, value) => {
        if (allowedConfigKeys.includes(key)) {
            state[key] = value;
        }
    };
    const merge = (values = {}) => {
        if (!values || typeof values !== 'object') {
            return;
        }
        Object.entries(values).forEach(([key, value]) => set(key, value));
    };
    const toObject = () => ({ ...state });

    return { get, set, merge, toObject };
};

/**
 * Create property descriptors that proxy access to runtime config container.
 *
 * @param {RuntimeConfigState} configState
 * @returns {PropertyDescriptorMap}
 */
export const createConfigPropertyDescriptors = (configState) => (
    allowedConfigKeys.reduce((descriptors, key) => ({
        ...descriptors,
        [key]: {
            enumerable: true,
            configurable: false,
            get() {
                return configState.get(key);
            },
            set(value) {
                configState.set(key, value);
            },
        },
    }), {})
);
