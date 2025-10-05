// --- ScriptLoader глобально ---
if (typeof window.ScriptLoader !== 'object' || window.ScriptLoader === null) {
    window.ScriptLoader = {
        load() {},
    };
}

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
const Energine = window.Energine = (typeof window.Energine === 'object' && window.Energine !== null) ? window.Energine : {};

if (typeof Energine.debug !== 'boolean') {
    Energine.debug = false;
}
if (typeof Energine.base !== 'string') {
    Energine.base = '';
}
if (typeof Energine.static !== 'string') {
    Energine.static = '';
}
if (typeof Energine.resizer !== 'string') {
    Energine.resizer = '';
}
if (typeof Energine.media !== 'string') {
    Energine.media = '';
}
if (typeof Energine.root !== 'string') {
    Energine.root = '';
}
if (typeof Energine.lang !== 'string') {
    Energine.lang = '';
}

if (typeof Energine.translations !== 'object' || Energine.translations === null) {
    Energine.translations = {};
}

Energine.translations.get = function (constant) {
    return (Energine.translations[constant] || null);
};

Energine.translations.set = function (constant, translation) {
    Energine.translations[constant] = translation;
};

Energine.translations.extend = function (obj) {
    Object.assign(Energine.translations, obj);
};

if (typeof Energine.forceJSON !== 'boolean') {
    Energine.forceJSON = false;
}
if (typeof Energine.supportContentEdit !== 'boolean') {
    Energine.supportContentEdit = true;
}

if (!Array.isArray(Energine.tasks)) {
    Energine.tasks = [];
}

// --- Универсальный AJAX-запрос ---
Energine.request = async function (uri, data, onSuccess, onUserError, onServerError = () => {}, method = 'post') {
    let url = uri + (Energine.forceJSON ? '?json' : '');
    const isGet = method.toLowerCase() === 'get';
    const headers = { 'X-Request': 'json' };
    const fetchOpts = { method: method.toUpperCase(), headers };

    if (Energine.forceJSON) {
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
            alert(msg);
            if (onUserError) onUserError(response);
        }
    } catch (e) {
        console.error(e);
        onServerError(e.toString());
    }
};

Energine.cancelEvent = function (e) {
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
};

Energine.resize = function (img, src, w, h, r = '') {
    img.setAttribute('src', `${Energine.resizer}${r}w${w}-h${h}/${src}`);
};

Energine.confirmBox = function (message, yes, no) {
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
};

Energine.alertBox = function (message) {
    if (typeof Swal === 'undefined') {
        alert(message);
    } else {
        Swal.fire({
            title: message,
            icon: "error",
        });
    }
};

Energine.noticeBox = function (message, icon, callback) {
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
};

Energine.createDatePicker = function (datePickerId, nullable) {

};

Energine.createDateTimePicker = function (datePickerId, nullable) {

};

Energine.loadCSS = function (file) {
    if (!document.querySelector(`link[href$="${file}"]`)) {
        const link = document.createElement('link');
        link.rel = "stylesheet";
        link.href = file;
        document.head.appendChild(link);
    }
};

Energine.addTask = function (task, priority = 5) {
    if (!Energine.tasks[priority]) {
        Energine.tasks[priority] = [];
    }
    Energine.tasks[priority].push(task);
};

Energine.run = function () {
    if (Energine.tasks) {
        for (const priority of Energine.tasks) {
            if (priority) {
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

window.Energine = Energine;
