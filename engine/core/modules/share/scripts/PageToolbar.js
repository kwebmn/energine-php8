ScriptLoader.load('Toolbar', 'ModalBox', 'Cookie');

class PageToolbar extends Toolbar {
    constructor(componentPath, documentId, toolbarName, controlsDesc = [], props = {}) {
        PageToolbar.ensureBootstrapLoaded();
        super(toolbarName, props);

        this.componentPath = componentPath;
        this.documentId = documentId;
        this.layoutManager = null;
        this.sidebarToggleButton = null;
        this._updateSidebarToggleState = null;
        this.sidebarOffcanvas = null;
        this.sidebarFrameElement = null;
        this._ensureSidebarOffcanvas = null;

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
                        window.nrgPageEditor.editors.forEach(editor => {
                            Energine.utils.safeCall(editor.save, [false], editor);
                        });
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

        const cssPath = PageToolbar._resolveStaticPath('stylesheets/default/bootstrap.min.css');
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

    static _persistSidebarState(isVisible) {
        try {
            const baseHref = window?.Energine?.base || window.location.pathname || '/';
            const url = new URL(baseHref, window.location.origin);
            const hostname = url.hostname || window.location.hostname;
            const domainChunks = hostname.split('.');
            if (domainChunks.length > 2) {
                domainChunks.shift();
            }
            const domain = domainChunks.length ? `.${domainChunks.join('.')}` : window.location.hostname;
            const pathName = url.pathname || '/';
            const path = pathName.endsWith('/') ? pathName : `${pathName}/`;
            const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
            const value = isVisible ? '1' : '0';
            document.cookie = `sidebar=${value}; expires=${expires}; domain=${domain}; path=${path}`;
        } catch (error) {
            console.warn('[PageToolbar] Failed to persist sidebar state', error);
        }
    }

    // ===== Основная логика =====

    setupLayout() {
        function getCookie(name) {
            let match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[]\/+^])/g, '\\$1') + '=([^;]*)'));
            return match ? decodeURIComponent(match[1]) : undefined;
        }

        const html = document.documentElement;
        html.classList.add('h-100');
        document.body.classList.add('min-vh-100', 'd-flex', 'flex-column', 'bg-body-tertiary');
        if (!PageToolbar._hasClass(html, 'e-has-topframe1')) {
            PageToolbar._addClass(html, 'e-has-topframe1');
        }

        const layoutContainer = document.createElement('div');
        layoutContainer.classList.add('e-layout', 'd-flex', 'flex-column', 'flex-lg-row', 'flex-grow-1', 'w-100', 'gap-4', 'py-3', 'px-3', 'px-lg-4');

        const mainFrame = document.createElement('div');
        PageToolbar._addClass(mainFrame, 'e-mainframe');
        mainFrame.classList.add('flex-grow-1', 'container-fluid', 'bg-body', 'rounded-3', 'shadow-sm', 'p-4');
        mainFrame.style.minHeight = '0';

        const topFrame = document.createElement('nav');
        PageToolbar._addClass(topFrame, 'e-topframe');
        topFrame.classList.add('navbar', 'navbar-expand-lg', 'navbar-light', 'bg-body', 'border-bottom', 'shadow-sm', 'sticky-top');

        const container = document.createElement('div');
        container.classList.add('container-fluid', 'd-flex', 'align-items-center', 'gap-3');
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
        logoImage.classList.add('pagetb_logo-img', 'img-fluid');
        logoImage.style.height = '38px';
        logoImage.style.width = 'auto';
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
        collapse.classList.add('collapse', 'navbar-collapse', 'justify-content-end', 'py-2', 'py-lg-0');
        collapse.id = collapseId;
        container.appendChild(collapse);

        this.element.classList.add('py-2', 'py-lg-0', 'gap-2');
        collapse.appendChild(this.element);

        // Перенос body-children (кроме svg и e-overlay)
        const toMove = Array.from(document.body.childNodes).filter(el =>
            el.nodeType === 1 && !((el.tagName.toLowerCase() !== 'svg') && PageToolbar._hasClass(el, 'e-overlay'))
        );
        layoutContainer.appendChild(mainFrame);
        document.body.appendChild(topFrame);
        document.body.appendChild(layoutContainer);
        toMove.forEach(child => mainFrame.appendChild(child));

        // Боковая панель (sidebar)
        if (!this.properties['noSideFrame']) {
            const sidebarId = (`${collapseIdBase}-sidebar`).replace(/[^A-Za-z0-9_-]/g, '-');
            const sidebarFrame = document.createElement('div');
            PageToolbar._addClass(sidebarFrame, 'e-sideframe');
            sidebarFrame.classList.add('offcanvas', 'offcanvas-start', 'shadow', 'border-0');
            sidebarFrame.id = sidebarId;
            sidebarFrame.setAttribute('tabindex', '-1');
            sidebarFrame.style.width = '320px';
            if (sidebarLabel) {
                sidebarFrame.setAttribute('aria-label', sidebarLabel);
            }

            const sidebarFrameContent = document.createElement('div');
            PageToolbar._addClass(sidebarFrameContent, 'e-sideframe-content');
            sidebarFrameContent.classList.add('offcanvas-body', 'p-0', 'd-flex', 'flex-column', 'bg-body');
            sidebarFrameContent.style.minHeight = '0';

            const sidebarFrameBorder = document.createElement('div');
            PageToolbar._addClass(sidebarFrameBorder, 'e-sideframe-border');
            sidebarFrameBorder.classList.add('d-none', 'd-lg-block', 'border-start');

            layoutContainer.insertBefore(sidebarFrame, mainFrame);
            sidebarFrame.appendChild(sidebarFrameContent);
            sidebarFrame.appendChild(sidebarFrameBorder);

            this.sidebarFrameElement = sidebarFrame;

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

            const sidebarCookie = getCookie('sidebar');
            const shouldShowSidebar = sidebarCookie == 1;
            if (shouldShowSidebar) {
                PageToolbar._addClass(html, 'e-has-sideframe');
            } else {
                PageToolbar._removeClass(html, 'e-has-sideframe');
            }
            this._updateSidebarToggleState(shouldShowSidebar);

            const handleSidebarShown = () => {
                PageToolbar._addClass(html, 'e-has-sideframe');
                this._updateSidebarToggleState(true);
                PageToolbar._persistSidebarState(true);
            };

            const handleSidebarHidden = () => {
                PageToolbar._removeClass(html, 'e-has-sideframe');
                this._updateSidebarToggleState(false);
                PageToolbar._persistSidebarState(false);
            };

            sidebarFrame.addEventListener('shown.bs.offcanvas', handleSidebarShown);
            sidebarFrame.addEventListener('hidden.bs.offcanvas', handleSidebarHidden);

            const bootstrapInitAttempts = { count: 0, max: 40 };
            const ensureOffcanvas = () => {
                if (this.sidebarOffcanvas) {
                    return true;
                }
                const bootstrapGlobal = window?.bootstrap;
                if (!bootstrapGlobal || !bootstrapGlobal.Offcanvas) {
                    return false;
                }

                this.sidebarOffcanvas = bootstrapGlobal.Offcanvas.getOrCreateInstance(sidebarFrame, {
                    backdrop: true,
                    scroll: false
                });

                if (PageToolbar._hasClass(html, 'e-has-sideframe')) {
                    this.sidebarOffcanvas.show();
                }

                return true;
            };

            const waitForOffcanvas = () => {
                if (!ensureOffcanvas()) {
                    if (bootstrapInitAttempts.count++ < bootstrapInitAttempts.max) {
                        window.setTimeout(waitForOffcanvas, 50);
                    } else {
                        console.warn('[PageToolbar] Bootstrap Offcanvas API is not available.');
                    }
                }
            };

            waitForOffcanvas();
            this._ensureSidebarOffcanvas = ensureOffcanvas;

            sidebarToggle.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                this.toggleSidebar();
            });

            sidebarToggle.setAttribute('aria-controls', sidebarId);
        } else {
            sidebarToggle.classList.add('disabled');
            sidebarToggle.setAttribute('aria-disabled', 'true');
            sidebarToggle.setAttribute('aria-pressed', 'false');
            sidebarToggle.setAttribute('aria-expanded', 'false');
            sidebarToggle.disabled = true;
            this._updateSidebarToggleState = null;
            this.sidebarFrameElement = null;
            this.sidebarOffcanvas = null;
            this._ensureSidebarOffcanvas = null;
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
        if (typeof this._ensureSidebarOffcanvas === 'function') {
            this._ensureSidebarOffcanvas();
        }

        if (this.sidebarOffcanvas && typeof this.sidebarOffcanvas.toggle === 'function') {
            const element = this.sidebarOffcanvas._element || this.sidebarFrameElement;
            const isShown = element ? element.classList.contains('show') : false;
            this.sidebarOffcanvas.toggle();
            return !isShown;
        }

        const html = document.documentElement;
        PageToolbar._toggleClass(html, 'e-has-sideframe');
        const isSidebarVisible = PageToolbar._hasClass(html, 'e-has-sideframe');
        PageToolbar._persistSidebarState(isSidebarVisible);

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
