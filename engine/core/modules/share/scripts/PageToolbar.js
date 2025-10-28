import Energine, { registerBehavior as registerEnergineBehavior } from './Energine.js';
import Toolbar from './Toolbar.js';
import ModalBox from './ModalBox.js';
import Cookie from './Cookie.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

const SIDEBAR_OFFCANVAS_Z_INDEX = 1030;
const TOOLBAR_Z_INDEX = SIDEBAR_OFFCANVAS_Z_INDEX + 10;

const CONTROL_FALLBACK_ACTIONS = Object.freeze({
    editMode: 'editMode',
    transEditor: 'showTransEditor',
    language: 'showLangEditor',
    user: 'showUserEditor',
    role: 'showRoleEditor',
    fileRepository: 'showFileRepository',
    siteEditor: 'showSiteEditor',
    tmplEditor: 'showTmplEditor',
});

class PageToolbar extends Toolbar {
    constructor(...args) {
        const config = PageToolbar._normalizeConstructorArgs(...args);

        super(config.element || config.toolbarName, config.properties);

        this._initializeInstanceState(config);
        this._bindToolbarContext();
        this._hydrateControls(config);
        this._registerDeclarativeInstance(config);

        this._ensureDefaultControlActions();

        this.setupLayout();

        this._ensureRoutingConfigFromLayout();

    }

    _initializeInstanceState(config) {
        this.componentPath = config.componentPath;
        this.documentId = config.documentId;
        this.layoutManager = null;
        this.layoutRoot = config.layout?.root || null;
        this.toolbarRoot = config.layout?.toolbarRoot || this.layoutRoot;
        this.sidebarToggleButton = null;
        this.sidebarToggleButtons = [];
        this._updateSidebarToggleState = null;
        this.sidebarOffcanvas = null;
        this.sidebarFrameElement = null;
        this._ensureSidebarOffcanvas = null;
        this._sidebarEventHandlers = [];
        this._mode = config.mode;
        this._layoutConfig = config.layout || {};
        this._layoutCleanupFns = [];
        this._boundEditModeUnpressed = this._handleEditModeUnpressed.bind(this);

        if (config.mode !== 'declarative' && config.shouldDock) {
            this.dock();
        }
    }

    _bindToolbarContext() {
        this.bindTo(this);

        window.addEventListener('oneditmodeunpressed', this._boundEditModeUnpressed);
    }

    _hydrateControls(config) {
        if (config.mode === 'declarative') {
            this._hydrateFromElement(config.element, config.descriptors);
            return;
        }

        if (Array.isArray(config.controls)) {
            config.controls.forEach(control => this.appendControl(control));
        }
    }

    _registerDeclarativeInstance(config) {
        if (config.mode !== 'declarative') {
            return;
        }

        if (this.element?.dataset) {
            this.element.dataset.eToolbarHydrated = '1';
        }

        const componentRef = config.componentRef
            || this.element?.dataset?.eToolbarComponent
            || this.element?.dataset?.componentRef
            || this._layoutConfig?.dataset?.eToolbarComponent
            || this._layoutConfig?.toolbarDataset?.eToolbarComponent
            || null;

        Toolbar.registerToolbarInstance(this, componentRef);
    }

    _hydrateFromElement(element, descriptors = null) {
        if (!(element instanceof HTMLElement)) {
            return;
        }

        const normalizedDescriptors = Array.isArray(descriptors) && descriptors.length
            ? descriptors
            : PageToolbar._extractDescriptorsFromElement(element);

        if (!Array.isArray(normalizedDescriptors) || !normalizedDescriptors.length) {
            return;
        }

        normalizedDescriptors.forEach(descriptor => {
            const controlInstance = Toolbar.createControlFromDescriptor(descriptor);
            if (controlInstance) {
                if (typeof HTMLElement !== 'undefined'
                    && descriptor.element instanceof HTMLElement
                    && typeof controlInstance.useExistingElement === 'function') {
                    controlInstance.useExistingElement(descriptor.element);
                }
                this.appendControl(controlInstance);
            }
        });
    }

    _ensureRoutingConfigFromLayout() {
        const datasetSources = PageToolbar._collectDatasetSources(this);

        if (!this.componentPath) {
            const resolvedPath = PageToolbar._resolveDatasetValue(
                ['eComponentPath', 'eComponent', 'eComponentUrl', 'eComponentBase'],
                ...datasetSources
            );
            if (resolvedPath) {
                this.componentPath = PageToolbar._normalizeComponentPath(resolvedPath);
            }
        } else {
            this.componentPath = PageToolbar._normalizeComponentPath(this.componentPath);
        }

        if (!this.documentId) {
            const resolvedDocumentId = PageToolbar._resolveDatasetValue(
                ['eDocumentId', 'eDocId', 'documentId', 'docId'],
                ...datasetSources
            );
            if (resolvedDocumentId) {
                this.documentId = resolvedDocumentId;
            }
        }
    }

    _ensureDefaultControlActions() {
        if (!Array.isArray(this.controls) || !this.controls.length) {
            return;
        }

        this.controls.forEach(control => PageToolbar._assignFallbackAction(control, this));
    }

