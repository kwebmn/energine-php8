ScriptLoader.load('Toolbar', 'ModalBox', 'Cookie');

class PageToolbar extends Toolbar {
    constructor(componentPath, documentId, toolbarName, controlsDesc = [], props = {}) {
        PageToolbar.ensureBootstrapLoaded();
        super(toolbarName, props);

        Energine.loadCSS('stylesheets/pagetoolbar.css');
        this.componentPath = componentPath;
        this.documentId = documentId;
        this.layoutManager = null;
        this.sidebarToggleButton = null;
        this._updateSidebarToggleState = null;

        this.dock();
        this.bindTo(this);

        if (controlsDesc && Array.isArray(controlsDesc)) {
            controlsDesc.forEach(control => this.appendControl(control));
        }

        this.setupLayout();

        // Подписка на oneditmodeunpressed
        window.addEventListener('oneditmodeunpressed', () => {

            if (window.nrgPageEditor) {
                if (confirm(Energine.translations.get('TXT_ARE_YOU_SURE_SAVE'))) {
                    if (window.nrgPageEditor.editors && window.nrgPageEditor.editors.length) {
                        window.nrgPageEditor.editors.forEach(editor => editor.save.call(editor, false));
                    }
                    setTimeout(
                        function()
                        {
                            window.location.href = window.location.href;
                        },
                        1000
                    );
                }
                else
                {
                    window.location = window.location;
                }
            }
            else
            {
                window.location = window.location;
            }

        });
    }

    static ensureBootstrapLoaded() {
        if (PageToolbar._bootstrapInitialized) {
            return;
        }

        const cssPath = PageToolbar._resolveStaticPath('stylesheets/bootstrap.min.css');
        if (!Toolbar.hasBootstrapStyles()) {
            Energine.loadCSS(cssPath);
        }

        if (!Toolbar.hasBootstrapScript()) {
            PageToolbar._appendBootstrapScript(PageToolbar._resolveStaticPath('scripts/bootstrap.bundle.min.js'));
        }

        PageToolbar._bootstrapInitialized = true;
    }

