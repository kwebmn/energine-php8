/**
 * Utilities for staging translations from embedded script tags.
 * @module Energine/translationScripts
 */

export const translationScriptSelector = 'script[type="application/json"][data-energine-translations]';

/**
 * Apply staged translations to runtime instance.
 *
 * @param {{ stageTranslations: (values: Record<string, any>) => void, safeConsoleError?: (error: unknown, context?: string) => void }} runtime
 * @param {Document|null} doc
 * @returns {void}
 */
export const applyTranslationsFromScripts = (runtime, doc) => {
    if (!doc || !runtime || typeof runtime.stageTranslations !== 'function') {
        return;
    }

    const scripts = doc.querySelectorAll(translationScriptSelector);
    if (!scripts || !scripts.length) {
        return;
    }

    scripts.forEach((script) => {
        if (!script || (script.dataset && script.dataset.energineTranslationsProcessed === '1')) {
            return;
        }

        const payload = script.textContent ? script.textContent.trim() : '';
        if (!payload) {
            if (script.dataset) {
                script.dataset.energineTranslationsProcessed = '1';
            }
            return;
        }

        try {
            const parsed = JSON.parse(payload);
            runtime.stageTranslations(parsed);
            if (script.dataset) {
                script.dataset.energineTranslationsProcessed = '1';
            }
            if (typeof script.remove === 'function') {
                script.remove();
            } else {
                script.textContent = '';
            }
        } catch (error) {
            if (typeof runtime.safeConsoleError === 'function') {
                runtime.safeConsoleError(error, '[Energine.autoBootstrap] Failed to parse staged translations');
            }
        }
    });
};
