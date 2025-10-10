import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { basicSetup } from '@codemirror/basic-setup';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { php } from '@codemirror/lang-php';
import { sql } from '@codemirror/lang-sql';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';

const LANGUAGE_FACTORIES = {
    html,
    xml,
    css,
    markdown,
    sql,
    php,
    json,
    yaml,
    yml: yaml,
    text: () => [],
    plaintext: () => [],
    javascript: () => javascript({ jsx: true }),
    jsx: () => javascript({ jsx: true }),
    typescript: () => javascript({ jsx: true, typescript: true }),
    tsx: () => javascript({ jsx: true, typescript: true })
};

const elegantHighlightStyle = HighlightStyle.define([
    { tag: [tags.number, tags.string, tags.atom, tags.bool], color: '#776622' },
    { tag: [tags.comment, tags.quote], color: '#226622', fontStyle: 'italic' },
    { tag: tags.meta, color: '#555', fontStyle: 'italic' },
    { tag: [tags.variableName, tags.propertyName], color: '#000' },
    { tag: tags.attributeName, color: '#b11' },
    { tag: [tags.keyword, tags.operatorKeyword], color: '#733000' },
    { tag: tags.atom, color: '#776622' },
    { tag: tags.link, color: '#776622', textDecoration: 'underline' },
    { tag: tags.invalid, color: '#000', backgroundColor: '#fdd' }
]);

const elegantTheme = EditorView.theme({
    '&': {
        backgroundColor: '#fff',
        color: '#000'
    },
    '.cm-content': {
        fontFamily: 'inherit',
        fontSize: '0.875rem'
    },
    '.cm-line': {
        lineHeight: '1.4'
    },
    '.cm-activeLine': {
        backgroundColor: '#e8f2ff'
    },
    '.cm-activeLineGutter': {
        backgroundColor: '#e8f2ff'
    },
    '.cm-gutters': {
        backgroundColor: '#f7f7f7',
        color: 'rgba(17, 17, 17, 0.7)',
        border: 'none',
        borderRight: '1px solid rgba(0, 0, 0, 0.08)'
    },
    '&.cm-editor.cm-focused': {
        outline: 'none'
    },
    '.cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: 'rgba(13, 110, 253, 0.15)'
    },
    '.cm-matchingBracket': {
        outline: '1px solid grey'
    }
});

function resolveLanguageExtensions(textarea) {
    const declaredMode = (textarea.dataset.language || textarea.dataset.mode || 'html').toLowerCase();
    const factory = LANGUAGE_FACTORIES[declaredMode];
    const result = factory ? factory() : html();
    return Array.isArray(result) ? result : [result];
}

function syncTextareaValue(textarea, view) {
    textarea.value = view.state.doc.toString();
}

/**
 * Создаёт CodeMirror-редактор на основе текстового поля.
 * @param {HTMLTextAreaElement} textarea
 * @returns {{view: EditorView, save: function(): void, destroy: function(): void}}
 */
export default function createCodeEditor(textarea) {
    if (!textarea) {
        throw new Error('createCodeEditor: textarea element is required');
    }

    if (!(textarea instanceof HTMLTextAreaElement)) {
        throw new Error('createCodeEditor: element must be a textarea');
    }

    const host = document.createElement('div');
    host.classList.add('cm-editor-host');
    if (textarea.classList.contains('is-invalid')) {
        host.classList.add('is-invalid');
    }
    if (textarea.classList.contains('is-valid')) {
        host.classList.add('is-valid');
    }

    const extensions = [
        basicSetup,
        elegantTheme,
        syntaxHighlighting(elegantHighlightStyle),
        EditorView.updateListener.of((update) => {
            if (update.focusChanged) {
                if (update.view.hasFocus) {
                    host.classList.add('cm-editor-host--focused');
                } else {
                    host.classList.remove('cm-editor-host--focused');
                }
            }
            if (update.docChanged) {
                syncTextareaValue(textarea, update.view);
            }
        }),
        ...resolveLanguageExtensions(textarea)
    ];

    if (textarea.readOnly || textarea.dataset.readonly === 'true') {
        extensions.push(EditorView.editable.of(false));
    }

    if (textarea.getAttribute('wrap') !== 'off') {
        extensions.push(EditorView.lineWrapping);
    }

    const state = EditorState.create({
        doc: textarea.value,
        extensions
    });

    textarea.style.display = 'none';
    textarea.insertAdjacentElement('afterend', host);

    const view = new EditorView({
        state,
        parent: host
    });

    syncTextareaValue(textarea, view);

    return {
        view,
        save() {
            syncTextareaValue(textarea, view);
        },
        destroy() {
            view.destroy();
            host.remove();
            textarea.style.removeProperty('display');
        }
    };
}
