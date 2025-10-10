const UID_PREFIX = `fileapi${Date.now()}`;
let uidCounter = 0;

export function createUploadUid() {
    uidCounter += 1;
    return `${UID_PREFIX}${uidCounter}`;
}

export function getFilesFromEvent(evt) {
    if (!evt) {
        return [];
    }

    const targetFiles = evt.target && 'files' in evt.target ? evt.target.files : undefined;
    if (targetFiles && targetFiles.length) {
        return Array.from(targetFiles);
    }

    const dataTransferFiles = evt.dataTransfer && evt.dataTransfer.files ? evt.dataTransfer.files : undefined;
    if (dataTransferFiles && dataTransferFiles.length) {
        return Array.from(dataTransferFiles);
    }

    return [];
}

export function bindDragAndDrop(target, { onDrop, onDragEnter, onDragLeave } = {}) {
    if (!target || typeof target.addEventListener !== 'function') {
        return () => {};
    }

    let dragDepth = 0;

    const handleDragEnter = (evt) => {
        evt.preventDefault();
        dragDepth += 1;
        if (typeof onDragEnter === 'function') {
            onDragEnter(evt);
        }
    };

    const handleDragOver = (evt) => {
        evt.preventDefault();
        if (evt.dataTransfer) {
            evt.dataTransfer.dropEffect = 'copy';
        }
    };

    const handleDragLeave = (evt) => {
        dragDepth = Math.max(dragDepth - 1, 0);
        if (dragDepth === 0 && typeof onDragLeave === 'function') {
            onDragLeave(evt);
        }
    };

    const handleDrop = (evt) => {
        evt.preventDefault();
        dragDepth = 0;
        const files = Array.from(evt.dataTransfer?.files || []);
        if (typeof onDrop === 'function') {
            onDrop(files, evt);
        }
        if (typeof onDragLeave === 'function') {
            onDragLeave(evt);
        }
    };

    target.addEventListener('dragenter', handleDragEnter);
    target.addEventListener('dragover', handleDragOver);
    target.addEventListener('dragleave', handleDragLeave);
    target.addEventListener('drop', handleDrop);

    return () => {
        target.removeEventListener('dragenter', handleDragEnter);
        target.removeEventListener('dragover', handleDragOver);
        target.removeEventListener('dragleave', handleDragLeave);
        target.removeEventListener('drop', handleDrop);
    };
}

export function uploadFiles({
    url,
    fieldName,
    files,
    data = {},
    onPrepare,
    onFileComplete,
    onProgress,
    onComplete
}) {
    const fileArray = Array.from(files || []).filter(Boolean);

    if (!url || !fieldName || fileArray.length === 0) {
        const error = new Error('No files to upload');
        if (typeof onComplete === 'function') {
            onComplete(error, null);
        }
        return { abort() {} };
    }

    const xhrs = [];
    let finished = 0;
    let lastError = null;
    let lastXhr = null;

    const finalize = (err, xhr) => {
        finished += 1;
        if (err) {
            lastError = err;
        }
        if (xhr) {
            lastXhr = xhr;
        }
        if (finished === fileArray.length && typeof onComplete === 'function') {
            onComplete(lastError, lastXhr);
        }
    };

    fileArray.forEach((file) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        xhr.responseType = 'text';

        const options = { data: { ...data } };
        if (typeof onPrepare === 'function') {
            onPrepare(file, options);
        }

        const formData = new FormData();
        Object.entries(options.data).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                value.forEach((item) => formData.append(key, item ?? ''));
            } else if (value instanceof Blob) {
                formData.append(key, value);
            } else {
                formData.append(key, value ?? '');
            }
        });
        formData.append(fieldName, file);

        if (typeof onProgress === 'function') {
            xhr.upload.addEventListener('progress', (evt) => {
                onProgress(evt, file);
            });
        }

        xhr.addEventListener('load', () => {
            let error = null;
            if (xhr.status < 200 || xhr.status >= 300) {
                error = new Error(`Upload failed with status ${xhr.status}`);
            }
            if (typeof onFileComplete === 'function') {
                onFileComplete(error, xhr, file);
            }
            finalize(error, xhr);
        });

        const handleError = () => {
            const error = new Error('Upload failed');
            if (typeof onFileComplete === 'function') {
                onFileComplete(error, xhr, file);
            }
            finalize(error, xhr);
        };

        xhr.addEventListener('error', handleError);
        xhr.addEventListener('abort', handleError);

        xhr.send(formData);
        xhrs.push(xhr);
    });

    return {
        abort() {
            xhrs.forEach((xhr) => {
                if (xhr.readyState !== XMLHttpRequest.DONE) {
                    xhr.abort();
                }
            });
        }
    };
}
