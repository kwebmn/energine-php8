const defaultGlobalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

const defaultDocument = typeof document !== 'undefined' ? document : null;

const defaultBootstrapResolver = (globalScope = defaultGlobalScope) => () => {
    if (globalScope && globalScope.bootstrap) {
        return globalScope.bootstrap;
    }
    if (typeof bootstrap !== 'undefined') {
        return bootstrap;
    }
    return null;
};

const createEnsureModalElement = (doc = defaultDocument) => (id, template) => {
    if (!doc) {
        return null;
    }

    let element = doc.getElementById(id);
    if (element) {
        return element;
    }

    const wrapper = doc.createElement('div');
    wrapper.innerHTML = template.trim();
    element = wrapper.firstElementChild;
    if (element) {
        doc.body.appendChild(element);
    }

    return element;
};

const createToastContainerResolver = (doc = defaultDocument) => () => {
    if (!doc) {
        return null;
    }
    let container = doc.getElementById('energine-toast-container');
    if (!container) {
        container = doc.createElement('div');
        container.id = 'energine-toast-container';
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '11000';
        doc.body.appendChild(container);
    }
    return container;
};

const createLoaderControls = (doc = defaultDocument, globalScope = defaultGlobalScope) => {
    const resolveDefaultContainer = () => (doc ? doc.body : undefined);

    const showLoader = (container = resolveDefaultContainer()) => {
        if (!container || !doc) {
            return;
        }

        if (!container.querySelector('.global-loader')) {
            const loader = doc.createElement('div');
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

    const hideLoader = (container = resolveDefaultContainer()) => {
        if (!container || !doc) {
            return;
        }

        const loader = container.querySelector('.global-loader');
        if (loader) {
            loader.remove();
        }
    };

    return { showLoader, hideLoader };
};

const noticeIconMap = {
    success: { variant: 'success', icon: 'fa-circle-check' },
    error: { variant: 'danger', icon: 'fa-circle-xmark' },
    warning: { variant: 'warning', icon: 'fa-triangle-exclamation' },
    info: { variant: 'info', icon: 'fa-circle-info' },
    question: { variant: 'primary', icon: 'fa-circle-question' },
};

/**
 * Create UI helper methods used by Energine runtime.
 *
 * @param {Object} params
 * @param {any} [params.globalScope]
 * @param {Document} [params.documentRef]
 * @returns {{
 *   resolveBootstrap: () => any,
 *   confirmBox: (message: string, yes?: Function, no?: Function) => void,
 *   alertBox: (message: string) => void,
 *   noticeBox: (message: string, icon?: string, callback?: Function) => void,
 *   showLoader: (container?: HTMLElement) => void,
 *   hideLoader: (container?: HTMLElement) => void,
 * }}
 */
export const createUIHelpers = ({
    globalScope = defaultGlobalScope,
    documentRef = defaultDocument,
} = {}) => {
    const resolveBootstrap = defaultBootstrapResolver(globalScope);
    const ensureModalElement = createEnsureModalElement(documentRef);
    const getToastContainer = createToastContainerResolver(documentRef);
    const { showLoader, hideLoader } = createLoaderControls(documentRef, globalScope);

    const confirmBox = (message, yes, no) => {
        const bootstrapLib = resolveBootstrap();
        if (!bootstrapLib || !documentRef) {
            if (confirm(message)) {
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
            if (confirm(message)) {
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
            resolved = true;
            if (no) no();
        };

        if (confirmBtn) {
            confirmBtn.addEventListener('click', handleConfirm, { once: true });
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', handleCancel, { once: true });
        }

        modal.addEventListener('hidden.bs.modal', () => {
            if (!resolved && no) {
                no();
            }
        }, { once: true });

        instance.show();
    };

    const alertBox = (message) => {
        const bootstrapLib = resolveBootstrap();
        if (!bootstrapLib || !documentRef) {
            alert(message);
            return;
        }

        const modal = ensureModalElement('energine-alert-modal', `
            <div class="modal fade" id="energine-alert-modal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header bg-danger text-white">
                            <h5 class="modal-title">
                                <i class="fa-solid fa-circle-exclamation me-2"></i>
                                <span data-role="title">Внимание</span>
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p class="mb-0" data-role="message"></p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-danger" data-bs-dismiss="modal">
                                <i class="fa-solid fa-circle-check me-2"></i>Ок
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `);

        if (!modal) {
            alert(message);
            return;
        }

        const messageContainer = modal.querySelector('[data-role="message"]');
        if (messageContainer) {
            messageContainer.textContent = message;
        }

        const instance = bootstrapLib.Modal.getOrCreateInstance(modal, { backdrop: 'static' });
        instance.show();
    };

    const noticeBox = (message, icon, callback) => {
        const bootstrapLib = resolveBootstrap();
        if (!bootstrapLib || !documentRef) {
            alert(message);
            if (callback) callback();
            return;
        }

        const container = getToastContainer();
        if (!container) {
            alert(message);
            if (callback) callback();
            return;
        }

        const { variant, icon: iconClass } = noticeIconMap[icon] || noticeIconMap.info;

        const toast = documentRef.createElement('div');
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

    return {
        resolveBootstrap,
        confirmBox,
        alertBox,
        noticeBox,
        showLoader,
        hideLoader,
    };
};

export default createUIHelpers;
