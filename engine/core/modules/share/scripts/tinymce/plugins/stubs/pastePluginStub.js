import tinymce from 'tinymce/tinymce';

const PLUGIN_NAME = 'paste';

if (tinymce?.PluginManager?.get(PLUGIN_NAME)) {
    // Plugin already registered (e.g. commercial distribution). Do nothing.
} else if (tinymce?.PluginManager?.add) {
    tinymce.PluginManager.add(PLUGIN_NAME, () => {
        // Provide a minimal stub so TinyMCE doesn't throw during initialization
        // when configurations still reference the legacy "paste" plugin.
    });
}

export default undefined;
