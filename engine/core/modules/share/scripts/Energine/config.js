export const allowedConfigKeys = [
    'debug',
    'base',
    'static',
    'resizer',
    'media',
    'root',
    'lang',
    'singleMode',
    'forceJSON',
    'supportContentEdit',
];

export const DATASET_FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);

/**
 * Normalize boolean-like values coming from DOM datasets.
 *
 * @param {string|number|boolean|null|undefined} value
 * @param {Set<string>} [falseValues]
 * @returns {boolean}
 */
export const normalizeDatasetBoolean = (value, falseValues = DATASET_FALSE_VALUES) => {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'number') {
        return value !== 0;
    }
    if (typeof value === 'string') {
        return !falseValues.has(value.trim().toLowerCase());
    }
    return Boolean(value);
};

/**
 * Read configuration from <script> dataset attributes.
 *
 * @param {HTMLScriptElement|null} scriptEl
 * @param {string[]} keys
 * @returns {Record<string, any>}
 */
export const readConfigFromScriptDataset = (scriptEl, keys = allowedConfigKeys) => {
    if (!scriptEl || !scriptEl.dataset) {
        return {};
    }

    const config = {};
    keys.forEach((key) => {
        if (typeof scriptEl.dataset[key] === 'undefined') {
            return;
        }
        if (key === 'debug' || key === 'singleMode') {
            config[key] = scriptEl.dataset[key] === 'true';
        } else {
            config[key] = scriptEl.dataset[key];
        }
    });

    return config;
};

/**
 * Normalize raw configuration props.
 *
 * @param {Record<string, any>} props
 * @returns {Record<string, any>}
 */
export const createConfigFromProps = (props = {}) => {
    const config = { ...props };

    const normalizeBoolean = (value) => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        if (typeof value === 'string') {
            return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
        }
        return Boolean(value);
    };

    ['debug', 'forceJSON', 'supportContentEdit', 'singleMode'].forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(config, key)) {
            config[key] = normalizeBoolean(config[key]);
        }
    });

    return config;
};

/**
 * Build helpers for resolving Energine configuration.
 *
 * @param {() => HTMLScriptElement|null} resolveScriptElement
 * @param {string[]} [keys]
 * @returns {{
 *   readConfigFromScriptDataset: () => Record<string, any>,
 *   createConfigFromProps: (props?: Record<string, any>) => Record<string, any>,
 *   createConfigFromScriptDataset: (overrides?: Record<string, any>) => Record<string, any>,
 * }}
 */
export const createConfigFactory = (resolveScriptElement, keys = allowedConfigKeys) => {
    const resolver = (typeof resolveScriptElement === 'function')
        ? resolveScriptElement
        : () => null;

    return {
        readConfigFromScriptDataset: () => readConfigFromScriptDataset(resolver(), keys),
        createConfigFromProps: (props = {}) => createConfigFromProps(props),
        createConfigFromScriptDataset: (overrides = {}) => {
            const baseConfig = readConfigFromScriptDataset(resolver(), keys);
            return createConfigFromProps({ ...baseConfig, ...overrides });
        },
    };
};
