import Energine, { registerBehavior as registerEnergineBehavior } from '../../share/scripts/Energine.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

class RecoverPassword {
    constructor(element) {
        // element — это или селектор, или DOM-элемент
        this.componentElement = (typeof element === 'string')
            ? document.querySelector(element)
            : element;

        const dataset = this.componentElement?.dataset || {};

        // getProperty => getAttribute (если это DOM-элемент)
        this.singlePath = dataset.eSingleTemplate
            || this.componentElement?.getAttribute('data-e-single-template')
            || this.componentElement?.getAttribute('single_template')
            || '';
        this.path = dataset.eTemplate
            || this.componentElement?.getAttribute('data-e-template')
            || this.componentElement?.getAttribute('template')
            || '';

        // Ссылка на this (для вложенных функций, если не использовать стрелочные)
        this.bindFormHandlers();
    }

    bindFormHandlers() {
        const recoverForm = this.componentElement?.querySelector('#recover_form');
        if (recoverForm) {
            recoverForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const emailInput = recoverForm.querySelector('#email');
                const payload = new URLSearchParams({
                    email: emailInput ? emailInput.value : ''
                });

                this.submitJson(`${Energine.lang}/${this.singlePath}check`, payload)
                    .then(this.handleResponse.bind(this));
            });
        }

        const recoverForm2 = this.componentElement?.querySelector('#recover_form2');
        if (recoverForm2) {
            recoverForm2.addEventListener('submit', (event) => {
                event.preventDefault();
                const formData = new FormData(recoverForm2);
                const payload = new URLSearchParams();
                formData.forEach((value, key) => {
                    payload.append(key, String(value));
                });

                this.submitJson(`${Energine.lang}/${this.singlePath}change`, payload)
                    .then(this.handleResponse.bind(this));
            });
        }
    }

    submitJson(url, payload) {
        return fetch(`/${url}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Accept': 'application/json'
            },
            body: payload.toString()
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error ${response.status}`);
                }
                return response.json();
            })
            .catch((error) => {
                console.error('RecoverPassword request failed', error);
                return { result: false, message: 'Unexpected error occurred.' };
            });
    }

    handleResponse(result) {
        if (result.result) {
            const redirect = () => {
                globalScope.location.href = `/${Energine.lang}/login/`;
            };
            if (typeof Energine.noticeBox === 'function') {
                Energine.noticeBox(result.message, 'success', redirect);
            } else {
                alert(result.message);
                redirect();
            }
            return;
        }

        if (typeof Energine.alertBox === 'function') {
            Energine.alertBox(result.message);
        } else {
            alert(result.message);
        }
    }
}

export { RecoverPassword };
export default RecoverPassword;
try {
    if (typeof registerEnergineBehavior === 'function') {
        registerEnergineBehavior('RecoverPassword', RecoverPassword);
    }
} catch (error) {
    if (Energine && typeof Energine.safeConsoleError === 'function') {
        Energine.safeConsoleError(error, '[RecoverPassword] Failed to register behavior');
    } else if (typeof console !== 'undefined' && console.warn) {
        console.warn('[RecoverPassword] Failed to register behavior', error);
    }
}
