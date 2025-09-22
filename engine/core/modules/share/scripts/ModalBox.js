class ModalBoxClass {
    constructor() {
        this.boxes = [];
        this.initialized = false;
    }

    init() {
        this.initialized = true;
    }

    _createModalMarkup() {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.tabIndex = -1;
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML = `
            <div class="modal-dialog modal-fullscreen">
                <div class="modal-content position-relative" style="min-height:100vh;">
                    <button type="button" class="btn-close position-absolute end-0 m-2" data-role="close" aria-label="Close"></button>
                    <div class="modal-body p-0" style="min-width:300px;"></div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const modalBody = modal.querySelector('.modal-body');
        const closeButton = modal.querySelector('[data-role="close"]');

        return { modal, modalBody, closeButton };
    }

    _destroyInstance(instance) {
        if (!instance || instance.isDestroyed) {
            return;
        }

        instance.isDestroyed = true;

        const index = this.boxes.indexOf(instance);
        if (index !== -1) {
            this.boxes.splice(index, 1);
        }

        if (instance.modalInstance) {
            instance.modalInstance.dispose();
        }

        instance.modal.remove();

        if (typeof instance.options.onClose === 'function') {
            try {
                instance.options.onClose(instance.returnValue);
            } catch (err) {
                console.error(err);
            }
        }

        const { previousActiveElement } = instance;
        if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
            try {
                previousActiveElement.focus();
            } catch (err) {
                // ignore focus errors
            }
        }
    }

    open(options = {}) {
        if (!options.url) {
            throw new Error('ModalBox.open: required parameter "url" missing');
        }

        if (!window.bootstrap || typeof window.bootstrap.Modal !== 'function') {
            throw new Error('ModalBox requires Bootstrap modal JavaScript to be loaded');
        }

        const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const { modal, modalBody, closeButton } = this._createModalMarkup();

        const iframe = document.createElement('iframe');
        iframe.src = options.url;
        iframe.width = '100%';
        iframe.height = options.height || '100%';
        iframe.style.border = 'none';
        iframe.style.display = 'block';
        iframe.style.width = '100%';
        iframe.style.height = options.height || '100vh';
        iframe.style.position = 'relative';
        iframe.tabIndex = 0;

        if (typeof window.showLoader === 'function') {
            window.showLoader(modalBody);
        }

        const hideLoaderHandler = () => {
            if (typeof window.hideLoader === 'function') {
                window.hideLoader(modalBody);
            }
        };

        iframe.addEventListener('load', hideLoaderHandler, { once: true });
        iframe.addEventListener('error', hideLoaderHandler, { once: true });

        modalBody.appendChild(iframe);

        const modalInstance = new window.bootstrap.Modal(modal, {
            backdrop: true,
            focus: true,
            keyboard: true,
        });

        const instance = {
            modal,
            modalBody,
            modalInstance,
            options,
            previousActiveElement,
            returnValue: undefined,
            isClosing: false,
            isDestroyed: false,
        };

        const adjustZIndex = () => {
            const modalIndex = this.boxes.indexOf(instance);
            const modalZIndex = 1055 + modalIndex * 20;
            modal.style.zIndex = String(modalZIndex);

            const backdrops = document.querySelectorAll('.modal-backdrop');
            const backdrop = backdrops[backdrops.length - 1];
            if (backdrop) {
                backdrop.style.zIndex = String(modalZIndex - 5);
            }
        };

        const handleHidden = () => {
            modal.removeEventListener('shown.bs.modal', adjustZIndex);
            this._destroyInstance(instance);
        };

        modal.addEventListener('shown.bs.modal', adjustZIndex);
        modal.addEventListener('hidden.bs.modal', handleHidden, { once: true });

        const closeHandler = () => {
            instance.close();
        };
        closeButton.addEventListener('click', closeHandler);

        instance.close = (returnValue) => {
            if (instance.isClosing) {
                return;
            }

            instance.isClosing = true;

            if (returnValue !== undefined) {
                instance.returnValue = returnValue;
            }

            modalInstance.hide();
        };

        this.boxes.push(instance);
        modalInstance.show();

        return instance;
    }

    getCurrent() {
        if (!this.boxes.length) {
            return null;
        }

        return this.boxes[this.boxes.length - 1];
    }

    getExtraData() {
        const current = this.getCurrent();
        return current ? current.options.extraData : undefined;
    }

    setReturnValue(value) {
        const current = this.getCurrent();
        if (current) {
            current.returnValue = value;
        }
    }

    close(returnValue) {
        const current = this.getCurrent();
        if (current) {
            current.close(returnValue);
        }
    }
}

const ModalBox = window.top.ModalBox || new ModalBoxClass();
window.top.ModalBox = ModalBox;

if (!ModalBox.initialized) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => ModalBox.init());
    } else {
        ModalBox.init();
    }
}
