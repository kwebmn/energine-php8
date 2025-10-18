import './styles/extended-vendor.css';

import './vendor-shims/jquery.js';
import './vendor-shims/jstree.js';

import { EditorState } from '@codemirror/state';
import {
    EditorView,
    keymap,
    lineNumbers,
    drawSelection,
    dropCursor,
    highlightActiveLine,
    highlightActiveLineGutter,
    rectangularSelection,
    crosshairCursor,
} from '@codemirror/view';
import {
    indentOnInput,
    syntaxHighlighting,
    defaultHighlightStyle,
    foldGutter,
    foldKeymap,
} from '@codemirror/language';
import {
    history,
    historyKeymap,
    defaultKeymap,
    indentWithTab,
} from '@codemirror/commands';
import {
    closeBrackets,
    closeBracketsKeymap,
    autocompletion,
    completionKeymap,
} from '@codemirror/autocomplete';
import { lintKeymap } from '@codemirror/lint';
import {
    searchKeymap,
    highlightSelectionMatches,
} from '@codemirror/search';
import { bracketMatching } from '@codemirror/matchbrackets';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';

const languageFactories = {
    html: () => html({ matchClosingTags: true, autoCloseTags: true }),
    'text/html': () => html({ matchClosingTags: true, autoCloseTags: true }),
    xml: () => html({ matchClosingTags: true, autoCloseTags: true }),
    'application/xml': () => html({ matchClosingTags: true, autoCloseTags: true }),
    javascript: () => javascript(),
    js: () => javascript(),
    'text/javascript': () => javascript(),
    'application/javascript': () => javascript(),
    css: () => css(),
    'text/css': () => css(),
    json: () => json(),
    'application/json': () => json(),
};

const getLanguageExtension = (language = 'html') => {
    const key = String(language || 'html').toLowerCase();
    return (languageFactories[key] || languageFactories.html)();
};

const editorTheme = EditorView.theme({
    '&': {
        borderRadius: '0.375rem',
        border: '1px solid var(--bs-border-color, rgba(0, 0, 0, 0.125))',
        backgroundColor: 'var(--bs-body-bg, #fff)',
        fontFamily: 'var(--bs-font-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    },
    '&.cm-focused': {
        outline: '0',
        boxShadow: '0 0 0 .25rem var(--bs-focus-ring-color, rgba(13, 110, 253, .25))',
        borderColor: 'var(--bs-focus-ring-color, rgba(13, 110, 253, .25))',
    },
    '.cm-content': {
        minHeight: '12rem',
        fontFamily: 'inherit',
    },
    '.cm-gutters': {
        backgroundColor: 'transparent',
        borderRight: '1px solid var(--bs-border-color, rgba(0, 0, 0, 0.125))',
    },
});

const enhanceTextArea = (textarea, options = {}) => {
    if (!(textarea instanceof HTMLTextAreaElement)) {
        return null;
    }

    const parent = textarea.parentNode;
    if (!parent) {
        return null;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'code-editor-wrapper position-relative';

    const updateTextarea = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
            textarea.value = update.state.doc.toString();
            const event = new Event('input', { bubbles: true });
            textarea.dispatchEvent(event);
        }
    });

    const state = EditorState.create({
        doc: textarea.value || '',
        extensions: [
            lineNumbers(),
            highlightActiveLineGutter(),
            history(),
            drawSelection(),
            dropCursor(),
            EditorState.allowMultipleSelections.of(true),
            indentOnInput(),
            syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
            bracketMatching(),
            closeBrackets(),
            autocompletion(),
            rectangularSelection(),
            crosshairCursor(),
            highlightActiveLine(),
            highlightSelectionMatches(),
            foldGutter(),
            keymap.of([
                indentWithTab,
                ...defaultKeymap,
                ...historyKeymap,
                ...foldKeymap,
                ...completionKeymap,
                ...closeBracketsKeymap,
                ...searchKeymap,
                ...lintKeymap,
            ]),
            editorTheme,
            EditorView.lineWrapping,
            updateTextarea,
            getLanguageExtension(options.language),
        ],
    });

    const view = new EditorView({
        state,
        parent: wrapper,
    });

    textarea.classList.add('code-editor-hidden');
    if (textarea.nextSibling) {
        parent.insertBefore(wrapper, textarea.nextSibling);
    } else {
        parent.appendChild(wrapper);
    }

    const resizeObserver = typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => view.requestMeasure())
        : null;
    resizeObserver?.observe(wrapper);

    const save = () => {
        textarea.value = view.state.doc.toString();
    };

    const destroy = () => {
        resizeObserver?.disconnect();
        view.destroy();
        textarea.classList.remove('code-editor-hidden');
        if (wrapper.parentNode) {
            wrapper.parentNode.removeChild(wrapper);
        }
    };

    return {
        view,
        textarea,
        wrapper,
        save,
        destroy,
    };
};

if (typeof window !== 'undefined') {
    window.EnergineCodeEditor = {
        enhanceTextArea,
        destroy(editorInstance) {
            editorInstance?.destroy?.();
        },
    };
}
