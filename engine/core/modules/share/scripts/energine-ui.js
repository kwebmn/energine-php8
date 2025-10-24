const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

const noticeIconMap = {
    success: { variant: 'success', icon: 'fa-circle-check' },
    error: { variant: 'danger', icon: 'fa-circle-xmark' },
    warning: { variant: 'warning', icon: 'fa-triangle-exclamation' },
    info: { variant: 'info', icon: 'fa-circle-info' },
    question: { variant: 'primary', icon: 'fa-circle-question' },
};

const resolveBootstrap = () => {
    if (globalScope && globalScope.bootstrap) {
        return globalScope.bootstrap;
    }
    if (typeof bootstrap !== 'undefined') {
        return bootstrap;
    }
    return null;
};

const ensureModalElement = (id, template) => {
    if (typeof document === 'undefined') {
        return null;
    }

    let element = document.getElementById(id);
    if (element) {
        return element;
    }

    const wrapper = document.createElement('div');
    wrapper.innerHTML = template.trim();
    element = wrapper.firstElementChild;
    if (element) {
        document.body.appendChild(element);
    }

    return element;
};

const getToastContainer = () => {
    if (typeof document === 'undefined') {
        return null;
    }

    let container = document.getElementById('energine-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'energine-toast-container';
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '11000';
        document.body.appendChild(container);
    }

    return container;
};

export const confirmBox = (message, yes, no) => {
    const bootstrapLib = resolveBootstrap();
    if (!bootstrapLib || typeof document === 'undefined') {
        if (typeof confirm === 'function' && confirm(message)) {
            if (yes) yes();
        } else if (no) {
            no();
        }
        return;
    }

    const modal = ensureModalElement('energine-confirm-modal', `
        <div class="modal fade" id="energine-confirm-modal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-warning text-dark">
                        <h5 class="modal-title">
                            <i class="fa-solid fa-triangle-exclamation me-2"></i>
                            <span data-role="title">Подтверждение</span>
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p class="mb-0" data-role="message"></p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-role="cancel" data-bs-dismiss="modal">
                            <i class="fa-solid fa-circle-xmark me-2"></i>Нет
                        </button>
                        <button type="button" class="btn btn-primary" data-role="confirm" data-bs-dismiss="modal">
                            <i class="fa-solid fa-circle-check me-2"></i>Да
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `);

    if (!modal) {
        if (typeof confirm === 'function' && confirm(message)) {
            if (yes) yes();
        } else if (no) {
            no();
        }
        return;
    }

    const messageContainer = modal.querySelector('[data-role="message"]');
    if (messageContainer) {
        messageContainer.textContent = message;
    }

    const confirmBtn = modal.querySelector('[data-role="confirm"]');
    const cancelBtn = modal.querySelector('[data-role="cancel"]');
    const instance = bootstrapLib.Modal.getOrCreateInstance(modal, { backdrop: 'static' });

    let resolved = false;
    const handleConfirm = () => {
        resolved = true;
        if (yes) yes();
    };

    const handleCancel = () => {
        if (!resolved && no) {
            no();
        }
    };

    confirmBtn?.addEventListener('click', handleConfirm, { once: true });
    cancelBtn?.addEventListener('click', handleCancel, { once: true });
    modal.addEventListener('hidden.bs.modal', () => {
        confirmBtn?.removeEventListener('click', handleConfirm);
        cancelBtn?.removeEventListener('click', handleCancel);
        if (!resolved && no) {
            no();
        }
    }, { once: true });

    instance.show();
};

export const alertBox = (message) => {
    const bootstrapLib = resolveBootstrap();
    if (!bootstrapLib || typeof document === 'undefined') {
        if (typeof alert === 'function') {
            alert(message);
        }
        return;
    }

    const modal = ensureModalElement('energine-alert-modal', `
        <div class="modal fade" id="energine-alert-modal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="fa-solid fa-circle-info me-2"></i>
                            <span data-role="title">Сообщение</span>
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p class="mb-0" data-role="message"></p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" data-bs-dismiss="modal">
                            <i class="fa-solid fa-circle-check me-2"></i>Ок
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `);

    if (!modal) {
        if (typeof alert === 'function') {
            alert(message);
        }
        return;
    }

    const messageContainer = modal.querySelector('[data-role="message"]');
    if (messageContainer) {
        messageContainer.textContent = message;
    }

    const instance = bootstrapLib.Modal.getOrCreateInstance(modal, { backdrop: 'static' });
    instance.show();
};

export const noticeBox = (message, icon = 'info', callback = null) => {
    const bootstrapLib = resolveBootstrap();
    const container = getToastContainer();

    if (!bootstrapLib || !container) {
        if (typeof alert === 'function') {
            alert(message);
        }
        if (callback) {
            callback();
        }
        return;
    }

    const { variant, icon: iconClass } = noticeIconMap[icon] || noticeIconMap.info;

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-${variant} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body d-flex align-items-center">
                <i class="fa-solid ${iconClass} me-2"></i>
                <span>${message}</span>
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

    container.appendChild(toast);

    const toastInstance = bootstrapLib.Toast.getOrCreateInstance(toast, {
        delay: 1500,
        autohide: true,
    });

    toast.addEventListener('hidden.bs.toast', () => {
        toastInstance.dispose();
        toast.remove();
        if (callback) {
            callback();
        }
    }, { once: true });

    toastInstance.show();
};

export const showLoader = (container = (typeof document !== 'undefined' ? document.body : undefined)) => {
    if (!container || typeof document === 'undefined') {
        return;
    }

    if (!container.querySelector('.global-loader')) {
        const loader = document.createElement('div');
        loader.className = 'global-loader d-flex justify-content-center align-items-center position-absolute top-0 start-0 w-100 h-100 bg-white bg-opacity-75';
        loader.style.zIndex = 9999;
        loader.innerHTML = `
            <div class="spinner-border text-primary" role="status" style="width:3rem; height:3rem;">
                <span class="visually-hidden">Loading...</span>
            </div>
        `;
        const computeStyle = (globalScope && globalScope.getComputedStyle)
            ? globalScope.getComputedStyle(container)
            : (typeof window !== 'undefined' && window.getComputedStyle
                ? window.getComputedStyle(container)
                : null);
        if (computeStyle && (computeStyle.position === 'static' || !computeStyle.position)) {
            container.style.position = 'relative';
        }
        container.appendChild(loader);
    }
};

export const hideLoader = (container = (typeof document !== 'undefined' ? document.body : undefined)) => {
    if (!container || typeof document === 'undefined') {
        return;
    }

    const loader = container.querySelector('.global-loader');
    if (loader) {
        loader.remove();
    }
};

export const attachUIToWindow = (target = globalScope) => {
    if (!target) {
        return;
    }

    target.confirmBox = confirmBox;
    target.alertBox = alertBox;
    target.noticeBox = noticeBox;
    target.showLoader = showLoader;
    target.hideLoader = hideLoader;
};

attachUIToWindow();

export default {
    confirmBox,
    alertBox,
    noticeBox,
    showLoader,
    hideLoader,
    attachUIToWindow,
};
