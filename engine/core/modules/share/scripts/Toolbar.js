const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

const TOOLBAR_DOCKED_CLASSES = ['bg-body', 'border', 'rounded-3', 'shadow-sm', 'p-2'];
const INLINE_FLEX_CENTER_CLASSES = ['d-inline-flex', 'align-items-center'];
const BUTTON_BASE_CLASSES = ['btn', 'btn-sm'];
const CUSTOM_SELECT_BUTTON_CLASSES = [
    'custom_select_button',
    ...BUTTON_BASE_CLASSES,
    'btn-outline-secondary',
    'dropdown-toggle',
    ...INLINE_FLEX_CENTER_CLASSES,
    'gap-2'
];

const normalizeDatasetPropKey = (key = '') => key
    .slice(4)
    .replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
    .toLowerCase();

const readValueFromElement = (element, { datasetKey, attributeNames = [], fallback } = {}) => {
    if (!(element instanceof HTMLElement)) {
        return '';
    }
    const dataset = element.dataset || {};
    if (datasetKey && Object.prototype.hasOwnProperty.call(dataset, datasetKey)) {
        const datasetValue = dataset[datasetKey];
        if (datasetValue !== undefined && datasetValue !== null && datasetValue !== '') {
            return datasetValue;
        }
    }
    for (const attr of attributeNames) {
        if (!attr || typeof element.getAttribute !== 'function') {
            continue;
        }
        const attrValue = element.getAttribute(attr);
        if (attrValue !== null && attrValue !== '') {
            return attrValue;
        }
    }
    if (typeof fallback === 'function') {
        const fallbackValue = fallback(element);
        if (fallbackValue !== undefined && fallbackValue !== null && fallbackValue !== '') {
            return fallbackValue;
        }
    }
    return '';
};

const createRegistryManager = () => {
    const maps = new Map();
    const ensureMap = (name) => {
        if (!maps.has(name)) {
            maps.set(name, new Map());
        }
        return maps.get(name);
    };
    return {
        ensureMap,
        assignTo(target, name) {
            target[name] = ensureMap(name);
            return target[name];
        },
        get(name, key) {
            return ensureMap(name).get(key);
        },
        set(name, key, value) {
            ensureMap(name).set(key, value);
        },
        delete(name, key) {
            ensureMap(name).delete(key);
        },
        pushToList(name, key, value) {
            const map = ensureMap(name);
            const list = map.get(key) || [];
            list.push(value);
            map.set(key, list);
            return list;
        },
        flushList(name, key) {
            const map = ensureMap(name);
            const list = map.get(key) || [];
            map.delete(key);
            return list;
        }
    };
};

const registryManager = createRegistryManager();

const CONTROL_DESCRIPTOR_PROP_CONFIG = [
    { key: 'id', datasetKey: 'controlId', attributeNames: ['data-control-id'] },
    {
        key: 'title',
        datasetKey: 'title',
        attributeNames: ['data-title'],
        fallback: element => element.textContent?.trim() || ''
    },
    { key: 'tooltip', datasetKey: 'tooltip', attributeNames: ['title', 'data-tooltip', 'data-bs-original-title'] },
    { key: 'icon', datasetKey: 'icon', attributeNames: ['data-icon'] },
    { key: 'iconOnly', datasetKey: 'iconOnly', attributeNames: ['data-icon-only'] },
    { key: 'action', datasetKey: 'action', attributeNames: ['data-action', 'data-click', 'onclick', 'onClick', 'action'] },
];

class Toolbar {
    constructor(toolbarNameOrElement, props = {}) {
        this.element = null;
        this.name = '';
        this.boundTo = null;
        this.controls = [];
        this.properties = typeof props === 'object' ? props : {};

        const { element, name } = this._initializeToolbarElement(toolbarNameOrElement);
        this.element = element;
        this.name = name;
        if (this.element && this.name) {
            this._assignToolbarIdentity(this.element, this.name);
        }
    }

    _initializeToolbarElement(toolbarNameOrElement) {
        if (toolbarNameOrElement instanceof HTMLElement) {
            const element = toolbarNameOrElement;
            const name = this._resolveToolbarName(element, toolbarNameOrElement);
            this._applyBaseToolbarAttributes(element);
            return { element, name };
        }

        const toolbarName = typeof toolbarNameOrElement === 'string' ? toolbarNameOrElement : '';
        if (typeof document === 'undefined') {
            return { element: null, name: toolbarName };
        }

        const element = document.createElement('div');
        this._applyBaseToolbarAttributes(element);
        return { element, name: toolbarName };
    }

    _resolveToolbarName(element, fallbackSource) {
        const datasetName = element?.dataset?.eToolbar;
        if (datasetName) {
            return datasetName;
        }
        if (typeof element?.getAttribute === 'function') {
            const attrName = element.getAttribute('data-e-toolbar');
            if (attrName) {
                return attrName;
            }
        }
        if (typeof element?.className === 'string') {
            const nameMatch = /([\w-]+)_toolbar/.exec(element.className);
            if (nameMatch) {
                return nameMatch[1];
            }
        }
        if (typeof fallbackSource === 'string') {
            return fallbackSource;
        }
        return '';
    }

    _applyBaseToolbarAttributes(element) {
        if (!element) {
            return;
        }
        Toolbar.applyClassList(element, {
            add: ['btn-toolbar', 'flex-wrap', 'gap-2', 'align-items-center']
        });
        element.setAttribute('role', 'toolbar');
    }

    _assignToolbarIdentity(element, name) {
        if (!element || !name) {
            return;
        }
        element.dataset.eToolbar = name;
        element.classList.add(name);
    }

    load(toolbarDescr) {
        Array.from(toolbarDescr.childNodes).forEach(elem => {
            if (elem.nodeType === 1) { // 1 — ELEMENT_NODE
                let control = null;
                switch (elem.getAttribute('type')) {
                    case 'button':
                        control = new Toolbar.Button();
                        break;
                    case 'separator':
                        control = new Toolbar.Separator();
                        break;
                }
                if (control) {
                    control.load(elem);
                    this.appendControl(control);
                }
            }
        });
    }

    dock() {
        Toolbar.applyClassList(this.element, {
            add: TOOLBAR_DOCKED_CLASSES
        });
    }
    undock() {
        Toolbar.applyClassList(this.element, {
            remove: TOOLBAR_DOCKED_CLASSES
        });
    }
    getElement() {
        return this.element;
    }
    bindTo(obj) {
        this.boundTo = obj;
    }

