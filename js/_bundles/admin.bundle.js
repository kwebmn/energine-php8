import feedToolbarSource from '../../engine/core/modules/apps/scripts/FeedToolbar.js?raw';
import templateWizardSource from '../../engine/core/modules/wizard/scripts/TemplateWizard.js?raw';
import userManagerSource from '../../engine/core/modules/user/scripts/UserManager.js?raw';
import groupFormSource from '../../engine/core/modules/user/scripts/GroupForm.js?raw';
import userProfileSource from '../../engine/core/modules/user/scripts/UserProfile.js?raw';
import recoverPasswordSource from '../../engine/core/modules/user/scripts/RecoverPassword.js?raw';

const legacyAdminScripts = [
  ['engine/core/modules/apps/scripts/FeedToolbar.js', feedToolbarSource],
  ['engine/core/modules/wizard/scripts/TemplateWizard.js', templateWizardSource],
  ['engine/core/modules/user/scripts/UserManager.js', userManagerSource],
  ['engine/core/modules/user/scripts/GroupForm.js', groupFormSource],
  ['engine/core/modules/user/scripts/UserProfile.js', userProfileSource],
  ['engine/core/modules/user/scripts/RecoverPassword.js', recoverPasswordSource],
];

function runLegacyScript(code, label) {
  if (!code) {
    return;
  }

  const executed = (window.__legacyScriptsExecuted ||= new Set());
  if (executed.has(label)) {
    return;
  }

  try {
    const executor = new Function(`${code}\n//# sourceURL=${label}`);
    executor.call(window);
    executed.add(label);
  } catch (error) {
    console.error(`[admin.bundle] Failed to execute ${label}:`, error);
  }
}

legacyAdminScripts.forEach(([label, code]) => runLegacyScript(code, label));
