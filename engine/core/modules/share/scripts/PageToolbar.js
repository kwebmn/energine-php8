ScriptLoader.load('Toolbar', 'ModalBox', 'Cookie');

class PageToolbar extends Toolbar {
    constructor(componentPath, documentId, toolbarName, controlsDesc = [], props = {}) {
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
        document.body.classList.add('min-vh-100', 'd-flex', 'flex-column', 'bg-light');
        if (!PageToolbar._hasClass(html, 'e-has-topframe1')) {
            PageToolbar._addClass(html, 'e-has-topframe1');
        }

        const layoutContainer = document.createElement('div');
        PageToolbar._addClass(layoutContainer, 'e-layout');
        layoutContainer.classList.add('container-fluid', 'd-flex', 'flex-column', 'flex-lg-row', 'flex-grow-1', 'w-100', 'gap-3', 'pt-3', 'pb-4', 'px-3', 'px-lg-4', 'align-items-stretch', 'mt-0');

        const mainFrame = document.createElement('div');
        PageToolbar._addClass(mainFrame, 'e-mainframe');
        mainFrame.classList.add('flex-grow-1', 'bg-white', 'rounded-3', 'shadow-sm', 'p-4', 'border');
        mainFrame.style.minHeight = '0';

        const topFrame = document.createElement('nav');
        PageToolbar._addClass(topFrame, 'e-topframe');
        topFrame.classList.add('navbar', 'navbar-expand-lg', 'bg-body-tertiary', 'border-bottom', 'sticky-top', 'py-1', 'px-0');

        const container = document.createElement('div');
        container.classList.add('container-fluid', 'd-flex', 'align-items-center', 'justify-content-between', 'gap-3', 'flex-wrap', 'py-0');
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

        const headerStack = document.createElement('div');
        headerStack.classList.add('d-flex', 'align-items-center', 'gap-2', 'flex-grow-1', 'min-w-0');
        container.appendChild(headerStack);

        const brandStack = document.createElement('div');
        brandStack.classList.add('d-flex', 'align-items-center', 'gap-2', 'flex-shrink-0');
        headerStack.appendChild(brandStack);

        const sidebarLabel = getTranslation('TXT_SIDEBAR_TOGGLE', 'TXT_SIDEBAR', 'TXT_SETTINGS') || 'Toggle sidebar';
        const sidebarToggle = document.createElement('button');
        sidebarToggle.type = 'button';
        sidebarToggle.classList.add('btn', 'btn-sm', 'btn-light', 'border', 'border-secondary-subtle', 'rounded-1', 'px-2', 'd-flex', 'align-items-center', 'justify-content-center', 'flex-shrink-0');
        if (sidebarLabel) {
            sidebarToggle.setAttribute('aria-label', sidebarLabel);
        }
        const logoWrapper = document.createElement('span');
        logoWrapper.classList.add('d-inline-flex', 'align-items-center', 'justify-content-center', 'rounded-1', 'bg-white', 'border', 'border-secondary-subtle', 'shadow-sm');
        logoWrapper.style.width = '32px';
        logoWrapper.style.height = '32px';
        logoWrapper.style.lineHeight = '0';

        const logoImage = document.createElement('img');
        logoImage.src = window.Energine.static + (window.Energine.debug ? 'images/toolbar/nrgnptbdbg.png' : 'images/toolbar/nrgnptb.png');
        logoImage.alt = '';
        logoImage.classList.add('img-fluid');
        logoImage.style.width = '70%';
        logoImage.style.height = '70%';
        logoImage.style.objectFit = 'contain';
        logoWrapper.appendChild(logoImage);

        sidebarToggle.appendChild(logoWrapper);
        brandStack.appendChild(sidebarToggle);
        this.sidebarToggleButton = sidebarToggle;

        const toolbarLabelText = getTranslation('TXT_ADMIN_PANEL', 'TXT_CONTROL_PANEL', 'TXT_SETTINGS');
        if (toolbarLabelText) {
            const toolbarLabel = document.createElement('span');
            toolbarLabel.classList.add('text-uppercase', 'fw-semibold', 'small', 'text-muted', 'd-none', 'd-sm-inline');
            toolbarLabel.textContent = toolbarLabelText;
            brandStack.appendChild(toolbarLabel);
        }

        const environmentLabel = PageToolbar._extractEnvironmentLabel();

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
        collapse.classList.add('collapse', 'navbar-collapse', 'py-2', 'py-lg-0');
        collapse.classList.add('w-100');
        collapse.style.flexGrow = '1';
        collapse.style.flexBasis = '100%';
        collapse.id = collapseId;
        container.appendChild(collapse);

        const actionStack = document.createElement('div');
        actionStack.classList.add('d-flex', 'flex-column', 'gap-2', 'w-100', 'align-items-start');
        collapse.appendChild(actionStack);

        const primaryRow = document.createElement('div');
        primaryRow.classList.add('d-flex', 'align-items-center', 'gap-2', 'flex-wrap', 'w-100', 'justify-content-start');
        actionStack.appendChild(primaryRow);

        this.element.classList.add('py-2', 'py-lg-0');
        primaryRow.appendChild(this.element);

        this.element.classList.add('d-flex', 'align-items-center', 'justify-content-start', 'gap-1', 'flex-wrap');
        this.element.classList.remove('gap-2', 'bg-body', 'border', 'rounded-3', 'shadow-sm', 'p-2', 'ms-auto', 'justify-content-end');
        this.element.classList.add('bg-transparent', 'p-0');
        this.element.querySelectorAll('button.btn').forEach(button => {
            button.classList.add('rounded-1', 'px-3');
            button.classList.add('btn-sm');
            if (!button.classList.contains('btn-primary')) {
                button.classList.remove('btn-secondary', 'btn-outline-secondary');
                button.classList.add('btn-light', 'border', 'border-secondary-subtle', 'text-uppercase', 'fw-semibold', 'text-secondary');
            }
        });

        const editControlIds = ['add', 'edit', 'delete'];
        const editButtons = editControlIds
            .map(id => this.getControlById(id))
            .filter(control => control && control.element instanceof HTMLElement)
            .map(control => control.element);

        let editBand = null;
        if (editButtons.length) {
            editBand = document.createElement('div');
            editBand.classList.add('e-toolbar-editband', 'bg-body', 'border', 'shadow-sm', 'rounded-3', 'px-3', 'py-2', 'd-flex', 'align-items-center', 'gap-2', 'flex-wrap', 'w-100', 'justify-content-start');

            editButtons.forEach(button => {
                button.classList.add('shadow-sm');
                editBand.appendChild(button);
            });

            actionStack.appendChild(editBand);
        }

        // Перенос body-children (кроме svg и e-overlay)
        const toMove = Array.from(document.body.childNodes).filter(el =>
            el.nodeType === 1 && !((el.tagName.toLowerCase() !== 'svg') && PageToolbar._hasClass(el, 'e-overlay'))
        );
        const anchor = toMove.length ? toMove[0] : null;
        layoutContainer.appendChild(mainFrame);

        const contentFragment = document.createDocumentFragment();
        toMove.forEach(child => contentFragment.appendChild(child));
        mainFrame.appendChild(contentFragment);

        const mountFragment = document.createDocumentFragment();
        mountFragment.appendChild(topFrame);
        mountFragment.appendChild(layoutContainer);
        if (anchor && anchor.parentNode === document.body) {
            document.body.insertBefore(mountFragment, anchor);
        } else {
            document.body.appendChild(mountFragment);
        }

        // Боковая панель (sidebar)
        if (!this.properties['noSideFrame']) {
            const sidebarId = (`${collapseIdBase}-sidebar`).replace(/[^A-Za-z0-9_-]/g, '-');
            const sidebarFrame = document.createElement('div');
            PageToolbar._addClass(sidebarFrame, 'e-sideframe');
            sidebarFrame.classList.add('offcanvas', 'offcanvas-start', 'shadow', 'border-0', 'bg-light');
            sidebarFrame.id = sidebarId;
            sidebarFrame.setAttribute('tabindex', '-1');
            sidebarFrame.style.width = '320px';
            if (sidebarLabel) {
                sidebarFrame.setAttribute('aria-label', sidebarLabel);
            }

            const sidebarFrameContent = document.createElement('div');
            PageToolbar._addClass(sidebarFrameContent, 'e-sideframe-content');
            sidebarFrameContent.classList.add('offcanvas-body', 'd-flex', 'flex-column', 'gap-3', 'p-0', 'bg-body-tertiary');
            sidebarFrameContent.style.minHeight = '0';

            const sidebarFrameBorder = document.createElement('div');
            PageToolbar._addClass(sidebarFrameBorder, 'e-sideframe-border');
            sidebarFrameBorder.classList.add('d-none', 'd-lg-block', 'border-start');

            layoutContainer.insertBefore(sidebarFrame, mainFrame);
            sidebarFrame.appendChild(sidebarFrameContent);
            sidebarFrame.appendChild(sidebarFrameBorder);

            this.sidebarFrameElement = sidebarFrame;

            const syncSidebarOffset = () => {
                if (!this.sidebarFrameElement) {
                    return;
                }
                const navHeight = Math.max(0, Math.round(topFrame.getBoundingClientRect().height || 0));
                this.sidebarFrameElement.style.top = navHeight ? `${navHeight}px` : '0';
                this.sidebarFrameElement.style.height = navHeight ? `calc(100vh - ${navHeight}px)` : '100vh';
            };
            syncSidebarOffset();
            window.addEventListener('resize', syncSidebarOffset);
            ['shown.bs.collapse', 'hidden.bs.collapse'].forEach(eventName => {
                collapse.addEventListener(eventName, syncSidebarOffset);
            });

            const sidebarHeader = document.createElement('div');
            sidebarHeader.classList.add('d-flex', 'align-items-center', 'justify-content-between', 'gap-2', 'px-3', 'py-2', 'border-bottom', 'bg-white');

            const sidebarHeaderContent = document.createElement('div');
            sidebarHeaderContent.classList.add('d-flex', 'align-items-center', 'gap-2', 'flex-wrap');
            sidebarHeader.appendChild(sidebarHeaderContent);

            if (environmentLabel) {
                const sidebarEnv = document.createElement('span');
                sidebarEnv.classList.add('badge', 'text-bg-secondary', 'text-uppercase', 'fw-semibold');
                sidebarEnv.textContent = environmentLabel;
                sidebarHeaderContent.appendChild(sidebarEnv);
            }

            const headerActions = document.createElement('div');
            headerActions.classList.add('d-flex', 'align-items-center', 'gap-2', 'ms-auto');
            sidebarHeader.appendChild(headerActions);

            const closeLabel = getTranslation('TXT_CLOSE', 'BTN_CLOSE', 'TXT_CANCEL', 'BTN_CANCEL') || 'Close';
            const sidebarCloseButton = document.createElement('button');
            sidebarCloseButton.type = 'button';
            sidebarCloseButton.classList.add('btn', 'btn-sm', 'btn-outline-secondary');
            sidebarCloseButton.setAttribute('data-bs-dismiss', 'offcanvas');
            if (closeLabel) {
                sidebarCloseButton.setAttribute('aria-label', closeLabel);
                sidebarCloseButton.textContent = closeLabel;
            }
            headerActions.appendChild(sidebarCloseButton);

            sidebarFrameContent.appendChild(sidebarHeader);

            const sidebarBody = document.createElement('div');
            sidebarBody.classList.add('d-flex', 'flex-column', 'gap-3', 'flex-grow-1', 'p-3');
            sidebarFrameContent.appendChild(sidebarBody);

            const iframeWrapper = document.createElement('div');
            iframeWrapper.classList.add('d-flex', 'flex-column', 'flex-grow-1', 'rounded-3', 'border', 'bg-white', 'shadow-sm', 'overflow-hidden');
            sidebarBody.appendChild(iframeWrapper);

            const iframe = document.createElement('iframe');
            PageToolbar._setProperties(iframe, {
                src: this.componentPath + 'show/',
                frameBorder: '0'
            });
            iframe.classList.add('flex-grow-1', 'w-100', 'border-0');
            iframeWrapper.appendChild(iframe);

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
                syncSidebarOffset();
                PageToolbar._addClass(html, 'e-has-sideframe');
                this._updateSidebarToggleState(true);
                PageToolbar._persistSidebarState(true);
            };

            const handleSidebarHidden = () => {
                syncSidebarOffset();
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
                    backdrop: false,
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

    static _extractPageTitle() {
        const selectors = [
            '.page-header h1',
            '.content-header h1',
            'main h1',
            'h1'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent) {
                const text = element.textContent.trim();
                if (text) {
                    return text;
                }
            }
        }

        const breadcrumbCurrent = document.querySelector('.breadcrumb .active, .breadcrumb-item.active');
        if (breadcrumbCurrent && breadcrumbCurrent.textContent) {
            const text = breadcrumbCurrent.textContent.trim();
            if (text) {
                return text;
            }
        }

        const documentTitle = document.title || '';
        if (documentTitle) {
            const parts = documentTitle.split('|');
            if (parts.length > 1) {
                const candidate = parts[0].trim();
                if (candidate) {
                    return candidate;
                }
            }
            return documentTitle.trim();
        }

        return '';
    }

    static _collectBreadcrumbs() {
        const selectors = [
            '.breadcrumb .breadcrumb-item',
            '.breadcrumb li',
            '[data-role="breadcrumbs"] .breadcrumb-item'
        ];

        const seen = new Set();
        const items = [];
        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(node => {
                if (!node || !node.textContent) {
                    return;
                }
                const text = node.textContent.replace(/\s+/g, ' ').trim();
                if (!text || seen.has(text)) {
                    return;
                }
                seen.add(text);
                items.push(text);
            });
        });

