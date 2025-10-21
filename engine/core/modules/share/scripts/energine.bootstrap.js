const GLOBAL_SCOPE = typeof window !== 'undefined' ? window : globalThis;
const DEFAULT_CONFIG_SELECTOR = '#energine-config';
const DATASET_CONFIG_KEYS = ['debug', 'base', 'static', 'resizer', 'media', 'root', 'lang', 'singleMode'];

const normalizeBoolean = (value) => {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'number') {
        return value !== 0;
    }
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        return ['1', 'true', 'yes', 'on'].includes(normalized);
    }
    return Boolean(value);
};

const resolveAbsoluteUrl = (url, base) => {
    if (!url) {
        return null;
    }
    try {
        const resolved = new URL(url, base || (typeof document !== 'undefined' ? document.baseURI : undefined));
        return resolved.href;
    } catch {
        return url;
    }
};

export const resolveBootstrapScript = (moduleUrl = import.meta.url) => {
    if (typeof document === 'undefined') {
        return null;
    }
    if (!moduleUrl) {
        return document.currentScript || null;
    }

    const scripts = document.getElementsByTagName('script');
    for (let index = scripts.length - 1; index >= 0; index -= 1) {
        const script = scripts[index];
        if (script.type !== 'module' || !script.src) {
            continue;
        }
        try {
            const normalizedSrc = new URL(script.src, document.baseURI).href;
            const normalizedModuleUrl = new URL(moduleUrl, document.baseURI).href;
            if (normalizedSrc === normalizedModuleUrl) {
                return script;
            }
        } catch {
            // ignore malformed URLs
        }
    }

    return document.currentScript || null;
};

export const readDatasetConfig = (scriptEl = resolveBootstrapScript()) => {
    const dataset = (scriptEl && scriptEl.dataset) ? scriptEl.dataset : {};

    const config = {};
    DATASET_CONFIG_KEYS.forEach((key) => {
        if (typeof dataset[key] === 'undefined') {
            return;
        }
        if (key === 'debug' || key === 'singleMode') {
            config[key === 'singleMode' ? 'singleMode' : 'debug'] = normalizeBoolean(dataset[key]);
        } else {
            config[key] = dataset[key];
        }
    });

    return {
        config,
        configSelector: dataset.config || DEFAULT_CONFIG_SELECTOR,
        energineUrl: resolveAbsoluteUrl(dataset.energine, scriptEl ? scriptEl.src : undefined),
        script: scriptEl || null,
    };
};

export const readJsonConfig = (selector = DEFAULT_CONFIG_SELECTOR) => {
    if (typeof document === 'undefined') {
        return {};
    }

    let element = null;
    if (typeof selector === 'string') {
        element = selector ? document.querySelector(selector) : null;
    } else if (selector && selector.nodeType === 1) {
        element = selector;
    }

    if (!element) {
        return {};
    }

    const raw = element.textContent || element.innerText || '';
    if (!raw.trim()) {
        return {};
    }

    try {
        return JSON.parse(raw);
    } catch (error) {
        if (console && console.error) {
            console.error('[Energine] Failed to parse bootstrap config JSON:', error);
        }
        return {};
    }
};

const assignVariables = (variables, scope = GLOBAL_SCOPE) => {
    if (!variables || typeof variables !== 'object') {
        return;
    }
    Object.keys(variables).forEach((key) => {
        scope[key] = variables[key];
    });
};

const ensureGlobalPlaceholders = (placeholders, scope = GLOBAL_SCOPE) => {
    if (!Array.isArray(placeholders)) {
        return;
    }
    placeholders.forEach((name) => {
        if (!name) {
            return;
        }
        if (!Object.prototype.hasOwnProperty.call(scope, name) || scope[name] === undefined) {
            scope[name] = null;
        }
    });
};

const resolveExportPath = (path, scope = GLOBAL_SCOPE) => {
    if (!path || !scope) {
        return undefined;
    }
    const segments = path.split('.');
    let cursor = scope;
    for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index];
        if (!segment) {
            return undefined;
        }
        cursor = cursor[segment];
        if (cursor === undefined || cursor === null) {
            return undefined;
        }
    }
    return cursor;
};

const createErrorReporter = (safeConsoleError) => (error, context = '') => {
    if (typeof safeConsoleError === 'function') {
        safeConsoleError(error, context);
    } else if (console && console.error) {
        if (context) {
            console.error(`[Energine] ${context}`, error);
        } else {
            console.error('[Energine]', error);
        }
    }
};

const instantiateComponents = (components, options) => {
    const { safeConsoleError } = options || {};
    if (!Array.isArray(components) || components.length === 0) {
        return;
    }
    const reportError = createErrorReporter(safeConsoleError);
    const doc = typeof document !== 'undefined' ? document : null;

    components.forEach((component) => {
        if (!component || typeof component !== 'object') {
            return;
        }
        const { id, behavior } = component;
        if (!id || !behavior || !doc) {
            return;
        }
        const element = doc.getElementById(id);
        if (!element) {
            return;
        }

        try {
            const Constructor = resolveExportPath(behavior);
            if (typeof Constructor !== 'function') {
                throw new Error(`Component constructor "${behavior}" is not available on the global scope.`);
            }
            GLOBAL_SCOPE[id] = new Constructor(element);
        } catch (error) {
            reportError(error, `component:${behavior}`);
        }
    });
};