    _materializeControl(control) {
        if (control?.type && control.id) {
            control.action = control.onclick;
            delete control.onclick;
            const fallbackTypes = control.type === 'submit' ? ['button'] : [];
            const factoryDescriptor = Toolbar.resolveControlFactory(control.type, fallbackTypes);
            if (factoryDescriptor?.fromProps) {
                control = factoryDescriptor.fromProps(control);
            }
        }
        return control instanceof Toolbar.Control ? control : null;
    }

    _collectControls(ids = []) {
        if (!Array.isArray(ids) || !ids.length) {
            return [...this.controls];
        }
        return ids
            .map(id => (typeof id === 'string' ? this.getControlById(id) : id))
            .filter(control => control instanceof Toolbar.Control);
    }

    _forEachControl(ids, iteratee) {
        this._collectControls(ids).forEach(control => {
            if (control) {
                iteratee(control);
            }
        });
    }

    appendControl(...args) {
        args
            .map(control => this._materializeControl(control))
            .filter(Boolean)
            .forEach(control => {
                control.toolbar = this;
                control.build();
                if (control.element) {
                    if (control.element.parentNode !== this.element) {
                        this.element.appendChild(control.element);
                    }
                    this.controls.push(control);
                    control.afterMount?.();
                }
            });
    }

    removeControl(control) {
        const controls = this._collectControls([control]);
        controls.forEach(ctrl => {
            const idx = this.controls.indexOf(ctrl);
            if (idx !== -1) {
                ctrl.destroy?.();
                if (ctrl.element?.parentNode) ctrl.element.parentNode.removeChild(ctrl.element);
                ctrl.toolbar = null;
                this.controls.splice(idx, 1);
            }
        });
    }
    getControlById(id) {
        return this.controls.find(c => c.properties.id === id) || null;
    }
    disableControls(...ids) {
        const controls = ids.length ? this._collectControls(ids) : this.controls.filter(ctrl => ctrl.properties.id !== 'close');
        controls.forEach(ctrl => ctrl.disable());
    }
    enableControls(...ids) {
        const controls = ids.length ? this._collectControls(ids) : [...this.controls];
        controls.forEach(ctrl => ctrl.enable());
    }
    allButtonsUp() {
        this._forEachControl([], ctrl => {
            if (ctrl instanceof Toolbar.Button) ctrl.up();
        });
    }
    callAction(action, data) {
        if (this.boundTo && typeof this.boundTo[action] === 'function') {
            this.boundTo[action](data);
        }
    }

    // Hydration helpers
    static extractPropertiesFromDataset(dataset = {}, overrides = {}) {
        const props = Object.entries(dataset)
            .filter(([key, value]) => key && value !== undefined && value !== null && key.startsWith('prop'))
            .reduce((acc, [key, value]) => {
                const normalized = normalizeDatasetPropKey(key);
                if (normalized) {
                    acc[normalized] = value;
                }
                return acc;
            }, {});
        return Object.assign(props, overrides || {});
    }

    static readDatasetOrAttribute(element, datasetKey, attributeNames = []) {
        return readValueFromElement(element, { datasetKey, attributeNames });
    }

    static extractControlDescriptor(element) {
        if (!(element instanceof HTMLElement)) {
            return null;
        }
        const dataset = element.dataset || {};
        const declaredType = Toolbar.readDatasetOrAttribute(element, 'type', ['data-type']);
        const rawType = declaredType || element.tagName.toLowerCase();
        let type = (rawType || 'button').toLowerCase();

        const props = CONTROL_DESCRIPTOR_PROP_CONFIG.reduce((acc, config) => {
            const value = readValueFromElement(element, config);
            acc[config.key] = value || '';
            return acc;
        }, {});

        props.action = Toolbar.normalizeActionName(props.action);
        const disabled = element.hasAttribute('disabled')
            || dataset.disabled === 'true'
            || dataset.disabled === '1';
        props.disabled = disabled;

        if (!props.id && type !== 'separator') {
            return null;
        }

        const ariaPressedAttr = element.getAttribute('aria-pressed');
        const bootstrapToggle = (element.getAttribute('data-bs-toggle') || '').toLowerCase();
        const hasToggleDataset = typeof dataset.state !== 'undefined' || element.getAttribute('data-state') !== null;
        const hasPressedClass = element.classList
            ? (element.classList.contains('active') || element.classList.contains('pressed'))
            : false;
        const shouldForceSwitcher = (
            type === 'switcher'
            || (
                (type === 'button' || type === 'link' || type === 'a')
                && (
                    ariaPressedAttr !== null
                    || bootstrapToggle === 'button'
                    || hasToggleDataset
                    || hasPressedClass
                )
            )
        );

        if (shouldForceSwitcher) {
            type = 'switcher';
        }

        props.title = props.title || element.textContent?.trim() || '';
        props.type = type;

        const descriptor = {
            type,
            element,
            props,
        };

        if (type === 'switcher') {
            props.aicon = Toolbar.readDatasetOrAttribute(element, 'altIcon', ['data-alt-icon']);
            const stateFromDataset = Toolbar.readDatasetOrAttribute(element, 'state', ['data-state']);
            const stateFromAria = ariaPressedAttr !== null ? (ariaPressedAttr === 'true' ? '1' : '0') : '';
            const stateFromClasses = hasPressedClass ? '1' : '';
            props.state = stateFromDataset || stateFromAria || stateFromClasses || '';
        }

        if (type === 'select') {
            const selectEl = element.querySelector('select');
            const options = {};
            let initialValue = false;
            if (selectEl) {
                Array.from(selectEl.options).forEach(option => {
                    options[option.value] = option.textContent;
                    if (option.selected) {
                        initialValue = option.value;
                    }
                });
                props.disabled = disabled || selectEl.hasAttribute('disabled');
            }
            descriptor.options = options;
            descriptor.initial = initialValue;
        }

        if (type === 'separator') {
            props.id = props.id || '';
        }

        return descriptor;
    }

    static createControlFromDescriptor(descriptor) {
        if (!descriptor || !descriptor.props) {
            return null;
        }
        const { type } = descriptor;
        const fallbackTypes = (type === 'link' || type === 'submit') ? ['button'] : [];
        const factoryDescriptor = Toolbar.resolveControlFactory(type, fallbackTypes);
        if (!factoryDescriptor) {
            return null;
        }
        if (factoryDescriptor.fromDescriptor) {
            return factoryDescriptor.fromDescriptor(descriptor);
        }
        if (factoryDescriptor.fromProps) {
            return factoryDescriptor.fromProps(descriptor.props);
        }
        return null;
    }

