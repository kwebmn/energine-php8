import Form from '../../share/scripts/Form.js';
import { registerBehavior as registerEnergineBehavior } from '../../share/scripts/Energine.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

/**
 * GroupForm (ES6 version)
 * @extends Form
 */
class GroupForm extends Form {
    /**
     * @param {HTMLElement|string} element The form element.
     */
    constructor(element) {
        super(element);

        /**
         * Флаг, показывающий, что идёт массовое обновление значений
         * (для того, чтобы не снимать отметку с групповых радиокнопок
         * во время программного выбора).
         * @type {boolean}
         * @private
         */
        this._isBulkUpdating = false;

        // Найти все .groupRadio и навесить обработчик
        this.componentElement
            .querySelectorAll('.groupRadio')
            .forEach(radio => {
                radio.addEventListener('click', this.checkAllRadioInColumn.bind(this));
            });

        this.componentElement
            .querySelectorAll('input[type=radio]')
            .forEach(radio => {
                radio.addEventListener('change', this.uncheckGroupRadio.bind(this));
            });
    }

    /**
     * Проверить все радиокнопки в столбце
     * @param {Event} event
     */
    checkAllRadioInColumn(event) {
        const radio = event.target;
        const td = radio.closest('td');
        const tbody = td?.closest('tbody');

        if (!td || !tbody) {
            return;
        }

        const columnId = radio.dataset.column || td.dataset.column;
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const headerRow = td.parentElement;

        this._isBulkUpdating = true;

        try {
            if (headerRow) {
                headerRow.querySelectorAll('.groupRadio').forEach(groupRadio => {
                    groupRadio.checked = groupRadio === radio;
                });
            }

            if (columnId) {
                rows.forEach(row => {
                    row.querySelectorAll(`td[data-column="${columnId}"] input[type="radio"]`).forEach(r => {
                        this._checkRadio(r);
                    });
                });
            } else {
                const cells = Array.from(td.parentElement?.children || []);
                const columnIndex = cells.indexOf(td);

                if (columnIndex === -1) {
                    return;
                }

                rows.forEach(row => {
                    const cell = row.children[columnIndex];
                    if (!cell) {
                        return;
                    }

                    const targetRadio = cell.querySelector('input[type="radio"]');
                    if (targetRadio) {
                        this._checkRadio(targetRadio);
                    }
                });
            }
        } finally {
            this._isBulkUpdating = false;
        }
    }

    _checkRadio(radio) {
        if (!radio || radio.disabled) {
            return false;
        }

        this._uncheckRadioGroup(radio);

        if (!radio.checked) {
            radio.checked = true;
            radio.dispatchEvent(new Event('change', { bubbles: true }));
        }

        return true;
    }

    _uncheckRadioGroup(radio) {
        if (!radio || !radio.name) {
            return;
        }

        const selector = `input[type="radio"][name="${radio.name.replace(/"/g, '\\"')}"]`;
        const groupRadios = this.componentElement?.querySelectorAll(selector);

        if (!groupRadios) {
            return;
        }

        groupRadios.forEach(groupRadio => {
            if (groupRadio === radio || groupRadio.disabled || !groupRadio.checked) {
                return;
            }

            groupRadio.checked = false;
            groupRadio.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }

    /**
     * Снять выделение с групповой радиокнопки (по необходимости)
     * @param {Event} event
     */
    uncheckGroupRadio(event) {
        const radio = event.target;

        if (this._isBulkUpdating || radio.classList.contains('groupRadio')) {
            return;
        }

        const td = radio.closest('td[data-column]');
        const tbody = td?.closest('tbody');

        if (!td || !tbody) {
            return;
        }

        const columnId = td.dataset.column;
        if (!columnId) {
            return;
        }

        const groupRadio = Array.from(tbody.querySelectorAll('.groupRadio')).find(r => r.dataset.column === columnId);
        if (groupRadio) {
            groupRadio.checked = false;
        }
    }
}

export { GroupForm };
export default GroupForm;
if (typeof registerEnergineBehavior === 'function') {
    registerEnergineBehavior('GroupForm', GroupForm);
}
