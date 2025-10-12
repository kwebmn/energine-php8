import SunEditor from 'suneditor';
import plugins from 'suneditor/src/plugins';

import Energine from './Energine.js';
import ModalBox from './ModalBox.js';

function ensureEnergineContext(core) {
    if (!core?.context) {
        return null;
    }

    if (!core.context.energine) {
        core.context.energine = {
            singleTemplate: '',
            originalContent: '',
            isDirty: false,
        };
    }

    return core.context.energine;
}

function withPanelZIndex(core, callback) {
    const panel = core?.context?.element?.topArea;
    if (!panel) {
        callback();
        return;
    }

    const originalZIndex = panel.style.zIndex;
    panel.style.zIndex = '1';
    try {
        callback();
    } finally {
        panel.style.zIndex = originalZIndex;
    }
}

function openImageDialog(core) {
    const context = ensureEnergineContext(core);
    if (!context?.singleTemplate) {
        console.warn('[suneditorIntegration] Missing singleTemplate for Energine image plugin.');
        return;
    }

    withPanelZIndex(core, () => {
        ModalBox.open({
            url: context.singleTemplate + 'file-library/',
            onClose(imageData) {
                if (!imageData) {
                    return;
                }

                ModalBox.open({
                    url: context.singleTemplate + 'imagemanager',
                    extraData: imageData,
                    onClose(image) {
                        if (!image) {
                            return;
                        }

                        let src = image.filename;
                        if (typeof src === 'string' && !/^https?:\/\//i.test(src)) {
                            src = (Energine.media || '') + src;
                        }

                        const styleParts = [];
                        ['margin-left', 'margin-right', 'margin-top', 'margin-bottom'].forEach((prop) => {
                            const value = image[prop];
                            if (value && Number(value) !== 0) {
                                styleParts.push(`${prop}:${value}px`);
                            }
                        });

                        const styleAttr = styleParts.length ? ` style="${styleParts.join(';')}"` : '';
                        const html = `<img src="${src}" width="${image.width || ''}" height="${image.height || ''}" align="${image.align || ''}" alt="${image.alt || ''}" border="0"${styleAttr}>`;
                        core.insertHTML(html, true, false);
                    }
                });
            }
        });
    });
}

function openFileDialog(core) {
    const context = ensureEnergineContext(core);
    if (!context?.singleTemplate) {
        console.warn('[suneditorIntegration] Missing singleTemplate for Energine file plugin.');
        return;
    }

    withPanelZIndex(core, () => {
        ModalBox.open({
            url: context.singleTemplate + 'file-library',
            onClose(data) {
                if (!data) {
                    return;
                }

                let filename = data['upl_path'];
                if (typeof filename === 'string' && !/^https?:\/\//i.test(filename)) {
                    filename = (Energine.media || '') + filename;
                }

                const selection = core.getSelection();
                const selectedText = selection ? selection.toString() : '';
                const linkText = selectedText || data['upl_title'] || data['upl_name'] || filename;
                const anchor = `<a href="${filename}">${linkText}</a>`;
                core.insertHTML(anchor, true, false);
            }
        });
    });
}

function openVideoDialog(core) {
    const context = ensureEnergineContext(core);
    if (!context?.singleTemplate) {
        console.warn('[suneditorIntegration] Missing singleTemplate for Energine video plugin.');
        return;
    }

    withPanelZIndex(core, () => {
        ModalBox.open({
            url: context.singleTemplate + 'file-library/',
            onClose(fileInfo) {
                if (!fileInfo) {
                    return;
                }

                if (fileInfo['upl_internal_type'] !== 'video') {
                    alert(Energine.translations?.get?.('TXT_ERROR_NOT_VIDEO_FILE') || 'Selected file is not a video.');
                    return;
                }

                ModalBox.open({
                    url: `${context.singleTemplate}file-library/${fileInfo['upl_id']}/put-video/`,
                    onClose(player) {
                        if (!player) {
                            return;
                        }

                        const iframe = `<iframe src="${Energine.base}single/pageToolBar/embed-player/${fileInfo['upl_id']}/" width="${player.width || ''}" height="${player.height || ''}" frameborder="0"></iframe>`;
                        core.insertHTML(iframe, true, false);
                    }
                });
            }
        });
    });
}

const energineImagePlugin = {
    name: 'energineImage',
    display: 'command',
    add(core, target) {
        const context = ensureEnergineContext(core);
        if (target) {
            const label = core.lang?.dialogBox?.imageBox?.title || 'Insert image';
            target.setAttribute('aria-label', label);
            target.title = label;
            target.innerHTML = core.icons.image || '<span class="se-icon se-icon-image"></span>';
        }
        if (context) {
            context.hasEnerginePlugins = true;
        }
    },
    action() {
        openImageDialog(this);
    }
};