    static _appendBootstrapScript(src) {
        if (typeof document === 'undefined' || !document.head) {
            return;
        }

        const existingScript = document.querySelector(`script[src$="${src}"]`);
        if (existingScript) {
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = false;
        script.dataset.energineBootstrap = 'true';
        script.addEventListener('error', error => {
            console.error('[PageToolbar] Failed to load Bootstrap bundle', src, error);
            PageToolbar._bootstrapInitialized = false;
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        }, { once: true });
        document.head.appendChild(script);
    }

    static _resolveStaticPath(relativePath) {
        if (/^(?:[a-z]+:)?\/\//i.test(relativePath)) {
            return relativePath;
        }

        const base = (window?.Energine && typeof window.Energine.static === 'string')
            ? window.Energine.static
            : '';

        if (!base) {
            return relativePath;
        }

        const normalizedBase = base.endsWith('/') ? base : `${base}/`;
        const normalizedPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
        return normalizedBase + normalizedPath;
    }

    static _addClass(el, cls) { el.classList.add(cls); }
    static _removeClass(el, cls) { el.classList.remove(cls); }
    static _hasClass(el, cls) { return el.classList.contains(cls); }
    static _toggleClass(el, cls) { el.classList.toggle(cls); }
    static _setProperties(el, props) {
        Object.entries(props).forEach(([k, v]) => el.setAttribute(k, v));
    }
    static _setStyle(el, prop, val) { el.style[prop] = val; }
    static _setStyles(el, styles) { Object.entries(styles).forEach(([k, v]) => el.style[k] = v); }

    // ===== Основная логика =====

    setupLayout() {
        function getCookie(name) {
            let match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[]\/+^])/g, '\\$1') + '=([^;]*)'));
            return match ? decodeURIComponent(match[1]) : undefined;
        }

        const html = document.documentElement;
        if (!PageToolbar._hasClass(html, 'e-has-topframe1')) {
            PageToolbar._addClass(html, 'e-has-topframe1');
        }

        // Основные контейнеры
        const mainFrame = document.createElement('div');
        PageToolbar._addClass(mainFrame, 'e-mainframe');

        const topFrame = document.createElement('nav');
        PageToolbar._addClass(topFrame, 'e-topframe');
        topFrame.classList.add('navbar', 'navbar-expand-lg', 'navbar-light', 'bg-body');

        const container = document.createElement('div');
        container.classList.add('container-fluid');
        topFrame.appendChild(container);

        const translations = window?.Energine?.translations;
        const getTranslation = (...keys) => {
            if (!translations || typeof translations.get !== 'function') {
                return '';
            }
            for (const key of keys) {
                if (!key) continue;
                const value = translations.get(key);
                if (value) {
                    return value;
                }
            }
            return '';
        };

        const sidebarToggle = document.createElement('button');
        sidebarToggle.type = 'button';
        sidebarToggle.classList.add('navbar-brand', 'pagetb_logo', 'p-0', 'border-0', 'bg-transparent');
        const sidebarLabel = getTranslation('TXT_SIDEBAR_TOGGLE', 'TXT_SIDEBAR', 'TXT_SETTINGS') || 'Toggle sidebar';
        if (sidebarLabel) {
            sidebarToggle.setAttribute('aria-label', sidebarLabel);
        }
        const logoImage = document.createElement('img');
        logoImage.src = window.Energine.static + (window.Energine.debug ? 'images/toolbar/nrgnptbdbg.png' : 'images/toolbar/nrgnptb.png');
        logoImage.alt = '';
        logoImage.classList.add('pagetb_logo-img');
        sidebarToggle.appendChild(logoImage);
        container.appendChild(sidebarToggle);
        this.sidebarToggleButton = sidebarToggle;

        const collapseIdBase = this.element.dataset.toolbar || this.name || 'toolbar';
        const collapseId = (`${collapseIdBase}-collapse`).replace(/[^A-Za-z0-9_-]/g, '-');

        const toggler = document.createElement('button');
        toggler.classList.add('navbar-toggler');
        toggler.type = 'button';
        toggler.setAttribute('data-bs-toggle', 'collapse');
        toggler.setAttribute('data-bs-target', `#${collapseId}`);
        toggler.setAttribute('aria-controls', collapseId);
        toggler.setAttribute('aria-expanded', 'false');
        const togglerLabel = getTranslation('TXT_MENU', 'TXT_TOOLBAR') || 'Toggle toolbar';
        if (togglerLabel) {
            toggler.setAttribute('aria-label', togglerLabel);
        }
        const togglerIcon = document.createElement('span');
        togglerIcon.classList.add('navbar-toggler-icon');
        toggler.appendChild(togglerIcon);
        container.appendChild(toggler);

        const collapse = document.createElement('div');
        collapse.classList.add('collapse', 'navbar-collapse', 'justify-content-end');
        collapse.id = collapseId;
        container.appendChild(collapse);

        this.element.classList.add('py-2', 'py-lg-0');
        collapse.appendChild(this.element);

        // Перенос body-children (кроме svg и e-overlay)
        const toMove = Array.from(document.body.childNodes).filter(el =>
            el.nodeType === 1 && !((el.tagName.toLowerCase() !== 'svg') && PageToolbar._hasClass(el, 'e-overlay'))
        );
        document.body.appendChild(topFrame);
        document.body.appendChild(mainFrame);
        toMove.forEach(child => mainFrame.appendChild(child));

        // Боковая панель (sidebar)
        if (!this.properties['noSideFrame']) {
            if (getCookie('sidebar') == 1) {
                PageToolbar._addClass(html, 'e-has-sideframe');
            }
            const sidebarFrame = document.createElement('div');
            PageToolbar._addClass(sidebarFrame, 'e-sideframe');
            const sidebarFrameContent = document.createElement('div');
            PageToolbar._addClass(sidebarFrameContent, 'e-sideframe-content');
            const sidebarFrameBorder = document.createElement('div');
            PageToolbar._addClass(sidebarFrameBorder, 'e-sideframe-border');
            document.body.appendChild(sidebarFrame);
            sidebarFrame.appendChild(sidebarFrameContent);
            sidebarFrame.appendChild(sidebarFrameBorder);

            const iframe = document.createElement('iframe');
            PageToolbar._setProperties(iframe, {
                src: this.componentPath + 'show/',
                frameBorder: '0'
            });
            sidebarFrameContent.appendChild(iframe);

            this._updateSidebarToggleState = (state = PageToolbar._hasClass(html, 'e-has-sideframe')) => {
                const pressed = state ? 'true' : 'false';
                sidebarToggle.setAttribute('aria-pressed', pressed);
                sidebarToggle.setAttribute('aria-expanded', pressed);
                sidebarToggle.classList.toggle('active', state);
            };
            this._updateSidebarToggleState();

            sidebarToggle.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                this.toggleSidebar();
            });
        } else {
            sidebarToggle.classList.add('disabled');
            sidebarToggle.setAttribute('aria-disabled', 'true');
            sidebarToggle.setAttribute('aria-pressed', 'false');
            sidebarToggle.setAttribute('aria-expanded', 'false');
            sidebarToggle.disabled = true;
            this._updateSidebarToggleState = null;
        }

        // Деактивируем editBlocks если editMode включён
        const editBlocksButton = this.getControlById('editBlocks');
        const editModeControl = this.getControlById('editMode');
        if (editModeControl && typeof editModeControl.getState === 'function' && editModeControl.getState() && editBlocksButton) {
            editBlocksButton.disable();
        }
    }

    // Actions
    editMode() {
        const editModeControl = this.getControlById('editMode');
        if (editModeControl && editModeControl.getState() == 0) {
            this._reloadWindowInEditMode();
        } else {
            this.onEditModeUnpressed(true);
        }
    }

    add() {
        ModalBox.open({ url: this.componentPath + 'add/' + this.documentId });
    }
    edit() {
        ModalBox.open({ url: this.componentPath + this.documentId + '/edit' });
    }

    toggleSidebar() {
        const html = document.documentElement;
        html.classList.toggle('e-has-sideframe');

        // Используем стандартный URL!
        const url = new URL(window.Energine.base, window.location.origin);
        let domainChunks = url.hostname.split('.');
        if (domainChunks.length > 2) domainChunks.shift();
        const domain = '.' + domainChunks.join('.');

        // Path с / на конце
        const path = url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';

        // Кука на 30 дней
        const value = html.classList.contains('e-has-sideframe') ? '1' : '0';
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
        document.cookie = `sidebar=${value}; expires=${expires}; domain=${domain}; path=${path}`;

        const isSidebarVisible = html.classList.contains('e-has-sideframe');
        if (typeof this._updateSidebarToggleState === 'function') {
            this._updateSidebarToggleState(isSidebarVisible);
        } else if (this.sidebarToggleButton) {
            const pressed = isSidebarVisible ? 'true' : 'false';
            this.sidebarToggleButton.setAttribute('aria-pressed', pressed);
            this.sidebarToggleButton.setAttribute('aria-expanded', pressed);
            this.sidebarToggleButton.classList.toggle('active', isSidebarVisible);
        }

        return isSidebarVisible;
    }

    showTmplEditor() { ModalBox.open({ url: this.componentPath + 'template' }); }
    showTransEditor() { ModalBox.open({ url: this.componentPath + 'translation' }); }
    showUserEditor() { ModalBox.open({ url: this.componentPath + 'user' }); }
    showRoleEditor() { ModalBox.open({ url: this.componentPath + 'role' }); }
    showLangEditor() { ModalBox.open({ url: this.componentPath + 'languages' }); }
    showFileRepository() { ModalBox.open({ url: this.componentPath + 'file-library' }); }
    showSiteEditor() { ModalBox.open({ url: this.componentPath + 'sites' }); }

    _reloadWindowInEditMode() {
        const form = document.createElement('form');
        PageToolbar._setStyles(form, { display: 'none' });
        PageToolbar._setProperties(form, { action: '', method: 'post' });
        const input = document.createElement('input');
        PageToolbar._setProperties(input, { name: 'editMode', type: 'hidden', value: '1' });
        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
    }

    // Событие как метод, без глобалки
    onEditModeUnpressed(state) {
        const evt = new CustomEvent('oneditmodeunpressed', { detail: state });
        window.dispatchEvent(evt);
    }

    // Вложенный контрол логотипа (если нужно)
    static Logo = class extends Toolbar.Control {};
}

PageToolbar._bootstrapInitialized = false;

// экспорт для window, если надо
window.PageToolbar = PageToolbar;
