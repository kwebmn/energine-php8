(function () {
    const COMPONENT_SELECTOR = '[data-energine-js]';
    const TOOLBAR_SELECTOR = '[data-energine-toolbar]';
    const TOOLBAR_ATTR_PREFIX = 'data-energine-toolbar-';
    const CONTROL_ATTR_PREFIX = 'data-energine-control-';
    const PARAM_ATTR_PREFIX = 'data-energine-param-';

    let started = false;

    const toCamelCase = (value) => {
        return value.replace(/[-_]+([a-z0-9])/gi, (_, char) => (char || '').toUpperCase());
    };

    const readPrefixedAttributes = (element, prefix) => {
        const options = {};
        if (!element || !element.attributes) {
            return options;
        }

        Array.from(element.attributes).forEach(attr => {
            if (!attr.name || !attr.name.startsWith(prefix)) {
                return;
            }
            const rawKey = attr.name.slice(prefix.length);
            if (!rawKey) {
                return;
            }
            const camelKey = toCamelCase(rawKey);
            if (!(rawKey in options)) {
                options[rawKey] = attr.value;
            }
            if (!(camelKey in options)) {
                options[camelKey] = attr.value;
            }
        });

        return options;
    };

    const FALLBACK_CONSTRUCTORS = {
        TextBlock: class TextBlockFallback {
            constructor(element, options = {}) {
                this.element = element;
                this.options = options;
                this.toolbar = null;
            }

            getElement() {
                return this.element;
            }

            attachToolbar(toolbar) {
                this.toolbar = toolbar;
                return this;
            }
        },
    };

    const fallbackNotifications = new Set();

    const resolveConstructor = (className) => {
        if (!className) {
            return null;
        }
        const globalScope = window;
        if (typeof globalScope[className] === 'function') {
            return globalScope[className];
        }
        if (globalScope.Energine && typeof globalScope.Energine[className] === 'function') {
            return globalScope.Energine[className];
        }
        if (Object.prototype.hasOwnProperty.call(FALLBACK_CONSTRUCTORS, className)) {
            const Constructor = FALLBACK_CONSTRUCTORS[className];
            globalScope[className] = Constructor;
            if (!fallbackNotifications.has(className) && globalScope.console) {
                fallbackNotifications.add(className);
                console.warn(`[Energine loader] Falling back to a built-in ${className} stub`);
            }
            return Constructor;
        }
        return null;
    };

    const prepareControlDescriptors = (toolbarElement) => {
        if (!toolbarElement) {
            return;
        }
        const controls = toolbarElement.querySelectorAll('[data-energine-control-id]');
        controls.forEach(control => {
            if (!control || control.__energinePrepared) {
                return;
            }
            Array.from(control.attributes).forEach(attr => {
                if (!attr.name || !attr.name.startsWith(CONTROL_ATTR_PREFIX)) {
                    return;
                }
                const attributeName = attr.name.slice(CONTROL_ATTR_PREFIX.length);
                if (!attributeName) {
                    return;
                }
                if (!control.hasAttribute(attributeName)) {
                    control.setAttribute(attributeName, attr.value);
                }
            });
            const click = control.getAttribute('click');
            if (!control.hasAttribute('action') && click) {
                control.setAttribute('action', click);
            }
            control.__energinePrepared = true;
        });
    };

    const collectToolbars = (componentElement, instance) => {
        if (!componentElement || !instance || typeof instance.attachToolbar !== 'function') {
            return;
        }
        const ToolbarConstructor = resolveConstructor('Toolbar');
        if (typeof ToolbarConstructor !== 'function') {
            console.warn('[Energine loader] Toolbar constructor is missing');
            return;
        }

        const toolbarElements = componentElement.querySelectorAll(TOOLBAR_SELECTOR);
        toolbarElements.forEach(placeholder => {
            if (!placeholder || placeholder.__energineToolbarAttached) {
                return;
            }
            const owner = placeholder.closest(COMPONENT_SELECTOR);
            if (owner !== componentElement) {
                return;
            }

            prepareControlDescriptors(placeholder);

            const toolbarName = placeholder.getAttribute('data-energine-toolbar') || '';
            const toolbarProps = readPrefixedAttributes(placeholder, TOOLBAR_ATTR_PREFIX);
            let toolbarInstance;
            try {
                toolbarInstance = new ToolbarConstructor(toolbarName, toolbarProps);
            } catch (error) {
                console.error('[Energine loader] Failed to create toolbar', toolbarName, error);
                return;
            }

            try {
                toolbarInstance.load(placeholder);
            } catch (error) {
                console.error('[Energine loader] Failed to load toolbar', toolbarName, error);
                return;
            }

            try {
                instance.attachToolbar(toolbarInstance);
            } catch (error) {
                console.error('[Energine loader] Failed to attach toolbar', toolbarName, error);
                return;
            }

            const toolbarElement = toolbarInstance.getElement();
            if (toolbarElement) {
                placeholder.innerHTML = '';
                placeholder.appendChild(toolbarElement);
            }

            placeholder.__energineToolbarAttached = true;
        });
    };

    const instantiateComponent = (element) => {
        const className = element.getAttribute('data-energine-js');
        const Constructor = resolveConstructor(className);
        if (typeof Constructor !== 'function') {
            console.warn('[Energine loader] Class not found for', className);
            return null;
        }
        const options = readPrefixedAttributes(element, PARAM_ATTR_PREFIX);
        let instance = null;
        try {
            instance = new Constructor(element, options);
        } catch (error) {
            console.error('[Energine loader] Failed to initialise', className, error);
            return null;
        }
        element.__energineInstance = instance;
        element.dataset.energineInitialized = 'true';
        return instance;
    };

    const run = () => {
        if (started) {
            return;
        }
        started = true;
        const components = document.querySelectorAll(COMPONENT_SELECTOR);
        components.forEach(element => {
            if (!element || element.__energineInstance || element.dataset.energineInitialized === 'true') {
                return;
            }
            const instance = instantiateComponent(element);
            if (instance) {
                collectToolbars(element, instance);
            }
        });
        if (window.Energine && typeof window.Energine.run === 'function') {
            try {
                window.Energine.run();
            } catch (error) {
                console.error('[Energine loader] Energine.run failed', error);
            }
        }
    };

    const bootstrap = () => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', run, { once: true });
        } else {
            run();
        }
    };

    bootstrap();
}());
