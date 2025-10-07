const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

const topWindow = globalScope?.top || globalScope;

function ensureComputedSize(targetWindow = topWindow || globalScope) {
    if (!targetWindow || !targetWindow.Element) {
        return;
    }

    const { Element } = targetWindow;

    if (typeof Element.prototype.getComputedSize === 'function') {
        return;
    }

    const toNumber = (value) => {
        const parsed = parseFloat(value);
        return Number.isNaN(parsed) ? 0 : parsed;
    };

    Element.prototype.getComputedSize = function getComputedSize() {
        const style = targetWindow.getComputedStyle(this);
        const rect = this.getBoundingClientRect();

        const paddingLeft = toNumber(style.paddingLeft);
        const paddingRight = toNumber(style.paddingRight);
        const paddingTop = toNumber(style.paddingTop);
        const paddingBottom = toNumber(style.paddingBottom);

        const borderLeft = toNumber(style.borderLeftWidth);
        const borderRight = toNumber(style.borderRightWidth);
        const borderTop = toNumber(style.borderTopWidth);
        const borderBottom = toNumber(style.borderBottomWidth);

        const marginLeft = toNumber(style.marginLeft);
        const marginRight = toNumber(style.marginRight);
        const marginTop = toNumber(style.marginTop);
        const marginBottom = toNumber(style.marginBottom);

        let width = rect.width - paddingLeft - paddingRight - borderLeft - borderRight;
        let height = rect.height - paddingTop - paddingBottom - borderTop - borderBottom;

        if (width < 0) {
            width = 0;
        }

        if (height < 0) {
            height = 0;
        }

        const computedWidth = toNumber(style.width);
        const computedHeight = toNumber(style.height);

        return {
            width,
            height,
            computedWidth: computedWidth || rect.width,
            computedHeight: computedHeight || rect.height,
            totalWidth: rect.width + marginLeft + marginRight,
            totalHeight: rect.height + marginTop + marginBottom,
        };
    };
}

ensureComputedSize(topWindow || globalScope);

class ModalBoxClass {
    constructor(hostWindow = topWindow || globalScope) {
        this.window = hostWindow;
        this.document = hostWindow?.document || null;
        this.boxes = [];
        this.initialized = false;
    }

    init() {
        if (!this.document || this.initialized) {
            return;
        }
        this.initialized = true;
    }

