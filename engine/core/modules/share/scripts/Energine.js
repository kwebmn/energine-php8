// --- ScriptLoader глобально ---
window.ScriptLoader = {
    load() {}
};

// --- Вспомогательная функция: сериализация данных ---
function serializeToFormEncoded(obj, prefix) {
    const str = [];
    for (const p in obj) {
        if (!obj.hasOwnProperty(p)) continue;

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

// --- Energine глобально ---
window.Energine = {
    debug: false,
    base: '',
    static: '',
    resizer: '',
    media: '',
    root: '',
    lang: '',
    _assetRegistry: {
        scripts: new Map(),
        styles: new Map(),
    },
    _resolveAssetURL(file) {
        if (!file) {
            return file;
        }
        if (/^(?:[a-z]+:)?\/\//i.test(file) || file.startsWith('/')) {
            return file;
        }
        const base = this.static || '';
        if (!base) {
            return file;
        }
        const separator = base.endsWith('/') ? '' : '/';
        return `${base}${separator}${file.replace(/^\//, '')}`;
    },
    _normalizeAssetURL(file) {
        try {
            return new URL(file, document.baseURI).href;
        } catch (e) {
            if (typeof safeConsoleError === 'function') {
                safeConsoleError(e, 'normalizeAssetURL');
            } else if (window.console && console.error) {
                console.error(e);
            }
            return file;
        }
    },
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
                onSuccess(response);
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
                let handled = false;
                if (onUserError) {
                    try {
                        handled = onUserError(response, msg) === true;
                    } catch (callbackError) {
                        if (typeof safeConsoleError === 'function') {
                            safeConsoleError(callbackError, 'Energine.request:onUserError');
                        } else if (console && console.error) {
                            console.error(callbackError);
                        }
                    }
                }
                if (!handled) {
                    alert(msg);
                }
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
            if (callback) callback();
        } else {
            Swal.fire({
                icon,
                title: message,
                timer: 1500
            }).then(() => {
                if (callback) callback();
            });
        }
    },

    createDatePicker: function(datePickerId, nullable) {

    },


    createDateTimePicker: function(datePickerId, nullable) {

    },

    loadCSS: function(file) {
        const resolved = this._resolveAssetURL(file);
        const href = this._normalizeAssetURL(resolved);

        if (this._assetRegistry.styles.has(href)) {
            return this._assetRegistry.styles.get(href);
        }

        const existing = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
            .find(link => link.href === href);
        if (existing) {
            const ready = existing.sheet ? Promise.resolve(existing) : new Promise(resolve => {
                existing.addEventListener('load', () => resolve(existing), { once: true });
            });
            this._assetRegistry.styles.set(href, ready);
            return ready;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = resolved;
        link.dataset.energineAsset = 'css';

        const ready = new Promise((resolve, reject) => {
            link.addEventListener('load', () => resolve(link), { once: true });
            link.addEventListener('error', () => {
                this._assetRegistry.styles.delete(href);
                reject(new Error(`Failed to load stylesheet ${href}`));
            }, { once: true });
        });

        this._assetRegistry.styles.set(href, ready);
        document.head.appendChild(link);

        return ready;
    },

    loadScript: function(file) {
        const resolved = this._resolveAssetURL(file);
        const src = this._normalizeAssetURL(resolved);

        if (this._assetRegistry.scripts.has(src)) {
            return this._assetRegistry.scripts.get(src);
        }

        const existing = Array.from(document.querySelectorAll('script[src]'))
            .find(script => script.src === src);
        if (existing) {
            const ready = existing.dataset.loaded === 'true'
                ? Promise.resolve(existing)
                : new Promise((resolve, reject) => {
                    existing.addEventListener('load', () => resolve(existing), { once: true });
                    existing.addEventListener('error', () => {
                        this._assetRegistry.scripts.delete(src);
                        reject(new Error(`Failed to load script ${src}`));
                    }, { once: true });
                });
            this._assetRegistry.scripts.set(src, ready);
            return ready;
        }

        const script = document.createElement('script');
        script.src = resolved;
        script.async = false;
        script.defer = false;
        script.dataset.energineAsset = 'script';

        const ready = new Promise((resolve, reject) => {
            script.addEventListener('load', () => {
                script.dataset.loaded = 'true';
                resolve(script);
            }, { once: true });
            script.addEventListener('error', () => {
                this._assetRegistry.scripts.delete(src);
                reject(new Error(`Failed to load script ${src}`));
            }, { once: true });
        });

        this._assetRegistry.scripts.set(src, ready);
        document.head.appendChild(script);

        return ready;
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

Window.Energine = Energine;
