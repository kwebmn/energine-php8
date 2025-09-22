class Toolbar {
    constructor(toolbarName, props = {}) {
        this.name = toolbarName;
        this.element = document.createElement('div');
        this.element.classList.add('btn-toolbar', 'flex-wrap', 'gap-2', 'align-items-center');
        this.element.setAttribute('role', 'toolbar');
        if (toolbarName) {
            this.element.classList.add(toolbarName);
            this.element.dataset.toolbar = toolbarName;
        }
        this.properties = typeof props === 'object' ? props : {};
        this.boundTo = null;
        this.controls = [];
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
        this.element.classList.add('bg-body', 'border', 'rounded-3', 'shadow-sm', 'p-2');
    }
    undock() {
        this.element.classList.remove('bg-body', 'border', 'rounded-3', 'shadow-sm', 'p-2');
    }
    getElement() {
        return this.element;
    }
    bindTo(obj) {
        this.boundTo = obj;
    }

    appendControl(...args) {
        args.forEach(control => {
            if (control?.type && control.id) {
                control.action = control.onclick;
                delete control.onclick;
                let Ctor = Toolbar[Toolbar.capitalize(control.type)];
                if (!Ctor && control.type === 'submit') Ctor = Toolbar.Button;
                if (Ctor) control = new Ctor(control);
            }
            if (control instanceof Toolbar.Control) {
                control.toolbar = this;
                control.build();
                if (control.element) {
                    this.element.appendChild(control.element);
                    this.controls.push(control);
                    control.afterMount?.();
                }
            }
        });
    }

    removeControl(control) {
        if (typeof control === 'string') control = this.getControlById(control);
        if (control instanceof Toolbar.Control) {
            let idx = this.controls.indexOf(control);
            if (idx !== -1) {
                control.destroy?.();
                if (control.element?.parentNode) control.element.parentNode.removeChild(control.element);
                control.toolbar = null;
                this.controls.splice(idx, 1);
            }
        }
    }
    getControlById(id) {
        return this.controls.find(c => c.properties.id === id) || null;
    }
    disableControls(...ids) {
        if (!ids.length) {
            this.controls.forEach(ctrl => { if (ctrl.properties.id !== 'close') ctrl.disable(); });
        } else {
            ids.forEach(id => {
                let c = this.getControlById(id);
                if (c) c.disable();
            });
        }
    }
    enableControls(...ids) {
        if (!ids.length) {
            this.controls.forEach(ctrl => ctrl.enable());
        } else {
            ids.forEach(id => {
                let c = this.getControlById(id);
                if (c) c.enable();
            });
        }
    }
    allButtonsUp() {
        this.controls.forEach(ctrl => {
            if (ctrl instanceof Toolbar.Button) ctrl.up();
        });
    }
    callAction(action, data) {
        if (this.boundTo && typeof this.boundTo[action] === 'function') {
            this.boundTo[action](data);
        }
    }

    // STATIC
    static capitalize(s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    static hasBootstrapStyles() {
        return (typeof document !== 'undefined') &&
            !!document.querySelector('link[href*="bootstrap.min.css"]');
    }

    static hasBootstrapScript() {
        if (typeof window !== 'undefined' && typeof window.bootstrap !== 'undefined') {
            return true;
        }
        return (typeof document !== 'undefined') &&
            !!document.querySelector('script[src*="bootstrap.bundle.min.js"]');
    }

    static createBootstrapTooltip(element, config = {}) {
        if (!Toolbar.hasBootstrapScript() || typeof bootstrap === 'undefined' || typeof bootstrap.Tooltip !== 'function') {
            return null;
        }
        return bootstrap.Tooltip.getOrCreateInstance(element, Object.assign({
            container: 'body',
            boundary: 'window'
        }, config));
    }

    static disposeBootstrapTooltip(instance) {
        if (instance && typeof instance.dispose === 'function') {
            instance.dispose();
        }
    }

    static createBootstrapDropdown(element, config = {}) {
        if (!Toolbar.hasBootstrapScript() || typeof bootstrap === 'undefined' || typeof bootstrap.Dropdown !== 'function') {
            return null;
        }
        return bootstrap.Dropdown.getOrCreateInstance(element, Object.assign({
            autoClose: true
        }, config));
    }

    // ---- Controls ----

    static Control = class {
        constructor(properties = {}) {
            this.toolbar = null;
            this.element = null;
            this.bootstrapTooltip = null;
            const normalizeBool = value => {
                if (value === true || value === 1) return true;
                if (typeof value === 'string') {
                    const normalized = value.toLowerCase();
                    return normalized === 'true' || normalized === '1' || normalized === 'disabled';
                }
                return false;
            };
            this.properties = Object.assign({
                id: '',
                icon: '',
                title: '',
                tooltip: '',
                action: '',
                disabled: false,
                initially_disabled: false,
                type: ''
            }, properties);
            this.properties.disabled = normalizeBool(this.properties.disabled);
            this.properties.initially_disabled = normalizeBool(this.properties.initially_disabled);
            this.properties.isDisabled = this.properties.disabled;
            this.properties.isInitiallyDisabled = this.properties.initially_disabled || this.properties.isDisabled;
        }
        load(controlDescr) {
            this.properties.id = controlDescr.getAttribute('id') || '';
            this.properties.icon = controlDescr.getAttribute('icon') || '';
            this.properties.title = controlDescr.getAttribute('title') || '';
            this.properties.action = controlDescr.getAttribute('action') || '';
            this.properties.tooltip = controlDescr.getAttribute('tooltip') || '';
            this.properties.type = controlDescr.getAttribute('type') || '';
            this.properties.isDisabled = !!controlDescr.getAttribute('disabled');
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
        buildAsIcon(icon) {
            this.element.classList.add('d-inline-flex', 'align-items-center', 'justify-content-center');
            this.element.textContent = icon;
            if (this.properties.title || this.properties.tooltip) {
                this.element.setAttribute('aria-label', this.properties.title || this.properties.tooltip);
            }
        }
        render() {
            if (this.properties.icon) {
                this.buildAsIcon(this.properties.icon);
            } else {
                this.element.classList.remove('d-inline-flex', 'align-items-center', 'justify-content-center', 'px-2');
                this.element.removeAttribute('aria-label');
                this.element.textContent = this.properties.title || '';
            }
        }
        build() {
            if (!this.toolbar || !this.properties.id) return;
            this.element = this.createElement();
            this.applyCommonAttributes();
            this.render();
            if (this.properties.isDisabled) this.disable();
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
            super.build();
            if (!this.element) return;
            this.element.type = this.properties.type || 'button';
            this.element.classList.add('btn', 'btn-sm', this.getVariantClass(), 'd-inline-flex', 'align-items-center', 'gap-2');
            if (this.properties.id) this.element.classList.add(`${this.properties.id}_btn`);
            this.handleMouseOver = () => {
                if (!this.properties.isDisabled) this.element.classList.add('highlighted');
            };
            this.handleMouseOut = () => {
                this.element.classList.remove('highlighted');
            };
            this.handleClick = event => {
                event.preventDefault();
                this.callAction(event);
            };
            this.handleMouseDown = e => { e.preventDefault(); e.stopPropagation(); };
            this.element.addEventListener('mouseover', this.handleMouseOver);
            this.element.addEventListener('mouseout', this.handleMouseOut);
            this.element.addEventListener('click', this.handleClick);
            this.element.addEventListener('mousedown', this.handleMouseDown);
        }
        buildAsIcon(icon) {
            super.buildAsIcon(icon);
            this.element.classList.add('px-2');
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
            return 'btn-secondary';
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
            if (this.element) {
                this.element.removeEventListener('mouseover', this.handleMouseOver);
                this.element.removeEventListener('mouseout', this.handleMouseOut);
                this.element.removeEventListener('click', this.handleClick);
                this.element.removeEventListener('mousedown', this.handleMouseDown);
            }
            super.destroy();
        }
    };

    static File = class extends Toolbar.Button {
        build() {
            super.build();
            if (!this.element) return;
            const input = document.createElement('input');
            input.type = 'file';
            input.id = this.properties.id;
            input.style.display = 'none';
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
            input.addEventListener('change', this.handleFileChange);
            this.fileInput = input;
            this.element.appendChild(input);
        }
        callAction() {
            if (this.fileInput) this.fileInput.click();
        }
        destroy() {
            if (this.fileInput) {
                this.fileInput.removeEventListener('change', this.handleFileChange);
                this.fileInput = null;
            }
            super.destroy();
        }
    };

    static Switcher = class extends Toolbar.Button {
        constructor(props) {
            super(props);
            this.properties.state = this.properties.state ? !!parseInt(this.properties.state, 10) : false;
            this.handleSwitch = null;
        }
        build() {
            super.build();
            this.element.setAttribute('data-bs-toggle', 'button');
            const toggle = () => {
                if (this.properties.state) {
                    if (this.properties.aicon) this.buildAsIcon(this.properties.aicon);
                    else this.element.classList.add('active', 'pressed');
                } else {
                    if (this.properties.icon) this.buildAsIcon(this.properties.icon);
                    else this.element.classList.remove('active', 'pressed');
                }
                this.element.setAttribute('aria-pressed', this.properties.state ? 'true' : 'false');
            };
            this.handleSwitch = () => {
                if (!this.properties.isDisabled) {
                    this.properties.state = !this.properties.state;
                    toggle();
                }
            };
            this.element.addEventListener('click', this.handleSwitch);
            toggle();
        }
        load(controlDescr) {
            super.load(controlDescr);
            this.properties.aicon = controlDescr.getAttribute('aicon') || '';
            this.properties.state = controlDescr.getAttribute('state') || 0;
        }
        getState() { return this.properties.state; }
        destroy() {
            if (this.element) {
                this.element.removeEventListener('click', this.handleSwitch);
            }
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
            this.element.classList.add('toolbar-select', 'd-flex', 'align-items-center', 'gap-2');
            if (this.properties.title) {
                const span = document.createElement('span');
                span.classList.add('fw-semibold', 'text-body-secondary');
                span.textContent = this.properties.title;
                this.element.appendChild(span);
            }
            this.select = document.createElement('select');
            this.select.classList.add('form-select', 'form-select-sm');
            this.handleChange = () => {
                this.toolbar.callAction(this.properties.action, this);
            };
            this.select.addEventListener('change', this.handleChange);
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
            if (this.select) {
                this.select.removeEventListener('change', this.handleChange);
            }
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
            this.element = document.createElement('div');
            this.applyCommonAttributes();
            this.element.classList.add('custom_select', 'dropdown', 'toolbar-dropdown', 'd-flex', 'flex-column', 'gap-1');
            if (this.properties.title) {
                let span = document.createElement('span');
                span.classList.add('label', 'text-body-secondary', 'small', 'text-uppercase', 'fw-semibold');
                span.textContent = this.properties.title;
                this.element.appendChild(span);
            }
            this.select = document.createElement('div');
            this.select.classList.add('custom_select_box', 'btn-group', 'd-flex', 'align-items-stretch');
            this.button = document.createElement('button');
            this.button.type = 'button';
            this.button.classList.add('custom_select_button', 'btn', 'btn-sm', 'btn-outline-secondary', 'dropdown-toggle', 'd-inline-flex', 'align-items-center', 'gap-2');
            this.button.setAttribute('data-bs-toggle', 'dropdown');
            this.button.setAttribute('aria-expanded', 'false');
            this.view = document.createElement('span');
            this.view.classList.add('custom_select_view', 'd-inline-flex', 'align-items-center', 'gap-2');
            this.button.appendChild(this.view);
            this.dropbox = document.createElement('div');
            this.dropbox.classList.add('custom_select_dropbox', 'dropdown-menu', 'shadow', 'p-0', 'w-100');
            this.options_container = document.createElement('div');
            this.options_container.classList.add('custom_select_options', 'list-group', 'list-group-flush');
            this.dropbox.appendChild(this.options_container);
            this.select.appendChild(this.button);
            this.select.appendChild(this.dropbox);
            this.element.appendChild(this.select);

            [this.element, this.view, this.button, this.dropbox, this.options_container].forEach(el => {
                el.setAttribute('unselectable', 'on');
                el.style.userSelect = 'none';
            });

            Object.entries(this.options).forEach(([key, value]) => {
                let el = document.createElement('button');
                el.type = 'button';
                el.classList.add('custom_select_option', 'dropdown-item');
                el.setAttribute('data-value', key);
                el.innerHTML = value['html'] || value['caption'] || '';
                el.setAttribute('data-caption', value['caption'] || '');
                el.setAttribute('data-element', value['element'] || '');
                el.setAttribute('data-class', value['class'] || '');
                if (key == this.initial) el.classList.add('selected', 'active');
                this.options_container.appendChild(el);
                el.addEventListener('click', e => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.setSelected(key);
                    this.select.dispatchEvent(new CustomEvent('afterchange'));
                });
            });

            this.handleButtonClick = e => {
                if (this.dropdownInstance) {
                    return;
                }
                this.toggle(e);
            };
            this.button.addEventListener('click', this.handleButtonClick);

            this.handleViewClick = e => {
                e.preventDefault();
                this.button.click();
            };
            this.view.addEventListener('click', this.handleViewClick);

            this.collapse();
            if (this.properties.isDisabled) this.disable();
        }
        toggle(e) {
            if (this.dropdownInstance) return;
            if (e) { e.preventDefault(); e.stopPropagation(); }
            this.select.dispatchEvent(new CustomEvent('beforechange'));
            (this.expanded) ? this.collapse() : this.expand();
        }
        expand() {
            if (!this.properties.isDisabled) {
                this.expanded = true;
                this.dropbox.classList.add('show');
                this.button.classList.add('show');
                this.button.setAttribute('aria-expanded', 'true');
            }
        }
        collapse() {
            this.expanded = false;
            this.dropbox.classList.remove('show');
            this.button.classList.remove('show');
            this.button.setAttribute('aria-expanded', 'false');
        }
        disable() {
            if (!this.properties.isDisabled) {
                super.disable();
                this.select.classList.add('disabled', 'opacity-50');
                this.button.classList.add('disabled');
                this.button.disabled = true;
                if (this.dropdownInstance) {
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
                    this.select.classList.remove('disabled', 'opacity-50');
                    this.button.classList.remove('disabled');
                    this.button.disabled = false;
                }
            }
        }
        getOptions() { return this.options; }
        getValue() {
            let selected = Array.from(this.select.querySelectorAll('.custom_select_option.selected, .custom_select_option.active')).pop();
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
                    opt.classList.remove('selected', 'active');
                });
                Array.from(this.select.querySelectorAll(`.custom_select_option[data-value="${itemId}"]`)).forEach(opt => {
                    opt.classList.add('selected', 'active');
                });
                const optionData = this.options[itemId];
                if (optionData.caption) {
                    this.view.textContent = optionData.caption;
                } else if (optionData.html) {
                    this.view.innerHTML = optionData.html;
                } else {
                    this.view.textContent = '';
                }
                if (this.dropdownInstance) {
                    this.dropdownInstance.hide();
                } else {
                    this.collapse();
                }
            }
        }
        afterMount() {
            super.afterMount();
            if (this.button) {
                if (Toolbar.hasBootstrapScript() && typeof bootstrap !== 'undefined' && typeof bootstrap.Dropdown === 'function') {
                    this.dropdownInstance = Toolbar.createBootstrapDropdown(this.button);
                    this.handleBootstrapShow = () => {
                        this.expanded = true;
                        this.select.dispatchEvent(new CustomEvent('beforechange'));
                    };
                    this.handleBootstrapHide = () => {
                        this.expanded = false;
                    };
                    this.button.addEventListener('show.bs.dropdown', this.handleBootstrapShow);
                    this.button.addEventListener('hide.bs.dropdown', this.handleBootstrapHide);
                } else {
                    this.documentClickHandler = event => {
                        if (!this.element.contains(event.target)) {
                            this.collapse();
                        }
                    };
                    document.addEventListener('click', this.documentClickHandler);
                }
            }
            if (this.initial !== false && this.options[this.initial]) {
                this.setSelected(this.initial);
            } else {
                const firstOption = Object.keys(this.options)[0];
                if (typeof firstOption !== 'undefined') this.setSelected(firstOption);
            }
        }
        destroy() {
            if (this.button) {
                this.button.removeEventListener('click', this.handleButtonClick);
                if (this.handleBootstrapShow) {
                    this.button.removeEventListener('show.bs.dropdown', this.handleBootstrapShow);
                }
                if (this.handleBootstrapHide) {
                    this.button.removeEventListener('hide.bs.dropdown', this.handleBootstrapHide);
                }
            }
            if (this.view) {
                this.view.removeEventListener('click', this.handleViewClick);
            }
            if (this.dropdownInstance) {
                this.dropdownInstance.dispose();
                this.dropdownInstance = null;
            }
            if (this.documentClickHandler) {
                document.removeEventListener('click', this.documentClickHandler);
                this.documentClickHandler = null;
            }
            super.destroy();
        }
    };
}

// Экспортируем в window
window.Toolbar = Toolbar;