    static ensureRegistryMaps(...keys) {
        const targets = keys.length ? keys : ['registry', 'pendingToolbars', 'componentInstances'];
        targets.forEach(key => {
            registryManager.assignTo(Toolbar, key);
        });
    }

    static registerToolbarInstance(toolbar, componentRef = null) {
        if (!(toolbar instanceof Toolbar)) {
            return;
        }
        Toolbar.ensureRegistryMaps('registry');
        registryManager.set('registry', toolbar.element, toolbar);

        if (!componentRef) {
            return;
        }

        Toolbar.ensureRegistryMaps('pendingToolbars', 'componentInstances');

        const componentInstance = registryManager.get('componentInstances', componentRef);
        if (componentInstance && typeof componentInstance.attachToolbar === 'function') {
            componentInstance.attachToolbar(toolbar);
            return;
        }

        registryManager.pushToList('pendingToolbars', componentRef, toolbar);
    }

    static registerComponentInstance(componentRef, instance) {
        if (!componentRef || !instance) {
            return;
        }
        Toolbar.ensureRegistryMaps('componentInstances');
        registryManager.set('componentInstances', componentRef, instance);

        const pending = registryManager.flushList('pendingToolbars', componentRef);
        if (pending && pending.length) {
            pending.forEach(toolbar => {
                try {
                    instance.attachToolbar?.(toolbar);
                } catch (error) {
                    console.warn('[Toolbar] Failed to attach toolbar to component', componentRef, error);
                }
            });
        }
    }

    static hydrate(element, options = {}) {
        if (!(element instanceof HTMLElement)) {
            return null;
        }

        if (element.dataset && element.dataset.eToolbarHydrated) {
            return (Toolbar.registry && Toolbar.registry.get(element)) || null;
        }

        const dataset = element.dataset || {};
        const toolbarName = dataset.eToolbar || options.name || '';
        const props = Toolbar.extractPropertiesFromDataset(dataset, options.properties);
        const childElements = Array.from(element.children || []).filter(child => child instanceof HTMLElement);
        const descriptors = childElements.map(child => Toolbar.extractControlDescriptor(child)).filter(Boolean);

        element.innerHTML = '';

        const toolbar = new Toolbar(element, props);
        if (toolbarName) {
            toolbar.name = toolbarName;
            toolbar.element.dataset.eToolbar = toolbarName;
            toolbar.element.classList.add(toolbarName);
        }

        descriptors.forEach(descriptor => {
            const controlInstance = Toolbar.createControlFromDescriptor(descriptor);
            if (controlInstance) {
                toolbar.appendControl(controlInstance);
            }
        });

        if (toolbar.element?.dataset) {
            toolbar.element.dataset.eToolbarHydrated = '1';
        }

        const componentRef = dataset.eToolbarComponent || dataset.componentRef || null;
        Toolbar.registerToolbarInstance(toolbar, componentRef);

        return toolbar;
    }

    static initFromDOM(root = (typeof document !== 'undefined' ? document : null)) {
        if (!root || typeof root.querySelectorAll !== 'function') {
            return [];
        }
        const toolbars = [];
        root.querySelectorAll('[data-e-toolbar]').forEach(element => {
            const toolbar = Toolbar.hydrate(element);
            if (toolbar) {
                toolbars.push(toolbar);
            }
        });
        return toolbars;
    }

    // STATIC
    static capitalize(s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    static applyClassList(element, config = {}) {
        if (!element || typeof element.classList === 'undefined') {
            return;
        }
        const { add = [], remove = [], toggle = {} } = config;
        add.forEach(className => className && element.classList.add(className));
        remove.forEach(className => className && element.classList.remove(className));
        Object.entries(toggle).forEach(([className, condition]) => {
            if (!className) {
                return;
            }
            if (condition) {
                element.classList.add(className);
            } else {
                element.classList.remove(className);
            }
        });
    }

    static getControlFactories() {
        if (!Toolbar.controlFactories) {
            Toolbar.controlFactories = new Map();
        }
        return Toolbar.controlFactories;
    }

    static registerControlFactory(type, factory) {
        if (!type || !factory) {
            return;
        }
        const normalized = String(type).toLowerCase();
        let descriptor = null;
        if (typeof factory === 'function') {
            descriptor = { fromProps: factory };
        } else if (typeof factory === 'object') {
            descriptor = {
                fromProps: typeof factory.fromProps === 'function' ? factory.fromProps : null,
                fromDescriptor: typeof factory.fromDescriptor === 'function' ? factory.fromDescriptor : null,
            };
        }
        if (descriptor) {
            Toolbar.getControlFactories().set(normalized, descriptor);
        }
    }

    static resolveControlFactory(type, fallbackTypes = []) {
        const factories = Toolbar.getControlFactories();
        const candidates = [type];
        if (Array.isArray(fallbackTypes)) {
            candidates.push(...fallbackTypes);
        } else {
            candidates.push(fallbackTypes);
        }
        for (const candidate of candidates) {
            if (!candidate && candidate !== 0) {
                continue;
            }
            const normalized = String(candidate).toLowerCase();
            const descriptor = factories.get(normalized);
            if (descriptor) {
                return descriptor;
            }
        }
        return null;
    }

    static hasBootstrapStyles() {
        return (typeof document !== 'undefined') &&
            !!document.querySelector('link[href*="bootstrap.min.css"], link[href*="energine.vendor.css"]');
    }

    static hasBootstrapScript() {
        if (typeof window !== 'undefined' && typeof window.bootstrap !== 'undefined') {
            return true;
        }
        return (typeof document !== 'undefined') &&
            !!document.querySelector('script[src*="bootstrap.bundle.min.js"], script[src*="energine.vendor.js"]');
    }

    static bootstrap = {
        attach(type, element, config = {}) {
            if (!Toolbar.hasBootstrapScript() || typeof bootstrap === 'undefined') {
                return null;
            }
            const ctor = bootstrap?.[type];
            if (typeof ctor !== 'function') {
                return null;
            }
            return ctor.getOrCreateInstance(element, config);
        },
        detach(instance) {
            if (instance && typeof instance.dispose === 'function') {
                instance.dispose();
            }
        }
    };

    static createBootstrapTooltip(element, config = {}) {
        const instance = Toolbar.bootstrap.attach('Tooltip', element, Object.assign({
            container: 'body',
            boundary: 'window'
        }, config));
        return instance;
    }

    static disposeBootstrapTooltip(instance) {
        Toolbar.bootstrap.detach(instance);
    }

    static createBootstrapDropdown(element, config = {}) {
        const instance = Toolbar.bootstrap.attach('Dropdown', element, Object.assign({
            autoClose: true
        }, config));
        return instance;
    }

    // ---- Controls ----

    static normalizeBoolean(value) {
        if (value === true || value === 1) return true;
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            return normalized === 'true' || normalized === '1' || normalized === 'disabled' || normalized === 'yes' || normalized === 'on';
        }
        return false;
    }

