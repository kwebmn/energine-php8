import tinymce from './initTinyMCE.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

const DEFAULT_PLUGINS = [
    'advlist',
    'anchor',
    'autolink',
    'charmap',
    'code',
    'fullscreen',
    'help',
    'image',
    'link',
    'lists',
    'media',
    'searchreplace',
    'table',
    'visualblocks',
    'wordcount',
    'energineimage',
    'energinefile',
    'energinevideo'
];

const TOOLBAR_GROUPS = [
    'code | undo redo | cut copy | searchreplace selectall',
    'link unlink anchor | image media energineimage energinevideo energinefile table | visualblocks',
    'bold italic underline strikethrough subscript superscript removeformat',
    'alignleft aligncenter alignright alignjustify | numlist bullist outdent indent',
    'styleselect formatselect fontselect fontsizeselect | forecolor backcolor'
];

const INLINE_BLOCK_ELEMENTS = new Set([
    'a', 'span', 'em', 'strong', 'small', 'sub', 'sup', 'code'
]);

export function collectWysiwygStyles(scope = globalScope) {
    const styles = [];
    const availableStyles = scope?.wysiwyg_styles;

    if (availableStyles && typeof availableStyles === 'object') {
        Object.values(availableStyles).forEach((style) => {
            if (!style) {
                return;
            }

            styles.push({
                caption: style.caption,
                element: style.element,
                class: style.class,
                attributes: style.attributes || {}
            });
        });
    }

    return styles;
}

function mapStyles(rawStyles = []) {
    return rawStyles
        .map((style) => {
            if (!style) {
                return null;
            }

            const caption = style.caption || style.name || style.title;
            const element = style.element || style.tag || null;
            const className = style.class || style.className || style['class'];
            const attributes = style.attributes || {};

            if (!caption || !element) {
                return null;
            }

            const format = {
                title: caption,
                attributes
            };

            if (className) {
                format.classes = className;
            }

            if (INLINE_BLOCK_ELEMENTS.has(element)) {
                format.inline = element;
            } else {
                format.block = element;
            }

            return format;
        })
        .filter(Boolean);
}

export function buildTinyMCEConfig({
    target,
    inline = false,
    singleTemplate = '',
    styles = [],
    additionalConfig = {}
} = {}) {
    if (!target) {
        throw new Error('TinyMCE configuration requires a target element.');
    }

    const styleFormats = mapStyles(styles.length ? styles : collectWysiwygStyles());

    const baseConfig = {
        target,
        inline,
        menubar: false,
        branding: false,
        convert_urls: false,
        relative_urls: false,
        remove_script_host: false,
        entity_encoding: 'raw',
        valid_elements: '*[*]',
        plugins: DEFAULT_PLUGINS.join(' '),
        toolbar: TOOLBAR_GROUPS.join('\n'),
        skin: false,
        content_css: false,
        toolbar_mode: 'wrap',
        style_formats: styleFormats.length ? styleFormats : undefined,
        setup(editor) {
            editor.editorId = target.id || editor.id;
            editor.singleTemplate = singleTemplate;
            if (typeof additionalConfig.setup === 'function') {
                additionalConfig.setup(editor);
            }
        },
        init_instance_callback(editor) {
            if (typeof additionalConfig.init_instance_callback === 'function') {
                additionalConfig.init_instance_callback(editor);
            }
        }
    };

    const mergedConfig = {
        ...baseConfig,
        ...additionalConfig,
    };

    if (additionalConfig.setup) {
        mergedConfig.setup = (editor) => {
            baseConfig.setup(editor);
        };
    }

    if (additionalConfig.init_instance_callback) {
        mergedConfig.init_instance_callback = (editor) => {
            baseConfig.init_instance_callback(editor);
        };
    }

    return mergedConfig;
}

export function initTinyMCE(options) {
    const config = buildTinyMCEConfig(options);
    return tinymce.init(config).then((editors) => editors?.[0] || null);
}

export default tinymce;
