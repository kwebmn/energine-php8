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
        const targets = this._getCheckableGroupElements(field);
        for (const element of targets) {
            if (element instanceof HTMLElement) {
                element.classList.remove('is-invalid');
            }
        }

        const feedback = this._getInvalidFeedbackElement(field, false);
        if (feedback) {
            feedback.textContent = '';
        }
    }

    /**
     * Показать ошибку для поля
     * @param {HTMLElement} field
     * @param {string} [message]
     */
    showError(field, message = 'Ошибка заполнения') {
        this.removeError(field);

        const targets = this._getCheckableGroupElements(field);
        for (const element of targets) {
            if (element instanceof HTMLElement) {
                element.classList.add('is-invalid');
            }
        }

        const feedback = this._getInvalidFeedbackElement(field);
        if (feedback) {
            feedback.textContent = message;
        }
    }

    /**
     * Найти (и при необходимости создать) контейнер для текста ошибки
     * @param {HTMLElement} field
     * @param {boolean} create
     * @returns {HTMLElement|null}
     */
    _getInvalidFeedbackElement(field, create = true) {
        const cached = field._validatorInvalidFeedback;
        if (cached && cached.isConnected) {
            if (this._isCheckableInput(field)) {
                cached.classList.add('d-block');
            }
            return cached;
        }

        let feedback = this._findExistingFeedback(field);

        if (!feedback && create) {
            feedback = document.createElement('div');
            feedback.className = 'invalid-feedback';
            if (this._isCheckableInput(field)) {
                feedback.classList.add('d-block');
            }

            field.insertAdjacentElement('afterend', feedback);
        }

        if (feedback && this._isCheckableInput(field)) {
            feedback.classList.add('d-block');
        }

        if (feedback) {
            this._assignFeedbackCache(field, feedback);
            return feedback;
        }

        return null;
    }

    /**
     * Привязать найденный контейнер обратной связи ко всем связанным чекбоксам/радиокнопкам
     * @param {HTMLElement} field
     * @param {HTMLElement} feedback
     */
    _assignFeedbackCache(field, feedback) {
        const elements = this._getCheckableGroupElements(field);
        let assigned = false;
        for (const element of elements) {
            if (element instanceof HTMLElement) {
                element._validatorInvalidFeedback = feedback;
                assigned = true;
            }
        }

        if (!assigned && field instanceof HTMLElement) {
            field._validatorInvalidFeedback = feedback;
        }
    }

    /**
     * Получить список связанных чекбоксов/радиокнопок (или сам элемент, если он не чекбокс/радио)
     * @param {HTMLElement} field
     * @returns {HTMLElement[]}
     */
    _getCheckableGroupElements(field) {
        if (!this._isCheckableInput(field) || !this.form) {
            return field instanceof HTMLElement ? [field] : [];
        }

        const name = field.getAttribute('name');
        if (!name) {
            return [field];
        }

        const type = (field.type || '').toLowerCase();
        const related = [];
        const elements = Array.from(this.form.elements);
        for (const element of elements) {
            if (element instanceof HTMLInputElement) {
                const elementType = (element.type || '').toLowerCase();
                if (this._isCheckableInput(element) && element.name === name && elementType === type) {
                    related.push(element);
                }
            }
        }

        if (!related.length) {
            return [field];
        }

        return related;
    }

    /**
     * Проверить, является ли элемент чекбоксом или радиокнопкой
     * @param {HTMLElement} field
     * @returns {boolean}
     */
    _isCheckableInput(field) {
        if (!(field instanceof HTMLInputElement)) {
            return false;
        }

        const type = (field.type || '').toLowerCase();
        return type === 'checkbox' || type === 'radio';
    }

    /**
     * Поиск существующего блока invalid-feedback, связанного с полем
     * @param {HTMLElement} field
     * @returns {HTMLElement|null}
     */
    _findExistingFeedback(field) {
        const describedBy = field.getAttribute('aria-describedby');
        if (describedBy) {
            const ids = describedBy.split(/\s+/).filter(Boolean);
            for (const id of ids) {
                const element = document.getElementById(id);
                if (element instanceof HTMLElement && element.classList.contains('invalid-feedback')) {
                    return element;
                }
            }
        }

        let sibling = field.nextSibling;
        while (sibling) {
            if (sibling instanceof HTMLElement && sibling.classList.contains('invalid-feedback')) {
                return sibling;
            }
            sibling = sibling.nextSibling;
        }

        const parent = field.parentElement;
        if (!parent) {
            return null;
        }

        const feedbacks = parent.querySelectorAll('.invalid-feedback');
        for (const feedback of feedbacks) {
            if (field.compareDocumentPosition(feedback) & Node.DOCUMENT_POSITION_FOLLOWING) {
                return feedback;
            }
        }

        return null;
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
