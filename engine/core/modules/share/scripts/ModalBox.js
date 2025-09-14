class ModalBoxClass {
    constructor() {
        this.boxes = [];
        this.initialized = false;
    }

    init() {
        this.initialized = true;
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

        // Создаем backdrop (оверлей MDB)
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        // z-index выше для вложенных модалов
        backdrop.style.zIndex = 1040 + this.boxes.length * 10;
        document.body.appendChild(backdrop);

        // Создаем модал
        const modal = document.createElement('div');
        modal.className = 'modal top  show';
        modal.style.display = 'block';
        modal.tabIndex = -1;
        modal.setAttribute('role', 'dialog');
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
        modalBody.appendChild(iframe);

        iframe.onload = () => {
            hideLoader(modalBody);
        };

        document.body.appendChild(modal);

        // Закрытие
        const closeModal = () => {
            modal.classList.remove('show');
            modal.style.display = 'none';
            backdrop.remove();
            setTimeout(() => {
                modal.remove();
                if (typeof options.onClose === 'function') options.onClose();
            }, 150);
        };

        // Кнопка закрытия (крестик)
        const btnClose = modal.querySelector('.btn-close');
        btnClose.onclick = closeModal;

        // ESC
        setTimeout(() => { modal.focus(); }, 10);
        const escHandler = (e) => {
            if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
                closeModal();
            }
        };
        document.addEventListener('keydown', escHandler, { once: true });

        // В стек (для модал в модале)
        this.boxes.push({ modal, backdrop, options, escHandler });
    }

    // Получить текущий (верхний) модал
    getCurrent() {
        if (!this.boxes.length) return null;
        return this.boxes[this.boxes.length - 1];
    }

    getExtraData() {
        const cur = this.getCurrent();
        console.log(cur);
        return cur ? cur.options.extraData : undefined;
    }

    // Закрыть последний модал
    setReturnValue(value) {
        const cur = this.getCurrent();
        if (cur) cur.returnValue = value;
    }

    close() {
        if (!this.boxes.length) return;
        const cur = this.getCurrent();
        const { modal, backdrop, options, escHandler } = this.boxes.pop();
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
            backdrop.remove();
            setTimeout(() => {
                modal.remove();
                if (typeof options.onClose === 'function') {
                    options.onClose(cur ? cur.returnValue : undefined);
                }
            }, 150);
        }
        document.removeEventListener('keydown', escHandler);
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