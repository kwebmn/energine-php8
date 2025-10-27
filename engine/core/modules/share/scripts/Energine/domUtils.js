/**
 * Build resolver for module script element matching provided URL.
 *
 * @param {{
 *   documentRef: Document | null,
 *   getModuleUrl: () => string,
 *   getCachedElement: () => HTMLScriptElement | null,
 *   setCachedElement: (el: HTMLScriptElement | null) => void,
 * }} options
 * @returns {() => HTMLScriptElement | null}
 */
export const createModuleScriptResolver = ({ documentRef, getModuleUrl, getCachedElement, setCachedElement }) => () => {
    if (!documentRef) {
        return null;
    }

    const cachedElement = getCachedElement();
    if (cachedElement && documentRef.contains(cachedElement)) {
        return cachedElement;
    }

    const moduleUrl = getModuleUrl();
    if (!moduleUrl) {
        return null;
    }

    const scripts = documentRef.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i -= 1) {
        const script = scripts[i];
        if (script.type !== 'module' || !script.src) {
            continue;
        }

        try {
            const normalizedSrc = new URL(script.src, documentRef.baseURI).href;
            if (normalizedSrc === moduleUrl) {
                setCachedElement(script);
                return script;
            }
        } catch {
            // ignore malformed URLs
        }
    }

    setCachedElement(null);
    return null;
};

/**
 * Create event canceler with graceful degradation for legacy browsers.
 *
 * @param {any} scope
 * @returns {(event?: Event) => void}
 */
export const createEventCanceler = (scope) => (event) => {
    const evt = event || (scope ? scope.event : undefined);

    try {
        if (evt && typeof evt.preventDefault === 'function') {
            evt.stopPropagation();
            evt.preventDefault();
        } else if (evt) {
            // @ts-ignore legacy event support
            evt.returnValue = false;
            // @ts-ignore legacy event support
            evt.cancelBubble = true;
        }
    } catch (error) {
        if (typeof console !== 'undefined' && console.warn) {
            console.warn(error);
        }
    }
};

/**
 * Attach external stylesheet to the document if it is not already present.
 *
 * @param {Document | null} documentRef
 * @returns {(file: string) => void}
 */
export const createCSSLoader = (documentRef) => (file) => {
    if (!documentRef) {
        return;
    }

    if (!documentRef.querySelector(`link[href$="${file}"]`)) {
        const link = documentRef.createElement('link');
        link.rel = 'stylesheet';
        link.href = file;
        documentRef.head.appendChild(link);
    }
};

/**
 * Build image resizer helper bound to Energine resizer configuration.
 *
 * @param {{ getResizerBase: () => string | undefined }} options
 * @returns {(img: HTMLImageElement, src: string, w: number, h: number, r?: string) => void}
 */
export const createImageResizer = ({ getResizerBase }) => (img, src, w, h, r = '') => {
    if (!img) {
        return;
    }

    const resizerBase = getResizerBase();
    if (!resizerBase) {
        return;
    }

    img.setAttribute('src', `${resizerBase}${r}w${w}-h${h}/${src}`);
};