    static normalizeActionName(value) {
        if (typeof value === 'undefined' || value === null) {
            return '';
        }
        let candidate = String(value).trim();
        if (!candidate) {
            return '';
        }
        candidate = candidate.replace(/^javascript\s*:/i, '');
        candidate = candidate.replace(/\(\s*\)$/, '');
        candidate = candidate.replace(/;+\s*$/, '');
        return candidate.trim();
    }

    static Control = class {
        constructor(properties = {}) {
            this.toolbar = null;
            this.element = null;
            this.bootstrapTooltip = null;
            this.existingElement = null;
            this.usesDeclarativeElement = false;
            this._eventBindings = [];
            this.properties = Object.assign({
                id: '',
                icon: '',
                iconOnly: false,
                title: '',
                tooltip: '',
                action: '',
                disabled: false,
                initially_disabled: false,
                type: ''
            }, properties);
            this.properties.iconOnly = Toolbar.normalizeBoolean(this.properties.iconOnly);
            this.properties.disabled = Toolbar.normalizeBoolean(this.properties.disabled);
            this.properties.initially_disabled = Toolbar.normalizeBoolean(this.properties.initially_disabled);
            this.properties.isDisabled = this.properties.disabled;
            this.properties.isInitiallyDisabled = this.properties.initially_disabled || this.properties.isDisabled;
        }
        useExistingElement(element) {
            if (typeof HTMLElement === 'undefined' || !(element instanceof HTMLElement)) {
                return;
            }
            this.existingElement = element;
            this.usesDeclarativeElement = true;
        }
        load(controlDescr) {
            const propertyReaders = [
                { prop: 'id', read: el => el.getAttribute('id') || '' },
                { prop: 'icon', read: el => Toolbar.readDatasetOrAttribute(el, 'icon', ['icon', 'data-icon']) },
                {
                    prop: 'iconOnly',
                    read: el => Toolbar.readDatasetOrAttribute(el, 'iconOnly', ['icon-only', 'data-icon-only']),
                    transform: Toolbar.normalizeBoolean
                },
                {
                    prop: 'title',
                    read: el => readValueFromElement(el, {
                        datasetKey: 'title',
                        attributeNames: ['title', 'data-title'],
                        fallback: node => node.textContent?.trim() || ''
                    })
                },
                {
                    prop: 'action',
                    read: el => Toolbar.readDatasetOrAttribute(el, 'action', ['action', 'onclick', 'data-action']),
                    transform: Toolbar.normalizeActionName
                },
                {
                    prop: 'tooltip',
                    read: el => Toolbar.readDatasetOrAttribute(el, 'tooltip', ['tooltip', 'title', 'data-bs-original-title'])
                },
                { prop: 'type', read: el => Toolbar.readDatasetOrAttribute(el, 'type', ['type']) }
            ];

            propertyReaders.forEach(({ prop, read, transform }) => {
                const raw = (typeof read === 'function') ? read(controlDescr) : '';
                const value = transform ? transform(raw) : raw;
                this.properties[prop] = (value !== undefined && value !== null) ? value : '';
            });

            this.properties.isDisabled = controlDescr.hasAttribute('disabled');
            this.properties.isInitiallyDisabled = this.properties.isDisabled;
        }
        createElement() {
            return document.createElement('div');
        }
        applyCommonAttributes() {
            if (!this.element) return;
            if (this.toolbar && this.toolbar.name && this.properties.id) {
                this.element.id = `${this.toolbar.name}${this.properties.id}`;
            }
            this.element.dataset.controlId = this.properties.id;
            this.element.setAttribute('unselectable', 'on');
            this.updateTooltip();
        }
        bindEvent(target, event, handler, options) {
            if (!target || typeof target.addEventListener !== 'function' || typeof handler !== 'function') {
                return null;
            }
            target.addEventListener(event, handler, options);
            const binding = { target, event, handler, options };
            this._eventBindings.push(binding);
            return () => this.unbindEvent(binding);
        }
        unbindEvent(binding) {
            if (!binding || !binding.target || typeof binding.target.removeEventListener !== 'function') {
                return;
            }
            binding.target.removeEventListener(binding.event, binding.handler, binding.options);
            const idx = this._eventBindings.indexOf(binding);
            if (idx !== -1) {
                this._eventBindings.splice(idx, 1);
            }
        }
        removeAllEvents() {
            this._eventBindings.splice(0).forEach(binding => {
                if (binding && binding.target && typeof binding.target.removeEventListener === 'function') {
                    binding.target.removeEventListener(binding.event, binding.handler, binding.options);
                }
            });
        }
        updateTooltip() {
            if (!this.element) return;
            const tooltip = this.properties.tooltip || this.properties.title || '';
            if (tooltip) {
                this.element.setAttribute('title', tooltip);
                this.element.setAttribute('data-bs-toggle', 'tooltip');
                if (!this.element.getAttribute('data-bs-placement')) {
                    this.element.setAttribute('data-bs-placement', 'bottom');
                }
            } else {
                this.element.removeAttribute('title');
                this.element.removeAttribute('data-bs-toggle');
                this.element.removeAttribute('data-bs-placement');
                this.disposeBootstrapBehaviors();
            }
        }
        createIconElement(icon) {
            const wrapper = document.createElement('span');
            wrapper.classList.add('toolbar-icon', 'd-inline-flex', 'align-items-center', 'justify-content-center');
            if (!icon) {
                wrapper.textContent = '';
                return wrapper;
            }
            const trimmed = icon.trim();
            if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
                wrapper.innerHTML = trimmed;
            } else if (/^[\w\s-]+$/.test(trimmed)) {
                const iconElement = document.createElement('i');
                trimmed.split(/\s+/).filter(Boolean).forEach(cls => iconElement.classList.add(cls));
                iconElement.setAttribute('aria-hidden', 'true');
                wrapper.appendChild(iconElement);
            } else {
                wrapper.textContent = trimmed;
                wrapper.setAttribute('aria-hidden', 'true');
            }
            return wrapper;
        }
        setIcon(icon, iconOnly = null) {
            this.properties.icon = icon || '';
            if (iconOnly !== null) {
                this.properties.iconOnly = Toolbar.normalizeBoolean(iconOnly);
            }
            if (this.usesDeclarativeElement) {
                this.updateDeclarativeIcon();
            } else {
                this.render();
            }
        }
        updateDeclarativeIcon() {
            if (!this.element) {
                return;
            }
            const hasIcon = !!this.properties.icon;
            const iconContainer = this.element.querySelector('.toolbar-icon');
            if (!hasIcon) {
                if (iconContainer) {
                    iconContainer.remove();
                }
                return;
            }
            const newWrapper = this.createIconElement(this.properties.icon);
            if (iconContainer) {
                iconContainer.replaceWith(newWrapper);
            } else {
                this.element.insertBefore(newWrapper, this.element.firstChild);
            }
        }
        render() {
            if (!this.element) return;
            const hasIcon = !!this.properties.icon;
            const titleText = (this.properties.title || '').trim();
            const hasTitle = !!titleText.length;
            const fallbackLabel = this.properties.tooltip || '';
            const accessibleLabel = titleText || fallbackLabel || '';
            const iconOnly = hasIcon && (this.properties.iconOnly || !hasTitle);
            this.element.innerHTML = '';

            if (hasIcon) {
                Toolbar.applyClassList(this.element, {
                    add: INLINE_FLEX_CENTER_CLASSES,
                    toggle: {
                        'gap-2': !iconOnly,
                        'justify-content-center': iconOnly,
                        'px-2': iconOnly
                    }
                });
                const iconElement = this.createIconElement(this.properties.icon);
                this.element.appendChild(iconElement);
                if (!iconOnly) {
                    const textSpan = document.createElement('span');
                    textSpan.classList.add('toolbar-control-label', 'd-none', 'd-sm-inline');
                    textSpan.textContent = titleText || accessibleLabel;
                    this.element.appendChild(textSpan);
                }
                if (accessibleLabel) {
                    this.element.setAttribute('aria-label', accessibleLabel);
                } else {
                    this.element.removeAttribute('aria-label');
                }
            } else {
                Toolbar.applyClassList(this.element, {
                    remove: ['gap-2', 'justify-content-center', 'px-2']
                });
                const label = titleText || fallbackLabel;
                this.element.textContent = label;
                if (label) {
                    this.element.setAttribute('aria-label', label);
                } else {
                    this.element.removeAttribute('aria-label');
                }
            }
        }
        build() {
            if (!this.toolbar || !this.properties.id) return;
            if (this.existingElement) {
                this._adoptExistingElement();
                return;
            }
            this._buildFreshElement();
        }
        _adoptExistingElement() {
            this.element = this.existingElement;
            this.applyCommonAttributes();
            const elementDisabled = this.element.classList.contains('disabled')
                || this.element.hasAttribute('disabled')
                || this.element.getAttribute('aria-disabled') === 'true';
            if (elementDisabled) {
                this.properties.isDisabled = true;
            }
            if (this.properties.isDisabled) {
                this.disable();
            }
        }
        _buildFreshElement() {
            this.element = this.createElement();
            this.applyCommonAttributes();
            this.render();
            if (this.properties.isDisabled) {
                this.disable();
            }
        }
        afterMount() {
            this.initBootstrapBehaviors();
        }
        initBootstrapBehaviors() {
            if (!this.element) return;
            if (this.element.getAttribute('data-bs-toggle') === 'tooltip') {
                this.disposeBootstrapBehaviors();
                this.bootstrapTooltip = Toolbar.createBootstrapTooltip(this.element);
            }
        }
        disposeBootstrapBehaviors() {
            if (this.bootstrapTooltip) {
                Toolbar.disposeBootstrapTooltip(this.bootstrapTooltip);
                this.bootstrapTooltip = null;
            }
        }
        disable() {
            this.properties.isDisabled = true;
            this.element.classList.add('disabled');
            if ('disabled' in this.element) {
                this.element.disabled = true;
            } else {
                this.element.setAttribute('aria-disabled', 'true');
            }
        }
        enable(force = false) {
            if (force) this.properties.isInitiallyDisabled = false;
            if (!this.properties.isInitiallyDisabled) {
                this.properties.isDisabled = false;
                this.element.classList.remove('disabled');
                if ('disabled' in this.element) {
                    this.element.disabled = false;
                } else {
                    this.element.removeAttribute('aria-disabled');
                }
            }
        }
        disabled() { return this.properties.isDisabled; }
        initially_disabled() { return this.properties.isInitiallyDisabled; }
        setAction(action) { this.properties.action = action; }
        destroy() {
            this.removeAllEvents();
            this.disposeBootstrapBehaviors();
        }
    };

    static Button = class extends Toolbar.Control {
        constructor(props) {
            super(props);
            this.handleMouseOver = null;
            this.handleMouseOut = null;
            this.handleClick = null;
            this.handleMouseDown = null;
        }
        createElement() {
            return document.createElement('button');
        }
        build() {
            const usingExisting = !!this.existingElement;
            super.build();
            if (!this.element) return;
            const hasIcon = !!this.properties.icon;
            const hasTitle = !!(this.properties.title && this.properties.title.trim().length);
            const iconOnly = hasIcon && (this.properties.iconOnly || !hasTitle);
            const variantClass = this.getVariantClass();
            const typeAttr = this.properties.type || 'button';
            if ('type' in this.element) {
                this.element.type = typeAttr;
            } else if (!usingExisting) {
                this.element.setAttribute('type', typeAttr);
            }
            Toolbar.applyClassList(this.element, { add: BUTTON_BASE_CLASSES });
            if (this.properties.id) {
                Toolbar.applyClassList(this.element, { add: [`${this.properties.id}_btn`] });
            }
            if (!usingExisting) {
                const layoutClasses = [...INLINE_FLEX_CENTER_CLASSES];
                if (variantClass) {
                    layoutClasses.push(variantClass);
                }
                Toolbar.applyClassList(this.element, {
                    add: layoutClasses,
                    toggle: { 'gap-2': !iconOnly }
                });
            } else {
                Toolbar.applyClassList(this.element, {
                    toggle: { 'gap-2': !iconOnly }
                });
            }
            this._bindEvents();
        }
        _ensureHandlers() {
            if (!this.handleMouseOver) {
                this.handleMouseOver = () => {
                    if (!this.properties.isDisabled) this.element.classList.add('highlighted');
                };
            }
            if (!this.handleMouseOut) {
                this.handleMouseOut = () => {
                    this.element.classList.remove('highlighted');
                };
            }
            if (!this.handleClick) {
                this.handleClick = event => {
                    event.preventDefault();
                    this.callAction(event);
                };
            }
            if (!this.handleMouseDown) {
                this.handleMouseDown = e => { e.preventDefault(); e.stopPropagation(); };
            }
        }
        _bindEvents() {
            if (!this.element) return;
            this._ensureHandlers();
            this.removeAllEvents();
            this.bindEvent(this.element, 'mouseover', this.handleMouseOver);
            this.bindEvent(this.element, 'mouseout', this.handleMouseOut);
            this.bindEvent(this.element, 'click', this.handleClick);
            this.bindEvent(this.element, 'mousedown', this.handleMouseDown);
        }
        getVariantClass() {
            const source = [this.properties.id, this.properties.action, this.properties.title]
                .filter(Boolean)
                .join('|')
                .toLowerCase();
            if (/(save|submit|apply|update|add|create|change|select|activate|confirm|ok|upload|send|build)/.test(source)) {
                return 'btn-primary';
            }
            if (/(delete|remove|cancel|close|list|back|del|drop|down|up|move|exit)/.test(source)) {
                return 'btn-outline-secondary';
            }
            return 'btn-light';
        }
        callAction(data) {
            if (!this.properties.isDisabled) {
                this.toolbar.callAction(this.properties.action, data);
            }
        }
        down() {
            this.element.classList.add('active', 'pressed');
            this.element.setAttribute('aria-pressed', 'true');
        }
        up() {
            this.element.classList.remove('active', 'pressed');
            this.element.setAttribute('aria-pressed', 'false');
        }
        isDown() {
            return this.element.classList.contains('active') || this.element.classList.contains('pressed');
        }
        destroy() {
            super.destroy();
        }
    };

    static File = class extends Toolbar.Button {
        build() {
            super.build();
            if (!this.element) return;
            let input = this.element.querySelector('[data-role="toolbar-file-input"]');
            if (!input) {
                input = this.element.querySelector('input[type="file"]');
            }
            if (!input) {
                input = document.createElement('input');
                input.type = 'file';
                input.style.display = 'none';
                this.element.appendChild(input);
            }
            if (this.properties.id) {
                input.id = this.properties.id;
            }
            if (!this.handleFileChange) {
                this.handleFileChange = evt => {
                    const file = evt.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = e => {
                        if (!this.properties.isDisabled) {
                            this.toolbar.callAction(this.properties.action, e.target);
                        }
                    };
                    reader.readAsDataURL(file);
                };
            }
            if (this.unbindFileChange) {
                this.unbindFileChange();
                this.unbindFileChange = null;
            }
            this.unbindFileChange = this.bindEvent(input, 'change', this.handleFileChange);
            this.fileInput = input;
        }
        callAction() {
            if (this.fileInput) this.fileInput.click();
        }
        destroy() {
            if (this.unbindFileChange) {
                this.unbindFileChange();
                this.unbindFileChange = null;
            }
            this.fileInput = null;
            super.destroy();
        }
    };

    static Switcher = class extends Toolbar.Button {
        constructor(props) {
            super(props);
            if (props && typeof props.aicon !== 'undefined') {
                this.properties.aicon = props.aicon || '';
            } else if (typeof this.properties.aicon === 'undefined') {
                this.properties.aicon = '';
            }
            this.properties.state = this.properties.state ? !!parseInt(this.properties.state, 10) : false;
            this.handleSwitch = null;
        }
        build() {
            super.build();
            this.element.setAttribute('data-bs-toggle', 'button');
            const toggle = () => {
                if (this.properties.state) {
                    if (this.properties.aicon) {
                        this.setIcon(this.properties.aicon);
                    }
                    this.element.classList.add('active', 'pressed');
                } else {
                    if (this.properties.icon) {
                        this.setIcon(this.properties.icon);
                    } else if (this.properties.aicon) {
                        this.setIcon('');
                    }
                    this.element.classList.remove('active', 'pressed');
                }
                this.element.setAttribute('aria-pressed', this.properties.state ? 'true' : 'false');
            };
            this.handleSwitch = () => {
                if (!this.properties.isDisabled) {
                    this.properties.state = !this.properties.state;
                    toggle();
                }
            };
            this.bindEvent(this.element, 'click', this.handleSwitch);
            toggle();
        }
        load(controlDescr) {
            super.load(controlDescr);
            this.properties.aicon = controlDescr.getAttribute('aicon') || '';
            const stateAttr = controlDescr.getAttribute('state');
            if (stateAttr !== null) {
                this.properties.state = Toolbar.normalizeBoolean(stateAttr) ? 1 : 0;
            } else {
                this.properties.state = 0;
            }
        }
        getState() { return this.properties.state; }
        destroy() {
            super.destroy();
        }
    };

    static Separator = class extends Toolbar.Control {
        build() {
            super.build();
            if (!this.element) return;
            this.element.classList.add('vr', 'mx-2', 'opacity-25');
            this.element.setAttribute('role', 'separator');
            this.element.textContent = '';
        }
        disable() { /* separator can't be disabled */ }
    };

    static Text = class extends Toolbar.Control {
        createElement() {
            return document.createElement('span');
        }
        build() {
            super.build();
            if (!this.element) return;
            this.element.classList.add('align-self-center', 'text-body-secondary', 'small');
        }
    };

    static Select = class extends Toolbar.Control {
        constructor(properties, options = {}, initialValue = false) {
            super(properties);
            this.options = options;
            this.initial = initialValue;
            this.handleChange = null;
        }
        build() {
            if (!this.toolbar || !this.properties.id) return;
            this.element = document.createElement('div');
            this.applyCommonAttributes();
            Toolbar.applyClassList(this.element, { add: ['toolbar-select', 'd-flex', 'align-items-center', 'gap-2'] });
            if (this.properties.title) {
                const span = document.createElement('span');
                Toolbar.applyClassList(span, { add: ['fw-semibold', 'text-body-secondary'] });
                span.textContent = this.properties.title;
                this.element.appendChild(span);
            }
            this.select = document.createElement('select');
            Toolbar.applyClassList(this.select, { add: ['form-select', 'form-select-sm'] });
            this.handleChange = () => {
                this.toolbar.callAction(this.properties.action, this);
            };
            this.bindEvent(this.select, 'change', this.handleChange);
            this.element.appendChild(this.select);
            Object.entries(this.options).forEach(([key, value]) => {
                const option = document.createElement('option');
                option.value = key;
                if (key == this.initial) option.selected = true;
                option.textContent = value;
                this.select.appendChild(option);
            });
            if (this.properties.isDisabled) this.disable();
        }
        disable() {
            if (!this.properties.isDisabled) {
                super.disable();
                this.select.setAttribute('disabled', 'disabled');
            }
        }
        enable(force = false) {
            if (force) this.properties.isInitiallyDisabled = false;
            if (this.properties.isDisabled) {
                super.enable(force);
                if (!this.properties.isDisabled) {
                    this.select.removeAttribute('disabled');
                }
            }
        }
        setAction(action) { this.properties.action = action; }
        getValue() {
            let sel = this.select.selectedOptions;
            if (sel.length) return sel[sel.length - 1].value;
            return null;
        }
        setSelected(itemId) {
            if (this.options[itemId] && this.select) {
                Array.from(this.select.options).forEach(opt => {
                    opt.selected = opt.value == itemId;
                });
            }
        }
        destroy() {
            super.destroy();
        }
    };

    static CustomSelect = class extends Toolbar.Control {
        constructor(properties, options = {}, initialValue = false) {
            super(properties);
            this.options = options;
            this.initial = initialValue;
            this.expanded = false;
            this.dropdownInstance = null;
            this.handleButtonClick = null;
            this.handleViewClick = null;
            this.handleBootstrapShow = null;
            this.handleBootstrapHide = null;
            this.documentClickHandler = null;
        }
        build() {
            if (!this.toolbar || !this.properties.id) return;
            this._createStructure();
            this._populateOptions();
            this._bindCustomSelectEvents();
            this.collapse();
            if (this.properties.isDisabled) this.disable();
        }
        _createStructure() {
            this.element = document.createElement('div');
            this.applyCommonAttributes();
            Toolbar.applyClassList(this.element, {
                add: ['custom_select', 'dropdown', 'toolbar-dropdown', 'd-flex', 'flex-column', 'gap-1']
            });
            if (this.properties.title) {
                const span = document.createElement('span');
                Toolbar.applyClassList(span, { add: ['label', 'text-body-secondary', 'small', 'fw-semibold'] });
                span.textContent = this.properties.title;
                this.element.appendChild(span);
            }
            this.select = document.createElement('div');
            Toolbar.applyClassList(this.select, { add: ['custom_select_box', 'btn-group', 'd-flex', 'align-items-stretch'] });
            this.button = document.createElement('button');
            this.button.type = 'button';
            Toolbar.applyClassList(this.button, {
                add: CUSTOM_SELECT_BUTTON_CLASSES
            });
            this.button.setAttribute('data-bs-toggle', 'dropdown');
            this.button.setAttribute('aria-expanded', 'false');
            this.view = document.createElement('span');
            Toolbar.applyClassList(this.view, { add: ['custom_select_view', 'd-inline-flex', 'align-items-center', 'gap-2'] });
            this.button.appendChild(this.view);
            this.dropbox = document.createElement('div');
            Toolbar.applyClassList(this.dropbox, { add: ['custom_select_dropbox', 'dropdown-menu', 'shadow', 'p-0', 'w-100'] });
            this.options_container = document.createElement('div');
            Toolbar.applyClassList(this.options_container, { add: ['custom_select_options', 'list-group', 'list-group-flush'] });
            this.dropbox.appendChild(this.options_container);
            this.select.appendChild(this.button);
            this.select.appendChild(this.dropbox);
            this.element.appendChild(this.select);
            [this.element, this.view, this.button, this.dropbox, this.options_container].forEach(el => {
                el.setAttribute('unselectable', 'on');
                el.style.userSelect = 'none';
            });
        }
        _populateOptions() {
            Object.entries(this.options).forEach(([key, value]) => {
                const option = document.createElement('button');
                option.type = 'button';
                Toolbar.applyClassList(option, { add: ['custom_select_option', 'dropdown-item'] });
                option.setAttribute('data-value', key);
                option.innerHTML = value['html'] || value['caption'] || '';
                option.setAttribute('data-caption', value['caption'] || '');
                option.setAttribute('data-element', value['element'] || '');
                option.setAttribute('data-class', value['class'] || '');
                if (key == this.initial) {
                    Toolbar.applyClassList(option, { add: ['selected', 'active'] });
                }
                this.options_container.appendChild(option);
                this.bindEvent(option, 'click', event => {
                    event.preventDefault();
                    event.stopPropagation();
                    this.setSelected(key);
                    this.select.dispatchEvent(new CustomEvent('afterchange'));
                });
            });
        }
        _bindCustomSelectEvents() {
            this.handleButtonClick = event => {
                if (this.dropdownInstance) {
                    return;
                }
                this.toggle(event);
            };
            this.handleViewClick = event => {
                event.preventDefault();
                this.button.click();
            };
            this.bindEvent(this.button, 'click', this.handleButtonClick);
            this.bindEvent(this.view, 'click', this.handleViewClick);
        }
        toggle(event) {
            if (this.dropdownInstance) return;
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            this.select.dispatchEvent(new CustomEvent('beforechange'));
            this.expanded ? this.collapse() : this.expand();
        }
        expand() {
            if (!this.properties.isDisabled) {
                this.expanded = true;
                Toolbar.applyClassList(this.dropbox, { add: ['show'] });
                Toolbar.applyClassList(this.button, { add: ['show'] });
                this.button.setAttribute('aria-expanded', 'true');
            }
        }
        collapse() {
            this.expanded = false;
            Toolbar.applyClassList(this.dropbox, { remove: ['show'] });
            Toolbar.applyClassList(this.button, { remove: ['show'] });
            this.button.setAttribute('aria-expanded', 'false');
        }
        disable() {
            if (!this.properties.isDisabled) {
                super.disable();
                Toolbar.applyClassList(this.select, { add: ['disabled', 'opacity-50'] });
                Toolbar.applyClassList(this.button, { add: ['disabled'] });
                this.button.disabled = true;
                if (this.dropdownInstance?.hide) {
                    this.dropdownInstance.hide();
                } else {
                    this.collapse();
                }
            }
        }
        enable(force = false) {
            if (force) this.properties.isInitiallyDisabled = false;
            if (this.properties.isDisabled) {
                super.enable(force);
                if (!this.properties.isDisabled) {
                    Toolbar.applyClassList(this.select, { remove: ['disabled', 'opacity-50'] });
                    Toolbar.applyClassList(this.button, { remove: ['disabled'] });
                    this.button.disabled = false;
                }
            }
        }
        getOptions() { return this.options; }
        getValue() {
            const selected = Array.from(this.select.querySelectorAll('.custom_select_option.selected, .custom_select_option.active')).pop();
            if (!selected) return null;
            return {
                value: selected.getAttribute('data-value'),
                element: selected.getAttribute('data-element'),
                class: selected.getAttribute('data-class')
            };
        }
        setSelected(itemId) {
            if (this.options[itemId] && this.select) {
                Array.from(this.select.querySelectorAll('.custom_select_option')).forEach(opt => {
                    Toolbar.applyClassList(opt, { remove: ['selected', 'active'] });
                });
                Array.from(this.select.querySelectorAll(`.custom_select_option[data-value="${itemId}"]`)).forEach(opt => {
                    Toolbar.applyClassList(opt, { add: ['selected', 'active'] });
                });
                const optionData = this.options[itemId];
                if (optionData.caption) {
                    this.view.textContent = optionData.caption;
                } else if (optionData.html) {
                    this.view.innerHTML = optionData.html;
                } else {
                    this.view.textContent = '';
                }
                if (this.dropdownInstance?.hide) {
                    this.dropdownInstance.hide();
                } else {
                    this.collapse();
                }
            }
        }
        afterMount() {
            super.afterMount();
            this._initializeDropdownIntegration();
            this._applyInitialSelection();
        }
        _initializeDropdownIntegration() {
            if (!this.button) {
                return;
            }
            if (Toolbar.hasBootstrapScript() && typeof bootstrap !== 'undefined' && typeof bootstrap.Dropdown === 'function') {
                this.dropdownInstance = Toolbar.createBootstrapDropdown(this.button);
                this.handleBootstrapShow = () => {
                    this.expanded = true;
                    this.select.dispatchEvent(new CustomEvent('beforechange'));
                };
                this.handleBootstrapHide = () => {
                    this.expanded = false;
                };
                this.bindEvent(this.button, 'show.bs.dropdown', this.handleBootstrapShow);
                this.bindEvent(this.button, 'hide.bs.dropdown', this.handleBootstrapHide);
            } else if (typeof document !== 'undefined') {
                this.documentClickHandler = event => {
                    if (!this.element.contains(event.target)) {
                        this.collapse();
                    }
                };
                this.bindEvent(document, 'click', this.documentClickHandler);
            }
        }
        _applyInitialSelection() {
            if (this.initial !== false && this.options[this.initial]) {
                this.setSelected(this.initial);
            } else {
                const [firstOption] = Object.keys(this.options);
                if (typeof firstOption !== 'undefined') {
                    this.setSelected(firstOption);
                }
            }
        }
        destroy() {
            if (this.dropdownInstance) {
                Toolbar.bootstrap.detach(this.dropdownInstance);
                this.dropdownInstance = null;
            }
            this.handleBootstrapShow = null;
            this.handleBootstrapHide = null;
            this.documentClickHandler = null;
            super.destroy();
        }
    };
}

