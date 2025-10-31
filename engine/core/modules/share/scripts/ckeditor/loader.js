const BUNDLE_FILENAME = 'energine.ckeditor.js';

const getAssetsBase = () => {
    const staticBase = window?.Energine?.static || '';
    if (!staticBase) {
        return './assets/';
    }
    return staticBase.endsWith('/') ? `${staticBase}assets/` : `${staticBase}/assets/`;
};

const getBundleUrl = () => `${getAssetsBase()}${BUNDLE_FILENAME}`;

const getCkeditorAssetsUrl = () => `${getAssetsBase()}ckeditor/`;

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
    const basePath = getCkeditorAssetsUrl();

    window.CKEDITOR_BASEPATH = basePath;

    ckeditorPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = scriptUrl;
        script.async = true;
        script.onload = () => {
            if (window.CKEDITOR) {
                window.CKEDITOR.basePath = basePath;
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
