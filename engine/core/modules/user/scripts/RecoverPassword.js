import Energine from '../../share/scripts/Energine.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

const $ = globalScope?.jQuery || globalScope?.$;
const Swal = globalScope?.Swal;

class RecoverPassword {
    constructor(element) {
        if (!$) {
            throw new Error('RecoverPassword requires jQuery to be available globally.');
        }

        // element — это или селектор, или DOM-элемент
        this.componentElement = (typeof element === 'string')
            ? document.querySelector(element)
            : element;

        // getProperty => getAttribute (если это DOM-элемент)
        this.singlePath = this.componentElement.getAttribute('single_template');
        this.path = this.componentElement.getAttribute('template');

        // Ссылка на this (для вложенных функций, если не использовать стрелочные)
        const self = this;

        $('#recover_form').submit(function () {
            $.post(
                `${Energine.lang}/${self.singlePath}check`,
                {
                    email: $('#email').val()
                },
                function (result) {
                    if (result.result) {
                        Swal?.fire({
                            title: result.message,
                            icon: "success",
                        })?.then?.(() => {
                            globalScope.location.href = `/${Energine.lang}/login/`;
                        });
                    } else {
                        Swal?.fire({
                            title: result.message,
                            icon: "error",
                        });
                    }
                },
                'json'
            );
            return false;
        });

        $('#recover_form2').submit(function () {
            const data = $(this).serialize();
            $.post(
                `${Energine.lang}/${self.singlePath}change`,
                data,
                function (result) {
                    if (result.result) {
                        Swal?.fire({
                            title: result.message,
                            icon: "success",
                        })?.then?.(() => {
                            globalScope.location.href = `/${Energine.lang}/login/`;
                        });
                    } else {
                        Swal?.fire({
                            title: result.message,
                            icon: "error",
                        });
                    }
                },
                'json'
            );
            return false;
        });
    }
}

export { RecoverPassword };
export default RecoverPassword;

export function attachToWindow(target = globalScope) {
    if (!target) {
        return RecoverPassword;
    }

    target.RecoverPassword = RecoverPassword;
    return RecoverPassword;
}

attachToWindow();