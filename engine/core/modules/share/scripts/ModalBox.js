class ModalBoxClass {
    constructor() {
        this.boxes = [];
        this.initialized = false;
    }

    init() {
        this.initialized = true;
    }

    _getFocusableElements(container) {
        if (!container) {
            return [];
        }

        const selectors = [
            'a[href]',
            'area[href]',
            'input:not([disabled]):not([type="hidden"])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            'button:not([disabled])',
            'iframe',
            'object',
            'embed',
            '[contenteditable="true"]',
            '[tabindex]:not([tabindex="-1"])',
        ];

        return Array.from(container.querySelectorAll(selectors.join(',')))
            .filter((el) => {
                if (!(el instanceof HTMLElement)) {
                    return false;
                }

                if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') {
                    return false;
                }

                if (el.tabIndex === -1) {
                    return false;
                }

                if (el.hasAttribute('hidden')) {
                    return false;
                }

                return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
            });
    }

    _closeInstance(instance, returnValue) {
        if (!instance || instance.isClosing) {
            return;
        }

        instance.isClosing = true;

        if (typeof instance.gridCleanup === 'function') {
            try {
                instance.gridCleanup();
            } catch (err) {
                // ignore cleanup failures
            }
        }

        if (returnValue !== undefined) {
            instance.returnValue = returnValue;
        }

        document.removeEventListener('keydown', instance.escHandler);
        document.removeEventListener('focusin', instance.focusInHandler, true);

        if (instance.focusTrapHandler) {
            instance.modal.removeEventListener('keydown', instance.focusTrapHandler);
        }

        if (instance.focusPropagationHandler) {
            instance.modal.removeEventListener('focusin', instance.focusPropagationHandler);
        }

        if (instance.backdropHandler) {
            instance.backdrop.removeEventListener('click', instance.backdropHandler);
        }

        const index = this.boxes.indexOf(instance);
        if (index !== -1) {
            this.boxes.splice(index, 1);
        }

        instance.modal.classList.remove('show');
        instance.modal.style.display = 'none';
        instance.modal.setAttribute('aria-hidden', 'true');
        instance.backdrop.remove();

        setTimeout(() => {
            instance.modal.remove();

            if (!this.boxes.length) {
                document.body.classList.remove('modal-open');
                document.body.style.removeProperty('paddingRight');
            }

            if (typeof instance.options.onClose === 'function') {
                instance.options.onClose(instance.returnValue);
            }

            const { previousActiveElement } = instance;
            if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
                try {
                    previousActiveElement.focus();
                } catch (err) {
                    // ignore
                }
            }
        }, 150);
    }

    /**
     * Открыть модальное окно с iframe
     * @param {Object} options
     *  options.url - src для iframe (обязательно)
     *  options.onClose - callback при закрытии
     *  options.height - необязательно, высота iframe (px или %, по умолчанию 400px)
     */
    open(options = {}) {
        if (!options.url) {
            throw new Error('ModalBox.open: required parameter "url" missing');
        }

        const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

        // Создаем backdrop (оверлей MDB)
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        // z-index выше для вложенных модалов
        backdrop.style.zIndex = 1040 + this.boxes.length * 10;
        document.body.appendChild(backdrop);

        // Создаем модал
        const modal = document.createElement('div');
        modal.className = 'modal fade show';
        modal.style.display = 'block';
        modal.tabIndex = -1;
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-hidden', 'false');
        modal.style.zIndex = 1050 + this.boxes.length * 10;

        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog modal-fullscreen';
        if (options.dialogClass) {
            dialog.className += ` ${options.dialogClass}`;
        }

        const content = document.createElement('div');
        content.className = 'modal-content h-100 border-0 rounded-0 d-flex flex-column';

        const header = document.createElement('div');
        header.className = 'modal-header';

        const shouldRenderTitle = Boolean(options.title);
        let titleId = null;

        if (shouldRenderTitle) {
            const title = document.createElement('h5');
            title.className = 'modal-title';
            title.textContent = options.title;
            titleId = `modalbox-title-${Date.now()}-${Math.random().toString(16).slice(2)}`;
            title.id = titleId;
            header.appendChild(title);
            modal.setAttribute('aria-labelledby', titleId);
        } else if (options.ariaLabel) {
            modal.setAttribute('aria-label', options.ariaLabel);
        } else {
            header.classList.add('border-0', 'pb-0');
            modal.setAttribute('aria-label', 'Modal dialog');
        }

        const btnClose = document.createElement('button');
        btnClose.type = 'button';
        btnClose.className = 'btn-close';
        btnClose.setAttribute('aria-label', 'Close');
        if (!shouldRenderTitle) {
            btnClose.classList.add('ms-auto');
        }
        header.appendChild(btnClose);

        const body = document.createElement('div');
        body.className = 'modal-body p-0 flex-grow-1 d-flex';

        content.appendChild(header);
        content.appendChild(body);
        dialog.appendChild(content);
        modal.appendChild(dialog);

        const modalBody = body;
        showLoader(modalBody);

        const iframe = document.createElement('iframe');
        iframe.src = options.url;
        iframe.width = '100%';
        const iframeHeight = options.height || '100%';
        iframe.height = iframeHeight;
        iframe.style.border = '0';
        iframe.style.display = 'block';
        iframe.style.width = '100%';
        iframe.style.height = iframeHeight;
        iframe.style.minHeight = iframeHeight;
        iframe.style.flex = '1 1 auto';
        iframe.loading = 'lazy';
        iframe.tabIndex = 0;
        modalBody.appendChild(iframe);

        const shouldEnhanceGrid = this._shouldEnhanceGridLayout(options);

        iframe.onload = () => {
            hideLoader(modalBody);

            if (shouldEnhanceGrid) {
                this._enhanceGridLayout(iframe, instance, options.gridLayout || {});
            }
        };

        document.body.appendChild(modal);

        if (!this.boxes.length) {
            document.body.classList.add('modal-open');
        }

        const instance = {
            modal,
            backdrop,
            options,
            previousActiveElement,
            returnValue: undefined,
            isClosing: false,
            gridCleanup: null,
        };

        const closeModal = (returnValue) => {
            this._closeInstance(instance, returnValue);
        };
        instance.close = closeModal;

        // Закрытие
        // Кнопка закрытия (крестик)
        btnClose.addEventListener('click', () => closeModal());

        const backdropHandler = () => {
            if (this.getCurrent() === instance) {
                closeModal();
            }
        };
        instance.backdropHandler = backdropHandler;
        backdrop.addEventListener('click', backdropHandler);

        const focusTrapHandler = (event) => {
            if (event.key !== 'Tab' || this.getCurrent() !== instance) {
                return;
            }

            const focusable = this._getFocusableElements(modal);
            if (!focusable.length) {
                event.preventDefault();
                modal.focus();
                return;
            }

            const firstElement = focusable[0];
            const lastElement = focusable[focusable.length - 1];

            if (event.shiftKey) {
                if (document.activeElement === firstElement || !modal.contains(document.activeElement)) {
                    event.preventDefault();
                    lastElement.focus();
                }
            } else if (document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        };
        instance.focusTrapHandler = focusTrapHandler;
        modal.addEventListener('keydown', focusTrapHandler);

        const stopFocusPropagationHandler = (event) => {
            if (this.getCurrent() !== instance) {
                return;
            }

            event.stopPropagation();
        };
        instance.focusPropagationHandler = stopFocusPropagationHandler;
        modal.addEventListener('focusin', stopFocusPropagationHandler);

        const focusInHandler = (event) => {
            if (this.getCurrent() !== instance) {
                return;
            }

            if (!modal.contains(event.target)) {
                if (typeof event.stopImmediatePropagation === 'function') {
                    event.stopImmediatePropagation();
                }

                const focusable = this._getFocusableElements(modal);
                const fallback = focusable[0] || modal;
                fallback.focus();
            }
        };
        instance.focusInHandler = focusInHandler;
        document.addEventListener('focusin', focusInHandler, true);

        // ESC
        const escHandler = (e) => {
            if (this.getCurrent() !== instance) {
                return;
            }

            if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
                e.preventDefault();
                closeModal();
            }
        };
        instance.escHandler = escHandler;
        document.addEventListener('keydown', escHandler);

        // В стек (для модал в модале)
        this.boxes.push(instance);

        const focusable = this._getFocusableElements(modal);
        const initialFocusTarget = focusable[0] || modal;
        setTimeout(() => {
            initialFocusTarget.focus();
        }, 10);
    }

    // Получить текущий (верхний) модал
    getCurrent() {
        if (!this.boxes.length) return null;
        return this.boxes[this.boxes.length - 1];
    }

    getExtraData() {
        const cur = this.getCurrent();
        return cur ? cur.options.extraData : undefined;
    }

    // Закрыть последний модал
    setReturnValue(value) {
        const cur = this.getCurrent();
        if (cur) cur.returnValue = value;
    }

    close(returnValue) {
        this._closeInstance(this.getCurrent(), returnValue);
    }

    _shouldEnhanceGridLayout(options) {
        if (!options || !options.url) {
            return false;
        }

        if (typeof options.forceGridLayout === 'boolean') {
            return options.forceGridLayout;
        }

        if (typeof options.enableGridLayout === 'boolean') {
            return options.enableGridLayout;
        }

        try {
            const parsedUrl = new URL(options.url, window.location.href);
            const combined = `${parsedUrl.pathname} ${parsedUrl.search}`.toLowerCase();
            if (combined.includes('component=grid')) {
                return true;
            }

            if (/\bgrid\b/.test(parsedUrl.pathname.toLowerCase())) {
                return true;
            }

            for (const value of parsedUrl.searchParams.values()) {
                if (typeof value === 'string' && value.toLowerCase().includes('grid')) {
                    return true;
                }
            }

            return false;
        } catch (err) {
            return /grid/i.test(String(options.url));
        }
    }

    _enhanceGridLayout(iframe, instance, layoutOptions = {}) {
        if (!iframe) {
            return;
        }

        if (instance && typeof instance.gridCleanup === 'function') {
            try {
                instance.gridCleanup();
            } catch (err) {
                // ignore existing cleanup errors
            }
        }

        const applyLayout = () => {
            let doc;

            try {
                doc = iframe.contentDocument || iframe.contentWindow?.document;
            } catch (err) {
                return;
            }

            if (!doc || !doc.body) {
                return;
            }

            const html = doc.documentElement;
            if (html) {
                html.classList.add('modalbox-grid-html');
                html.style.height = '100%';
            }

            const body = doc.body;
            body.classList.add('modalbox-grid-body');
            body.style.height = '100%';
            body.style.minHeight = '100%';
            body.style.display = 'flex';
            body.style.flexDirection = 'column';
            body.style.overflow = 'hidden';

            const gridRootSelectors = [];
            if (layoutOptions.rootSelector) {
                gridRootSelectors.push(layoutOptions.rootSelector);
            }
            gridRootSelectors.push(
                '[data-module="grid"]',
                '[data-component="grid"]',
                '[data-role="grid"]',
                '.grid',
                '.grid-component',
                '.grid-container',
                '.c-grid',
                '.admin-grid'
            );

            let gridRoot = null;
            for (const selector of gridRootSelectors) {
                if (!selector) {
                    continue;
                }

                const candidate = body.querySelector(selector);
                if (candidate) {
                    gridRoot = candidate;
                    break;
                }
            }

            if (!gridRoot && body.children.length === 1) {
                gridRoot = body.children[0];
            }

            if (!gridRoot) {
                return;
            }

            gridRoot.classList.add('modalbox-grid-root');
            gridRoot.style.display = 'flex';
            gridRoot.style.flexDirection = 'column';
            gridRoot.style.flex = '1 1 auto';
            gridRoot.style.minHeight = '0';

            const toolbarSelectors = [];
            if (layoutOptions.toolbarSelector) {
                toolbarSelectors.push(layoutOptions.toolbarSelector);
            }
            toolbarSelectors.push('.toolbar', '.grid-toolbar', '.btn-toolbar', '[data-role="toolbar"]');

            let toolbar = null;
            for (const selector of toolbarSelectors) {
                if (!selector) {
                    continue;
                }

                const candidate = gridRoot.querySelector(selector);
                if (candidate) {
                    toolbar = candidate;
                    break;
                }
            }

            if (toolbar) {
                toolbar.classList.add('modalbox-grid-toolbar');
                toolbar.style.flex = '0 0 auto';
                toolbar.style.marginTop = 'auto';
            }

            const tabsSelectors = [];
            if (layoutOptions.tabsSelector) {
                tabsSelectors.push(layoutOptions.tabsSelector);
            }
            tabsSelectors.push('.tabset', '.nav-tabs', '[role="tablist"]');

            const tabs = tabsSelectors
                .map((selector) => selector && gridRoot.querySelector(selector))
                .find(Boolean);

            if (tabs) {
                tabs.classList.add('modalbox-grid-tabs');
                tabs.style.flex = '0 0 auto';
            }

            const scrollSelectors = [];
            if (layoutOptions.scrollSelector) {
                scrollSelectors.push(layoutOptions.scrollSelector);
            }
            scrollSelectors.push(
                '.grid-body',
                '.grid-content',
                '.grid-data',
                '.grid-table',
                '.table-responsive',
                '.table-wrapper',
                '.dataTables_wrapper',
                '.data-grid'
            );

            let scrollContainer = null;
            for (const selector of scrollSelectors) {
                if (!selector) {
                    continue;
                }

                const candidate = gridRoot.querySelector(selector);
                if (candidate) {
                    scrollContainer = candidate;
                    break;
                }
            }

            if (!scrollContainer) {
                const firstTable = gridRoot.querySelector('table');
                if (firstTable) {
                    scrollContainer = firstTable.closest('.table-responsive') || firstTable.parentElement;
                }
            }

            if (!scrollContainer) {
                const children = Array.from(gridRoot.children).filter((child) => child !== toolbar && child !== tabs);
                if (children.length) {
                    scrollContainer = children[children.length > 1 ? 1 : 0];
                }
            }

            if (scrollContainer) {
                scrollContainer.classList.add('modalbox-grid-scroll');
                scrollContainer.style.flex = '1 1 auto';
                scrollContainer.style.minHeight = '0';
                if (!scrollContainer.style.overflowY) {
                    scrollContainer.style.overflowY = 'auto';
                }
                if (!scrollContainer.style.overflowX) {
                    scrollContainer.style.overflowX = 'auto';
                }
            }

            const styleId = 'modalbox-grid-style';
            if (!doc.getElementById(styleId)) {
                const styleTag = doc.createElement('style');
                styleTag.id = styleId;
                styleTag.textContent = `
                    html.modalbox-grid-html,
                    body.modalbox-grid-body {
                        height: 100%;
                    }

                    body.modalbox-grid-body {
                        gap: 0;
                        background-color: inherit;
                    }

                    .modalbox-grid-root {
                        gap: 0.75rem;
                    }

                    .modalbox-grid-root .modalbox-grid-scroll {
                        flex: 1 1 auto;
                        min-height: 0;
                    }

                    .modalbox-grid-toolbar {
                        padding-top: 0.75rem;
                    }
                `;
                doc.head.appendChild(styleTag);
            }
        };

        let layoutTimer = null;

        const debouncedApply = () => {
            if (layoutTimer) {
                clearTimeout(layoutTimer);
            }

            layoutTimer = setTimeout(() => {
                layoutTimer = null;
                applyLayout();
            }, 20);
        };

        applyLayout();

        let observer;
        try {
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            if (doc && doc.body) {
                observer = new MutationObserver(() => {
                    debouncedApply();
                });
                observer.observe(doc.body, { childList: true, subtree: true });
            }
        } catch (err) {
            observer = null;
        }

        let resizeHandler = null;
        if (iframe.contentWindow && typeof iframe.contentWindow.addEventListener === 'function') {
            resizeHandler = () => {
                debouncedApply();
            };
            iframe.contentWindow.addEventListener('resize', resizeHandler);
        }

        instance.gridCleanup = () => {
            if (observer) {
                observer.disconnect();
            }

            if (resizeHandler && iframe.contentWindow) {
                iframe.contentWindow.removeEventListener('resize', resizeHandler);
            }

            if (layoutTimer) {
                clearTimeout(layoutTimer);
                layoutTimer = null;
            }
        };
    }
}

// Singleton-глобал (window.top — если есть)
const ModalBox = window.top.ModalBox || new ModalBoxClass();
window.top.ModalBox = ModalBox;

// DOM ready init
if (!ModalBox.initialized) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => ModalBox.init());
    } else {
        ModalBox.init();
    }
}