Toolbar.registry = registryManager.ensureMap('registry');
Toolbar.pendingToolbars = registryManager.ensureMap('pendingToolbars');
Toolbar.componentInstances = registryManager.ensureMap('componentInstances');

const buttonFactory = {
    fromProps: props => new Toolbar.Button(Object.assign({}, props)),
    fromDescriptor: descriptor => new Toolbar.Button(Object.assign({}, descriptor.props))
};
Toolbar.registerControlFactory('button', buttonFactory);
Toolbar.registerControlFactory('link', buttonFactory);
Toolbar.registerControlFactory('submit', buttonFactory);

Toolbar.registerControlFactory('switcher', {
    fromProps: props => new Toolbar.Switcher(Object.assign({}, props)),
    fromDescriptor: descriptor => new Toolbar.Switcher(Object.assign({}, descriptor.props))
});

Toolbar.registerControlFactory('file', {
    fromProps: props => new Toolbar.File(Object.assign({}, props)),
    fromDescriptor: descriptor => new Toolbar.File(Object.assign({}, descriptor.props))
});

Toolbar.registerControlFactory('separator', {
    fromProps: props => new Toolbar.Separator(Object.assign({}, props)),
    fromDescriptor: descriptor => new Toolbar.Separator(Object.assign({}, descriptor.props))
});

