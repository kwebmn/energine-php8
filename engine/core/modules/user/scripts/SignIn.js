class SignIn {
    constructor(element) {
        // Если element — это селектор, ищем DOM-элемент
        this.componentElement = typeof element === 'string' ? document.querySelector(element) : element;

        // Если у компонента есть атрибут template — берём его
        this.singlePath = this.componentElement?.getAttribute('template') || '';

        // Нужно, чтобы было корректное обращение к this внутри событий
        const el = this;

        // Быстрая регистрация
        $('#sign_up_fast').submit(function() {
            const data = $(this).serialize();
            $.post(
                Energine.lang + el.singlePath + 'sign-up-fast/',
                data,
                function(result) {
                    if (result.result) {
                        Energine.noticeBox(
                            result.message,
                            'success',
                            function() {
                                document.location.href = '/' + Energine.lang + '/' + result.redirect;
                            }
                        );
                    } else {
                        Energine.alertBox(result.message, 'error');
                    }
                },
                'json'
            );
            return false;
        });

        // Обычная регистрация
        $('#sign_up').submit(function() {
            const data = $(this).serialize();
            $.post(
                el.singlePath + 'sign-up/',
                data,
                function(result) {
                    if (result.result) {
                        Energine.noticeBox(
                            result.message,
                            'success',
                            function() {
                                document.location.href = '/' + Energine.lang + '/' + result.redirect;
                            }
                        );
                    } else {
                        Energine.alertBox(result.message, 'error');
                    }
                },
                'json'
            );
            return false;
        });

        // Вход
        $('#sign_in').submit(function() {
            const data = $(this).serialize();
            $.post(
                el.singlePath + 'sign-in/',
                data,
                function(result) {
                    if (result.result) {
                        Energine.noticeBox(
                            result.message,
                            'success',
                            function() {
                                document.location.href = '/' + Energine.lang + '/' + result.redirect;
                            }
                        );
                    } else {
                        Energine.alertBox(result.message, 'error');
                    }
                },
                'json'
            );
            return false;
        });

        // Логаут
        $('.btn-logout').click(function() {
            $.post(
                Energine.lang + '/login/logout/',
                function(result) {
                    if (result.result) {
                        Energine.noticeBox(
                            result.message,
                            'success',
                            function() {
                                document.location.href = '/' + Energine.lang + '/';
                            }
                        );
                    } else {
                        Energine.alertBox(result.message, 'error');
                    }
                },
                'json'
            );
            return false;
        });
    }
}

// Пример использования:
// new SignIn('#sign-in-component');
