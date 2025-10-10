import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { basicSetup } from '@codemirror/basic-setup';
import { html } from '@codemirror/lang-html';

/**
 * Создаёт CodeMirror-редактор на основе текстового поля.
 * @param {HTMLTextAreaElement} textarea
 * @returns {{view: EditorView, save: function(): void, destroy: function(): void}}
 */
export default function createCodeEditor(textarea) {
    if (!textarea) {
        throw new Error('createCodeEditor: textarea element is required');
    }

    const host = document.createElement('div');
    host.classList.add('cm-editor-host');

    textarea.style.display = 'none';
    textarea.insertAdjacentElement('afterend', host);

    const state = EditorState.create({
        doc: textarea.value,
        extensions: [
            basicSetup,
            html(),
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    textarea.value = update.state.doc.toString();
                }
            })
        ]
    });

    const view = new EditorView({
        state,
        parent: host
    });

    return {
        view,
        save() {
            textarea.value = view.state.doc.toString();
        },
        destroy() {
            view.destroy();
            host.remove();
            textarea.style.removeProperty('display');
        }
    };
}
