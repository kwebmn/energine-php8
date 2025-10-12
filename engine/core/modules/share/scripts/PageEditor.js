import Energine, { showLoader, hideLoader } from './Energine.js';
import suneditor from 'suneditor';
import plugins from 'suneditor/src/plugins';
import { createEnerginePlugins } from './suneditor/EnerginePlugins.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

const getCodeMirror = () => globalScope?.CodeMirror;

function applyEditorOutline(area) {
    if (!area) {
        return;
    }
    area.style.outline = '1px dashed #f00';
    area.style.outlineOffset = '2px';
}

function collectStyles() {
    const stylesSource = globalScope?.wysiwyg_styles;
    const blockTags = new Set(['p', 'div', 'blockquote', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
    const paragraphStyles = [];
    const textStyles = [];

    if (stylesSource && typeof stylesSource === 'object') {
        Object.values(stylesSource).forEach((style) => {
            if (!style) {
                return;
            }

            const element = (style.element || '').toLowerCase();
            const className = style.class || '';
            const caption = style.caption || className || element || '';
            const base = {
                name: caption || 'Style'
            };

            if (className) {
                base.class = className;
            }
            if (style.style) {
                base.style = style.style;
            }

            if (blockTags.has(element)) {
                paragraphStyles.push({ ...base });
            } else {
                textStyles.push({ ...base, tag: element || 'span' });
            }
        });
    }

    return { paragraphStyles, textStyles };
}

function cloneStyles(list) {
    return list ? list.map((item) => ({ ...item })) : undefined;
}

const inlineConfig = {
    baseOptions: null
};

function ensureInlineBaseOptions() {
    if (inlineConfig.baseOptions) {
        return;
    }

    const { paragraphStyles, textStyles } = collectStyles();
    const codeMirrorInstance = getCodeMirror();

    const defaultPlugins = [
        plugins.blockquote,
        plugins.align,
        plugins.font,
        plugins.fontSize,
        plugins.fontColor,
        plugins.hiliteColor,
        plugins.horizontalRule,
        plugins.list,
        plugins.table,
        plugins.formatBlock,
        plugins.lineHeight,
        plugins.template,
        plugins.paragraphStyle,
        plugins.textStyle,
        plugins.link,
        plugins.image,
        plugins.video,
    ];

    inlineConfig.baseOptions = {
        plugins: [...defaultPlugins, ...createEnerginePlugins()],
        buttonList: [
            ['undo', 'redo'],
            ['font', 'fontSize', 'formatBlock', 'paragraphStyle', 'textStyle'],
            ['bold', 'underline', 'italic', 'strike', 'subscript', 'superscript', 'removeFormat'],
            ['fontColor', 'hiliteColor', 'align', 'list', 'lineHeight'],
            ['blockquote', 'horizontalRule', 'table'],
            ['energineImage', 'energineVideo', 'energineFile', 'link'],
            ['showBlocks', 'codeView', 'fullScreen']
        ],
        addTagsWhitelist: '*',
        attributesWhitelist: {
            all: 'class|style|id|name|width|height|align|border|data-.+',
            a: 'target|rel|download|class|style'
        },
        defaultStyle: 'font-family: inherit; font-size: inherit;',
        strictMode: false,
        strictHTMLValidation: false,
        showPathLabel: false,
        codeMirror: codeMirrorInstance || undefined,
        paragraphStyles: paragraphStyles.length ? paragraphStyles : undefined,
        textStyles: textStyles.length ? textStyles : undefined,
    };
}

function buildInlineOptions(singleTemplate, initialValue, minHeight) {
    ensureInlineBaseOptions();
    const base = inlineConfig.baseOptions || {};

    return {
        plugins: base.plugins ? [...base.plugins] : createEnerginePlugins(),
        buttonList: base.buttonList ? base.buttonList.map((group) => [...group]) : [],
        addTagsWhitelist: base.addTagsWhitelist || '*',
        attributesWhitelist: base.attributesWhitelist ? { ...base.attributesWhitelist } : {
            all: 'class|style|id|name|width|height|align|border|data-.+'
        },
        defaultStyle: base.defaultStyle || 'font-family: inherit; font-size: inherit;',
        strictMode: base.strictMode ?? false,
        strictHTMLValidation: base.strictHTMLValidation ?? false,
        showPathLabel: base.showPathLabel ?? false,
        codeMirror: base.codeMirror,
        paragraphStyles: cloneStyles(base.paragraphStyles),
        textStyles: cloneStyles(base.textStyles),
        value: initialValue,
        mode: 'inline',
        height: 'auto',
        minHeight: minHeight || undefined,
        toolbarWidth: 'auto',
        stickyToolbar: 0,
        iframe: false,
        resizingBar: false,
        charCounter: false,
        historyStackDelayTime: 400,
        imageFileInput: false,
        videoFileInput: false,
        energine: {
            singleTemplate
        }
    };
}

function ensureAreaId(area) {
    if (area.id) {
        return area.id;
    }

    const uniqueId = `suneditor-inline-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    area.id = uniqueId;
    return uniqueId;
}

class BaseBlockEditor {
    constructor(area) {
        this.area = area;
        this.area.setAttribute('contenteditable', 'true');
        applyEditorOutline(this.area);

        this.singlePath = this.area.getAttribute('single_template') || '';
        this.ID = this.area.getAttribute('eID') || '';
        this.num = this.area.getAttribute('num') || '';

        const areaId = ensureAreaId(this.area);
        const initialValue = this.area.innerHTML;
        const minHeight = Math.max(this.area.clientHeight || this.area.offsetHeight || 0, 120);

        this.editor = null;
        this.lastSavedValue = initialValue;

        try {
            const options = buildInlineOptions(this.singlePath, initialValue, minHeight);
            this.editor = suneditor.create(this.area, options);

            if (this.editor) {
                this.editor.singleTemplate = this.singlePath;
                this.editor.editorId = areaId;

                const context = this.editor.getContext?.();
                if (context) {
                    context.energine = context.energine || {};
                    context.energine.singleTemplate = this.singlePath;
                }

                const updateOutline = (isFocused) => {
                    this.area.style.outline = isFocused ? '2px dashed #0d0' : '1px dashed #f00';
                    this.area.style.outlineOffset = '2px';
                };

                const previousFocus = this.editor.onFocus;
                this.editor.onFocus = (event, core) => {
                    this.area.classList.add('activeEditor');
                    updateOutline(true);
                    if (typeof previousFocus === 'function') {
                        previousFocus.call(this.editor, event, core);
                    }
                };

                const previousBlur = this.editor.onBlur;
                this.editor.onBlur = (event, core) => {
                    this.area.classList.remove('activeEditor');
                    updateOutline(false);
                    if (typeof previousBlur === 'function') {
                        previousBlur.call(this.editor, event, core);
                    }
                };

                this.lastSavedValue = this.editor.getContents(false);
            }
        } catch (error) {
            console.warn(error);
        }
    }

    getCurrentData() {
        if (!this.editor) {
            return this.area.innerHTML;
        }
        return this.editor.getContents(false);
    }

    hasChanges() {
        return this.getCurrentData() !== this.lastSavedValue;
    }

    markClean(value) {
        this.lastSavedValue = value ?? this.getCurrentData();
    }
}

class PageEditorBlockEditor extends BaseBlockEditor {
    save(async = true, onSuccess = undefined) {
        if (!this.editor) {
            return;
        }

        const data = this.getCurrentData();
        if (data === this.lastSavedValue) {
            return;
        }

        if (!async) {
            showLoader();
        }

        let payload = `data=${encodeURIComponent(data)}`;
        if (this.ID) {
            payload += `&ID=${this.ID}`;
        }
        if (this.num) {
            payload += `&num=${this.num}`;
        }

        fetch(`${this.singlePath}save-text`, {
            method: 'POST',
            body: payload,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
            .then((response) => response.text())
            .then((response) => {
                this.markClean(data);
                if (typeof onSuccess === 'function') {
                    onSuccess.call(this, response);
                }
            })
            .catch((error) => {
                console.error(error);
            })
            .finally(() => {
                if (!async) {
                    hideLoader();
                }
            });
    }
}

class BlockEditor extends BaseBlockEditor {
    save(async = true, onSuccess = undefined) {
        if (!this.editor) {
            return;
        }

        const data = this.getCurrentData();
        if (data === this.lastSavedValue) {
            return;
        }

        if (!async) {
            showLoader();
        }

        const params = { data };
        if (this.ID) {
            params.ID = this.ID;
        }
        if (this.num) {
            params.num = this.num;
        }

        Energine.request(
            `${this.singlePath}save-text`,
            params,
            (response) => {
                this.markClean(data);
                if (typeof onSuccess === 'function') {
                    onSuccess.call(this, response);
                }
                if (!async) {
                    hideLoader();
                }
            },
            () => {
                if (!async) {
                    hideLoader();
                }
            },
            () => {
                if (!async) {
                    hideLoader();
                }
            }
        );
    }
}

class PageEditor {
    editorClassName = 'nrgnEditor';
    editors = [];

    constructor() {
        ensureInlineBaseOptions();

        document.querySelectorAll(`.${this.editorClassName}`).forEach((element) => {
            this.editors.push(new PageEditorBlockEditor(element));
        });

        if (globalScope) {
            globalScope.nrgPageEditor = this;
        }
    }
}

PageEditor.BlockEditor = BlockEditor;

export { PageEditor, BlockEditor };
export default PageEditor;

export function attachToWindow(target = globalScope) {
    if (!target) {
        return PageEditor;
    }

    target.PageEditor = PageEditor;
    target.PageEditor.BlockEditor = BlockEditor;
    return PageEditor;
}

attachToWindow();
