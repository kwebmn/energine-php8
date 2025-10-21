const RUNTIME_SELECTOR = 'script[data-energine-core]';
const TRANSLATION_SELECTOR = 'script[type="application/json"][data-energine-translations]';
const BEHAVIOUR_TEMPLATE_SELECTOR = 'template[data-energine-behaviors]';
const COMPONENT_TEMPLATE_SELECTOR = 'template[data-energine-components]';

const ELEMENT_CTOR = typeof Element !== 'undefined' ? Element : null;

const runtimeState = {
    script: null,
    config: {},
    bootPromise: null,
    mountedControllers: new WeakMap(),
    translations: {},
};

function coerceValue(value) {
    if (value === undefined || value === null) {
        return value;
    }

    if (value === '') {
        return '';
    }

    const normalized = String(value).trim();
    const lower = normalized.toLowerCase();

    if (lower === 'true') {
        return true;
    }

    if (lower === 'false') {
        return false;
    }

    if (lower === 'null') {
        return null;
    }

    if (lower === 'undefined') {
        return undefined;
    }

    if (!Number.isNaN(Number(normalized))) {
        return Number(normalized);
    }

    return normalized;
}

function extractOptions(dataset, ignoredKeys = []) {
    const options = {};
    Object.keys(dataset || {}).forEach((key) => {
        if (ignoredKeys.includes(key)) {
            return;
        }
        options[key] = coerceValue(dataset[key]);
    });
    return options;
}

function toCamelCaseKey(name) {
    if (typeof name !== 'string') {
        return '';
    }
    const trimmed = name.trim();
    if (!trimmed) {
        return '';
    }
    if (!/[-_:]/.test(trimmed)) {
        return trimmed;
    }
    const segments = trimmed.split(/[-_:]+/).filter(Boolean);
    if (!segments.length) {
        return '';
    }
    return segments.map((segment, index) => {
        const lower = segment.toLowerCase();
        if (index === 0) {
            return lower;
        }
        return lower.charAt(0).toUpperCase() + lower.slice(1);
    }).join('');
}

function collectAttributes(element, ignored = [], preserveOriginal = false) {
    const result = {};
    if (!element || !element.attributes) {
        return result;
    }
    Array.from(element.attributes).forEach((attr) => {
        const { name, value } = attr;
        if (ignored.includes(name)) {
            return;
        }
        const key = preserveOriginal ? name : toCamelCaseKey(name);
        if (!key) {
            return;
        }
        result[key] = coerceValue(value);
    });
    return result;
}

function readTemplateElements(template, selector) {
    if (!template || !template.content) {
        return [];
    }
    return Array.from(template.content.querySelectorAll(selector));
}

function parsePropertyNodes(container) {
    const properties = {};
    if (!container) {
        return properties;
    }
    const propertyNodes = container.querySelectorAll('property');
    propertyNodes.forEach((node) => {
        const name = node.getAttribute('name') || node.getAttribute('key');
        if (!name) {
            return;
        }
        const value = node.hasAttribute('value') ? node.getAttribute('value') : node.textContent;
        properties[name] = coerceValue(value);
    });
    return properties;
}

function parseControlNodes(container) {
    if (!container) {
        return [];
    }
    const controls = [];
    container.querySelectorAll('control').forEach((node) => {
        const attributes = collectAttributes(node, [], true);
        if (Object.keys(attributes).length) {
            controls.push(attributes);
        }
    });
    return controls;
}

function readBehaviourDefinitions() {
    const doc = getDocument();
    const templates = Array.from(doc.querySelectorAll(BEHAVIOUR_TEMPLATE_SELECTOR));
    const definitions = [];
    templates.forEach((template) => {
        readTemplateElements(template, 'behavior').forEach((node) => {
            const selector = node.getAttribute('selector') || null;
            const moduleId = node.getAttribute('module') || node.getAttribute('controller') || null;
            if (!selector || !moduleId) {
                return;
            }
            const definition = {
                selector,
                module: moduleId,
            };
            const exportName = node.getAttribute('export');
            if (exportName) {
                definition.export = exportName;
            }
            const options = collectAttributes(node, ['selector', 'module', 'controller', 'export']);
            if (Object.keys(options).length) {
                definition.options = options;
            }
            definitions.push(definition);
        });
    });
    return definitions;
}

