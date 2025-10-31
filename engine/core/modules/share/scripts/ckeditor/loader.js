const BUNDLE_FILENAME = 'energine.ckeditor.js';

const ensureTrailingSlash = (value) => {
    if (!value) {
        return value;
    }
    return value.endsWith('/') ? value : `${value}/`;
};

const toAbsoluteUrl = (value) => {
    if (!value) {
        return '';
    }
    try {
        return new URL(value, window.location.href).toString();
    } catch (error) {
        return value;
    }
};

const resolveStaticBase = () => {
    const staticBase = window?.Energine?.static;
    if (!staticBase) {
        return '';
    }
    return ensureTrailingSlash(toAbsoluteUrl(staticBase));
};

const getBundleUrl = () => {
    const staticBase = resolveStaticBase();
    if (staticBase) {
        return `${staticBase}assets/${BUNDLE_FILENAME}`;
    }

    return toAbsoluteUrl(`/assets/${BUNDLE_FILENAME}`);
};

const getCkeditorAssetsUrl = (bundleUrl) => {
    try {
        const normalizedBundleUrl = new URL(bundleUrl || getBundleUrl(), window.location.href);
        return ensureTrailingSlash(new URL('./ckeditor/', normalizedBundleUrl).toString());
    } catch (error) {
        return ensureTrailingSlash(toAbsoluteUrl('/assets/ckeditor/'));
    }
};

let ckeditorPromise = null;

export const loadCKEditor = () => {
    if (typeof window === 'undefined') {
        return Promise.resolve(null);
    }
    if (window.CKEDITOR) {
        return Promise.resolve(window.CKEDITOR);
    }
    if (ckeditorPromise) {
        return ckeditorPromise;
    }

    const scriptUrl = getBundleUrl();
    const basePath = getCkeditorAssetsUrl(scriptUrl);

    window.CKEDITOR_BASEPATH = basePath;

    ckeditorPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = scriptUrl;
        script.async = true;
        script.onload = () => {
            const resolvedBasePath = getCkeditorAssetsUrl(script.src);
            if (window.CKEDITOR) {
                window.CKEDITOR.basePath = resolvedBasePath;
                window.CKEDITOR_BASEPATH = resolvedBasePath;
                resolve(window.CKEDITOR);
            } else {
                reject(new Error('CKEDITOR failed to initialize'));
            }
        };
        script.onerror = (event) => {
            ckeditorPromise = null;
            reject(new Error(`Failed to load CKEditor bundle from ${scriptUrl}`, { cause: event }));
        };
        document.head.appendChild(script);
    });

    return ckeditorPromise;
};

export default loadCKEditor;
