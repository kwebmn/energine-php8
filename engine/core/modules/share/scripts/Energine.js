const globalScope = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});

const RESERVED_TRANSLATION_METHODS = new Set(['get', 'set', 'extend']);
const DEFAULT_TRANSLATION_SCOPE = 'global';
const translationStore = Object.create(null);
const translationScopes = Object.create(null);

const translationsCore = {};
Object.defineProperties(translationsCore, {
    get: {
        value(constant) {
            if (typeof constant !== 'string') {
                return null;
            }
            return Object.prototype.hasOwnProperty.call(translationStore, constant)
                ? translationStore[constant]
                : null;
        },
        enumerable: false,
    },
    set: {
        value(constant, translation) {
            if (typeof constant !== 'string') {
                return translation;
            }
            translationStore[constant] = translation;
            return translation;
        },
        enumerable: false,
    },
    extend: {
        value(dictionary) {
            if (!dictionary || typeof dictionary !== 'object') {
                return translations;
            }
            Object.keys(dictionary).forEach((key) => {
                translationStore[key] = dictionary[key];
            });
            return translations;
        },
        enumerable: false,
    },
});

const translations = new Proxy(translationsCore, {
    get(target, prop, receiver) {
        if (typeof prop === 'string' && !Reflect.has(target, prop) && Object.prototype.hasOwnProperty.call(translationStore, prop)) {
            return translationStore[prop];
        }
        return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
        if (typeof prop === 'string' && !RESERVED_TRANSLATION_METHODS.has(prop)) {
            translationStore[prop] = value;
            return true;
        }
        return Reflect.set(target, prop, value, receiver);
    },
    has(target, prop) {
        if (typeof prop === 'string' && Object.prototype.hasOwnProperty.call(translationStore, prop)) {
            return true;
        }
        return Reflect.has(target, prop);
    },
    ownKeys(target) {
        const baseKeys = Reflect.ownKeys(target).filter((key) => !RESERVED_TRANSLATION_METHODS.has(key));
        const dataKeys = Object.keys(translationStore);
        return Array.from(new Set([...baseKeys, ...dataKeys]));
    },
    getOwnPropertyDescriptor(target, prop) {
        if (typeof prop === 'string' && Object.prototype.hasOwnProperty.call(translationStore, prop)) {
            return {
                configurable: true,
                enumerable: true,
                value: translationStore[prop],
                writable: true,
            };
        }
        return Reflect.getOwnPropertyDescriptor(target, prop);
    },
});

const taskQueue = [];
const configStore = {
    debug: false,
    base: '',
    static: '',
    resizer: '',
    media: '',
    root: '',
    lang: '',
    singleMode: false,
};

function parseBoolean(value) {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'number') {
        return value !== 0;
    }
    if (typeof value !== 'string') {
        return false;
    }
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function serializeToFormEncoded(obj, prefix) {
    if (obj === null || typeof obj === 'undefined') {
        return '';
    }

    if (typeof URLSearchParams !== 'undefined' && obj instanceof URLSearchParams) {
        return obj.toString();
    }

    if (typeof FormData !== 'undefined' && obj instanceof FormData) {
        const params = new URLSearchParams();
        for (const [key, value] of obj.entries()) {
            params.append(prefix ? `${prefix}[${key}]` : key, value);
        }
        return params.toString();
    }

    if (typeof obj !== 'object') {
        if (!prefix) {
            return encodeURIComponent(String(obj));
        }
        return `${encodeURIComponent(prefix)}=${encodeURIComponent(String(obj))}`;
    }

    const str = [];
    Object.keys(obj).forEach((prop) => {
        if (!Object.prototype.hasOwnProperty.call(obj, prop)) {
            return;
        }
        const key = prefix ? `${prefix}[${prop}]` : prop;
        const value = obj[prop];
        if (typeof value === 'object' && value !== null && !(value instanceof File) && !(value instanceof Date)) {
            const nested = serializeToFormEncoded(value, key);
            if (nested) {
                str.push(nested);
            }
        } else {
            const encodedValue = value instanceof Date ? value.toISOString() : value;
            str.push(`${encodeURIComponent(key)}=${encodeURIComponent(encodedValue ?? '')}`);
        }
    });
    return str.join('&');
}

