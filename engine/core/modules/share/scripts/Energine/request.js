const defaultFetch = (typeof fetch === 'function')
    ? fetch.bind(typeof globalThis !== 'undefined' ? globalThis : undefined)
    : null;

/**
 * Serialize plain objects into application/x-www-form-urlencoded payloads.
 *
 * @param {Record<string, any>} obj
 * @param {string} [prefix]
 * @returns {string}
 */
export const serializeToFormEncoded = (obj, prefix) => {
    if (!obj || typeof obj !== 'object') {
        return '';
    }

    const chunks = [];

    Object.keys(obj).forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) {
            return;
        }

        const propKey = prefix ? `${prefix}[${key}]` : key;
        const value = obj[key];

        if (typeof value === 'object' && value !== null && !((typeof File !== 'undefined' && value instanceof File))) {
            chunks.push(serializeToFormEncoded(value, propKey));
        } else {
            chunks.push(`${encodeURIComponent(propKey)}=${encodeURIComponent(value)}`);
        }
    });

    return chunks.join('&');
};

/**
 * Create Energine request executor with injected dependencies.
 *
 * @param {Object} params
 * @param {typeof fetch} [params.fetchImpl]
 * @param {() => boolean} [params.getForceJSON]
 * @param {(data: Record<string, any>, prefix?: string) => string} [params.serialize]
 * @returns {(uri: string, data: any, onSuccess: Function, onUserError?: Function, onServerError?: Function, method?: string) => Promise<void>}
 */
export const createRequestClient = ({
    fetchImpl = defaultFetch,
    getForceJSON = () => false,
    serialize = serializeToFormEncoded,
} = {}) => {
    if (typeof fetchImpl !== 'function') {
        throw new Error('Fetch implementation is required to perform Energine requests');
    }

    return async (uri, data, onSuccess, onUserError, onServerError = () => {}, method = 'post') => {
        let url = uri;
        const isGet = String(method).toLowerCase() === 'get';
        const headers = {
            'X-Request': 'json',
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json, text/plain, */*',
        };
        const fetchOpts = { method: String(method || 'post').toUpperCase(), headers };

        if (getForceJSON()) {
            headers['Content-Type'] = 'application/json';
            if (!isGet) {
                fetchOpts.body = JSON.stringify(data);
            } else if (data) {
                const params = new URLSearchParams(data).toString();
                url += (url.includes('?') ? '&' : '?') + params;
            }
        } else if (typeof data === 'string') {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            fetchOpts.body = data;
        } else {
            const formEncoded = serialize(data || {});
            if (isGet) {
                if (formEncoded) {
                    url += (url.includes('?') ? '&' : '?') + formEncoded;
                }
            } else {
                headers['Content-Type'] = 'application/x-www-form-urlencoded';
                fetchOpts.body = formEncoded;
            }
        }

        try {
            const res = await fetchImpl(url, fetchOpts);
            const text = await res.text();
            let response = null;

            try {
                response = JSON.parse(text);
            } catch (error) {
                response = null;
            }

            if (!response) {
                onServerError(text);
                return;
            }

            if (response.result) {
                onSuccess(response);
                return;
            }

            let msg = response.title || 'Произошла ошибка:\n';
            if (Array.isArray(response.errors)) {
                response.errors.forEach((error) => {
                    if (typeof error.field !== 'undefined') {
                        msg += `${error.field} :\t`;
                    }
                    if (typeof error.message !== 'undefined') {
                        msg += `${error.message}\n`;
                    } else {
                        msg += `${error}\n`;
                    }
                });
            }

            alert(msg);
            if (onUserError) onUserError(response);
        } catch (error) {
            console.error(error);
            onServerError(error.toString());
        }
    };
};

export default createRequestClient;