const energineFilePlugin = {
    name: 'energineFile',
    display: 'command',
    add(core, target) {
        const context = ensureEnergineContext(core);
        if (target) {
            const label = core.lang?.toolbar?.link || 'Insert file';
            target.setAttribute('aria-label', label);
            target.title = label;
            target.innerHTML = core.icons.link || '<span class="se-icon se-icon-link"></span>';
        }
        if (context) {
            context.hasEnerginePlugins = true;
        }
    },
    action() {
        openFileDialog(this);
    }
};

const energineVideoPlugin = {
    name: 'energineVideo',
    display: 'command',
    add(core, target) {
        const context = ensureEnergineContext(core);
        if (target) {
            const label = core.lang?.toolbar?.video || 'Insert video';
            target.setAttribute('aria-label', label);
            target.title = label;
            target.innerHTML = core.icons.video || '<span class="se-icon se-icon-video"></span>';
        }
        if (context) {
            context.hasEnerginePlugins = true;
        }
    },
    action() {
        openVideoDialog(this);
    }
};

const customPlugins = {
    ...plugins,
    energineImage: energineImagePlugin,
    energineFile: energineFilePlugin,
    energineVideo: energineVideoPlugin,
};

const DEFAULT_BUTTON_LIST = [
    ['undo', 'redo'],
    ['font', 'fontSize', 'formatBlock', 'paragraphStyle'],
    ['bold', 'underline', 'italic', 'strike', 'subscript', 'superscript', 'removeFormat'],
    ['fontColor', 'hiliteColor'],
    ['outdent', 'indent'],
    ['align', 'horizontalRule', 'list', 'lineHeight'],
    ['link', 'table'],
    ['energineImage', 'energineVideo', 'energineFile'],
    ['codeView', 'fullScreen']
];

function buildParagraphStyles(globalScope = typeof window !== 'undefined' ? window : undefined) {
    const result = [];
    const styles = globalScope?.wysiwyg_styles;
    if (!styles) {
        return result;
    }

    Object.values(styles).forEach((style) => {
        if (!style || typeof style !== 'object') {
            return;
        }
        const caption = style.caption || style.name;
        const className = style.class || '';
        if (!caption || !className) {
            return;
        }
        result.push({
            name: caption,
            class: className,
        });
    });

    return result;
}

function applyDirtyTracking(editor) {
    if (!editor?.core) {
        return;
    }
    const context = ensureEnergineContext(editor.core);
    if (!context) {
        return;
    }

    const getCurrent = () => editor.getContents(true);
    context.originalContent = getCurrent();
    context.isDirty = false;

    const previousOnChange = editor.onChange;
    editor.onChange = (contents, core) => {
        context.isDirty = contents !== context.originalContent;
        if (typeof previousOnChange === 'function') {
            previousOnChange(contents, core);
        }
    };
}

export function isEditorDirty(editor) {
    const context = editor?.core?.context?.energine;
    return Boolean(context?.isDirty);
}

export function markEditorClean(editor) {
    if (!editor?.core) {
        return;
    }
    const context = ensureEnergineContext(editor.core);
    if (!context) {
        return;
    }
    context.originalContent = editor.getContents(true);
    context.isDirty = false;
}

export function createEnergineSunEditor(target, options = {}) {
    const {
        singleTemplate = '',
        paragraphStyles = buildParagraphStyles(),
        minHeight = 200,
        height = 'auto',
        buttonList = DEFAULT_BUTTON_LIST,
        katex = undefined,
        mode = undefined,
        resizingBar = true,
        showPathLabel = false,
        defaultStyle = 'font-size: 1rem;',
        linkTargetNewWindow = true,
        ...rest
    } = options;

    const editor = SunEditor.create(target, {
        plugins: customPlugins,
        buttonList,
        paragraphStyles,
        minHeight,
        height,
        katex,
        mode,
        resizingBar,
        showPathLabel,
        defaultStyle,
        linkTargetNewWindow,
        ...rest,
    });

    const context = ensureEnergineContext(editor.core);
    if (context) {
        context.singleTemplate = singleTemplate;
    }
    applyDirtyTracking(editor);

    return editor;
}

export function getParagraphStyles() {
    return buildParagraphStyles();
}

export default {
    createEnergineSunEditor,
    isEditorDirty,
    markEditorClean,
    getParagraphStyles,
};