const schedulePageToolbar = (runtime, definition, options) => {
    if (!definition || typeof definition !== 'object' || !runtime || typeof runtime.addTask !== 'function') {
        return;
    }
    const { safeConsoleError } = options || {};
    const reportError = createErrorReporter(safeConsoleError);

    runtime.addTask(() => {
        try {
            const ToolbarClass = resolveExportPath(definition.className);
            if (typeof ToolbarClass !== 'function') {
                throw new Error(`Toolbar constructor "${definition.className}" is not available on the global scope.`);
            }
            const controls = Array.isArray(definition.controls) ? definition.controls : [];
            const properties = (definition.properties && typeof definition.properties === 'object')
                ? definition.properties
                : {};
            let pageId = definition.pageId;
            if (typeof pageId === 'string' && pageId.trim() !== '') {
                const parsed = Number(pageId);
                if (!Number.isNaN(parsed)) {
                    pageId = parsed;
                }
            }
            // eslint-disable-next-line no-new
            new ToolbarClass(definition.url, pageId, definition.name, controls, properties);
        } catch (error) {
            reportError(error, `toolbar:${definition.className}`);
        }
    });
};

const initializePageEditor = (definition, options) => {
    if (!definition || typeof definition !== 'object') {
        return;
    }
    const { safeConsoleError } = options || {};
    const reportError = createErrorReporter(safeConsoleError);

    try {
        const EditorClass = resolveExportPath(definition.className);
        if (typeof EditorClass !== 'function') {
            throw new Error(`Page editor constructor "${definition.className}" is not available on the global scope.`);
        }
        if (!definition.globalId) {
            throw new Error('Page editor global identifier is not defined.');
        }
        GLOBAL_SCOPE[definition.globalId] = new EditorClass();
    } catch (error) {
        reportError(error, `page-editor:${definition.className || 'unknown'}`);
    }
};

const applyTranslations = (stageTranslations, translations, safeConsoleError) => {
    if (!translations) {
        return;
    }
    try {
        if (typeof stageTranslations === 'function') {
            stageTranslations(translations);
        }
    } catch (error) {
        const reportError = createErrorReporter(safeConsoleError);
        reportError(error, 'translations');
    }
};

const mergeRuntimeConfig = (datasetConfig, jsonConfig) => {
    const runtimeConfig = { ...(datasetConfig || {}) };
    if (jsonConfig && typeof jsonConfig === 'object' && jsonConfig.config && typeof jsonConfig.config === 'object') {
        Object.assign(runtimeConfig, jsonConfig.config);
    }
    return runtimeConfig;
};

export const bootstrapEnergine = async (options = {}) => {
    const scriptElement = options.scriptElement || resolveBootstrapScript();
    const datasetConfig = options.datasetConfig || readDatasetConfig(scriptElement);
    const jsonConfig = options.jsonConfig || readJsonConfig(datasetConfig.configSelector);

    const moduleUrl = datasetConfig.energineUrl
        || (scriptElement ? scriptElement.src : null)
        || './energine.js';

    let energineModule;
    try {
        energineModule = await import(/* @vite-ignore */ moduleUrl);
    } catch (error) {
        if (console && console.error) {
            console.error('[Energine] Unable to load Energine runtime module:', error);
        }
        throw error;
    }

    const {
        bootEnergine,
        attachToWindow,
        safeConsoleError,
        stageTranslations,
    } = energineModule;

    const runtimeConfig = mergeRuntimeConfig(datasetConfig.config, jsonConfig);
    const runtime = bootEnergine(runtimeConfig);

    if (GLOBAL_SCOPE && GLOBAL_SCOPE.__energineBridge && typeof GLOBAL_SCOPE.__energineBridge.setRuntime === 'function') {
        GLOBAL_SCOPE.__energineBridge.setRuntime(runtime);
    }

    const energineRuntime = attachToWindow(GLOBAL_SCOPE, runtime);

    GLOBAL_SCOPE.componentToolbars = [];

    assignVariables(jsonConfig.variables, GLOBAL_SCOPE);
    ensureGlobalPlaceholders(jsonConfig.componentGlobals, GLOBAL_SCOPE);
    applyTranslations(stageTranslations, jsonConfig.translations, safeConsoleError);
    instantiateComponents(jsonConfig.components, { safeConsoleError });
    schedulePageToolbar(energineRuntime, jsonConfig.pageToolbar, { safeConsoleError });
    initializePageEditor(jsonConfig.pageEditor, { safeConsoleError });

    if (typeof document !== 'undefined' && document && typeof document.addEventListener === 'function') {
        document.addEventListener('DOMContentLoaded', () => energineRuntime.run());
    }

    return energineRuntime;
};

if (typeof window !== 'undefined') {
    bootstrapEnergine().catch((error) => {
        if (console && console.error) {
            console.error('[Energine] Bootstrap failure:', error);
        }
    });
}

export default bootstrapEnergine;
