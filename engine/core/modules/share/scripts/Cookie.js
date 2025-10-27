const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

const documentRef = globalScope?.document;

class Cookie {
    // Получить значение cookie по имени
    static read(name) {
        if (!documentRef) {
            return undefined;
        }

        const matches = documentRef.cookie.match(
            new RegExp(
                '(?:^|; )' +
                name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') +
                '=([^;]*)'
            )
        );
        return matches ? decodeURIComponent(matches[1]) : undefined;
    }

    // Установить cookie
    static write(name, value, options = {}) {
        options = {
            path: '/',
            // можно добавить другие опции по умолчанию
            ...options
        };

        let updatedCookie = encodeURIComponent(name) + "=" + encodeURIComponent(value);

        if (options.duration) {
            // duration в днях
            let expires = new Date();
            expires.setTime(expires.getTime() + options.duration * 24 * 60 * 60 * 1000);
            updatedCookie += "; expires=" + expires.toUTCString();
        }
        if (options.path) {
            updatedCookie += "; path=" + options.path;
        }
        if (options.domain) {
            updatedCookie += "; domain=" + options.domain;
        }
        if (options.secure) {
            updatedCookie += "; secure";
        }
        if (documentRef) {
            documentRef.cookie = updatedCookie;
        }
    }

    // Удалить cookie
    static remove(name, options = {}) {
        this.write(name, '', { ...options, duration: -1 });
    }
}

export { Cookie };
export default Cookie;
