import Energine from '../Energine.js';
import ModalBox from '../ModalBox.js';

function ensurePanel(core) {
    const panel = core?.context?.element?.topArea || null;
    const originalZIndex = panel ? panel.style.zIndex : '';

    if (panel) {
        panel.style.zIndex = '1';
    }

    return {
        panel,
        restore() {
            if (panel) {
                panel.style.zIndex = originalZIndex || '';
            }
        }
    };
}

function resolveMediaUrl(path) {
    if (!path) {
        return '';
    }

    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    return `${Energine.media || ''}${path}`;
}

function getSingleTemplate(core) {
    return core?.options?.energine?.singleTemplate
        || core?.context?.energine?.singleTemplate
        || '';
}

function withSingleTemplate(core, callback) {
    const singleTemplate = getSingleTemplate(core);
    if (!singleTemplate) {
        console.warn('SunEditor Energine plugin: singleTemplate is not defined.');
        return;
    }

    callback(singleTemplate);
}

function withPanel(core, callback) {
    const { restore } = ensurePanel(core);
    const close = (resultHandler) => (result) => {
        try {
            resultHandler(result);
        } finally {
            restore();
        }
    };

    return callback(close);
}

export function createEnergineImagePlugin() {
    return {
        name: 'energineImage',
        display: 'command',
        add(core, targetElement) {
            core.context.energine = core.context.energine || {};
            core.context.energine.singleTemplate = getSingleTemplate(core);
            if (targetElement) {
                targetElement.innerHTML = core.icons.image;
                targetElement.title = Energine.translations?.get?.('TXT_INSERT_IMAGE')
                    || targetElement.title
                    || 'Insert image';
            }
        },
        action() {
            const core = this;
            withSingleTemplate(core, (singleTemplate) => {
                withPanel(core, (closeWithRestore) => {
                    ModalBox.open({
                        url: `${singleTemplate}file-library/`,
                        onClose: closeWithRestore((imageData) => {
                            if (!imageData) {
                                return;
                            }

                            withPanel(core, (nestedClose) => {
                                ModalBox.open({
                                    url: `${singleTemplate}imagemanager`,
                                    extraData: imageData,
                                    onClose: nestedClose((image) => {
                                        if (!image) {
                                            return;
                                        }

                                        let filename = resolveMediaUrl(image.filename);
                                        const margins = ['margin-left', 'margin-right', 'margin-top', 'margin-bottom'];
                                        let styleValue = '';
                                        margins.forEach((prop) => {
                                            const value = image[prop];
                                            if (value && Number(value) !== 0) {
                                                styleValue += `${prop}:${value}px;`;
                                            }
                                        });

                                        const imgHtml = `<img src="${filename}" width="${image.width}" height="${image.height}" align="${image.align}" alt="${image.alt || ''}" border="0" style="${styleValue}">`;
                                        core.insertHTML(imgHtml, true, false);
                                    })
                                });
                            });
                        })
                    });
                });
            });
        }
    };
}

export function createEnergineVideoPlugin() {
    return {
        name: 'energineVideo',
        display: 'command',
        add(core, targetElement) {
            core.context.energine = core.context.energine || {};
            core.context.energine.singleTemplate = getSingleTemplate(core);
            if (targetElement) {
                targetElement.innerHTML = core.icons.video;
                targetElement.title = Energine.translations?.get?.('TXT_INSERT_VIDEO')
                    || targetElement.title
                    || 'Insert video';
            }
        },
        action() {
            const core = this;
            withSingleTemplate(core, (singleTemplate) => {
                withPanel(core, (closeWithRestore) => {
                    ModalBox.open({
                        url: `${singleTemplate}file-library/`,
                        onClose: closeWithRestore((fileInfo) => {
                            if (!fileInfo) {
                                return;
                            }

                            if (fileInfo['upl_internal_type'] !== 'video') {
                                const message = Energine.translations?.get?.('TXT_ERROR_NOT_VIDEO_FILE')
                                    || 'Selected file is not a video.';
                                globalThis?.alert?.(message);
                                return;
                            }

                            withPanel(core, (nestedClose) => {
                                ModalBox.open({
                                    url: `${singleTemplate}file-library/${fileInfo['upl_id']}/put-video/`,
                                    onClose: nestedClose((player) => {
                                        if (!player) {
                                            return;
                                        }

                                        const iframe = core.util.createElement('iframe');
                                        iframe.setAttribute('src', `${Energine.base || ''}single/pageToolBar/embed-player/${fileInfo['upl_id']}/`);
                                        iframe.setAttribute('width', player.width);
                                        iframe.setAttribute('height', player.height);
                                        iframe.setAttribute('frameborder', '0');
                                        core.insertHTML(iframe, true, false);
                                    })
                                });
                            });
                        })
                    });
                });
            });
        }
    };
}

export function createEnergineFilePlugin() {
    return {
        name: 'energineFile',
        display: 'command',
        add(core, targetElement) {
            core.context.energine = core.context.energine || {};
            core.context.energine.singleTemplate = getSingleTemplate(core);
            if (targetElement) {
                targetElement.innerHTML = core.icons.link;
                targetElement.title = Energine.translations?.get?.('TXT_INSERT_FILE')
                    || targetElement.title
                    || 'Insert file link';
            }
        },
        action() {
            const core = this;
            withSingleTemplate(core, (singleTemplate) => {
                withPanel(core, (closeWithRestore) => {
                    ModalBox.open({
                        url: `${singleTemplate}file-library`,
                        onClose: closeWithRestore((data) => {
                            if (!data) {
                                return;
                            }

                            let filename = resolveMediaUrl(data['upl_path']);
                            const selection = core.getSelection();
                            const selectedText = selection ? selection.toString() : '';
                            const linkText = selectedText || data['upl_title'] || data['upl_name'] || filename;
                            const anchorHtml = `<a href="${filename}">${linkText}</a>`;
                            core.insertHTML(anchorHtml, true, false, true);
                        })
                    });
                });
            });
        }
    };
}

export function createEnerginePlugins() {
    return [
        createEnergineImagePlugin(),
        createEnergineVideoPlugin(),
        createEnergineFilePlugin()
    ];
}

export default createEnerginePlugins;