        return items;
    }

    static _extractBreadcrumbTrail(pageTitle = '') {
        const crumbs = PageToolbar._collectBreadcrumbs();
        if (!crumbs.length) {
            return '';
        }

        const filtered = crumbs.filter(Boolean);
        if (!filtered.length) {
            return '';
        }

        const normalizedTitle = pageTitle ? pageTitle.trim().toLowerCase() : '';
        const lastItem = filtered[filtered.length - 1];
        if (normalizedTitle && lastItem && lastItem.trim().toLowerCase() === normalizedTitle) {
            filtered.pop();
        }

        if (!filtered.length) {
            return '';
        }

        return filtered.join(' / ');
    }

    static _extractEnvironmentLabel() {
        const candidate = window?.Energine?.root || window?.Energine?.base || window?.location?.href || '';
        if (!candidate) {
            return '';
        }

        try {
            const parsed = new URL(candidate, window.location.origin);
            if (parsed && (parsed.host || parsed.hostname)) {
                return parsed.host || parsed.hostname;
            }
        } catch (error) {
            // ignore and fallback to window.location
        }

        if (window?.location?.host) {
            return window.location.host;
        }

        return '';
    }

    // Вложенный контрол логотипа (если нужно)
    static Logo = class extends Toolbar.Control {};
}

// экспорт для window, если надо
window.PageToolbar = PageToolbar;
