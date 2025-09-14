class Toolbar {
    constructor(toolbarName, props = {}) {
        Energine.loadCSS('stylesheets/toolbar.css');
        this.name = toolbarName;
        this.element = document.createElement('ul');
        this.element.classList.add('toolbar', 'clearfix', toolbarName);
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
        this.element.classList.add('docked_toolbar');
    }
    undock() {
        this.element.classList.remove('docked_toolbar');
    }
    getElement() {
        return this.element;
    }
    bindTo(obj) {
        this.boundTo = obj;
    }

    appendControl(...args) {
        args.forEach(control => {
            if (control.type && control.id) {
                control.action = control.onclick;
                delete control.onclick;
                const Ctor = Toolbar[Toolbar.capitalize(control.type)];
                if (Ctor) control = new Ctor(control);
            }
            if (control instanceof Toolbar.Control) {
                control.toolbar = this;
                control.build();
                this.element.appendChild(control.element);
                this.controls.push(control);
            }
        });
    }

    removeControl(control) {
        if (typeof control === 'string') control = this.getControlById(control);
        if (control instanceof Toolbar.Control) {
            let idx = this.controls.indexOf(control);
            if (idx !== -1) {
                control.toolbar = null;
                if (control.element.parentNode) control.element.parentNode.removeChild(control.element);
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

    // ---- Controls ----

    static Control = class {
        constructor(properties = {}) {
            this.toolbar = null;
            this.element = null;
            this.properties = Object.assign({
                id: '',
                icon: '',
                title: '',
                tooltip: '',
                action: '',
                disabled: false,
                initially_disabled: false
            }, properties);
        }
        load(controlDescr) {
            this.properties.id = controlDescr.getAttribute('id') || '';
            this.properties.icon = controlDescr.getAttribute('icon') || '';
            this.properties.title = controlDescr.getAttribute('title') || '';
            this.properties.action = controlDescr.getAttribute('action') || '';
            this.properties.tooltip = controlDescr.getAttribute('tooltip') || '';
            this.properties.isDisabled = !!controlDescr.getAttribute('disabled');
            this.properties.isInitiallyDisabled = this.properties.isDisabled;
        }
        buildAsIcon(icon) {
            this.element.classList.add('icon', 'unselectable');
            this.element.setAttribute('id', this.toolbar.name + this.properties.id);
            this.element.setAttribute('title', this.properties.title + (this.properties.tooltip ? ` (${this.properties.tooltip})` : ''));
            Object.assign(this.element.style, {
                userSelect: 'none',
                fontSize: '1em',
                //background: '#0d6efd',   // убираем фон
                padding: '5px',
                color: 'black',
                textAlign: 'center',
                marginBottom: '10px;'
            });
            this.element.textContent = icon;
        }
        build() {
            if (!this.toolbar || !this.properties.id) return;
            this.element = document.createElement('li');
            this.element.setAttribute('unselectable', 'on');
            if (this.properties.icon) {
                this.buildAsIcon(this.properties.icon);
            } else {
                this.element.setAttribute('title', this.properties.tooltip || '');
                this.element.textContent = this.properties.title || '';
            }
            if (this.properties.isDisabled) this.disable();
        }
        disable() {
            this.properties.isDisabled = true;
            this.element.classList.add('disabled');
            this.element.style.opacity = 0.25;
        }
        enable(force = false) {
            if (force) this.properties.isInitiallyDisabled = false;
            if (!this.properties.isInitiallyDisabled) {
                this.properties.isDisabled = false;
                this.element.classList.remove('disabled');
                this.element.style.opacity = 1;
            }
        }
        disabled() { return this.properties.isDisabled; }
        initially_disabled() { return this.properties.isInitiallyDisabled; }
        setAction(action) { this.properties.action = action; }
    };

    static Button = class extends Toolbar.Control {
        build() {
            super.build();
            this.element.classList.add(this.properties.id + '_btn');
            this.element.addEventListener('mouseover', () => {
                if (!this.properties.isDisabled) this.element.classList.add('highlighted');
            });
            this.element.addEventListener('mouseout', () => {
                this.element.classList.remove('highlighted');
            });
            this.element.addEventListener('click', this.callAction.bind(this));
            this.element.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
        }
        callAction(data) {
            if (!this.properties.isDisabled) {
                this.toolbar.callAction(this.properties.action, data);
            }
        }
        down() { this.element.classList.add('pressed'); }
        up() { this.element.classList.remove('pressed'); }
        isDown() { return this.element.classList.contains('pressed'); }
    };

    static File = class extends Toolbar.Button {
        build() {
            super.build();
            let input = document.createElement('input');
            input.type = 'file';
            input.id = this.properties.id;
            input.addEventListener('change', evt => {
                let file = evt.target.files[0];
                let reader = new FileReader();
                reader.onload = e => {
                    if (!this.properties.isDisabled) {
                        this.toolbar.callAction(this.properties.action, e.target);
                    }
                };
                reader.readAsDataURL(file);
            });
            this.element.appendChild(input);
        }
        callAction() {
            this.element.querySelector(`#${this.properties.id}`).click();
        }
    };

    static Switcher = class extends Toolbar.Button {
        constructor(props) {
            super(props);
            this.properties.state = this.properties.state ? !!parseInt(this.properties.state) : false;
        }
        build() {
            super.build();
            const toggle = () => {
                if (this.properties.state) {
                    if (this.properties.aicon) this.buildAsIcon(this.properties.aicon);
                    else this.element.classList.add('pressed');
                } else {
                    if (this.properties.icon) this.buildAsIcon(this.properties.icon);
                    else this.element.classList.remove('pressed');
                }
            };
            this.element.addEventListener('click', () => {
                if (!this.properties.isDisabled) {
                    this.properties.state = !this.properties.state;
                    toggle();
                }
            });
            toggle();
        }
        load(controlDescr) {
            super.load(controlDescr);
            this.properties.aicon = controlDescr.getAttribute('aicon') || '';
            this.properties.state = controlDescr.getAttribute('state') || 0;
        }
        getState() { return this.properties.state; }
    };

    static Separator = class extends Toolbar.Control {
        build() {
            super.build();
            this.element.classList.add('separator');
        }
        disable() { /* separator can't be disabled */ }
    };

    static Text = class extends Toolbar.Control {
        build() {
            super.build();
            this.element.classList.add('text');
        }
    };

    static Select = class extends Toolbar.Control {
        constructor(properties, options = {}, initialValue = false) {
            super(properties);
            this.options = options;
            this.initial = initialValue;
        }
        build() {
            if (!this.toolbar || !this.properties.id) return;
            this.element = document.createElement('li');
            this.element.setAttribute('unselectable', 'on');
            this.element.classList.add('select');
            if (this.properties.title) {
                let span = document.createElement('span');
                span.classList.add('label');
                span.textContent = this.properties.title;
                this.element.appendChild(span);
            }
            this.select = document.createElement('select');
            this.select.addEventListener('change', () => {
                this.toolbar.callAction(this.properties.action, this);
            });
            this.element.appendChild(this.select);
            if (this.properties.isDisabled) this.disable();
            Object.entries(this.options).forEach(([key, value]) => {
                let option = document.createElement('option');
                option.value = key;
                if (key == this.initial) option.selected = true;
                option.textContent = value;
                this.select.appendChild(option);
            });
        }
        disable() {
            if (!this.properties.isDisabled) {
                this.properties.isDisabled = true;
                this.select.setAttribute('disabled', 'disabled');
            }
        }
        enable() {
            if (this.properties.isDisabled) {
                this.properties.isDisabled = false;
                this.select.removeAttribute('disabled');
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
    };

    static CustomSelect = class extends Toolbar.Control {
        constructor(properties, options = {}, initialValue = false) {
            super(properties);
            this.options = options;
            this.initial = initialValue;
            this.expanded = false;
        }
        build() {
            if (!this.toolbar || !this.properties.id) return;
            this.element = document.createElement('li');
            this.element.classList.add('custom_select');
            if (this.properties.title) {
                let span = document.createElement('span');
                span.classList.add('label');
                span.textContent = this.properties.title;
                this.element.appendChild(span);
            }
            this.select = document.createElement('div');
            this.select.classList.add('custom_select_box');
            this.view = document.createElement('div');
            this.view.classList.add('custom_select_view');
            this.button = document.createElement('div');
            this.button.classList.add('custom_select_button');
            this.dropbox = document.createElement('div');
            this.dropbox.classList.add('custom_select_dropbox');
            this.options_container = document.createElement('div');
            this.options_container.classList.add('custom_select_options');
            this.dropbox.appendChild(this.options_container);
            this.select.appendChild(this.view);
            this.select.appendChild(this.button);
            this.select.appendChild(this.dropbox);
            this.element.appendChild(this.select);

            // disable selection
            [this.element, this.view, this.button, this.dropbox, this.options_container].forEach(el => {
                el.setAttribute('unselectable', 'on');
                el.style.userSelect = 'none';
                el.addEventListener('selectstart', e => { e.preventDefault(); });
                el.addEventListener('mousedown', e => { e.preventDefault(); });
                el.addEventListener('click', e => { e.stopPropagation(); });
            });

            Object.entries(this.options).forEach(([key, value]) => {
                let el = document.createElement('div');
                el.classList.add('custom_select_option');
                el.setAttribute('data-value', key);
                el.innerHTML = value['html'] || value['caption'] || '';
                el.setAttribute('data-caption', value['caption'] || '');
                el.setAttribute('data-element', value['element'] || '');
                el.setAttribute('data-class', value['class'] || '');
                if (key == this.initial) el.classList.add('selected');
                this.options_container.appendChild(el);
                el.addEventListener('click', e => {
                    e.stopPropagation(); e.preventDefault();
                    this.setSelected(key);
                    this.select.dispatchEvent(new CustomEvent('afterchange'));
                });
            });

            this.view.addEventListener('click', this.toggle.bind(this));
            this.button.addEventListener('click', this.toggle.bind(this));
            document.addEventListener('click', () => { if (this.expanded) this.collapse(); });

            this.collapse();
        }
        toggle(e) {
            if (e) { e.preventDefault(); e.stopPropagation(); }
            this.select.dispatchEvent(new CustomEvent('beforechange'));
            (this.expanded) ? this.collapse() : this.expand();
        }
        expand() {
            if (!this.properties.isDisabled) {
                this.expanded = true;
                this.dropbox.style.display = 'block';
            }
        }
        collapse() {
            this.expanded = false;
            this.dropbox.style.display = 'none';
        }
        disable() {
            if (!this.properties.isDisabled) {
                this.properties.isDisabled = true;
                this.select.classList.add('disabled');
            }
        }
        enable() {
            if (this.properties.isDisabled) {
                this.properties.isDisabled = false;
                this.select.classList.remove('disabled');
            }
        }
        getOptions() { return this.options; }
        getValue() {
            let selected = Array.from(this.select.querySelectorAll('.selected')).pop();
            if (!selected) return null;
            return {
                value: selected.getAttribute('data-value'),
                element: selected.getAttribute('data-element'),
                class: selected.getAttribute('data-class')
            };
        }
        setSelected(itemId) {
            if (this.options[itemId] && this.select) {
                Array.from(this.select.querySelectorAll('.custom_select_option')).forEach(opt => opt.classList.remove('selected'));
                Array.from(this.select.querySelectorAll(`.custom_select_option[data-value="${itemId}"]`)).forEach(opt => opt.classList.add('selected'));
                this.view.textContent = this.options[itemId].caption || '';
                this.collapse();
            }
        }
    };
}

// Экспортируем в window
window.Toolbar = Toolbar;