function readComponentDefinitions() {
    const doc = getDocument();
    const templates = Array.from(doc.querySelectorAll(COMPONENT_TEMPLATE_SELECTOR));
    const definitions = [];
    templates.forEach((template) => {
        readTemplateElements(template, 'component').forEach((node) => {
            const selector = node.getAttribute('selector') || null;
            const moduleId = node.getAttribute('module') || node.getAttribute('controller') || null;
            if (!selector || !moduleId) {
                return;
            }
            const definition = {
                selector,
                module: moduleId,
            };
            const exportName = node.getAttribute('export');
            if (exportName) {
                definition.export = exportName;
            }
            const options = collectAttributes(node, ['selector', 'module', 'controller', 'export']);
            const controls = parseControlNodes(node.querySelector('controls'));
            if (controls.length) {
                options.controls = controls;
            }
            const properties = parsePropertyNodes(node.querySelector('properties'));
            if (Object.keys(properties).length) {
                options.properties = properties;
            }
            if (Object.keys(options).length) {
                definition.options = options;
            }
            definitions.push(definition);
        });
    });
    return definitions;
}

function getDocument() {
    if (typeof document === 'undefined') {
        throw new Error('Energine runtime requires a DOM environment');
    }
    return document;
}

function findRuntimeScript() {
    const doc = getDocument();
    let script = doc.querySelector(RUNTIME_SELECTOR);
    if (script) {
        return script;
    }
    const scripts = Array.from(doc.querySelectorAll('script[type="module"]'));
    script = scripts.reverse().find((node) => {
        const src = node.getAttribute('src') || '';
        return src.includes('Energine.js');
    }) || null;
    return script;
}

export function readConfigFromScriptDataset(scriptElement) {
    if (!scriptElement || !scriptElement.dataset) {
        return {};
    }
    const dataset = scriptElement.dataset;
    const config = {};
    Object.keys(dataset).forEach((key) => {
        config[key] = coerceValue(dataset[key]);
    });
    return config;
}

export function getConfig() {
    return Object.assign({}, runtimeState.config);
}

function ensureAbsoluteUrl(url) {
    if (typeof url !== 'string' || url.length === 0) {
        return url;
    }
    if (/^[a-z]+:\/\//i.test(url) || url.startsWith('//')) {
        return url;
    }
    return null;
}

export function resolveModuleUrl(moduleId) {
    if (!moduleId) {
        throw new Error('Module identifier must be provided');
    }

    const absolute = ensureAbsoluteUrl(moduleId);
    if (absolute) {
        return absolute;
    }

    if (moduleId.startsWith('/')) {
        return moduleId;
    }

    if (moduleId.startsWith('./') || moduleId.startsWith('../')) {
        if (runtimeState.script && runtimeState.script.src) {
            return new URL(moduleId, runtimeState.script.src).toString();
        }
        return moduleId;
    }

    const staticBase = runtimeState.config.static || '';
    if (!staticBase) {
        return moduleId;
    }
    const separator = staticBase.endsWith('/') ? '' : '/';
    return `${staticBase}${separator}${moduleId.replace(/^\/+/g, '')}`;
}

function readJsonPayload(selector) {
    try {
        const node = getDocument().querySelector(selector);
        if (!node) {
            return null;
        }
        const text = node.textContent || '';
        if (!text.trim()) {
            return null;
        }
        return JSON.parse(text);
    } catch (error) {
        console.error('[Energine] Failed to parse JSON payload from', selector, error);
        return null;
    }
}

