import './styles/vendor.css';

import bootstrapSource from '../../../site/modules/default/scripts/bootstrap.bundle.min.js?raw';
import jquerySource from '../../core/modules/share/scripts/jquery.min.js?raw';
import jsTreeSource from '../../core/modules/share/scripts/jstree/jstree.min.js?raw';
import ckeditorSource from '../../core/modules/share/scripts/ckeditor/ckeditor.js?raw';
import fileAPISource from '../../core/modules/share/scripts/FileAPI/FileAPI.js?raw';

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

function injectGlobalScript(source, label) {
  if (!isBrowser) {
    return;
  }

  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.text = `${source}\n//# sourceURL=${label}`;
  document.head.appendChild(script);
  document.head.removeChild(script);
}

if (isBrowser) {
  injectGlobalScript(bootstrapSource, 'site/modules/default/scripts/bootstrap.bundle.min.js');
  injectGlobalScript(jquerySource, 'engine/core/modules/share/scripts/jquery.min.js');

  if (typeof window.jQuery === 'function') {
    window.$ = window.jQuery;
  }

  if (typeof window.CKEDITOR_BASEPATH === 'undefined') {
    const ckeditorBase = new URL(
      '../../core/modules/share/scripts/ckeditor/',
      import.meta.url,
    );
    window.CKEDITOR_BASEPATH = ckeditorBase.href.endsWith('/')
      ? ckeditorBase.href
      : `${ckeditorBase.href}/`;
  }

  injectGlobalScript(ckeditorSource, 'engine/core/modules/share/scripts/ckeditor/ckeditor.js');
  injectGlobalScript(jsTreeSource, 'engine/core/modules/share/scripts/jstree/jstree.min.js');
  injectGlobalScript(fileAPISource, 'engine/core/modules/share/scripts/FileAPI/FileAPI.js');
}