async function request(uri, data, onSuccess, onUserError, onServerError = () => {}, method = 'post') {
    const methodName = typeof method === 'string' ? method.toUpperCase() : 'POST';
    const isGet = methodName === 'GET';
    let url = uri + (Energine.forceJSON ? '?json' : '');
    const headers = { 'X-Request': 'json' };
    const options = { method: methodName, headers };

    if (Energine.forceJSON) {
        headers['Content-Type'] = 'application/json';
        if (isGet) {
            if (data) {
                let params = '';
                if (typeof data === 'string') {
                    params = data;
                } else if (typeof URLSearchParams !== 'undefined' && data instanceof URLSearchParams) {
                    params = data.toString();
                } else if (typeof data === 'object') {
                    params = new URLSearchParams(data).toString();
                }
                if (params) {
                    url += (url.includes('?') ? '&' : '?') + params;
                }
            }
        } else if (typeof data !== 'undefined') {
            options.body = typeof data === 'string' ? data : JSON.stringify(data);
        }
    } else if (isGet) {
        if (data) {
            const query = typeof data === 'string' ? data : serializeToFormEncoded(data);
            if (query) {
                url += (url.includes('?') ? '&' : '?') + query;
            }
        }
    } else if (typeof data === 'string') {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        options.body = data;
    } else if (data instanceof FormData) {
        options.body = data;
        delete headers['Content-Type'];
    } else if (typeof data === 'object' && data !== null) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        options.body = serializeToFormEncoded(data);
    }

    try {
        const response = await fetch(url, options);
        const text = await response.text();
        let payload = null;

        try {
            payload = JSON.parse(text);
        } catch (error) {
            payload = null;
        }

        if (!payload) {
            onServerError(text);
            return;
        }

        if (payload.result) {
            if (typeof onSuccess === 'function') {
                onSuccess(payload);
            }
        } else {
            let message = payload.title || 'Произошла ошибка:\n';
            if (Array.isArray(payload.errors)) {
                payload.errors.forEach((error) => {
                    if (typeof error === 'object' && error !== null) {
                        if (typeof error.field !== 'undefined') {
                            message += `${error.field} :\t`;
                        }
                        if (typeof error.message !== 'undefined') {
                            message += `${error.message}\n`;
                        } else {
                            message += `${error}\n`;
                        }
                    } else if (typeof error !== 'undefined') {
                        message += `${error}\n`;
                    }
                });
            }
            if (globalScope.alert) {
                globalScope.alert(message);
            } else if (globalScope.console && typeof globalScope.console.warn === 'function') {
                globalScope.console.warn(message);
            }
            if (typeof onUserError === 'function') {
                onUserError(payload);
            }
        }
    } catch (error) {
        if (globalScope.console && typeof globalScope.console.error === 'function') {
            globalScope.console.error(error);
        }
        onServerError(String(error));
    }
}

function cancelEvent(event) {
    const e = event || globalScope.event;
    if (!e) {
        return;
    }
    try {
        if (typeof e.preventDefault === 'function') {
            e.preventDefault();
            if (typeof e.stopPropagation === 'function') {
                e.stopPropagation();
            }
        } else {
            e.returnValue = false;
            e.cancelBubble = true;
        }
    } catch (error) {
        if (globalScope.console && typeof globalScope.console.warn === 'function') {
            globalScope.console.warn(error);
        }
    }
}

function resize(img, src, width, height, rules = '') {
    if (!img) {
        return;
    }
    const base = Energine.resizer || '';
    img.setAttribute('src', `${base}${rules}w${width}-h${height}/${src}`);
}

function confirmBox(message, yes, no) {
    if (typeof globalScope.Swal === 'undefined') {
        const confirmed = globalScope.confirm ? globalScope.confirm(message) : false;
        if (confirmed) {
            if (typeof yes === 'function') {
                yes();
            }
        } else if (typeof no === 'function') {
            no();
        }
        return;
    }

    globalScope.Swal.fire({
        title: message,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
    }).then((result) => {
        if (result.isConfirmed) {
            if (typeof yes === 'function') {
                yes();
            }
        } else if (typeof no === 'function') {
            no();
        }
    });
}

function alertBox(message) {
    if (typeof globalScope.Swal === 'undefined') {
        if (globalScope.alert) {
            globalScope.alert(message);
        }
        return;
    }
    globalScope.Swal.fire({
        title: message,
        icon: 'error',
    });
}

function noticeBox(message, icon, callback) {
    if (typeof globalScope.Swal === 'undefined') {
        if (globalScope.alert) {
            globalScope.alert(message);
        }
        if (typeof callback === 'function') {
            callback();
        }
        return;
    }
    globalScope.Swal.fire({
        icon,
        title: message,
        timer: 1500,
        showConfirmButton: false,
    }).then(() => {
        if (typeof callback === 'function') {
            callback();
        }
    });
}

function createDatePicker() {
    // Placeholder for future date picker integration.
    return null;
}

