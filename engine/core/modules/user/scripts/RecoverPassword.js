export default class RecoverPassword {
    constructor(element, options = {}) {
        // element — это или селектор, или DOM-элемент
        this.componentElement = (typeof element === 'string')
            ? document.querySelector(element)
            : element;
        this.options = options;

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
                        Swal.fire({
                            title: result.message,
                            icon: "success",
                        }).then(() => {
                            document.location.href = `/${Energine.lang}/login/`;
                        });
                    } else {
                        Swal.fire({
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
                        Swal.fire({
                            title: result.message,
                            icon: "success",
                        }).then(() => {
                            document.location.href = `/${Energine.lang}/login/`;
                        });
                    } else {
                        Swal.fire({
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

if (typeof window !== 'undefined') {
    window.RecoverPassword = RecoverPassword;
}