    static _assignFallbackAction(control, toolbarInstance) {
        if (!control || typeof control !== 'object') {
            return;
        }

        const controlId = control.properties?.id || '';
        if (!controlId || control.properties?.action) {
            return;
        }

        const fallbackAction = CONTROL_FALLBACK_ACTIONS[controlId];
        if (!fallbackAction || typeof toolbarInstance[fallbackAction] !== 'function') {
            return;
        }

        if (typeof control.setAction === 'function') {
            control.setAction(fallbackAction);
        } else if (control.properties) {
            control.properties.action = fallbackAction;
        }

        if (control.element instanceof HTMLElement) {
            try {
                control.element.dataset.action = fallbackAction;
                control.element.setAttribute('data-action', fallbackAction);
            } catch (error) {
                // ignore dataset failures
            }
        }
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
            const baseHref = Energine?.base || globalScope?.location?.pathname || '/';
            const origin = globalScope?.location
                ? `${globalScope.location.protocol}//${globalScope.location.host}`
                : undefined;
            const url = origin ? new URL(baseHref, origin) : new URL(baseHref, 'http://localhost');
            const hostname = url.hostname || globalScope?.location?.hostname || '';
            const domainChunks = hostname ? hostname.split('.') : [];
            if (domainChunks.length > 2) {
                domainChunks.shift();
            }
            const domain = domainChunks.length
                ? `.${domainChunks.join('.')}`
                : (globalScope?.location?.hostname || undefined);
            const pathName = url.pathname || '/';
            const path = pathName.endsWith('/') ? pathName : `${pathName}/`;
            const value = isVisible ? '1' : '0';
            Cookie.write('sidebar', value, {
                duration: 30,
                path,
                domain,
            });
        } catch (error) {
            console.warn('[PageToolbar] Failed to persist sidebar state', error);
        }
    }

    // ===== Основная логика =====

    setupLayout() {
        if (this._setupDeclarativeLayoutIfPossible()) {
            return;
        }
        this._setupLegacyLayout();
    }

    _setupDeclarativeLayoutIfPossible() {
        const element = this.element instanceof HTMLElement ? this.element : null;
        if (!element || typeof document === 'undefined') {
            return false;
        }

        const root = this.layoutRoot || PageToolbar._findDeclarativeRoot(element);
        if (!root) {
            return false;
        }

        this.layoutRoot = root;
        this.layoutManager = root;

        const dataset = element.dataset || {};
        const rootDataset = root.dataset || {};
        const combinedDataset = Object.assign({}, rootDataset || {}, dataset || {});
        this._layoutConfig = Object.assign({}, this._layoutConfig || {}, {
            dataset: rootDataset,
            toolbarDataset: dataset,
            rootDataset,
            combinedDataset,
        });

        const html = document.documentElement;
        if (html) {
            html.classList.add('h-100');
        }
        if (document.body) {
            document.body.classList.add('min-vh-100', 'd-flex', 'flex-column', 'bg-light');
        }

        this._configureTopframeDocking(root, dataset, rootDataset);

        const editBandContainer = root.querySelector('[data-role="toolbar-editband"]');
        if (editBandContainer) {
            const editBandControlsRaw = PageToolbar._resolveDatasetValue(
                ['editbandControls', 'editBandControls', 'editControls'],
                this._layoutConfig,
                dataset,
                rootDataset,
                editBandContainer.dataset || {}
            );
            const controlIds = (typeof editBandControlsRaw === 'string'
                ? editBandControlsRaw.split(',').map(chunk => chunk.trim()).filter(Boolean)
                : []) || [];
            const fallbackControlIds = ['add', 'edit', 'delete'];
            const resolvedIds = controlIds.length ? controlIds : fallbackControlIds;

            const editControls = resolvedIds
                .map(id => this.getControlById(id))
                .filter(control => control && control.element instanceof HTMLElement);

            if (editControls.length) {
                editBandContainer.removeAttribute('hidden');
                editBandContainer.classList.remove('d-none');
                editBandContainer.dataset.state = 'active';
                editControls.forEach(control => {
                    control.element.classList.add('shadow-sm');
                    editBandContainer.appendChild(control.element);
                });
            } else {
                editBandContainer.setAttribute('hidden', 'hidden');
                editBandContainer.classList.add('d-none');
                editBandContainer.dataset.state = 'empty';
            }
        }

        const offcanvasSelectorValue = PageToolbar._resolveDatasetValue(
            ['eOffcanvasTarget', 'eSidebarTarget', 'offcanvasTarget', 'sidebarTarget', 'sidebarSelector'],
            this._layoutConfig,
            dataset,
            rootDataset
        );
        const offcanvasIdValue = PageToolbar._resolveDatasetValue(
            ['eSidebarId', 'eOffcanvasId', 'sidebarId', 'offcanvasId'],
            this._layoutConfig,
            dataset,
            rootDataset
        );
        const normalizedOffcanvasSelector = PageToolbar._normalizeSelector(offcanvasSelectorValue, offcanvasIdValue);

        let sidebarFrame = null;
        if (normalizedOffcanvasSelector) {
            sidebarFrame = root.querySelector(normalizedOffcanvasSelector)
                || document.querySelector(normalizedOffcanvasSelector);
        }
        if (!sidebarFrame && offcanvasIdValue) {
            const candidateId = offcanvasIdValue.replace(/^#/, '');
            sidebarFrame = document.getElementById(candidateId) || sidebarFrame;
        }
        if (!sidebarFrame) {
            sidebarFrame = root.querySelector('[data-role="page-toolbar-sidebar"],[data-sidebar],[data-offcanvas]');
        }
        if (sidebarFrame) {
            this.sidebarFrameElement = sidebarFrame;
        }

        const topFrame = root.querySelector('[data-role="page-toolbar-topframe"]') || null;
        const syncSidebarOffset = () => {
            PageToolbar._syncSidebarGeometry(this.sidebarFrameElement, topFrame);
        };

        if (sidebarFrame) {
            syncSidebarOffset();

            if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
                const handleResize = () => syncSidebarOffset();
                window.addEventListener('resize', handleResize);
                this._sidebarEventHandlers.push({ element: window, type: 'resize', handler: handleResize });
            }

            if (typeof ResizeObserver !== 'undefined' && topFrame instanceof HTMLElement) {
                const resizeObserver = new ResizeObserver(() => syncSidebarOffset());
                resizeObserver.observe(topFrame);
                this._registerLayoutCleanup(() => resizeObserver.disconnect());
            }
        }

        const toggleButtons = PageToolbar._collectSidebarToggleButtons(
            root,
            sidebarFrame,
            normalizedOffcanvasSelector
        );
        this.sidebarToggleButtons = toggleButtons;
        this.sidebarToggleButton = toggleButtons[0] || null;

        this._updateSidebarToggleState = state => {
            const pressed = state ? 'true' : 'false';
            toggleButtons.forEach(button => {
                if (!button) {
                    return;
                }
                button.setAttribute('aria-pressed', pressed);
                button.setAttribute('aria-expanded', pressed);
                button.classList.toggle('active', !!state);
                if (sidebarFrame?.id && !button.getAttribute('aria-controls')) {
                    button.setAttribute('aria-controls', sidebarFrame.id);
                }
                if (button.dataset) {
                    button.dataset.eSidebarState = state ? 'open' : 'closed';
                }
            });
            if (root.dataset) {
                root.dataset.eSidebarExpanded = state ? '1' : '0';
            }
            if (element !== root && element.dataset) {
                element.dataset.eSidebarExpanded = state ? '1' : '0';
            }
        };

        const rawInitialState = PageToolbar._resolveDatasetValue(
            ['eSidebarExpanded', 'eSidebarState', 'sidebarExpanded', 'sidebarState', 'sidebarVisible', 'sidebar'],
            this._layoutConfig,
            dataset,
            rootDataset
        );
        let initialState = PageToolbar._parseSidebarState(rawInitialState);
        if (initialState === null) {
            const cookieValue = Cookie.read('sidebar');
            initialState = cookieValue == 1;
        }

        this._handleSidebarStateChange(initialState, { persist: false });

        if (sidebarFrame) {
            const handleShown = () => {
                syncSidebarOffset();
                this._handleSidebarStateChange(true);
            };
            const handleHidden = () => {
                syncSidebarOffset();
                this._handleSidebarStateChange(false);
            };
            sidebarFrame.addEventListener('shown.bs.offcanvas', handleShown);
            sidebarFrame.addEventListener('hidden.bs.offcanvas', handleHidden);
            this._sidebarEventHandlers.push({ element: sidebarFrame, type: 'shown.bs.offcanvas', handler: handleShown });
            this._sidebarEventHandlers.push({ element: sidebarFrame, type: 'hidden.bs.offcanvas', handler: handleHidden });

            this._ensureSidebarOffcanvas = () => {
                if (this.sidebarOffcanvas) {
                    return this.sidebarOffcanvas;
                }
                const bootstrapGlobal = window?.bootstrap;
                if (!bootstrapGlobal || !bootstrapGlobal.Offcanvas) {
                    return null;
                }
                this.sidebarOffcanvas = bootstrapGlobal.Offcanvas.getOrCreateInstance(sidebarFrame, {
                    backdrop: false,
                    scroll: false,
                });
                return this.sidebarOffcanvas;
            };

            if (initialState) {
                if (window?.bootstrap?.Offcanvas) {
                    this._ensureSidebarOffcanvas();
                    if (this.sidebarOffcanvas) {
                        const elementRef = this.sidebarOffcanvas._element || sidebarFrame;
                        if (!elementRef.classList.contains('show')) {
                            this.sidebarOffcanvas.show();
                        }
                    }
                } else {
                    sidebarFrame.classList.add('show');
                }
            }
        }

        if (toggleButtons.length) {
            const handleToggleClick = event => {
                if (window?.bootstrap?.Offcanvas) {
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
                this.toggleSidebar();
            };
            toggleButtons.forEach(button => {
                if (!button) {
                    return;
                }
                button.addEventListener('click', handleToggleClick);
                this._sidebarEventHandlers.push({ element: button, type: 'click', handler: handleToggleClick });
            });
        }

        return true;
    }

    _configureTopframeDocking(root, dataset = {}, rootDataset = {}) {
        if (!root) {
            return;
        }

        const topFrame = root.querySelector('[data-role="page-toolbar-topframe"]');
        if (!topFrame) {
            return;
        }

        const dockRaw = PageToolbar._resolveDatasetValue(
            ['toolbarDock', 'dock', 'dockMode', 'toolbarPosition'],
            this._layoutConfig,
            dataset,
            rootDataset,
            topFrame.dataset || {}
        );

        const normalizedDock = (typeof dockRaw === 'string' ? dockRaw : '').trim().toLowerCase();
        const dockingMode = normalizedDock || 'sticky';

        const originalRootDock = root.dataset ? root.dataset.eToolbarDock : undefined;
        const originalTopDock = topFrame.dataset ? topFrame.dataset.eToolbarDock : undefined;

        if (root.dataset) {
            root.dataset.eToolbarDock = dockingMode;
        }
        if (topFrame.dataset) {
            topFrame.dataset.eToolbarDock = dockingMode;
        }

        const topFrameAddedClasses = [];
        const rootAddedClasses = [];
        const rememberClass = (element, className, bucket) => {
            if (!element || !className) {
                return;
            }
            if (!element.classList.contains(className)) {
                element.classList.add(className);
                if (Array.isArray(bucket)) {
                    bucket.push(className);
                }
            }
        };
        const rememberTopClass = className => rememberClass(topFrame, className, topFrameAddedClasses);
        const rememberRootClass = className => rememberClass(root, className, rootAddedClasses);

        const originalStyles = {
            position: topFrame.style.position,
            top: topFrame.style.top,
            left: topFrame.style.left,
            right: topFrame.style.right,
            zIndex: topFrame.style.zIndex,
        };
        const originalRootStyles = root ? {
            position: root.style.position,
            top: root.style.top,
            left: root.style.left,
            right: root.style.right,
            zIndex: root.style.zIndex,
        } : null;

        const applySticky = () => {
            rememberTopClass('sticky-top');
            rememberTopClass('position-sticky');
            rememberTopClass('top-0');
            rememberTopClass('start-0');
            rememberTopClass('end-0');
            if (!topFrame.style.position) {
                topFrame.style.position = 'sticky';
            }
            if (!topFrame.style.top) {
                topFrame.style.top = '0px';
            }
            if (!topFrame.style.zIndex) {
                topFrame.style.zIndex = `${TOOLBAR_Z_INDEX}`;
            }
            if (!topFrame.style.left) {
                topFrame.style.left = '0px';
            }
            rememberRootClass('sticky-top');
            rememberRootClass('position-sticky');
            rememberRootClass('top-0');
            rememberRootClass('start-0');
            rememberRootClass('end-0');
            if (root) {
                if (!root.style.position || root.style.position === 'static') {
                    root.style.position = 'sticky';
                }
                if (!root.style.top) {
                    root.style.top = '0px';
                }
                if (!root.style.left) {
                    root.style.left = '0px';
                }
                if (!root.style.right) {
                    root.style.right = '0px';
                }
                if (!root.style.zIndex) {
                    root.style.zIndex = `${TOOLBAR_Z_INDEX}`;
                }
            }
        };

        const applyFixed = () => {
            if (!topFrame.style.position || topFrame.style.position === 'sticky') {
                topFrame.style.position = 'fixed';
            }
            if (!topFrame.style.top) {
                topFrame.style.top = '0px';
            }
            if (!topFrame.style.left) {
                topFrame.style.left = '0px';
            }
            if (!topFrame.style.right) {
                topFrame.style.right = '0px';
            }
            if (!topFrame.style.zIndex) {
                topFrame.style.zIndex = `${TOOLBAR_Z_INDEX}`;
            }
            if (root) {
                if (!root.style.position || root.style.position === 'static') {
                    root.style.position = 'fixed';
                }
                if (!root.style.top) {
                    root.style.top = '0px';
                }
                if (!root.style.left) {
                    root.style.left = '0px';
                }
                if (!root.style.right) {
                    root.style.right = '0px';
                }
                if (!root.style.zIndex) {
                    root.style.zIndex = `${TOOLBAR_Z_INDEX}`;
                }
            }
        };

        const shouldStick = !normalizedDock || ['sticky', 'stick', 'top', 'pinned'].includes(normalizedDock);
        const shouldFix = normalizedDock === 'fixed';

        if (shouldFix) {
            applyFixed();
        } else if (shouldStick) {
            applySticky();
        }

        const updateMetrics = () => {
            if (!topFrame.isConnected) {
                return;
            }
            const rect = topFrame.getBoundingClientRect();
            const height = rect ? Math.round(rect.height) : 0;
            if (height > 0) {
                root.style.setProperty('--page-toolbar-height', `${height}px`);
                if (document?.documentElement) {
                    document.documentElement.style.setProperty('--page-toolbar-height', `${height}px`);
                }
            }
        };

        updateMetrics();

        const handleResize = () => updateMetrics();
        window.addEventListener('resize', handleResize);
        this._registerLayoutCleanup(() => window.removeEventListener('resize', handleResize));

        if (typeof ResizeObserver !== 'undefined') {
            const resizeObserver = new ResizeObserver(() => updateMetrics());
            resizeObserver.observe(topFrame);
            this._registerLayoutCleanup(() => resizeObserver.disconnect());
        }

        this._registerLayoutCleanup(() => {
            topFrameAddedClasses.forEach(className => topFrame.classList.remove(className));
            if (root) {
                rootAddedClasses.forEach(className => root.classList.remove(className));
            }
            topFrame.style.position = originalStyles.position;
            topFrame.style.top = originalStyles.top;
            topFrame.style.left = originalStyles.left;
            topFrame.style.right = originalStyles.right;
            topFrame.style.zIndex = originalStyles.zIndex;
            if (root && originalRootStyles) {
                root.style.position = originalRootStyles.position;
                root.style.top = originalRootStyles.top;
                root.style.left = originalRootStyles.left;
                root.style.right = originalRootStyles.right;
                root.style.zIndex = originalRootStyles.zIndex;
            }
            if (root?.style) {
                root.style.removeProperty('--page-toolbar-height');
            }
            if (document?.documentElement) {
                document.documentElement.style.removeProperty('--page-toolbar-height');
            }
            if (root.dataset) {
                if (typeof originalRootDock === 'string') {
                    root.dataset.eToolbarDock = originalRootDock;
                } else {
                    delete root.dataset.eToolbarDock;
                }
            }
            if (topFrame.dataset) {
                if (typeof originalTopDock === 'string') {
                    topFrame.dataset.eToolbarDock = originalTopDock;
                } else {
                    delete topFrame.dataset.eToolbarDock;
                }
            }
        });
    }

    _handleSidebarStateChange(state, options = {}) {
        const { persist = true } = options || {};
        const html = (typeof document !== 'undefined') ? document.documentElement : null;
        if (html) {
            if (state) {
                PageToolbar._addClass(html, 'e-has-sideframe');
            } else {
                PageToolbar._removeClass(html, 'e-has-sideframe');
            }
        }

        if (persist) {
            PageToolbar._persistSidebarState(!!state);
        }

        if (typeof this._updateSidebarToggleState === 'function') {
            this._updateSidebarToggleState(!!state);
        } else if (this.sidebarToggleButton) {
            const pressed = state ? 'true' : 'false';
            this.sidebarToggleButton.setAttribute('aria-pressed', pressed);
            this.sidebarToggleButton.setAttribute('aria-expanded', pressed);
            this.sidebarToggleButton.classList.toggle('active', !!state);
        }

        if (this.layoutRoot?.dataset) {
            this.layoutRoot.dataset.eSidebarExpanded = state ? '1' : '0';
        }
        if (this.element?.dataset && this.element !== this.layoutRoot) {
            this.element.dataset.eSidebarExpanded = state ? '1' : '0';
        }
    }

    _setupLegacyLayout() {
        const html = document.documentElement;
        html.classList.add('h-100');
        document.body.classList.add('min-vh-100', 'd-flex', 'flex-column', 'bg-light');
        // if (!PageToolbar._hasClass(html, 'e-has-topframe1')) {
        //     PageToolbar._addClass(html, 'e-has-topframe1');
        // }

        const layoutContainer = document.createElement('div');
        PageToolbar._addClass(layoutContainer, 'e-layout');
        // layoutContainer.classList.add('container-fluid');
        // layoutContainer.classList.add('container-fluid', 'd-flex', 'flex-column', 'flex-lg-row', 'flex-grow-1', 'w-100', 'gap-3', 'pt-3', 'pb-4', 'px-3', 'px-lg-4', 'align-items-stretch', 'mt-0');

        const mainFrame = document.createElement('div');
        PageToolbar._addClass(mainFrame, 'e-mainframe');
        // mainFrame.classList.add('flex-grow-1', 'bg-white', 'rounded-3', 'shadow-sm', 'p-4', 'border');
        // mainFrame.classList.add('flex-grow-1', 'bg-white', 'rounded-3', 'shadow-sm', 'p-4', 'border');
        mainFrame.style.minHeight = '0';

        const topFrame = document.createElement('nav');
        PageToolbar._addClass(topFrame, 'e-topframe');
        topFrame.classList.add( 'sticky-top', 'py-1', 'px-0', 'bg-body-tertiary', 'border-bottom', 'sticky-top', 'py-1', 'px-0');

        // topFrame.classList.add('navbar', 'navbar-expand-lg', 'bg-body-tertiary', 'border-bottom', 'sticky-top', 'py-1', 'px-0');

        const container = document.createElement('div');
        container.classList.add('container-fluid', 'd-flex', 'align-items-start', 'justify-content-start', 'gap-3', 'flex-wrap', 'py-0');
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
        // headerStack.classList.add('d-flex', 'align-items-center', 'gap-3', 'flex-wrap', 'w-100', 'min-w-0');
        headerStack.classList.add('d-flex', 'align-items-center', 'gap-3', 'flex-wrap', 'w-100', 'min-w-0');
        container.appendChild(headerStack);

        const brandStack = document.createElement('div');
        brandStack.classList.add('d-flex', 'align-items-center', 'gap-2', 'flex-shrink-0');
        headerStack.appendChild(brandStack);

        const sidebarLabel = getTranslation('TXT_SIDEBAR_TOGGLE', 'TXT_SIDEBAR', 'TXT_SETTINGS') || 'Toggle sidebar';
        const sidebarToggle = document.createElement('button');
        sidebarToggle.type = 'button';
        sidebarToggle.classList.add(
            'btn',
            'py-2',
            'btn-sm',
            'btn-light',
            'd-inline-flex',
            'align-items-center',
            'gap-2',
            'rounded-1',
            'px-3',
            'flex-shrink-0',
            'text-secondary',
        );
        if (sidebarLabel) {
            sidebarToggle.setAttribute('aria-label', sidebarLabel);
        }

        const iconWrapper = document.createElement('span');
        iconWrapper.classList.add('toolbar-icon', 'd-inline-flex', 'align-items-center', 'justify-content-center');

        const icon = document.createElement('i');
        icon.classList.add('fa', 'fa-bars');
        icon.setAttribute('aria-hidden', 'true');

        iconWrapper.appendChild(icon);
        sidebarToggle.appendChild(iconWrapper);
        brandStack.appendChild(sidebarToggle);
        this.sidebarToggleButton = sidebarToggle;
        this.sidebarToggleButtons = [sidebarToggle];

        const environmentLabel = PageToolbar._extractEnvironmentLabel();

        const toolbarIdBase = this.element.dataset.eToolbar || this.name || 'toolbar';

        const actionsColumn = document.createElement('div');
        actionsColumn.classList.add('d-flex', 'flex-column', 'gap-2', 'flex-grow-1', 'min-w-0');
        headerStack.appendChild(actionsColumn);

        const primaryRow = document.createElement('div');
        primaryRow.classList.add('d-flex', 'align-items-center', 'gap-2', 'flex-wrap', 'justify-content-start', 'w-100', 'min-w-0', 'py-2', 'py-lg-0');
        actionsColumn.appendChild(primaryRow);

        primaryRow.appendChild(this.element);

        this.element.classList.add('d-flex', 'align-items-center', 'justify-content-start', 'gap-1', 'flex-wrap');
        this.element.classList.remove('gap-2', 'bg-body', 'border', 'rounded-3', 'shadow-sm', 'p-2', 'ms-auto', 'justify-content-end');
        this.element.classList.add('bg-transparent', 'p-0', 'flex-grow-1', 'min-w-0');
        this.element.querySelectorAll('button.btn').forEach(button => {
            const label = button.textContent ? button.textContent.trim() : '';
            if (label && !button.getAttribute('title')) {
                button.setAttribute('title', label);
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
                editBand.appendChild(button);
            });

            actionsColumn.appendChild(editBand);
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
            const sidebarId = (`${toolbarIdBase}-sidebar`).replace(/[^A-Za-z0-9_-]/g, '-');
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
                PageToolbar._syncSidebarGeometry(this.sidebarFrameElement, topFrame);
            };
            syncSidebarOffset();
            if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
                const handleResize = () => syncSidebarOffset();
                window.addEventListener('resize', handleResize);
                this._registerLayoutCleanup(() => window.removeEventListener('resize', handleResize));
            }
            if (typeof ResizeObserver !== 'undefined' && topFrame instanceof HTMLElement) {
                const resizeObserver = new ResizeObserver(() => syncSidebarOffset());
                resizeObserver.observe(topFrame);
                this._registerLayoutCleanup(() => resizeObserver.disconnect());
            }

            const sidebarHeader = document.createElement('div');
            sidebarHeader.classList.add('d-flex', 'align-items-center', 'justify-content-between', 'gap-2', 'px-3', 'py-2', 'border-bottom', 'bg-white');

            const sidebarHeaderContent = document.createElement('div');
            sidebarHeaderContent.classList.add('d-flex', 'align-items-center', 'gap-2', 'flex-wrap');
            sidebarHeader.appendChild(sidebarHeaderContent);

            if (environmentLabel) {
                const sidebarEnv = document.createElement('span');
                sidebarEnv.classList.add('badge', 'text-bg-secondary', 'fw-semibold');
                sidebarEnv.textContent = environmentLabel;
                sidebarHeaderContent.appendChild(sidebarEnv);
            }

            const headerActions = document.createElement('div');
            headerActions.classList.add('d-flex', 'align-items-center', 'gap-2', 'ms-auto');
            sidebarHeader.appendChild(headerActions);

            const closeLabel = getTranslation('TXT_CLOSE', 'BTN_CLOSE', 'TXT_CANCEL', 'BTN_CANCEL') || 'Close';
            const sidebarCloseButton = document.createElement('button');
            sidebarCloseButton.type = 'button';
            sidebarCloseButton.classList.add(
                'btn',
                'btn-sm',
                'btn-light',
                'd-inline-flex',
                'align-items-center',
                'justify-content-center',
            );
            sidebarCloseButton.setAttribute('data-bs-dismiss', 'offcanvas');
            sidebarCloseButton.setAttribute('data-role', 'sidebar-close');
            if (closeLabel) {
                sidebarCloseButton.setAttribute('aria-label', closeLabel);
            }

            const closeIconWrapper = document.createElement('span');
            closeIconWrapper.classList.add('toolbar-icon', 'd-inline-flex', 'align-items-center', 'justify-content-center');
            closeIconWrapper.setAttribute('aria-hidden', 'true');

            const closeIcon = document.createElement('i');
            closeIcon.classList.add('fa', 'fa-chevron-left');
            closeIcon.setAttribute('aria-hidden', 'true');

            closeIconWrapper.appendChild(closeIcon);
            sidebarCloseButton.appendChild(closeIconWrapper);
            headerActions.appendChild(sidebarCloseButton);

            sidebarFrameContent.appendChild(sidebarHeader);

            const sidebarBody = document.createElement('div');
            //sidebarBody.classList.add('d-flex', 'flex-column', 'gap-3', 'flex-grow-1', 'p-3');
            sidebarBody.classList.add('d-flex', 'flex-column', 'gap-3', 'flex-grow-1');
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

        const sidebarCookie = Cookie.read('sidebar');
            const shouldShowSidebar = sidebarCookie == 1;
            this._handleSidebarStateChange(shouldShowSidebar, { persist: false });

            const handleSidebarShown = () => {
                syncSidebarOffset();
                this._handleSidebarStateChange(true);
            };

            const handleSidebarHidden = () => {
                syncSidebarOffset();
                this._handleSidebarStateChange(false);
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
        const editModeState = PageToolbar._resolveControlState(editModeControl);
        if (editBlocksButton && editModeState === 1) {
            editBlocksButton.disable();
        }
    }

    // Actions
    editMode() {
        const editModeControl = this.getControlById('editMode');
        const state = PageToolbar._resolveControlState(editModeControl);
        if (state === 0 || state === null) {
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
            const nextState = !isShown;
            this._handleSidebarStateChange(nextState, { persist: false });
            return nextState;
        }

        const html = (typeof document !== 'undefined') ? document.documentElement : null;
        const isSidebarVisible = html ? !PageToolbar._hasClass(html, 'e-has-sideframe') : false;
        this._handleSidebarStateChange(isSidebarVisible);
        return isSidebarVisible;
    }

    showTmplEditor() { ModalBox.open({ url: this.componentPath + 'template' }); }
    showTransEditor() { ModalBox.open({ url: this.componentPath + 'translation' }); }
    showUserEditor() { ModalBox.open({ url: this.componentPath + 'user' }); }
    showRoleEditor() { ModalBox.open({ url: this.componentPath + 'role' }); }
    showLangEditor() { ModalBox.open({ url: this.componentPath + 'languages' }); }
    showFileRepository() { ModalBox.open({ url: this.componentPath + 'file-library' }); }
    showSiteEditor() { ModalBox.open({ url: this.componentPath + 'sites' }); }

    destroy() {
        if (this._boundEditModeUnpressed) {
            window.removeEventListener('oneditmodeunpressed', this._boundEditModeUnpressed);
            this._boundEditModeUnpressed = null;
        }

        if (Array.isArray(this._sidebarEventHandlers) && this._sidebarEventHandlers.length) {
            this._sidebarEventHandlers.forEach(({ element, type, handler }) => {
                if (element && typeof element.removeEventListener === 'function') {
                    element.removeEventListener(type, handler);
                }
            });
            this._sidebarEventHandlers = [];
        }

        if (this.sidebarOffcanvas && typeof this.sidebarOffcanvas.dispose === 'function') {
            this.sidebarOffcanvas.dispose();
        }
        this.sidebarOffcanvas = null;

        if (Array.isArray(this._layoutCleanupFns) && this._layoutCleanupFns.length) {
            this._layoutCleanupFns.forEach(cleanup => {
                try {
                    if (typeof cleanup === 'function') {
                        cleanup();
                    }
                } catch (error) {
                    console.warn('[PageToolbar] Failed to execute cleanup callback', error);
                }
            });
            this._layoutCleanupFns = [];
        }
    }

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

    static _normalizeConstructorArgs(...args) {
        if (!args.length) {
            return {
                mode: 'legacy',
                element: null,
                toolbarName: '',
                componentPath: '',
                documentId: '',
                controls: [],
                descriptors: [],
                properties: {},
                componentRef: null,
                layout: {},
                shouldDock: true,
            };
        }

        if (args.length === 1 && args[0] && typeof args[0] === 'object' && !(args[0] instanceof HTMLElement) && args[0].element instanceof HTMLElement) {
            return PageToolbar._normalizeConstructorArgs(args[0].element, args[0]);
        }

        if (args[0] instanceof HTMLElement) {
            const rootElementRaw = args[0];
            const options = (args[1] && typeof args[1] === 'object' && !Array.isArray(args[1])) ? args[1] : {};
            const dataset = rootElementRaw.dataset || {};
            const toolbarElement = (options.toolbarElement instanceof HTMLElement && rootElementRaw.contains(options.toolbarElement))
                ? options.toolbarElement
                : (rootElementRaw.matches('[data-e-toolbar]')
                    ? rootElementRaw
                    : rootElementRaw.querySelector('[data-e-toolbar]'));
            const effectiveElement = toolbarElement || rootElementRaw;
            const toolbarDataset = effectiveElement.dataset || {};
            const layoutRootCandidate = PageToolbar._findDeclarativeRoot(rootElementRaw)
                || PageToolbar._findDeclarativeRoot(effectiveElement)
                || null;
            const rootDataset = layoutRootCandidate && layoutRootCandidate.dataset
                ? layoutRootCandidate.dataset
                : (options.rootDataset || {});
            const combinedDataset = Object.assign({}, rootDataset || {}, toolbarDataset || {}, dataset || {});
            const root = options.root instanceof HTMLElement
                ? options.root
                : layoutRootCandidate;
            const properties = Toolbar.extractPropertiesFromDataset(toolbarDataset, options.properties);

            const componentPath = PageToolbar._resolveDatasetValue(
                ['eComponentPath', 'eComponent', 'eComponentUrl', 'eComponentBase'],
                options,
                dataset,
                toolbarDataset,
                rootDataset,
                combinedDataset
            ) || '';
            const documentId = PageToolbar._resolveDatasetValue(
                ['eDocumentId', 'eDocId'],
                options,
                dataset,
                toolbarDataset,
                rootDataset,
                combinedDataset
            ) || '';
            const toolbarName = options.toolbarName
                || toolbarDataset.eToolbar
                || dataset.eToolbarName
                || dataset.ePageToolbar
                || rootDataset.eToolbarName
                || rootDataset.ePageToolbar
                || '';
            const componentRef = options.componentRef
                || toolbarDataset.eToolbarComponent
                || dataset.eToolbarComponent
                || rootDataset.eToolbarComponent
                || null;
            const descriptors = PageToolbar._extractDescriptorsFromElement(effectiveElement);
            const layout = {
                root: root || layoutRootCandidate || null,
                toolbarRoot: rootElementRaw,
                dataset: rootDataset,
                toolbarDataset,
                rootDataset,
                combinedDataset,
                sidebarTarget: PageToolbar._resolveDatasetValue(['eOffcanvasTarget', 'eSidebarTarget'], options, dataset, toolbarDataset, rootDataset, combinedDataset),
                sidebarId: PageToolbar._resolveDatasetValue(['eSidebarId', 'eOffcanvasId'], options, dataset, toolbarDataset, rootDataset, combinedDataset),
                sidebarUrl: PageToolbar._resolveDatasetValue(['eSidebarUrl'], options, dataset, toolbarDataset, rootDataset, combinedDataset),
            };

            return {
                mode: 'declarative',
                element: effectiveElement,
                toolbarName,
                componentPath,
                documentId,
                controls: [],
                descriptors,
                properties,
                componentRef,
                layout,
                shouldDock: false,
            };
        }

        const componentPath = typeof args[0] === 'string' ? args[0] : '';
        const documentId = typeof args[1] !== 'undefined' ? args[1] : '';
        const toolbarName = typeof args[2] === 'string' ? args[2] : '';
        const controls = Array.isArray(args[3]) ? args[3] : [];
        const props = (args[4] && typeof args[4] === 'object' && !Array.isArray(args[4])) ? args[4] : {};
        return {
            mode: 'legacy',
            element: null,
            toolbarName,
            componentPath,
            documentId,
            controls,
            descriptors: [],
            properties: props,
            componentRef: null,
            layout: {},
            shouldDock: true,
        };
    }

    static _extractDescriptorsFromElement(element) {
        if (!(element instanceof HTMLElement)) {
            return [];
        }
        return Array.from(element.children || [])
            .map(child => Toolbar.extractControlDescriptor(child))
            .filter(Boolean);
    }

    static _collectDatasetSources(instance) {
        const sources = [];
        const push = (source) => {
            if (source && typeof source === 'object') {
                sources.push(source);
            }
        };

        if (!instance || typeof instance !== 'object') {
            return sources;
        }

        const layoutConfig = instance._layoutConfig || {};
        push(layoutConfig.combinedDataset);
        push(layoutConfig.dataset);
        push(layoutConfig.rootDataset);
        push(layoutConfig.toolbarDataset);
        push(layoutConfig);

        const potentialElements = new Set();
        if (instance.layoutRoot instanceof HTMLElement) {
            potentialElements.add(instance.layoutRoot);
        }
        if (instance.toolbarRoot instanceof HTMLElement) {
            potentialElements.add(instance.toolbarRoot);
        }
        if (instance.element instanceof HTMLElement) {
            potentialElements.add(instance.element);
        }

        potentialElements.forEach(element => {
            if (element && element.dataset) {
                push(element.dataset);
            }
            if (element?.closest) {
                const carrier = element.closest('[data-e-component-path],[data-e-component],[data-e-document-id]');
                if (carrier && carrier.dataset) {
                    push(carrier.dataset);
                }
            }
        });

        if (typeof document !== 'undefined') {
            const toolbarName = instance?.name
                || instance?.element?.dataset?.eToolbar
                || instance?.element?.dataset?.eToolbarName
                || '';
            if (toolbarName) {
                const script = document.querySelector(`script[data-e-toolbar-name="${toolbarName}"]`);
                if (script && script.dataset) {
                    push(script.dataset);
                }
            }
        }

        return sources;
    }

    static _normalizeComponentPath(value) {
        if (typeof value === 'undefined' || value === null) {
            return '';
        }
        let candidate = String(value).trim();
        if (!candidate) {
            return '';
        }
        const anchorIndex = candidate.search(/[?#]/);
        if (anchorIndex === -1) {
            if (!candidate.endsWith('/')) {
                candidate = `${candidate}/`;
            }
            return candidate;
        }
        const base = candidate.slice(0, anchorIndex);
        const suffix = candidate.slice(anchorIndex);
        const normalizedBase = base.endsWith('/') ? base : `${base}/`;
        return `${normalizedBase}${suffix}`;
    }

    static _resolveDatasetValue(keys, ...sources) {
        if (!Array.isArray(keys)) {
            return '';
        }
        for (const source of sources) {
            if (!source || typeof source !== 'object') {
                continue;
            }
            for (const key of keys) {
                if (typeof key !== 'string' || !key) {
                    continue;
                }
                const value = source[key];
                if (typeof value !== 'undefined' && value !== null) {
                    const stringified = String(value);
                    if (stringified.trim().length) {
                        return value;
                    }
                }
            }
        }
        return '';
    }

    static _normalizeControlStateValue(value) {
        if (typeof value === 'undefined' || value === null) {
            return null;
        }
        if (typeof value === 'boolean') {
            return value ? 1 : 0;
        }
        if (typeof value === 'number') {
            return value ? 1 : 0;
        }
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed.length) {
                return null;
            }
            if (/^-?\d+$/.test(trimmed)) {
                return parseInt(trimmed, 10) ? 1 : 0;
            }
            return Toolbar.normalizeBoolean(trimmed) ? 1 : 0;
        }
        return null;
    }

    static _resolveControlState(control) {
        if (!control || typeof control !== 'object') {
            return null;
        }

        if (typeof control.getState === 'function') {
            try {
                const value = control.getState();
                const normalized = PageToolbar._normalizeControlStateValue(value);
                if (normalized !== null) {
                    return normalized;
                }
            } catch (error) {
                // ignore state read errors and try fallbacks
            }
        }

        if (control.properties && Object.prototype.hasOwnProperty.call(control.properties, 'state')) {
            const normalized = PageToolbar._normalizeControlStateValue(control.properties.state);
            if (normalized !== null) {
                return normalized;
            }
        }

        const element = control.element instanceof HTMLElement ? control.element : null;
        if (element) {
            const datasetState = element.dataset ? element.dataset.state : undefined;
            const normalizedDatasetState = PageToolbar._normalizeControlStateValue(datasetState);
            if (normalizedDatasetState !== null) {
                return normalizedDatasetState;
            }

            if (typeof element.getAttribute === 'function') {
                const ariaPressed = element.getAttribute('aria-pressed');
                if (ariaPressed !== null) {
                    return ariaPressed === 'true' ? 1 : 0;
                }
            }

            if (element.classList && (element.classList.contains('active') || element.classList.contains('pressed'))) {
                return 1;
            }
        }

        return null;
    }

    static _findDeclarativeRoot(element) {
        if (!(element instanceof HTMLElement)) {
            return null;
        }
        if (element.dataset?.eToolbarName
            || element.dataset?.eToolbarScope === 'page'
            || element.matches?.('[data-role="page-toolbar-root"]')) {
            return element;
        }
        return element.closest('[data-e-toolbar-name],[data-e-toolbar-scope="page"],[data-role="page-toolbar-root"]')
            || element.closest('.e-topframe')
            || null;
    }

    static _normalizeSelector(value, fallbackId = '') {
        let candidate = value || fallbackId || '';
        if (!candidate) {
            return '';
        }
        candidate = String(candidate).trim();
        if (!candidate) {
            return '';
        }
        if (candidate.startsWith('#') || candidate.startsWith('.') || candidate.startsWith('[')) {
            return candidate;
        }
        return `#${candidate}`;
    }

    static _parseSidebarState(value) {
        if (typeof value === 'undefined' || value === null) {
            return null;
        }
        if (typeof value === 'number') {
            if (value === 1) return true;
            if (value === 0) return false;
        }
        const normalized = String(value).trim().toLowerCase();
        if (!normalized) {
            return null;
        }
        if (['1', 'true', 'yes', 'on', 'open', 'opened', 'show', 'shown', 'expand', 'expanded'].includes(normalized)) {
            return true;
        }
        if (['0', 'false', 'no', 'off', 'close', 'closed', 'hidden', 'hide', 'collapsed', 'collapse'].includes(normalized)) {
            return false;
        }
        return null;
    }

    static _collectSidebarToggleButtons(root, sidebarFrame, selector = '') {
        const collection = new Set();
        if (root && typeof root.querySelectorAll === 'function') {
            const baseSelectors = [
                '[data-role="sidebar-toggle"]',
                '[data-sidebar-toggle]',
                '[data-action="toggleSidebar"]',
                '[data-action="toggleSidebar()"]',
                '[data-action*="toggleSidebar"]',
            ];
            baseSelectors.forEach(sel => {
                root.querySelectorAll(sel).forEach(node => { if (node instanceof HTMLElement) collection.add(node); });
            });
        }

        const normalizedSelector = selector ? PageToolbar._normalizeSelector(selector) : '';
        if (normalizedSelector && root && typeof root.querySelectorAll === 'function') {
            root.querySelectorAll(`[data-bs-target="${normalizedSelector}"]`).forEach(node => { if (node instanceof HTMLElement) collection.add(node); });
            if (normalizedSelector.startsWith('#')) {
                root.querySelectorAll(`a[href="${normalizedSelector}"]`).forEach(node => { if (node instanceof HTMLElement) collection.add(node); });
                root.querySelectorAll(`button[href="${normalizedSelector}"]`).forEach(node => { if (node instanceof HTMLElement) collection.add(node); });
            }
        }

        if (sidebarFrame?.id && root && typeof root.querySelectorAll === 'function') {
            const idSelector = `#${sidebarFrame.id}`;
            root.querySelectorAll(`[data-bs-target="${idSelector}"]`).forEach(node => { if (node instanceof HTMLElement) collection.add(node); });
            root.querySelectorAll(`[aria-controls="${sidebarFrame.id}"]`).forEach(node => { if (node instanceof HTMLElement) collection.add(node); });
        }

        return Array.from(collection);
    }

    // Вложенный контрол логотипа (если нужно)
    static Logo = class extends Toolbar.Control {};

    static _syncSidebarGeometry(sidebarFrame, anchorElement = null, zIndex = SIDEBAR_OFFCANVAS_Z_INDEX) {
        if (!(sidebarFrame instanceof HTMLElement)) {
            return;
        }

        if (typeof zIndex === 'number' || (typeof zIndex === 'string' && zIndex.trim().length)) {
            const normalizedZIndex = `${zIndex}`;
            try {
                sidebarFrame.style.setProperty('--bs-offcanvas-zindex', normalizedZIndex);
            } catch (error) {
                // ignore CSS variable assignment failures
            }
            sidebarFrame.style.zIndex = normalizedZIndex;
        }

        const anchor = anchorElement instanceof HTMLElement ? anchorElement : null;
        const navHeight = anchor ? Math.max(0, Math.round(anchor.getBoundingClientRect().height || 0)) : 0;
        sidebarFrame.style.top = navHeight ? `${navHeight}px` : '0';
        sidebarFrame.style.height = navHeight ? `calc(100vh - ${navHeight}px)` : '100vh';
        if (sidebarFrame.style.bottom) {
            sidebarFrame.style.bottom = 'auto';
        }
    }

    _registerLayoutCleanup(callback) {
        if (typeof callback === 'function') {
            this._layoutCleanupFns.push(callback);
        }
    }

    _handleEditModeUnpressed() {
        const editor = window.nrgPageEditor;
        const translationSource = Energine?.translations;
        const confirmMessage = translationSource && typeof translationSource.get === 'function'
            ? translationSource.get('TXT_ARE_YOU_SURE_SAVE')
            : undefined;

        if (editor) {
            if (confirm(confirmMessage)) {
                if (Array.isArray(editor.editors) && editor.editors.length) {
                    editor.editors.forEach(item => {
                        try {
                            if (item && typeof item.save === 'function') {
                                item.save.call(item, false);
                            }
                        } catch (error) {
                            console.warn('[PageToolbar] Failed to save editor state', error);
                        }
                    });
                }
                setTimeout(() => {
                    try {
                        window.location.href = window.location.href;
                    } catch (error) {
                        window.location.reload();
                    }
                }, 1000);
            } else {
                window.location = window.location;
            }
        } else {
            window.location = window.location;
        }
    }
}

export { PageToolbar };
export default PageToolbar;
try {
    if (typeof registerEnergineBehavior === 'function') {
        registerEnergineBehavior('PageToolbar', PageToolbar);
    }
} catch (error) {
    if (Energine && typeof Energine.safeConsoleError === 'function') {
        Energine.safeConsoleError(error, '[PageToolbar] Failed to register behavior');
    } else if (typeof console !== 'undefined' && console.warn) {
        console.warn('[PageToolbar] Failed to register behavior', error);
    }
}
