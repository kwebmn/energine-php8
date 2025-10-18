const BUNDLE_FILENAME = 'energine.extended.vendor.js';

const getAssetsBase = () => {
    if (typeof window === 'undefined') {
        return './assets/';
    }

    const staticBase = window?.Energine?.static || '';
    if (!staticBase) {
        return './assets/';
    }
    return staticBase.endsWith('/') ? `${staticBase}assets/` : `${staticBase}/assets/`;
};

const getBundleUrl = () => `${getAssetsBase()}${BUNDLE_FILENAME}`;

let loaderPromise = null;

const waitForExistingScript = (script) => new Promise((resolve, reject) => {
    const handleLoad = () => {
        cleanup();
        if (window.EnergineCodeEditor) {
            resolve(window.EnergineCodeEditor);
        } else {
            reject(new Error('Code editor bundle loaded but EnergineCodeEditor is undefined.'));
        }
    };

    const handleError = () => {
        cleanup();
        reject(new Error('Failed to load code editor bundle.'));
    };

    const cleanup = () => {
        script.removeEventListener('load', handleLoad);
        script.removeEventListener('error', handleError);
    };

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });

    if (script.readyState === 'complete' || script.readyState === 'loaded') {
        handleLoad();
    }
});

export const loadCodeEditor = () => {
    if (typeof window === 'undefined') {
        return Promise.resolve(null);
    }

    if (window.EnergineCodeEditor) {
        return Promise.resolve(window.EnergineCodeEditor);
    }

    if (loaderPromise) {
        return loaderPromise;
    }

    const scriptUrl = getBundleUrl();
    const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);

    if (existingScript) {
        loaderPromise = waitForExistingScript(existingScript);
        return loaderPromise;
    }

    loaderPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.defer = true;
        script.src = scriptUrl;

        script.onload = () => {
            if (window.EnergineCodeEditor) {
                resolve(window.EnergineCodeEditor);
            } else {
                reject(new Error('Code editor bundle loaded but EnergineCodeEditor is undefined.'));
            }
        };

        script.onerror = (event) => {
            loaderPromise = null;
            reject(new Error(`Failed to load code editor bundle from ${scriptUrl}`, { cause: event }));
        };

        document.head.appendChild(script);
    });

    return loaderPromise;
};

export default loadCodeEditor;