function createDateTimePicker() {
    // Placeholder for future datetime picker integration.
    return null;
}

function loadCSS(file) {
    if (!globalScope.document) {
        return;
    }
    const selector = `link[href$="${file}"]`;
    if (globalScope.document.querySelector(selector)) {
        return;
    }
    const link = globalScope.document.createElement('link');
    link.rel = 'stylesheet';
    link.href = file;
    globalScope.document.head.appendChild(link);
}

function addTask(task, priority = 5) {
    if (typeof task !== 'function') {
        return;
    }
    const index = Number.isFinite(priority) ? Math.max(0, Math.floor(priority)) : 5;
    if (!Array.isArray(taskQueue[index])) {
        taskQueue[index] = [];
    }
    taskQueue[index].push(task);
}

function runTasks() {
    taskQueue.forEach((priorityTasks) => {
        if (!Array.isArray(priorityTasks)) {
            return;
        }
        priorityTasks.forEach((task) => {
            if (typeof task !== 'function') {
                return;
            }
            try {
                task();
            } catch (error) {
                safeConsoleError(error);
            }
        });
    });
}

function safeConsoleError(error, context = '') {
    const consoleRef = globalScope.console;
    if (!consoleRef || typeof consoleRef.error !== 'function') {
        return;
    }
    const message = error && typeof error === 'object' && 'message' in error ? error.message : error;
    if (typeof consoleRef.groupCollapsed === 'function' && typeof consoleRef.groupEnd === 'function') {
        consoleRef.groupCollapsed(
            `%c[App Error]%c ${context ? `[${context}] ` : ''}%c${message}`,
            'color:#fff; background:#dc3545; padding:2px 6px; border-radius:3px;',
            'color:#aaa; font-size:11px;',
            'color:#dc3545;'
        );
    }
    if (error && typeof error === 'object' && 'stack' in error && error.stack) {
        consoleRef.error('%cStack trace:', 'color:#888');
        consoleRef.error(`%c${error.stack}`, 'color:#dc3545; font-size:12px;');
    } else {
        consoleRef.error(error);
    }
    if (typeof consoleRef.info === 'function') {
        consoleRef.info('%c' + new Date().toLocaleString(), 'color:#888; font-size:10px;');
    }
    if (typeof consoleRef.groupEnd === 'function') {
        consoleRef.groupEnd();
    }
}

function ensureScopeContainer(container) {
    if (container) {
        return container;
    }
    if (globalScope.document) {
        return globalScope.document.body || globalScope.document.documentElement;
    }
    return null;
}

function showLoader(container = globalScope.document ? globalScope.document.body : null) {
    const target = ensureScopeContainer(container);
    if (!target || !target.querySelector) {
        return;
    }
    if (target.querySelector('.global-loader')) {
        return;
    }
    const doc = target.ownerDocument || globalScope.document;
    const loader = doc.createElement('div');
    loader.className = 'global-loader d-flex justify-content-center align-items-center position-absolute top-0 start-0 w-100 h-100 bg-white bg-opacity-75';
    loader.style.zIndex = 9999;
    loader.innerHTML = `
        <div class="spinner-border text-primary" role="status" style="width:3rem; height:3rem;">
            <span class="visually-hidden">Loading...</span>
        </div>
    `;
    const style = globalScope.getComputedStyle ? globalScope.getComputedStyle(target) : null;
    if (style && (style.position === 'static' || !style.position)) {
        target.style.position = 'relative';
    } else if (!style && target.style && (!target.style.position || target.style.position === '')) {
        target.style.position = 'relative';
    }
    target.appendChild(loader);
}

function hideLoader(container = globalScope.document ? globalScope.document.body : null) {
    const target = ensureScopeContainer(container);
    if (!target || !target.querySelector) {
        return;
    }
    const loader = target.querySelector('.global-loader');
    if (loader && typeof loader.remove === 'function') {
        loader.remove();
    } else if (loader && loader.parentNode) {
        loader.parentNode.removeChild(loader);
    }
}

function applyConfig(partialConfig) {
    if (!partialConfig || typeof partialConfig !== 'object') {
        return;
    }
    Object.keys(partialConfig).forEach((key) => {
        configStore[key] = partialConfig[key];
        if (!Object.prototype.hasOwnProperty.call(Energine, key)) {
            Object.defineProperty(Energine, key, {
                configurable: true,
                enumerable: true,
                get() {
                    return configStore[key];
                },
                set(value) {
                    configStore[key] = value;
                },
            });
        }
    });
}

