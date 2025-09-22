// --- ScriptLoader глобально ---
window.ScriptLoader = {
    load() {}
};

// --- Вспомогательная функция: сериализация данных ---
function serializeToFormEncoded(obj, prefix) {
    const str = [];
    for (const p in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, p)) continue;

        const k = prefix ? `${prefix}[${p}]` : p;
        const v = obj[p];

        if (typeof v === "object" && v !== null && !(v instanceof File)) {
            str.push(serializeToFormEncoded(v, k));
        } else {
            str.push(encodeURIComponent(k) + "=" + encodeURIComponent(v));
        }
    }
    return str.join("&");
}

const isElementLike = (value) => {
    if (!value) return false;
    return value === window
        || value === document
        || value instanceof Element
        || (typeof DocumentFragment !== 'undefined' && value instanceof DocumentFragment);
};

const isCollectionLike = (value) => {
    if (!value) return false;
    return Array.isArray(value)
        || (typeof NodeList !== 'undefined' && value instanceof NodeList)
        || (typeof HTMLCollection !== 'undefined' && value instanceof HTMLCollection);
};

const toArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.slice();
    if (typeof NodeList !== 'undefined' && value instanceof NodeList) return Array.from(value);
    if (typeof HTMLCollection !== 'undefined' && value instanceof HTMLCollection) return Array.from(value);
    return [value];
};

