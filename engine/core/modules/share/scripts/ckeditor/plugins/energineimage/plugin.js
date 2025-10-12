(function () {
    if (typeof window === 'undefined' || !window.CKEDITOR) {
        return;
    }

    CKEDITOR.plugins.add('energineimage', {
        lang: 'en,ru,uk',
        init: function (editor) {
            editor.addCommand('energineimage', {
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
                        url: `${currentEditor.singleTemplate}file-library/`,
                        onClose(imageData) {
                            if (!imageData) {
                                restoreZIndex();
                                return;
                            }

                            window.ModalBox.open({
                                url: `${currentEditor.singleTemplate}imagemanager`,
                                extraData: imageData,
                                onClose(image) {
                                    if (!image) {
                                        restoreZIndex();
                                        return;
                                    }

                                    let filename = image.filename || '';
                                    const lower = filename.toLowerCase();
                                    if (lower.indexOf('http://') === -1 && lower.indexOf('https://') === -1) {
                                        filename = `${window.Energine.media}${filename}`;
                                    }

                                    let inlineStyles = '';
                                    ['margin-left', 'margin-right', 'margin-top', 'margin-bottom'].forEach((prop) => {
                                        if (image[prop] && image[prop] !== 0) {
                                            inlineStyles += `${prop}:${image[prop]}px;`;
                                        }
                                    });

                                    const imgTag = [
                                        `<img src="${filename}"`,
                                        `width="${image.width || ''}"`,
                                        `height="${image.height || ''}"`,
                                        `align="${image.align || ''}"`,
                                        `alt="${image.alt || ''}"`,
                                        'border="0"',
                                        `style="${inlineStyles}" />`,
                                    ].join(' ');

                                    currentEditor.insertHtml(imgTag);
                                    restoreZIndex();
                                },
                            });
                        },
                    });
                },
            });

            if (editor.ui.addButton) {
                editor.ui.addButton('EnergineImage', {
                    label: editor.lang.energineimage.toolbar,
                    command: 'energineimage',
                    toolbar: 'insert,10',
                    icon: 'image',
                });
            }
        },
    });
}());
