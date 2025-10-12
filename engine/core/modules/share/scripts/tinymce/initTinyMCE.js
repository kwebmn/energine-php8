import tinymce from 'tinymce/tinymce';

import 'tinymce/icons/default/icons.js';
import 'tinymce/themes/silver/theme.js';
import 'tinymce/models/dom/model.js';

import 'tinymce/plugins/advlist/plugin.js';
import 'tinymce/plugins/anchor/plugin.js';
import 'tinymce/plugins/autolink/plugin.js';
import 'tinymce/plugins/charmap/plugin.js';
import 'tinymce/plugins/code/plugin.js';
import 'tinymce/plugins/fullscreen/plugin.js';
import 'tinymce/plugins/help/plugin.js';
import 'tinymce/plugins/image/plugin.js';
import 'tinymce/plugins/link/plugin.js';
import 'tinymce/plugins/lists/plugin.js';
import 'tinymce/plugins/media/plugin.js';
import 'tinymce/plugins/paste/plugin.js';
import 'tinymce/plugins/searchreplace/plugin.js';
import 'tinymce/plugins/table/plugin.js';
import 'tinymce/plugins/visualblocks/plugin.js';
import 'tinymce/plugins/wordcount/plugin.js';

import 'tinymce/skins/ui/oxide/skin.min.css';
import 'tinymce/skins/content/default/content.min.css';

import registerEnerginePlugins from './plugins/registerEnerginePlugins.js';

registerEnerginePlugins(tinymce);

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

if (globalScope && !globalScope.tinymce) {
    globalScope.tinymce = tinymce;
}

export default tinymce;
