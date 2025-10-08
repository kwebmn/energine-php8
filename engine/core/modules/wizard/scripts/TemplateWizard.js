import Energine from '../../share/scripts/Energine.js';
import GridManager from '../../share/scripts/GridManager.js';
import ModalBox from '../../share/scripts/ModalBox.js';

const globalScope = typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : undefined);

const $ = globalScope?.jQuery || globalScope?.$;
/**
 * TemplateWizard (ES6 version)
 * @extends GridManager
 */
class TemplateWizard extends GridManager {
    /**
     * @param {HTMLElement|string} element
     */
    constructor(element) {
        if (!$) {
            throw new Error('TemplateWizard requires jQuery to be available globally.');
        }

        super(element);
    }

    /**
     * Открыть модалку с linker
     */
    linker() {
        ModalBox.open({
            url: `${Energine.base}/setup/`,
            onClose: (returnValue) => {
                // Здесь твоя логика при закрытии, если нужна
            }
        });
        // Принудительно прокрутка в iframe (jQuery)
        $('iframe').attr('scrolling', 'yes');
    }

    /**
     * Открыть builder для выбранного шаблона
     */
    builder() {
        if (globalScope?.confirm?.('Are you sure?')) {
            ModalBox.open({
                url: `${this.singlePath}build/${this.grid.getSelectedRecordKey()}/`,
                onClose: this.processAfterCloseAction.bind(this)
            });
            $('iframe').attr('scrolling', 'yes');
        }
    }
}

export { TemplateWizard };
export default TemplateWizard;

export function attachToWindow(target = globalScope) {
    if (!target) {
        return TemplateWizard;
    }

    target.TemplateWizard = TemplateWizard;
    return TemplateWizard;
}

attachToWindow();
