CKEDITOR.plugins.add( 'energineimage', {
    lang: 'en,ru,uk',
    icons: 'energineimage',
	init: function( editor ) {

		editor.addCommand( 'energineimage', {
            exec: function(editor) {
                // var panel = $mt('cke_' + editor.editorId);
                // var zIndex = panel.getStyle('z-index');
                // panel.setStyle('z-index', '1');

                // panel = обёртка редактора
                const panel = document.getElementById(editor.name);
                // console.log(editor);
                if (!panel) return;

                // Сохраняем исходный z-index
                const zIndex = panel.style.zIndex;
                panel.style.zIndex = '1';

                ModalBox.open({
                    url: editor.singleTemplate + 'file-library/',
                    onClose: function(imageData) {

                        if (!imageData) {
                            // panel.setStyle('z-index', zIndex);
                            panel.style.zIndex = zIndex;
                            return;
                        }

                        ModalBox.open({
                            url: editor.singleTemplate + 'imagemanager',
                            onClose: function (image) {
                                if (!image) {
                                    // panel.setStyle('z-index', zIndex);
                                    panel.style.zIndex = zIndex;
                                    return;
                                }

                                if (image.filename.toLowerCase().indexOf('http://') == -1) {
                                    image.filename = Energine.media + image.filename;
                                }

                                // var imgStr = '<img src="'
                                //     + image.filename + '" width="'
                                //     + image.width + '" height="'
                                //     + image.height + '" align="'
                                //     + image.align + '" alt="'
                                //     + image.alt + '" border="0" style="';
                                //
                                // ['margin-left', 'margin-right', 'margin-top', 'margin-bottom'].each(function (marginProp) {
                                //     if (image[marginProp] != 0) {
                                //         imgStr += marginProp + ':' + image[marginProp] +
                                //             'px;';
                                //     }
                                // });

                                // imgStr += '"/>';

                                // Формируем тэг <img ... />
                                let imgStr = `<img src="${image.filename}" width="${image.width}" height="${image.height}" align="${image.align}" alt="${image.alt}" border="0" style="`;

                                // Массив полей margin-*
                                ['margin-left', 'margin-right', 'margin-top', 'margin-bottom'].forEach(marginProp => {
                                    if (image[marginProp] && image[marginProp] != 0) {
                                        imgStr += `${marginProp}:${image[marginProp]}px;`;
                                    }
                                });

                                imgStr += '"/>';


                                editor.insertHtml(imgStr);
                                panel.style.zIndex = zIndex;
                                //panel.setStyle('z-index', zIndex);
                            },
                            extraData: imageData
                        });
                    }
                });
            }
        });

		if ( editor.ui.addButton ) {
			editor.ui.addButton( 'EnergineImage', {
				label: editor.lang.energineimage.toolbar,
				command: 'energineimage',
				toolbar: 'insert,10'
			});
		}
	}
});
