import { initializeToolbars, registerToolbarComponent } from './Toolbar.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

const allowedConfigKeys = [
    'debug',
    'base',
    'static',
    'resizer',
    'media',
    'root',
    'lang',
    'singleMode',
    'supportContentEdit',
];

const datasetFalseValues = new Set(['0', 'false', 'no', 'off']);

const isElement = (value) => (typeof Element !== 'undefined') && value instanceof Element;

class EnergineCore {
    constructor(scope) {
        this.globalScope = scope;

        this.moduleUrl = (typeof import.meta !== 'undefined' && import.meta && import.meta.url)
            ? import.meta.url
            : '';
        this.moduleScriptElement = null;

        this.translationStore = {};
        this.translations = this.createTranslationsFacade();

        this.config = {};
        allowedConfigKeys.forEach((key) => {
            const defaultValue = (key === 'debug' || key === 'singleMode')
                ? false
                : (key === 'supportContentEdit' ? true : '');
            this.config[key] = defaultValue;
            this[key] = defaultValue;
        });

        this.registry = new Map();
    }

    createTranslationsFacade() {
        const store = this.translationStore;
        return {
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
    }

    resolveModuleScriptElement() {
        if (typeof document === 'undefined') {
            return null;
        }
        if (this.moduleScriptElement && document.contains(this.moduleScriptElement)) {
            return this.moduleScriptElement;
        }
        if (!this.moduleUrl) {
            return null;
        }

        const scripts = document.getElementsByTagName('script');
        for (let i = scripts.length - 1; i >= 0; i -= 1) {
            const script = scripts[i];
            if (script.type !== 'module' || !script.src) {
                continue;
            }

            try {
                const normalizedSrc = new URL(script.src, document.baseURI).href;
                if (normalizedSrc === this.moduleUrl) {
                    this.moduleScriptElement = script;
                    return script;
                }
            } catch {
                // ignore malformed URLs
            }
        }

        return null;
    }

    readConfigFromScriptDataset() {
        if (typeof document === 'undefined') {
            return {};
        }

        const scriptEl = this.resolveModuleScriptElement();
        if (!scriptEl || !scriptEl.dataset) {
            return {};
        }

        const config = {};
        allowedConfigKeys.forEach((key) => {
            if (typeof scriptEl.dataset[key] === 'undefined') {
                return;
            }
            if (key === 'debug' || key === 'singleMode' || key === 'supportContentEdit') {
                config[key] = !datasetFalseValues.has(scriptEl.dataset[key].toLowerCase());
            } else {
                config[key] = scriptEl.dataset[key];
            }
        });

        return config;
    }

    mergeConfigValues(values = {}) {
        if (!values || typeof values !== 'object') {
            return;
        }

        allowedConfigKeys.forEach((key) => {
            if (!Object.prototype.hasOwnProperty.call(values, key)) {
                return;
            }

            const value = values[key];
            if (key === 'debug' || key === 'singleMode' || key === 'supportContentEdit') {
                const normalized = typeof value === 'boolean'
                    ? value
                    : !datasetFalseValues.has(String(value).toLowerCase());
                this.config[key] = normalized;
                this[key] = normalized;
            } else if (typeof value !== 'undefined') {
                this.config[key] = value;
                this[key] = value;
            }
        });
    }

    createConfigFromProps(props = {}) {
        const normalized = { ...props };

        const normalizeBoolean = (value) => {
            if (typeof value === 'boolean') return value;
            if (typeof value === 'number') return value !== 0;
            if (typeof value === 'string') {
                return !datasetFalseValues.has(value.toLowerCase());
            }
            return Boolean(value);
        };

        ['debug', 'singleMode', 'supportContentEdit'].forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(normalized, key)) {
                normalized[key] = normalizeBoolean(normalized[key]);
            }
        });

        return normalized;
    }

    createConfigFromScriptDataset(overrides = {}) {
        const baseConfig = this.readConfigFromScriptDataset();
        return this.createConfigFromProps({ ...baseConfig, ...overrides });
    }

    boot(config = {}) {
        const { translations: translationsConfig, registry } = config;

        this.mergeConfigValues(config);

        if (translationsConfig && typeof translationsConfig === 'object') {
            this.translations.extend(translationsConfig);
        }

        if (registry && typeof registry === 'object') {
            Object.entries(registry).forEach(([name, value]) => {
                this.register(name, value);
            });
        }

        return this;
    }

    stageTranslations(values) {
        if (!values || typeof values !== 'object') {
            return;
        }
        this.translations.extend(values);
    }

    safeConsoleError(e, context = '') {
        if (typeof console === 'undefined' || !console.error || !console.groupCollapsed) {
            return;
        }

        const message = (e && e.message) ? e.message : e;

        console.groupCollapsed(
            `%c[App Error]%c ${context ? `[${context}] ` : ''}%c${message}`,
            'color:#fff; background:#dc3545; padding:2px 6px; border-radius:3px;',
            'color:#aaa; font-size:11px;',
            'color:#dc3545;',
        );

        if (e && e.stack) {
            console.error('%cStack trace:', 'color:#888');
            console.error(`%c${e.stack}`, 'color:#dc3545; font-size:12px;');
        } else {
            console.error(e);
        }

        console.info(
            `%c${new Date().toLocaleString()}`,
            'color:#888; font-size:10px;',
        );

        console.groupEnd();
    }

    cancelEvent(e) {
        const event = e || (this.globalScope ? this.globalScope.event : undefined);
        try {
            if (event && event.preventDefault) {
                event.stopPropagation();
                event.preventDefault();
            } else if (event) {
                event.returnValue = false;
                event.cancelBubble = true;
            }
        } catch (err) {
            console.warn(err);
        }
    }

    resize(img, src, w, h, r = '') {
        if (!img) return;
        img.setAttribute('src', `${this.resizer}${r}w${w}-h${h}/${src}`);
    }

    createDatePicker() {
        // Placeholder for date picker integration
    }

    createDateTimePicker() {
        // Placeholder for date-time picker integration
    }

    loadCSS(file) {
        if (typeof document === 'undefined') return;
        if (!document.querySelector(`link[href$="${file}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = file;
            document.head.appendChild(link);
        }
    }

    register(name, value) {
        if (!name || typeof name !== 'string') {
            return;
        }
        this.registry.set(name, value);
    }

    resolve(name) {
        if (!name) {
            return undefined;
        }
        if (this.registry.has(name)) {
            return this.registry.get(name);
        }
        if (this.globalScope && typeof this.globalScope[name] !== 'undefined') {
            return this.globalScope[name];
        }
        return undefined;
    }

    attachToWindow(target = this.globalScope) {
        if (!target) {
            return this;
        }

        target.safeConsoleError = this.safeConsoleError.bind(this);
        target.Energine = this;

        return this;
    }

    getBehaviorConstructor(name) {
        if (!name) {
            return undefined;
        }
        const registered = this.resolve(name);
        if (typeof registered === 'function') {
            return registered;
        }
        return undefined;
    }

    instantiateBehavior(element) {
        if (!isElement(element)) {
            return;
        }
        if (element.dataset && element.dataset.eJsApplied === '1') {
            return;
        }

        const behaviorName = element.dataset?.eJs?.trim();
        if (!behaviorName) {
            return;
        }

        const BehaviorCtor = this.getBehaviorConstructor(behaviorName);
        if (typeof BehaviorCtor !== 'function') {
            this.safeConsoleError(
                new Error(`Behavior "${behaviorName}" is not registered`),
                '[Energine.initDOM]'
            );
            return;
        }

        try {
            const instance = new BehaviorCtor(element, element.dataset, this);
            if (element.dataset) {
                element.dataset.eJsApplied = '1';
            }
            Object.defineProperty(element, '__energineInstance', {
                value: instance,
                configurable: true,
                enumerable: false,
                writable: false,
            });
        } catch (error) {
            this.safeConsoleError(error, `[Energine.initDOM] Failed to instantiate behavior "${behaviorName}"`);
        }
    }

    initPageToolbars(root) {
        if (typeof document === 'undefined') {
            return;
        }

        const elements = [];
        if (isElement(root) && root.matches('[data-page-toolbar]')) {
            elements.push(root);
        }

        const scope = (root && typeof root.querySelectorAll === 'function')
            ? root
            : document;

        scope.querySelectorAll?.('[data-page-toolbar]').forEach((el) => {
            if (!elements.includes(el)) {
                elements.push(el);
            }
        });

        elements.forEach((element) => {
            if (element.dataset.pageToolbarApplied === '1') {
                return;
            }

            const behaviorName = element.dataset.pageToolbarBehavior || 'PageToolbar';
            const ToolbarCtor = this.getBehaviorConstructor(behaviorName);

            if (typeof ToolbarCtor !== 'function') {
                this.safeConsoleError(
                    new Error(`Toolbar behavior "${behaviorName}" is not registered`),
                    '[Energine.initDOM]'
                );
                return;
            }

            try {
                const instance = new ToolbarCtor(element, { mode: 'declarative' });
                element.dataset.pageToolbarApplied = '1';

                const componentRef = element.dataset.toolbarComponent
                    || element.dataset.componentRef
                    || null;

                if (componentRef && typeof registerToolbarComponent === 'function') {
                    try {
                        registerToolbarComponent(componentRef, instance);
                    } catch (error) {
                        this.safeConsoleError(
                            error,
                            `[Energine.initDOM] Failed to register toolbar component "${componentRef}"`,
                        );
                    }
                }
            } catch (error) {
                this.safeConsoleError(error, '[Energine.initDOM] Failed to create page toolbar instance');
            }
        });
    }

    initPageEditors(root) {
        if (typeof document === 'undefined') {
            return;
        }

        const elements = [];
        if (isElement(root) && root.matches('[data-page-editor]')) {
            elements.push(root);
        }

        const scope = (root && typeof root.querySelectorAll === 'function')
            ? root
            : document;

        scope.querySelectorAll?.('[data-page-editor]').forEach((el) => {
            if (!elements.includes(el)) {
                elements.push(el);
            }
        });

        elements.forEach((element) => {
            if (element.dataset.pageEditorApplied === '1') {
                return;
            }

            const behaviorName = element.dataset.pageEditorBehavior
                || element.dataset.pageEditor
                || 'PageEditor';
            const EditorCtor = this.getBehaviorConstructor(behaviorName);

            if (typeof EditorCtor !== 'function') {
                this.safeConsoleError(
                    new Error(`Editor behavior "${behaviorName}" is not registered`),
                    '[Energine.initDOM]'
                );
                return;
            }

            try {
                const instance = new EditorCtor(element, element?.dataset, this);
                element.dataset.pageEditorApplied = '1';
                Object.defineProperty(element, '__energineEditor', {
                    value: instance,
                    configurable: true,
                    enumerable: false,
                    writable: false,
                });
            } catch (error) {
                this.safeConsoleError(error, '[Energine.initDOM] Failed to create PageEditor instance');
            }
        });
    }

    initBehaviors(root) {
        if (typeof document === 'undefined') {
            return;
        }

        const elements = [];
        if (isElement(root) && root.matches('[data-e-js]')) {
            elements.push(root);
        }

        const scope = (root && typeof root.querySelectorAll === 'function')
            ? root
            : document;

        scope.querySelectorAll?.('[data-e-js]').forEach((el) => {
            if (!elements.includes(el)) {
                elements.push(el);
            }
        });

        elements.forEach((element) => this.instantiateBehavior(element));
    }

    initDOM(root = (typeof document !== 'undefined' ? document : null)) {
        if (!root) {
            return;
        }

        this.initBehaviors(root);
        this.initPageToolbars(root);
        this.initPageEditors(root);

        if (root === document && typeof initializeToolbars === 'function') {
            try {
                initializeToolbars(document);
            } catch (error) {
                this.safeConsoleError(error, '[Energine.initDOM] Failed to initialize legacy toolbars');
            }
        }
    }

    shouldRun(scriptEl) {
        if (!scriptEl || !scriptEl.dataset) {
            return true;
        }

        const runAttr = scriptEl.dataset.run;
        if (typeof runAttr === 'string' && datasetFalseValues.has(runAttr.toLowerCase())) {
            return false;
        }

        if (typeof document !== 'undefined' && document.body && document.body.dataset) {
            const bodyRun = document.body.dataset.energineRun;
            if (typeof bodyRun === 'string' && datasetFalseValues.has(bodyRun.toLowerCase())) {
                return false;
            }
        }

        return true;
    }
}

const Energine = new EnergineCore(globalScope);

const autoBootstrapRuntime = () => {
    const scriptEl = Energine.resolveModuleScriptElement();

    if (!Energine.shouldRun(scriptEl)) {
        Energine.attachToWindow(globalScope);
        return;
    }

    const config = Energine.createConfigFromScriptDataset();
    const runtime = Energine.boot(config);

    runtime.attachToWindow(globalScope);

    if (typeof document === 'undefined') {
        return;
    }

    const init = () => runtime.initDOM(document);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
};

autoBootstrapRuntime();

export const bootEnergine = (config = {}) => Energine.boot(config);

export const stageTranslations = (values) => Energine.stageTranslations(values);

export const createConfigFromProps = (props = {}) => Energine.createConfigFromProps(props);

export const createConfigFromScriptDataset = (overrides = {}) => Energine.createConfigFromScriptDataset(overrides);

export const safeConsoleError = (error, context = '') => Energine.safeConsoleError(error, context);

export const attachToWindow = (target = globalScope, runtime = Energine) => runtime.attachToWindow(target);

export const register = (name, value) => Energine.register(name, value);

export const resolve = (name) => Energine.resolve(name);

export default Energine;
