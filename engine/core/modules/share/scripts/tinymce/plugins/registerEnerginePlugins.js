import ModalBox from '../../ModalBox.js';
import Energine from '../../Energine.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

function getPanelElement(editor) {
    if (!editor) {
        return null;
    }

    if (typeof editor.getContainer === 'function' && editor.getContainer()) {
        return editor.getContainer();
    }

    if (typeof editor.getElement === 'function') {
        return editor.getElement();
    }

    if (editor.targetElm) {
        return editor.targetElm;
    }

    return null;
}

function withPanelZIndex(editor, callback) {
    const panel = getPanelElement(editor);
    if (!panel) {
        callback({ restore: () => {} });
        return;
    }

    const originalZIndex = panel.style.zIndex;
    panel.style.zIndex = '1';

    const restore = () => {
        panel.style.zIndex = originalZIndex;
    };

    try {
        callback({ panel, restore });
    } catch (error) {
        restore();
        throw error;
    }
}

function ensureAbsoluteUrl(path) {
    if (!path) {
        return path;
    }

    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    if (!globalScope || !globalScope.Energine || !globalScope.Energine.media) {
        return path;
    }

    return `${globalScope.Energine.media}${path}`;
}

function registerImagePlugin(tinymce) {
    if (tinymce.PluginManager.get('energineimage')) {
        return;
    }

    tinymce.PluginManager.add('energineimage', (editor) => {
        editor.ui.registry.addButton('energineimage', {
            icon: 'image',
            text: editor.translate ? editor.translate('Image') : 'Image',
            tooltip: editor.translate ? editor.translate('Insert image from library') : 'Insert image from library',
            onAction: () => {
                withPanelZIndex(editor, ({ restore }) => {
                    ModalBox.open({
                        url: `${editor.singleTemplate || ''}file-library/`,
                        onClose(imageData) {
                            if (!imageData) {
                                restore();
                                return;
                            }

                            ModalBox.open({
                                url: `${editor.singleTemplate || ''}imagemanager`,
                                extraData: imageData,
                                onClose(image) {
                                    if (!image) {
                                        restore();
                                        return;
                                    }

                                    const src = ensureAbsoluteUrl(image.filename);
                                    const img = editor.dom.create('img', {
                                        src,
                                        width: image.width,
                                        height: image.height,
                                        align: image.align,
                                        alt: image.alt,
                                        border: 0
                                    });

                                    const margins = ['margin-left', 'margin-right', 'margin-top', 'margin-bottom'];
                                    margins.forEach((prop) => {
                                        if (image[prop]) {
                                            editor.dom.setStyle(img, prop, `${image[prop]}px`);
                                        }
                                    });

                                    editor.insertContent(img.outerHTML);
                                    restore();
                                }
                            });
                        }
                    });
                });
            }
        });
    });
}

function registerFilePlugin(tinymce) {
    if (tinymce.PluginManager.get('energinefile')) {
        return;
    }

    tinymce.PluginManager.add('energinefile', (editor) => {
        editor.ui.registry.addButton('energinefile', {
            icon: 'insert-time',
            text: editor.translate ? editor.translate('File') : 'File',
            tooltip: editor.translate ? editor.translate('Insert file link from library') : 'Insert file link from library',
            onAction: () => {
                withPanelZIndex(editor, ({ restore }) => {
                    ModalBox.open({
                        url: `${editor.singleTemplate || ''}file-library`,
                        onClose(data) {
                            if (!data) {
                                restore();
                                return;
                            }

                            const href = ensureAbsoluteUrl(data['upl_path']);
                            const selection = editor.selection.getContent({ format: 'text' });
                            const title = selection || data['upl_title'] || href;

                            editor.insertContent(`<a href="${href}">${title}</a>`);
                            restore();
                        }
                    });
                });
            }
        });
    });
}

function registerVideoPlugin(tinymce) {
    if (tinymce.PluginManager.get('energinevideo')) {
        return;
    }

    tinymce.PluginManager.add('energinevideo', (editor) => {
        editor.ui.registry.addButton('energinevideo', {
            icon: 'embed',
            text: editor.translate ? editor.translate('Video') : 'Video',
            tooltip: editor.translate ? editor.translate('Insert video from library') : 'Insert video from library',
            onAction: () => {
                withPanelZIndex(editor, ({ restore }) => {
                    ModalBox.open({
                        url: `${editor.singleTemplate || ''}file-library/`,
                        onClose(fileInfo) {
                            if (!fileInfo) {
                                restore();
                                return;
                            }

                            if (fileInfo['upl_internal_type'] !== 'video') {
                                const message = Energine?.translations?.get
                                    ? Energine.translations.get('TXT_ERROR_NOT_VIDEO_FILE')
                                    : 'The selected file is not a video.';
                                globalScope?.alert?.(message);
                                restore();
                                return;
                            }

                            ModalBox.open({
                                url: `${editor.singleTemplate || ''}file-library/${fileInfo['upl_id']}/put-video/`,
                                onClose(player) {
                                    if (!player) {
                                        restore();
                                        return;
                                    }

                                    const iframe = editor.dom.create('iframe', {
                                        src: `${Energine.base}single/pageToolBar/embed-player/${fileInfo['upl_id']}/`,
                                        width: player.width,
                                        height: player.height,
                                        frameborder: '0'
                                    });

                                    editor.insertContent(iframe.outerHTML);
                                    restore();
                                }
                            });
                        }
                    });
                });
            }
        });
    });
}

export default function registerEnerginePlugins(tinymce) {
    registerImagePlugin(tinymce);
    registerFilePlugin(tinymce);
    registerVideoPlugin(tinymce);
}
