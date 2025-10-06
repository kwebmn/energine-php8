const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

export const ScriptLoader = {
    load() {},
};

export function serializeToFormEncoded(obj, prefix) {
    const str = [];

    for (const key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) {
            continue;
        }

        const propKey = prefix ? `${prefix}[${key}]` : key;
        const value = obj[key];

        if (typeof value === 'object' && value !== null && !(value instanceof File)) {
            str.push(serializeToFormEncoded(value, propKey));
        } else {
            str.push(`${encodeURIComponent(propKey)}=${encodeURIComponent(value)}`);
        }
    }

    return str.join('&');
}

const translations = {
    get(constant) {
        return Object.prototype.hasOwnProperty.call(translations, constant)
            ? translations[constant]
            : null;
    },
    set(constant, translation) {
        translations[constant] = translation;
    },
    extend(obj) {
        Object.assign(translations, obj);
    },
};

const energineState = {
    debug: false,
    base: '',
    static: '',
    resizer: '',
    media: '',
    root: '',
    lang: '',
    translations,
    forceJSON: false,
    supportContentEdit: true,
    tasks: [],

    async request(uri, data, onSuccess, onUserError, onServerError = () => {}, method = 'post') {
        let url = uri + (energineState.forceJSON ? '?json' : '');
        const isGet = method.toLowerCase() === 'get';
        const headers = { 'X-Request': 'json' };
        const fetchOpts = { method: method.toUpperCase(), headers };

        if (energineState.forceJSON) {
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
            const formEncoded = serializeToFormEncoded(data || {});
            if (isGet) {
                url += (url.includes('?') ? '&' : '?') + formEncoded;
            } else {
                headers['Content-Type'] = 'application/x-www-form-urlencoded';
                fetchOpts.body = formEncoded;
            }
        }

        try {
            const res = await fetch(url, fetchOpts);
            const text = await res.text();
            let response;

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
        } catch (e) {
            console.error(e);
            onServerError(e.toString());
        }
    },

    cancelEvent(e) {
        const event = e || (typeof window !== 'undefined' ? window.event : undefined);
        try {
            if (event && event.preventDefault) {
                event.stopPropagation();
                event.preventDefault();
            } else if (event) {
                event.returnValue = false;
                event.cancelBubble = true;
            }
        } catch (err) {
            console.warn(err);
        }
    },

    resize(img, src, w, h, r = '') {
        if (!img) return;
        img.setAttribute('src', `${energineState.resizer}${r}w${w}-h${h}/${src}`);
    },

    confirmBox(message, yes, no) {
        if (typeof Swal === 'undefined') {
            if (confirm(message)) {
                if (yes) yes();
            } else if (no) {
                no();
            }
            return;
        }

        Swal.fire({
            title: message,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes',
            cancelButtonText: 'No',
        }).then((result) => {
            if (result.isConfirmed && yes) {
                yes();
            } else if (no) {
                no();
            }
        });
    },

    alertBox(message) {
        if (typeof Swal === 'undefined') {
            alert(message);
            return;
        }

        Swal.fire({
            title: message,
            icon: 'error',
        });
    },

    noticeBox(message, icon, callback) {
        if (typeof Swal === 'undefined') {
            alert(message);
            if (callback) callback();
            return;
        }

        Swal.fire({
            icon,
            title: message,
            timer: 1500,
        }).then(() => {
            if (callback) callback();
        });
    },

    createDatePicker(/* datePickerId, nullable */) {
        // TODO: реализовать при переносе соответствующего функционала
    },

    createDateTimePicker(/* datePickerId, nullable */) {
        // TODO: реализовать при переносе соответствующего функционала
    },

    loadCSS(file) {
        if (typeof document === 'undefined') return;
        if (!document.querySelector(`link[href$="${file}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = file;
            document.head.appendChild(link);
        }
    },

    addTask(task, priority = 5) {
        if (!energineState.tasks[priority]) {
            energineState.tasks[priority] = [];
        }
        energineState.tasks[priority].push(task);
    },

    run() {
        if (!energineState.tasks) {
            return;
        }

        for (const priority of energineState.tasks) {
            if (!priority) continue;
            for (const func of priority) {
                try {
                    func();
                } catch (e) {
                    safeConsoleError(e);
                }
            }
        }
    },
};

export function bootEnergine(config = {}) {
    const { translations: translationsConfig, tasks, ...rest } = config;

    Object.assign(energineState, rest);

    if (translationsConfig) {
        translations.extend(translationsConfig);
    }

    if (Array.isArray(tasks)) {
        energineState.tasks = tasks;
    }

    return energineState;
}

export function stageTranslations(values) {
    if (!values || typeof values !== 'object') {
        return;
    }

    if (globalScope && globalScope.__energineBridge && typeof globalScope.__energineBridge.extendTranslations === 'function') {
        globalScope.__energineBridge.extendTranslations(values);
        return;
    }

    translations.extend(values);
}

export function queueTask(task, priority = 5) {
    if (typeof task !== 'function') {
        return;
    }

    if (globalScope && globalScope.__energineBridge && typeof globalScope.__energineBridge.queueTask === 'function') {
        globalScope.__energineBridge.queueTask(task, priority);
        return;
    }

    energineState.addTask(task, priority);
}

export function createConfigFromProps(props = {}) {
    const config = { ...props };

    const normalizeBoolean = (value) => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        if (typeof value === 'string') {
            return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
        }
        return Boolean(value);
    };

    if (Object.prototype.hasOwnProperty.call(config, 'debug')) {
        config.debug = normalizeBoolean(config.debug);
    }
    if (Object.prototype.hasOwnProperty.call(config, 'forceJSON')) {
        config.forceJSON = normalizeBoolean(config.forceJSON);
    }
    if (Object.prototype.hasOwnProperty.call(config, 'supportContentEdit')) {
        config.supportContentEdit = normalizeBoolean(config.supportContentEdit);
    }
    if (Object.prototype.hasOwnProperty.call(config, 'singleMode')) {
        config.singleMode = normalizeBoolean(config.singleMode);
    }

    return config;
}

export function safeConsoleError(e, context = '') {
    if (typeof console === 'undefined' || !console.error || !console.groupCollapsed) {
        return;
    }

    const message = (e && e.message) ? e.message : e;

    console.groupCollapsed(
        `%c[App Error]%c ${context ? `[${context}] ` : ''}%c${message}`,
        'color:#fff; background:#dc3545; padding:2px 6px; border-radius:3px;',
        'color:#aaa; font-size:11px;',
        'color:#dc3545;'
    );

    if (e && e.stack) {
        console.error('%cStack trace:', 'color:#888');
        console.error(`%c${e.stack}`, 'color:#dc3545; font-size:12px;');
    } else {
        console.error(e);
    }

    console.info(
        `%c${new Date().toLocaleString()}`,
        'color:#888; font-size:10px;'
    );

    console.groupEnd();
}

export function showLoader(container = (typeof document !== 'undefined' ? document.body : undefined)) {
    if (!container || typeof document === 'undefined' || typeof window === 'undefined') {
        return;
    }

    if (!container.querySelector('.global-loader')) {
        const loader = document.createElement('div');
        loader.className = 'global-loader d-flex justify-content-center align-items-center position-absolute top-0 start-0 w-100 h-100 bg-white bg-opacity-75';
        loader.style.zIndex = 9999;
        loader.innerHTML = `
            <div class="spinner-border text-primary" role="status" style="width:3rem; height:3rem;">
                <span class="visually-hidden">Loading...</span>
            </div>
        `;
        const style = window.getComputedStyle(container);
        if (style.position === 'static' || !style.position) {
            container.style.position = 'relative';
        }
        container.appendChild(loader);
    }
}

export function hideLoader(container = (typeof document !== 'undefined' ? document.body : undefined)) {
    if (!container || typeof document === 'undefined') {
        return;
    }

    const loader = container.querySelector('.global-loader');
    if (loader) {
        loader.remove();
    }
}

export function attachToWindow(target = globalScope, runtime = energineState) {
    if (!target) {
        return runtime;
    }

    target.ScriptLoader = ScriptLoader;
    target.safeConsoleError = safeConsoleError;
    target.showLoader = showLoader;
    target.hideLoader = hideLoader;
    target.Energine = runtime;

    return runtime;
}

const existingConfig = (() => {
    if (!globalScope) {
        return undefined;
    }
    if (globalScope.__energineBridge && globalScope.__energineBridge.pendingConfig) {
        return { ...globalScope.__energineBridge.pendingConfig };
    }
    if (typeof globalScope.Energine === 'object') {
        return { ...globalScope.Energine };
    }
    return undefined;
})();

if (existingConfig && Object.keys(existingConfig).length) {
    bootEnergine(existingConfig);
}

if (globalScope && !globalScope.__energineBridge) {
    attachToWindow(globalScope);
}

export default energineState;