Toolbar.registerControlFactory('text', {
    fromProps: props => new Toolbar.Text(Object.assign({}, props)),
    fromDescriptor: descriptor => new Toolbar.Text(Object.assign({}, descriptor.props))
});

Toolbar.registerControlFactory('select', {
    fromProps: props => {
        const { options = {}, initial = false, ...rest } = props || {};
        return new Toolbar.Select(Object.assign({}, rest), options, initial);
    },
    fromDescriptor: descriptor => new Toolbar.Select(
        Object.assign({}, descriptor.props),
        Object.assign({}, descriptor.options || {}),
        descriptor.initial
    )
});

const customSelectFactory = {
    fromProps: props => {
        const { options = {}, initial = false, ...rest } = props || {};
        return new Toolbar.CustomSelect(Object.assign({}, rest), options, initial);
    },
    fromDescriptor: descriptor => new Toolbar.CustomSelect(
        Object.assign({}, descriptor.props),
        Object.assign({}, descriptor.options || {}),
        descriptor.initial
    )
};
Toolbar.registerControlFactory('custom-select', customSelectFactory);
Toolbar.registerControlFactory('custom_select', customSelectFactory);

export { Toolbar };
export default Toolbar;

export function initializeToolbars(root) {
    return Toolbar.initFromDOM(root);
}

export function registerToolbarComponent(componentRef, instance) {
    return Toolbar.registerComponentInstance(componentRef, instance);
}
