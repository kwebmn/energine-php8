# Energine CKEditor overrides

This directory stores only the custom Energine plugins that extend the CKEditor bundle.
The upstream CKEditor distribution is now located under `engine/vite/vendor/ckeditor` and
is copied to the public `assets/ckeditor/` folder during the Vite build. Any additional
project-specific plugins should live alongside `energineimage` and `energinefile` here so
that they are bundled automatically.
