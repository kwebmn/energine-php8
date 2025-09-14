ScriptLoader.load('GridManager');
/**
 * TemplateWizard (ES6 version)
 * @extends GridManager
 */
class TemplateWizard extends GridManager {
    /**
     * @param {HTMLElement|string} element
     */
    constructor(element) {
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
        if (confirm('Are you sure?')) {
            ModalBox.open({
                url: `${this.singlePath}build/${this.grid.getSelectedRecordKey()}/`,
                onClose: this.processAfterCloseAction.bind(this)
            });
            $('iframe').attr('scrolling', 'yes');
        }
    }
}

// Глобально, если требуется
window.TemplateWizard = TemplateWizard;
