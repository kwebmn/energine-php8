const networkState = {
    forceJSON: false,
};

export const getNetworkOptions = () => ({ ...networkState });

export const configureNetwork = (options = {}) => {
    if (Object.prototype.hasOwnProperty.call(options, 'forceJSON')) {
        networkState.forceJSON = Boolean(options.forceJSON);
    }
};

export const serializeToFormEncoded = (obj, prefix) => {
    if (!obj || typeof obj !== 'object') {
        return '';
    }

    const pairs = [];

    Object.keys(obj).forEach((key) => {
        const value = obj[key];
        if (typeof value === 'undefined') {
            return;
        }

        const propKey = prefix ? `${prefix}[${key}]` : key;

        if (value && typeof value === 'object' && !(value instanceof File)) {
            pairs.push(serializeToFormEncoded(value, propKey));
        } else {
            pairs.push(`${encodeURIComponent(propKey)}=${encodeURIComponent(value ?? '')}`);
        }
    });

    return pairs.join('&');
};

export const request = async (
    uri,
    data,
    onSuccess,
    onUserError,
    onServerError = () => {},
    method = 'post',
) => {
    if (!uri) {
        return;
    }

    const forceJSON = networkState.forceJSON;
    let url = uri + (forceJSON ? '?json' : '');
    const isGet = method.toLowerCase() === 'get';
    const headers = { 'X-Request': 'json' };
    const fetchOpts = { method: method.toUpperCase(), headers };

    try {
        if (forceJSON) {
            headers['Content-Type'] = 'application/json';
            if (!isGet) {
                fetchOpts.body = JSON.stringify(data ?? {});
            } else if (data) {
                const params = new URLSearchParams(data).toString();
                url += (url.includes('?') ? '&' : '?') + params;
            }
        } else if (typeof data === 'string') {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            if (!isGet) {
                fetchOpts.body = data;
            } else if (data) {
                url += (url.includes('?') ? '&' : '?') + data;
            }
        } else {
            const formEncoded = serializeToFormEncoded(data || {});
            if (isGet) {
                if (formEncoded) {
                    url += (url.includes('?') ? '&' : '?') + formEncoded;
                }
            } else {
                headers['Content-Type'] = 'application/x-www-form-urlencoded';
                fetchOpts.body = formEncoded;
            }
        }

        const res = await fetch(url, fetchOpts);
        const text = await res.text();

        let response = null;
        try {
            response = JSON.parse(text);
        } catch {
            response = null;
        }

        if (!response) {
            onServerError(text);
            return;
        }

        if (response.result) {
            if (typeof onSuccess === 'function') {
                onSuccess(response);
            }
            return;
        }

        let msg = response.title || 'Произошла ошибка:\n';
        if (Array.isArray(response.errors)) {
            response.errors.forEach((error) => {
                if (typeof error === 'object' && error) {
                    if (typeof error.field !== 'undefined') {
                        msg += `${error.field} :\t`;
                    }
                    if (typeof error.message !== 'undefined') {
                        msg += `${error.message}\n`;
                    } else {
                        msg += `${error}\n`;
                    }
                } else if (typeof error !== 'undefined') {
                    msg += `${error}\n`;
                }
            });
        }
        if (typeof alert === 'function') {
            alert(msg);
        }
        if (typeof onUserError === 'function') {
            onUserError(response);
        }
    } catch (error) {
        console.error(error);
        onServerError(error?.toString?.() || 'Network error');
    }
};

export default {
    request,
    serializeToFormEncoded,
    configureNetwork,
    getNetworkOptions,
};