function storeTranslations(payload) {
    if (!payload || typeof payload !== 'object') {
        return;
    }
    Object.assign(runtimeState.translations, payload);
}

export const translations = {
    get(constant) {
        return Object.prototype.hasOwnProperty.call(runtimeState.translations, constant)
            ? runtimeState.translations[constant]
            : null;
    },
    set(constant, value) {
        runtimeState.translations[constant] = value;
    },
    extend(values) {
        if (!values || typeof values !== 'object') {
            return;
        }
        Object.assign(runtimeState.translations, values);
    },
};

function createControllerContext(element, options = {}) {
    return {
        element,
        options,
        config: runtimeState.config,
        translations,
        resolveModuleUrl,
        mountControllers,
    };
}

async function instantiateController(element) {
    if (!element || runtimeState.mountedControllers.has(element)) {
        return runtimeState.mountedControllers.get(element) || null;
    }

    const { controller, module: moduleId, export: exportName } = element.dataset;
    if (!controller && !moduleId) {
        return null;
    }

    const moduleSpecifier = moduleId || `scripts/${controller}.js`;
    const namespace = await import(/* webpackIgnore: true */ resolveModuleUrl(moduleSpecifier));
    const exportKey = exportName || 'default';
    const ControllerCtor = exportKey === 'default' ? (namespace.default || namespace.Controller || namespace[controller]) : namespace[exportKey];

    if (typeof ControllerCtor !== 'function') {
        throw new Error(`Controller "${controller || moduleId}" does not export a callable constructor (${exportKey}).`);
    }

    const options = extractOptions(element.dataset, ['controller', 'module', 'export']);
    const instance = new ControllerCtor(element, createControllerContext(element, options));
    if (instance && typeof instance.mount === 'function') {
        await instance.mount();
    }
    runtimeState.mountedControllers.set(element, instance || true);
    element.dispatchEvent(new CustomEvent('energine:controller-mounted', {
        bubbles: true,
        detail: {
            controller: controller || moduleId,
            instance,
        },
    }));
    return instance;
}

async function initialiseBehaviours(definitions) {
    if (!Array.isArray(definitions)) {
        return [];
    }

    const results = [];
    for (const definition of definitions) {
        if (!definition || typeof definition !== 'object') {
            continue;
        }
        const selector = definition.selector || null;
        const moduleId = definition.module || definition.controller || null;
        if (!selector || !moduleId) {
            continue;
        }

        const exportName = definition.export || 'default';
        const namespace = await import(/* webpackIgnore: true */ resolveModuleUrl(moduleId));
        const behaviour = exportName === 'default'
            ? (namespace.default || namespace.run || namespace.initialise)
            : namespace[exportName];

        if (typeof behaviour !== 'function') {
            console.warn(`[Energine] Behaviour ${moduleId} is missing callable export ${exportName}`);
            continue;
        }

        const context = {
            config: runtimeState.config,
            translations,
            resolveModuleUrl,
        };

        const nodes = selector === 'document'
            ? [getDocument()]
            : Array.from(getDocument().querySelectorAll(selector));

        for (const node of nodes) {
            try {
                const payload = definition.options ? JSON.parse(JSON.stringify(definition.options)) : {};
                results.push(await behaviour(node, context, payload));
            } catch (error) {
                console.error(`[Energine] Behaviour ${moduleId} failed`, error);
            }
        }
    }
    return results;
}

