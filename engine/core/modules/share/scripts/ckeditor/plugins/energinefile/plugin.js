(function () {
    if (typeof window === 'undefined' || !window.CKEDITOR) {
        return;
    }

    CKEDITOR.plugins.add('energinefile', {
        lang: 'en,ru,uk',
        init: function (editor) {
            editor.addCommand('energinefile', {
                exec: function (currentEditor) {
                    const container = currentEditor.container ? currentEditor.container.$ : null;
                    if (!container) {
                        return;
                    }

                    const initialZIndex = container.style.zIndex || '';
                    container.style.zIndex = '1';

                    const restoreZIndex = () => {
                        container.style.zIndex = initialZIndex;
                    };

                    window.ModalBox.open({
                        url: `${currentEditor.singleTemplate}file-library`,
                        onClose(data) {
                            if (!data) {
                                restoreZIndex();
                                return;
                            }

                            let filename = data.upl_path || '';
                            const lower = filename.toLowerCase();
                            if (filename && lower.indexOf('http://') === -1 && lower.indexOf('https://') === -1) {
                                filename = `${window.Energine.media}${filename}`;
                            }

                            const style = new CKEDITOR.style({
                                element: 'a',
                                attributes: { href: filename },
                            });
                            style.type = CKEDITOR.STYLE_INLINE;
                            style.apply(currentEditor.document);

                            if (currentEditor.getSelection().getSelectedText() === '') {
                                currentEditor.insertHtml(
                                    `<a href="${filename}">${data.upl_title || filename}</a>`,
                                );
                            }

                            restoreZIndex();
                        },
                    });
                },
            });

            if (editor.ui.addButton) {
                editor.ui.addButton('EnergineFile', {
                    label: editor.lang.energinefile.toolbar,
                    command: 'energinefile',
                    toolbar: 'insert,10',
                    icon: 'link',
                });
            }
        },
    });
}());
