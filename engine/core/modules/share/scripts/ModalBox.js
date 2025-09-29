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

        document.body.style.overflow = 'auto';

        setTimeout(() => {
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

        const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

        // Создаем backdrop (оверлей MDB)
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        // z-index выше для вложенных модалов
        backdrop.style.zIndex = 1040 + this.boxes.length * 10;
        document.body.appendChild(backdrop);

        // Создаем модал
        const modal = document.createElement('div');
        modal.className = 'modal top show';
        modal.style.display = 'block';
        modal.tabIndex = -1;
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        modal.style.zIndex = 1050 + this.boxes.length * 10;
        modal.innerHTML = `
          <div class="modal-dialog modal-fullscreen">
            <div class="modal-content" style="position:relative;height:100vh;">
              <button type="button" class="btn-close position-absolute end-0 m-2" aria-label="Close" style="z-index:2"></button>
                <div class="modal-body p-0" style="min-width:300px;">
                </div>      
            </div>
          </div>
        `;

        const modalBody = modal.querySelector('.modal-body');
        showLoader(modalBody);

        const iframe = document.createElement('iframe');
        iframe.src = options.url;
        iframe.width = '100%';
        iframe.height = options.height || '100%';
        iframe.style.border = 'none';
        iframe.style.display = 'block';
        iframe.style.width = '100%';
        iframe.style.height = '100vh';
        iframe.style.position = 'relative';
        iframe.tabIndex = 0;
        modalBody.appendChild(iframe);

        iframe.onload = () => {
            hideLoader(modalBody);
        };

        document.body.appendChild(modal);

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