const toElementArray = (target, { context = document } = {}) => {
    if (!target) return [];

    if (typeof target === 'string') {
        const trimmed = target.trim();
        if (!trimmed) return [];

        const root = context || document;
        const results = new Set();

        const add = (element) => {
            if (element) results.add(element);
        };

        const resolveBySelector = (selector, scope) => {
            try {
                scope.querySelectorAll(selector).forEach(add);
            } catch (err) {
                // ignore selector errors, fall back to id search
            }
        };

        const looksLikeSelector = /[#.\[\s:]/.test(trimmed);

        if (!looksLikeSelector) {
            const byId = (typeof root.getElementById === 'function' ? root.getElementById(trimmed) : null)
                || document.getElementById(trimmed);
            add(byId);
        }

        if (!results.size) {
            resolveBySelector(trimmed, root);
            if (!results.size && root !== document) {
                resolveBySelector(trimmed, document);
            }
        }

        return Array.from(results);
    }

    if (isElementLike(target)) {
        return [target];
    }

    if (target && typeof target.jquery !== 'undefined') {
        return toElementArray(target.get ? target.get() : target.toArray(), { context });
    }

    if (isCollectionLike(target)) {
        return toArray(target).flatMap((item) => toElementArray(item, { context }));
    }

    return [];
};

const resolveElement = (target, { context = document, optional = false, name } = {}) => {
    const elements = toElementArray(target, { context });
    if (elements.length) {
        return elements[0];
    }

    if (optional) {
        return null;
    }

    const label = name || 'Element';
    throw new Error(`${label}: selector "${target}" did not match any element`);
};

const resolveElements = (target, options = {}) => toElementArray(target, options);

const bindAll = (instance, methods = []) => {
    if (!instance || !Array.isArray(methods)) {
        return instance;
    }

    methods.forEach((methodName) => {
        if (typeof methodName !== 'string') {
            return;
        }
        const fn = instance[methodName];
        if (typeof fn === 'function') {
            instance[methodName] = fn.bind(instance);
        }
    });

    return instance;
};

const safeCall = (fn, args = [], context = undefined) => {
    if (typeof fn !== 'function') {
        return undefined;
    }

    const normalizedArgs = Array.isArray(args) ? args : [args];
    return fn.apply(context ?? null, normalizedArgs);
};

const utils = {
    resolveElement,
    resolveElements,
    toArray,
    toElementArray,
    bindAll,
    safeCall,
    isNodeCollection: isCollectionLike
};

// --- Energine глобально ---
window.Energine = {
    debug: false,
    base: '',
    static: '',
    resizer: '',
    media: '',
    root: '',
    lang: '',
    translations: {
        get(constant) {
            return (window.Energine.translations[constant] || null);
        },
        set(constant, translation) {
            window.Energine.translations[constant] = translation;
        },
        extend(obj) {
            Object.assign(window.Energine.translations, obj);
        }
    },
    forceJSON: false,
    supportContentEdit: true,
    tasks: [],

    // --- Универсальный AJAX-запрос ---
    request: async function(uri, data, onSuccess, onUserError, onServerError = () => {}, method = 'post') {
        let url = uri + (window.Energine.forceJSON ? '?json' : '');
        const isGet = method.toLowerCase() === 'get';
        const headers = { 'X-Request': 'json' };
        const fetchOpts = { method: method.toUpperCase(), headers };

        if (window.Energine.forceJSON) {
            headers['Content-Type'] = 'application/json';
            if (!isGet) {
                fetchOpts.body = JSON.stringify(data);
            } else if (data) {
                const params = new URLSearchParams(data).toString();
                url += (url.includes('?') ? '&' : '?') + params;
            }
        } else {
            if (typeof data === 'string') {
                headers['Content-Type'] = 'application/x-www-form-urlencoded';
                fetchOpts.body = data;
            } else {
                const formEncoded = serializeToFormEncoded(data);
                if (isGet) {
                    url += (url.includes('?') ? '&' : '?') + formEncoded;
                } else {
                    headers['Content-Type'] = 'application/x-www-form-urlencoded';
                    fetchOpts.body = formEncoded;
                }
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

            if (!response) return onServerError(text);

            if (response.result) {
                safeCall(onSuccess, [response]);
            } else {
                let msg = response.title || 'Произошла ошибка:\n';
                if (Array.isArray(response.errors)) {
                    response.errors.forEach(error => {
                        if (typeof error.field !== 'undefined') {
                            msg += error.field + " :\t";
                        }
                        if (typeof error.message !== 'undefined') {
                            msg += error.message + "\n";
                        } else {
                            msg += error + "\n";
                        }
                    });
                }
                alert(msg);
                safeCall(onUserError, [response]);
            }
        } catch (e) {
            console.error(e);
            onServerError(e.toString());
        }
    },

    cancelEvent(e) {
        e = e || window.event;
        try {
            if (e.preventDefault) {
                e.stopPropagation();
                e.preventDefault();
            } else {
                e.returnValue = false;
                e.cancelBubble = true;
            }
        } catch (err) {
            console.warn(err);
        }
    },

    resize(img, src, w, h, r = '') {
        img.setAttribute('src', `${window.Energine.resizer}${r}w${w}-h${h}/${src}`);
    },

    confirmBox(message, yes, no) {
        if (typeof Swal === 'undefined') {
            if (confirm(message)) {
                if (yes) yes();
            } else {
                if (no) no();
            }
        } else {
            Swal.fire({
                title: message,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Yes",
                cancelButtonText: "No",
            }).then((result) => {
                if (result.isConfirmed && yes) yes();
                else if (no) no();
            });
        }
    },

    alertBox(message) {
        if (typeof Swal === 'undefined') {
            alert(message);
        } else {
            Swal.fire({
                title: message,
                icon: "error",
            });
        }
    },

    noticeBox(message, icon, callback) {
        if (typeof Swal === 'undefined') {
            alert(message);
            safeCall(callback);
        } else {
            Swal.fire({
                icon,
                title: message,
                timer: 1500
            }).then(() => {
                safeCall(callback);
            });
        }
    },

    createDatePicker: function(datePickerId, nullable) {

    },


    createDateTimePicker: function(datePickerId, nullable) {

    },

    loadCSS: function(file) {
        if (!document.querySelector(`link[href$="${file}"]`)) {
            const link = document.createElement('link');
            link.rel = "stylesheet";
            link.href = file;
            document.head.appendChild(link);
        }
    },

    addTask: function(task, priority = 5)
    {
        if (!Energine.tasks[priority])
        {
            Energine.tasks[priority] = [];
        }
        Energine.tasks[priority].push(task);

    },

    run: function()
    {
        if (Energine.tasks)
        {
            for (const priority of Energine.tasks) {
                if (priority)
                {
                    for (const func of priority) {
                        try {
                            func();
                        }
                        catch (e) {
                            safeConsoleError(e);
                        }
                    }
                }
            }
        }
    }
};

window.Energine.utils = Object.assign({}, window.Energine.utils || {}, utils);

// --- safeConsoleError глобально ---
// window.safeConsoleError = function (e) {
//     if (window.console && console.error) {
//         console.error(e && e.stack ? e.stack : e);
//     }
// };

window.safeConsoleError = function (e, context = '') {
    if (!window.console || !console.error) return;

    // Определяем сообщение
    const msg = (e && e.message) ? e.message : e;

    // Группируем ошибку
    console.groupCollapsed(
        `%c[App Error]%c ${context ? '[' + context + '] ' : ''}%c${msg}`,
        'color:#fff; background:#dc3545; padding:2px 6px; border-radius:3px;',
        'color:#aaa; font-size:11px;',
        'color:#dc3545;'
    );

    // Если есть stack — выделяем цветом
    if (e && e.stack) {
        console.error('%cStack trace:', 'color:#888');
        console.error('%c' + e.stack, 'color:#dc3545; font-size:12px;');
    } else {
        console.error(e);
    }

    // Показываем время ошибки
    console.info(
        '%c' + new Date().toLocaleString(),
        'color:#888; font-size:10px;'
    );

    console.groupEnd();
};

window.showLoader = function(container = document.body) {
    if (!container.querySelector('.global-loader')) {
        const loader = document.createElement('div');
        loader.className = 'global-loader d-flex justify-content-center align-items-center position-absolute top-0 start-0 w-100 h-100 bg-white bg-opacity-75';
        loader.style.zIndex = 9999;
        loader.innerHTML = `
            <div class="spinner-border text-primary" role="status" style="width:3rem; height:3rem;">
                <span class="visually-hidden">Loading...</span>
            </div>
        `;
        // Добавим position: relative контейнеру, если надо
        const style = window.getComputedStyle(container);
        if (style.position === 'static' || !style.position) {
            container.style.position = 'relative';
        }
        container.appendChild(loader);
    }
};

window.hideLoader = function(container = document.body) {
    const loader = container.querySelector('.global-loader');
    if (loader) loader.remove();
};

window.Energine = Energine;