async function initialiseComponentDefinitions(definitions) {
    if (!Array.isArray(definitions)) {
        return [];
    }
    const instances = [];
    for (const definition of definitions) {
        if (!definition || typeof definition !== 'object') {
            continue;
        }
        const targetSelector = definition.selector || null;
        if (!targetSelector) {
            continue;
        }
        const nodes = Array.from(getDocument().querySelectorAll(targetSelector));
        if (!nodes.length) {
            continue;
        }
        const moduleId = definition.module || definition.controller;
        if (!moduleId) {
            continue;
        }
        const exportName = definition.export || 'default';
        const namespace = await import(/* webpackIgnore: true */ resolveModuleUrl(moduleId));
        const Factory = exportName === 'default'
            ? (namespace.default || namespace.create || namespace.initialise)
            : namespace[exportName];
        if (typeof Factory !== 'function') {
            console.warn(`[Energine] Component ${moduleId} is missing callable export ${exportName}`);
            continue;
        }
        for (const element of nodes) {
            try {
                const options = definition.options ? JSON.parse(JSON.stringify(definition.options)) : {};
                instances.push(await Factory(element, createControllerContext(element, options)));
            } catch (error) {
                console.error(`[Energine] Component ${moduleId} failed`, error);
            }
        }
    }
    return instances;
}

export async function mountControllers(root = null) {
    const doc = getDocument();
    const container = root || doc;
    const elements = ELEMENT_CTOR && container instanceof ELEMENT_CTOR
        ? [container, ...Array.from(container.querySelectorAll('[data-controller]'))]
        : Array.from(doc.querySelectorAll('[data-controller]'));

    const uniqueElements = elements.filter((el, idx, array) => {
        if (!(ELEMENT_CTOR && el instanceof ELEMENT_CTOR)) {
            return false;
        }
        if (idx === 0) {
            return true;
        }
        return array.indexOf(el) === idx;
    });

    const promises = uniqueElements.map((element) => instantiateController(element).catch((error) => {
        console.error('[Energine] Failed to mount controller for element', element, error);
        return null;
    }));

    return Promise.all(promises);
}

function shouldBoot(config) {
    const doc = getDocument();
    if (doc.body && doc.body.dataset && doc.body.dataset.energineRun === '1') {
        return true;
    }
    if (config.autoBoot === false) {
        return false;
    }
    return true;
}

async function performBoot(configOverrides = {}) {
    runtimeState.script = findRuntimeScript();
    const datasetConfig = readConfigFromScriptDataset(runtimeState.script);
    runtimeState.config = Object.assign({}, datasetConfig, configOverrides);

    if (!shouldBoot(runtimeState.config)) {
        return {
            skipped: true,
            reason: 'boot flag missing',
        };
    }

    storeTranslations(readJsonPayload(TRANSLATION_SELECTOR));

    const behaviourDefinitions = readBehaviourDefinitions();
    const componentDefinitions = readComponentDefinitions();

    const [behaviourResults, componentResults, controllerResults] = await Promise.all([
        initialiseBehaviours(behaviourDefinitions),
        initialiseComponentDefinitions(componentDefinitions),
        mountControllers(),
    ]);

    return {
        skipped: false,
        behaviours: behaviourResults,
        components: componentResults,
        controllers: controllerResults,
    };
}

export function boot(configOverrides = {}) {
    if (!runtimeState.bootPromise) {
        runtimeState.bootPromise = performBoot(configOverrides);
    }
    return runtimeState.bootPromise;
}

function scheduleAutoBoot() {
    try {
        const doc = getDocument();
        if (doc.readyState === 'loading') {
            doc.addEventListener('DOMContentLoaded', () => {
                boot().catch((error) => {
                    console.error('[Energine] boot failed', error);
                });
            }, { once: true });
            return;
        }
        boot().catch((error) => {
            console.error('[Energine] boot failed', error);
        });
    } catch (error) {
        console.error('[Energine] unable to initialise auto boot', error);
    }
}

if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'Energine', {
        configurable: true,
        enumerable: false,
        get() {
            return {
                boot,
                getConfig,
                translations,
                resolveModuleUrl,
                readConfigFromScriptDataset,
            };
        },
    });
}

scheduleAutoBoot();

export default {
    boot,
    getConfig,
    translations,
    resolveModuleUrl,
    mountControllers,
    readConfigFromScriptDataset,
};
