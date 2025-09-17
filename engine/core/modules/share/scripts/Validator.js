/**
 * @file Validator — валидация форм, включая работу с паттернами и сообщениями об ошибке.
 * @author Pavel Dubenko (адаптация ES6 — STARTER Teem)
 * @version 2.0.0
 */

class Validator {
    /**
     * @param {HTMLFormElement|string} form - форма (DOM-элемент или id)
     * @param {TabPane} tabPane - (необязательно) объект TabPane
     */
    constructor(form, tabPane = null) {
        this.form = typeof form === 'string' ? document.getElementById(form) : form;
        this.tabPane = tabPane;
        this.prepareFloatFields();
    }

    /**
     * Подготовить поля типа float (заменить запятые на точки)
     */
    prepareFloatFields() {
        this.form.querySelectorAll('.float').forEach(element => {
            element.removeEventListener('change', this._floatHandler); // на всякий случай
            element.addEventListener('change', this._floatHandler);
        });
    }
    // Стрелочная, чтобы всегда был правильный this
    _floatHandler = (event) => {
        event.target.value = event.target.value.replace(/\,/, '.');
    }

    /**
     * Удалить ошибку с поля
     * @param {HTMLElement} field
     */
    removeError(field) {
        field.classList.remove('is-invalid');
        const feedback = this._getFeedbackElement(field);
        if (feedback) {
            feedback.innerText = '';
        }
    }

    /**
     * Показать ошибку для поля
     * @param {HTMLElement} field
     * @param {string} [message]
     */
    showError(field, message = 'Ошибка заполнения') {
        this.removeError(field);
        field.classList.add('is-invalid');
        const feedback = this._getFeedbackElement(field, true);
        if (feedback) {
            feedback.innerText = message;
        }
    }

    /**
     * Получить (или создать) контейнер для сообщения об ошибке
     * @param {HTMLElement} field
     * @param {boolean} create
     * @returns {HTMLElement|null}
     */
    _getFeedbackElement(field, create = false) {
        let feedback = field._validatorFeedback;
        if (feedback && !feedback.isConnected) {
            feedback = null;
            delete field._validatorFeedback;
        }

        const parent = field.parentNode;
        const identifier = field.id || field.name || null;

        if (!feedback && parent) {
            const candidates = parent.querySelectorAll('.invalid-feedback');
            feedback = Array.from(candidates).find(element => {
                if (!identifier) {
                    return !element.dataset.validatorFor;
                }
                return element.dataset.validatorFor === identifier;
            });

            if (!feedback && identifier) {
                feedback = Array.from(candidates).find(element => !element.dataset.validatorFor);
            }
        }

        if (!feedback && create) {
            feedback = document.createElement('div');
            feedback.className = 'invalid-feedback';
            if (identifier) {
                feedback.dataset.validatorFor = identifier;
            }
            field.insertAdjacentElement('afterend', feedback);
        }

        if (feedback) {
            field._validatorFeedback = feedback;
        }

        return feedback || null;
    }

    /**
     * Прокрутить к полю
     * @param {HTMLElement} field
     */
    scrollToElement(field) {
        // Если есть .e-mainframe — внутри неё, иначе окно
        const context = document.querySelector('.e-mainframe') || window;
        // Старый scroll — просто к полю
        field.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
            try { field.focus(); } catch (e) { /* ignore */ }
        }, 350);
    }

    /**
     * Проверка одного поля (по data-атрибутам!)
     * @param {HTMLElement} field
     * @returns {boolean}
     */
    validateElement(field) {
        let result = true;
        // ищем data-pattern и data-message (или кастомные)
        const pattern = field.getAttribute('data-pattern') || field.getAttribute('nrgn:pattern');
        const message = field.getAttribute('data-message') || field.getAttribute('nrgn:message');
        const disabled = field.disabled;
        const skipValidation = field.classList.contains('novalidation');

        if (pattern && message && !disabled && !skipValidation) {
            // Пример pattern: "/^[a-z0-9]{2,}$/i"
            let parts = pattern.split('/');
            let regex;
            try {
                regex = new RegExp(parts[1], parts[2]);
            } catch (e) {
                console.warn('Некорректный pattern для валидации:', pattern);
                regex = /.*/; // пропускаем
            }
            if (!regex.test(field.value)) {
                this.showError(field, message);

                if (!field.dataset.check) {
                    // "once" убираем старую ошибку при правке
                    field.addEventListener('blur', () => this.validateElement(field), { once: true });
                    field.addEventListener('keydown', () => this.removeError(field), { once: true });
                    field.dataset.check = 'check';
                }
                result = false;
            } else {
                this.removeError(field);
            }
        }
        return result;
    }

    /**
     * Проверить все поля формы
     * @returns {boolean}
     */
    validate() {
        let error = false, firstErrorField = null;
        const elements = Array.from(this.form.elements);
        for (const field of elements) {
            if (!this.validateElement(field) && !error) {
                firstErrorField = field;
                error = true;
            }
        }

        if (error && firstErrorField) {
            // Если tabPane — ищем и активируем таб
            if (this.tabPane && typeof this.tabPane.show === 'function' && typeof this.tabPane.whereIs === 'function') {
                this.tabPane.show(this.tabPane.whereIs(firstErrorField));
            }
            this.scrollToElement(firstErrorField);
            try { firstErrorField.focus(); } catch (e) { /* ignore */ }
        }

        return !error;
    }
}

// Для совместимости
window.Validator = Validator;
