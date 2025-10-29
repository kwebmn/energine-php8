import Energine, { registerBehavior as registerEnergineBehavior } from '../../share/scripts/Energine.js';
import ValidForm from '../../share/scripts/ValidForm.js';

const normalizePath = (value = '') => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    const withoutTrailing = trimmed.replace(/\/+$/g, '');
    if (!withoutTrailing) return '';
    return withoutTrailing.startsWith('/') ? withoutTrailing : `/${withoutTrailing}`;
};

const buildComponentUrl = (basePath, segment = '') => {
    let url = normalizePath(basePath);
    if (!url) url = '';
    if (segment) {
        url = `${url.replace(/\/+$/g, '')}/${segment.replace(/^\/+/g, '')}`;
    }
    if (!url.startsWith('/')) url = `/${url}`;
    if (!url.endsWith('/')) url += '/';
    return url;
};

/**
 * UserProfile (ES6 version)
 * @extends ValidForm
 */
class UserProfile extends ValidForm {
    /**
     * @param {HTMLElement|string} element
     */
    constructor(element) {
        const elementRef = (typeof element === 'string')
            ? document.querySelector(element)
            : element;
        super(elementRef);
        this.componentElement = elementRef;
        const dataset = this.componentElement?.dataset || {};
        this.form = this.componentElement?.closest('form') || this.componentElement || null;
        this.singleTemplate = normalizePath(
            dataset.eSingleTemplate
                || this.componentElement?.getAttribute('data-e-single-template')
                || this.componentElement?.getAttribute('single_template')
                || ''
        );

        if (this.form) {
            this.form.addEventListener('submit', (event) => {
                event.preventDefault();
                this.saveProfile();
            });
        }
    }

    saveProfile() {
        if (!this.form) {
            return;
        }

        const formData = new FormData(this.form);
        const payload = new URLSearchParams();
        formData.forEach((value, key) => {
            payload.append(key, String(value));
        });

        const url = buildComponentUrl(this.singleTemplate, 'save');

        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                Accept: 'application/json'
            },
            body: payload.toString(),
            credentials: 'same-origin'
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                return response.json();
            })
            .then((result) => {
                const message = result?.message || 'Готово';
                const type = result?.result ? 'success' : 'error';
                if (typeof Energine.noticeBox === 'function') {
                    Energine.noticeBox(message, type);
                } else {
                    alert(message);
                }
            })
            .catch(() => {
                const message = 'Не вдалося зберегти дані.';
                if (typeof Energine.alertBox === 'function') {
                    Energine.alertBox(message, 'error');
                } else {
                    alert(message);
                }
            });
    }
}

export { UserProfile };
export default UserProfile;
if (typeof registerEnergineBehavior === 'function') {
    registerEnergineBehavior('UserProfile', UserProfile);
}