function registerTranslations(dictionary, scope = DEFAULT_TRANSLATION_SCOPE) {
    if (!dictionary || typeof dictionary !== 'object') {
        return;
    }
    translations.extend(dictionary);
    const scopeName = scope || DEFAULT_TRANSLATION_SCOPE;
    if (!translationScopes[scopeName]) {
        translationScopes[scopeName] = {};
    }
    Object.assign(translationScopes[scopeName], dictionary);
}

function getTranslations(scope = DEFAULT_TRANSLATION_SCOPE) {
    const scopeName = scope || DEFAULT_TRANSLATION_SCOPE;
    return translationScopes[scopeName] ? { ...translationScopes[scopeName] } : {};
}

function readCoreConfig(documentRef) {
    if (!documentRef) {
        return;
    }
    const meta = documentRef.querySelector('meta[data-energine-config="core"]');
    if (!meta) {
        return;
    }
    const updates = {};
    const mapping = {
        debug: { attr: 'data-energine-config-debug', transform: parseBoolean },
        base: { attr: 'data-energine-config-base' },
        static: { attr: 'data-energine-config-static' },
        resizer: { attr: 'data-energine-config-resizer' },
        media: { attr: 'data-energine-config-media' },
        root: { attr: 'data-energine-config-root' },
        lang: { attr: 'data-energine-config-lang' },
        singleMode: { attr: 'data-energine-config-single-mode', transform: parseBoolean },
    };
    Object.keys(mapping).forEach((key) => {
        const descriptor = mapping[key];
        const value = meta.getAttribute(descriptor.attr);
        if (value === null || value === '') {
            return;
        }
        updates[key] = descriptor.transform ? descriptor.transform(value) : value;
    });
    if (Object.keys(updates).length) {
        Energine.setConfig(updates);
    }
}

function readTranslations(documentRef) {
    if (!documentRef) {
        return;
    }
    const metas = documentRef.querySelectorAll('meta[data-energine-translations]');
    metas.forEach((meta) => {
        const json = meta.getAttribute('data-energine-translations');
        if (!json) {
            return;
        }
        try {
            const dictionary = JSON.parse(json);
            const scope = meta.getAttribute('data-energine-translations-scope') || DEFAULT_TRANSLATION_SCOPE;
            registerTranslations(dictionary, scope);
        } catch (error) {
            safeConsoleError(error, 'Energine translations');
        }
    });
}

let bootstrapped = false;
function bootstrap(documentRef = globalScope.document, options = {}) {
    if (!documentRef) {
        return;
    }
    const force = options && typeof options === 'object' && options.force === true;
    if (force) {
        bootstrapped = false;
    }
    if (bootstrapped) {
        return;
    }
    readCoreConfig(documentRef);
    readTranslations(documentRef);
    bootstrapped = true;
}

const scriptLoader = (globalScope.ScriptLoader && typeof globalScope.ScriptLoader === 'object')
    ? globalScope.ScriptLoader
    : { load() {} };
if (typeof scriptLoader.load !== 'function') {
    scriptLoader.load = () => {};
}

const Energine = {
    translations,
    translationScopes,
    forceJSON: false,
    supportContentEdit: true,
    tasks: taskQueue,
    request,
    cancelEvent,
    resize,
    confirmBox,
    alertBox,
    noticeBox,
    createDatePicker,
    createDateTimePicker,
    loadCSS,
    addTask,
    run: runTasks,
    serializeToFormEncoded,
    safeConsoleError,
    showLoader,
    hideLoader,
    bootstrap,
    registerTranslations,
    getTranslations,
    setConfig(partial) {
        applyConfig(partial);
        return Energine;
    },
    getConfig() {
        return { ...configStore };
    },
    config: configStore,
};

Object.keys(configStore).forEach((key) => {
    Object.defineProperty(Energine, key, {
        configurable: true,
        enumerable: true,
        get() {
            return configStore[key];
        },
        set(value) {
            configStore[key] = value;
        },
    });
});

bootstrap();

if (globalScope) {
    globalScope.ScriptLoader = scriptLoader;
    globalScope.Energine = Energine;
    globalScope.safeConsoleError = safeConsoleError;
    globalScope.showLoader = showLoader;
    globalScope.hideLoader = hideLoader;
}

export default Energine;
export {
    Energine,
    translations,
    translationScopes,
    serializeToFormEncoded,
    request,
    cancelEvent,
    resize,
    confirmBox,
    alertBox,
    noticeBox,
    createDatePicker,
    createDateTimePicker,
    loadCSS,
    addTask,
    runTasks as run,
    bootstrap,
    registerTranslations,
    getTranslations,
    safeConsoleError,
    showLoader,
    hideLoader,
    scriptLoader as ScriptLoader,
};
