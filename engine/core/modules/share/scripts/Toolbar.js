const ELEMENT_CTOR = typeof Element !== 'undefined' ? Element : null;

function isElement(node) {
    return !!ELEMENT_CTOR && node instanceof ELEMENT_CTOR;
}

function normalizeBoolean(value) {
    if (value === true || value === false) {
        return value;
    }
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
    }
    if (typeof value === 'number') {
        return value !== 0;
    }
    return false;
}

function readToolbarProperties(element) {
    const props = {};
    if (!element || !element.dataset) {
        return props;
    }
    Object.keys(element.dataset).forEach((key) => {
        if (key.startsWith('prop')) {
            const normalizedKey = key.replace(/^prop/, '');
            const propertyName = normalizedKey.charAt(0).toLowerCase() + normalizedKey.slice(1);
            props[propertyName] = element.dataset[key];
        }
    });
    return props;
}

function enhanceWithBootstrap(control) {
    if (!isElement(control) || !control.hasAttribute('data-bs-toggle')) {
        return null;
    }
    if (typeof window === 'undefined' || typeof window.bootstrap === 'undefined') {
        return null;
    }
    const { bootstrap } = window;
    if (!bootstrap || typeof bootstrap.Tooltip !== 'function') {
        return null;
    }
    return bootstrap.Tooltip.getOrCreateInstance(control, {
        container: 'body',
        boundary: 'window',
    });
}

export class ToolbarController {
    constructor(element, context = {}) {
        this.element = element;
        this.context = context;
        this.controls = [];
        this.bootstrapTooltips = new Map();
        this.toolbarName = element?.dataset?.toolbar || null;
        this.componentName = element?.dataset?.component || null;
        this.componentSample = element?.dataset?.componentSample || null;
        this.componentType = element?.dataset?.componentType || null;
        this.properties = readToolbarProperties(element);
        this.handleClick = this.handleClick.bind(this);
    }

    mount() {
        if (!isElement(this.element)) {
            throw new Error('ToolbarController requires a DOM element.');
        }
        this.collectControls();
        this.element.addEventListener('click', this.handleClick);
        return this;
    }

    destroy() {
        if (!isElement(this.element)) {
            return;
        }
        this.element.removeEventListener('click', this.handleClick);
        this.controls.forEach((control) => {
            const tooltip = this.bootstrapTooltips.get(control);
            if (tooltip && typeof tooltip.dispose === 'function') {
                tooltip.dispose();
            }
        });
        this.bootstrapTooltips.clear();
        this.controls = [];
    }

    collectControls() {
        const nodes = Array.from(this.element.querySelectorAll('[data-command]'));
        this.controls = nodes.filter(isElement);
        this.controls.forEach((control) => {
            const tooltip = enhanceWithBootstrap(control);
            if (tooltip) {
                this.bootstrapTooltips.set(control, tooltip);
            }
        });
    }

    handleClick(event) {
        const target = ELEMENT_CTOR && event.target instanceof ELEMENT_CTOR
            ? event.target.closest('[data-command]')
            : null;
        if (!target || !this.element.contains(target)) {
            return;
        }
        const command = target.getAttribute('data-command') || '';
        if (!command) {
            return;
        }
        event.preventDefault();
        const detail = {
            action: command,
            handler: target.getAttribute('data-handler') || null,
            toolbar: this.toolbarName,
            component: this.componentName,
            componentSample: this.componentSample,
            componentType: this.componentType,
            properties: Object.assign({}, this.properties),
            control: target,
            toolbarElement: this.element,
            controller: this,
            context: this.context,
        };
        const dispatched = target.dispatchEvent(new CustomEvent('energine:toolbar-action', {
            bubbles: true,
            cancelable: true,
            detail,
        }));
        if (!dispatched) {
            return;
        }
        if (!detail.handler) {
            return;
        }
        this.invokeLegacyHandler(detail.handler, target);
    }

    invokeLegacyHandler(handler, control) {
        const normalized = handler.trim();
        if (!normalized) {
            return;
        }
        const isFormSubmit = normalizeBoolean(control?.getAttribute('data-submit'));
        if (isFormSubmit) {
            const form = control?.closest('form');
            if (form) {
                form.submit();
            }
            return;
        }
        if (typeof window === 'undefined') {
            console.warn('[Toolbar] legacy handler invocation skipped (no window available)', handler);
            return;
        }
        try {
            const fn = new Function('event', 'controller', `return (function(){ ${normalized}; }).call(this);`);
            fn.call(window, { target: control }, this);
        } catch (error) {
            console.error('[Toolbar] legacy handler execution failed:', handler, error);
        }
    }
}

export default ToolbarController;
