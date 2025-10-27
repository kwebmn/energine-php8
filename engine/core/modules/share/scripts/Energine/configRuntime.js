/**
 * Create configuration helpers bound to Energine runtime state.
 *
 * @param {{
 *   configState: { merge(values: Record<string, any>): void },
 *   translations: { extend(values: Record<string, any>): void },
 *   configFactory: {
 *     createConfigFromProps(props: Record<string, any>): Record<string, any>,
 *     createConfigFromScriptDataset(overrides?: Record<string, any>): Record<string, any>,
 *     readConfigFromScriptDataset(): Record<string, any>,
 *   }
 * }} context
 * @returns {{
 *   mergeConfigValues(values: Record<string, any>): void,
 *   createConfigFromProps(props: Record<string, any>): Record<string, any>,
 *   createConfigFromScriptDataset(overrides?: Record<string, any>): Record<string, any>,
 *   readConfigFromScriptDataset(): Record<string, any>,
 *   boot(config?: Record<string, any>): any,
 *   stageTranslations(values: Record<string, any>): void,
 * }}
 */
export const createConfigRuntime = ({ configState, translations, configFactory }) => ({
    mergeConfigValues(values = {}) {
        if (!values || typeof values !== 'object') {
            return;
        }

        configState.merge(values);
    },

    createConfigFromProps(props = {}) {
        return configFactory.createConfigFromProps(props);
    },

    createConfigFromScriptDataset(overrides = {}) {
        return configFactory.createConfigFromScriptDataset(overrides);
    },

    readConfigFromScriptDataset() {
        return configFactory.readConfigFromScriptDataset();
    },

    boot(config = {}) {
        const { translations: translationsConfig, ...rest } = config;

        if (rest && typeof rest === 'object') {
            configState.merge(rest);
        }

        if (translationsConfig) {
            translations.extend(translationsConfig);
        }

        return this;
    },

    stageTranslations(values) {
        if (!values || typeof values !== 'object') {
            return;
        }

        translations.extend(values);
    },
});