    _getFocusableElements(container) {
        if (!container || !this.window) {
            return [];
        }

        const HTMLElementCtor = this.window.HTMLElement;

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
                if (!HTMLElementCtor || !(el instanceof HTMLElementCtor)) {
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
        if (!instance || instance.isClosing || !this.document) {
            return;
        }

        instance.isClosing = true;

        if (returnValue !== undefined) {
            instance.returnValue = returnValue;
        }

        this.document.removeEventListener('keydown', instance.escHandler);
        this.document.removeEventListener('focusin', instance.focusInHandler, true);

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

        if (this.document.body) {
            this.document.body.style.overflow = 'auto';
        }

        (this.window?.setTimeout || setTimeout)(() => {
            instance.modal.remove();

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

        if (!this.document || !this.window) {
            throw new Error('ModalBox.open: host window is not available');
        }

        const previousActiveElement = this.document.activeElement instanceof this.window.HTMLElement
            ? this.document.activeElement
            : null;

        // Создаем backdrop (оверлей MDB)
        const backdrop = this.document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        // z-index выше для вложенных модалов
        backdrop.style.zIndex = 1040 + this.boxes.length * 10;
        if (!this.document.body) {
            throw new Error('ModalBox.open: document body is not available');
        }
        this.document.body.appendChild(backdrop);

        // Создаем модал
        const modal = this.document.createElement('div');
        modal.className = 'modal top show';
        modal.style.display = 'block';
        modal.tabIndex = -1;
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-hidden', 'false');
        if (this.document.body) {
            this.document.body.style.overflow = 'hidden';
        }
        modal.style.zIndex = 1050 + this.boxes.length * 10;
        modal.innerHTML = `
          <div class="modal-dialog modal-fullscreen">
            <div class="modal-content h-100" style="position:relative;display:flex;flex-direction:column;">
              <div class="modal-header border-0 justify-content-end align-items-start" style="flex:0 0 auto;">
                <button type="button" class="btn-close" aria-label="Close"></button>
              </div>
              <div class="modal-body p-0 d-flex flex-column" style="min-width:300px;flex:1 1 auto;min-height:0;">
              </div>
            </div>
          </div>
        `;

        const modalBody = modal.querySelector('.modal-body');
        this._showLoader(modalBody);

        const iframe = this.document.createElement('iframe');
        iframe.src = options.url;
        iframe.width = '100%';
        iframe.height = options.height || '100%';
        iframe.style.border = 'none';
        iframe.style.display = 'block';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.position = 'relative';
        iframe.tabIndex = 0;
        modalBody.appendChild(iframe);

        iframe.onload = () => {
            this._hideLoader(modalBody);

            try {
                const doc = iframe.contentDocument || iframe.contentWindow?.document;
                if (!doc) {
                    return;
                }

                const styleId = 'modalbox-singlemode-style';
                if (doc.getElementById(styleId)) {
                    return;
                }

                const style = doc.createElement('style');
                style.id = styleId;
                style.textContent = `
                    html, body {
                        height: 100%;
                    }

                    body.e-singlemode-layout {
                        display: flex;
                        flex-direction: column;
                        min-height: 100%;
                    }

                    body.e-singlemode-layout form.e-grid-form,
                    body.e-singlemode-layout form[data-role="grid-form"] {
                        flex: 1 1 auto;
                        display: flex;
                        flex-direction: column;
                        min-height: 0;
                    }

                    body.e-singlemode-layout form.e-grid-form > [data-role="pane"],
                    body.e-singlemode-layout form[data-role="grid-form"] > [data-role="pane"] {
                        flex: 1 1 auto;
                        min-height: 0;
                        display: flex;
                        flex-direction: column;
                    }

                    body.e-singlemode-layout [data-pane-part="body"] {
                        flex: 1 1 auto;
                        min-height: 0;
                        display: flex;
                        flex-direction: column;
                    }

                    body.e-singlemode-layout [data-role="tab-content"] {
                        flex: 1 1 auto;
                        min-height: 0;
                        display: flex;
                        flex-direction: column;
                    }

                    body.e-singlemode-layout .tab-content > .tab-pane {
                        flex: 1 1 auto;
                        min-height: 0;
                        overflow: auto;
                    }

                    body.e-singlemode-layout [data-pane-part="footer"] {
                        flex-shrink: 0;
                        margin-top: auto;
                    }
                `;

                doc.head.appendChild(style);

                ensureComputedSize(doc.defaultView || iframe.contentWindow);
            } catch (e) {
                // ignore cross-origin errors
            }
        };

        this.document.body.appendChild(modal);

        const instance = {
            modal,
            backdrop,
            options,
            previousActiveElement,
            returnValue: undefined,
            isClosing: false,
        };

        const closeModal = (returnValue) => {
            this._closeInstance(instance, returnValue);
        };
        instance.close = closeModal;

        // Закрытие
        // Кнопка закрытия (крестик)
        const btnClose = modal.querySelector('.btn-close');
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
                if (this.document.activeElement === firstElement || !modal.contains(this.document.activeElement)) {
                    event.preventDefault();
                    lastElement.focus();
                }
            } else if (this.document.activeElement === lastElement) {
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
        this.document.addEventListener('focusin', focusInHandler, true);

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
        this.document.addEventListener('keydown', escHandler);

        // В стек (для модал в модале)
        this.boxes.push(instance);

        const focusable = this._getFocusableElements(modal);
        const initialFocusTarget = focusable[0] || modal;
        (this.window?.setTimeout || setTimeout)(() => {
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

    _showLoader(container) {
        if (!container) {
            return;
        }

        const loaderFn = this.window && typeof this.window.showLoader === 'function'
            ? this.window.showLoader
            : null;

        if (loaderFn) {
            loaderFn.call(this.window, container);
            return;
        }

        if (!this.document) {
            return;
        }

        if (!container.querySelector('.global-loader')) {
            const loader = this.document.createElement('div');
            loader.className = 'global-loader d-flex justify-content-center align-items-center position-absolute top-0 start-0 w-100 h-100 bg-white bg-opacity-75';
            loader.style.zIndex = 9999;
            loader.innerHTML = `
                <div class="spinner-border text-primary" role="status" style="width:3rem; height:3rem;">
                    <span class="visually-hidden">Loading...</span>
                </div>
            `;

            const style = this.window?.getComputedStyle ? this.window.getComputedStyle(container) : null;
            if (style && (style.position === 'static' || !style.position)) {
                container.style.position = 'relative';
            }

            container.appendChild(loader);
        }
    }

    _hideLoader(container) {
        if (!container) {
            return;
        }

        const loaderFn = this.window && typeof this.window.hideLoader === 'function'
            ? this.window.hideLoader
            : null;

        if (loaderFn) {
            loaderFn.call(this.window, container);
            return;
        }

        const loader = container.querySelector('.global-loader');
        if (loader) {
            loader.remove();
        }
    }
}

const modalHostWindow = topWindow || globalScope;
const MODAL_BOX_SINGLETON_KEY = '__energineModalBox__';

const existingModalBox = modalHostWindow && modalHostWindow.ModalBox
    ? modalHostWindow.ModalBox
    : null;

const isCompatibleModal = (instance) => (
    !!instance
    && typeof instance === 'object'
    && typeof instance.open === 'function'
    && typeof instance.close === 'function'
    && typeof instance.getCurrent === 'function'
    && instance.window === modalHostWindow
);

const ModalBox = isCompatibleModal(existingModalBox)
    ? existingModalBox
    : new ModalBoxClass(modalHostWindow);

ModalBox[MODAL_BOX_SINGLETON_KEY] = true;

if (modalHostWindow && modalHostWindow.ModalBox !== ModalBox) {
    modalHostWindow.ModalBox = ModalBox;
}

if (globalScope && globalScope !== modalHostWindow) {
    globalScope.ModalBox = ModalBox;
}

// DOM ready init
if (ModalBox.document && !ModalBox.initialized) {
    if (ModalBox.document.readyState === 'loading') {
        ModalBox.document.addEventListener('DOMContentLoaded', () => ModalBox.init());
    } else {
        ModalBox.init();
    }
}

export { ModalBoxClass, ModalBox };
export default ModalBox;

export function attachToWindow(target = topWindow) {
    if (!target) {
        return ModalBox;
    }

    target.ModalBox = ModalBox;
    return ModalBox;
}

attachToWindow();
