// Admin runtime entry builds on the public bundle and wires in editor-specific modules.

import './jquery.min.js';
import './bootstrap.bundle.min.js';
import './jstree/jstree.js';
import './fancytree/jquery.fancytree-all.js';
import './codemirror/lib/codemirror.js';

import './site.entry.js';

// Administration components.
import './AttachmentEditor.js';
import './DivForm.js';
import './DivManager.js';
import './DivSidebar.js';
import './DivTree.js';
import './FileRepoForm.js';
import './FileRepository.js';
import './FiltersTreeEditor.js';
import './ImageManager.js';
import './PageEditor.js';
import './PageToolbar.js';
import './SiteManager.js';
import './TagEditor.js';

// Admin-facing modules from other packages.
import '../../user/scripts/GroupForm.js';
import '../../user/scripts/UserManager.js';
import '../../wizard/scripts/DefaultTemplateJs.js';
import '../../wizard/scripts/TemplateWizard.js';
