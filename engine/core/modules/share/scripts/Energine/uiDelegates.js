/**
 * Create method delegates exposing UI helper capabilities on Energine runtime.
 *
 * @param {{
 *   confirmBox: Function,
 *   alertBox: Function,
 *   noticeBox: Function,
 *   showLoader: Function,
 *   hideLoader: Function,
 * }} uiHelpers
 * @returns {Record<string, Function>}
 */
export const createUIDelegates = (uiHelpers) => ({
    confirmBox: (message, yes, no) => uiHelpers.confirmBox(message, yes, no),
    alertBox: (message) => uiHelpers.alertBox(message),
    noticeBox: (message, icon, callback) => uiHelpers.noticeBox(message, icon, callback),
    showLoader: (container) => uiHelpers.showLoader(container),
    hideLoader: (container) => uiHelpers.hideLoader(container),
});
