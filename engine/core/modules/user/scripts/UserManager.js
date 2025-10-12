import GridManager from '../../share/scripts/GridManager.js';
import { globalScope, attachToWindow as registerGlobal } from '../../share/scripts/exportToWindow.js';

/**
 * UserManager (ES6 version)
 * @extends GridManager
 */
class UserManager extends GridManager {
    /**
     * Активировать пользователя
     */
    activate() {
        this.request(
            `${this.singlePath}${this.grid.getSelectedRecordKey()}/activate/`,
            null,
            () => this.loadPage(this.pageList.currentPage)
        );
    }

    /**
     * Авторизация пользователя
     */
    auth() {
        this.request(
            `${this.singlePath}${this.grid.getSelectedRecordKey()}/auth/`,
            null,
            () => this.loadPage(this.pageList.currentPage)
        );
        setTimeout(() => {
            const targetWindow = globalScope?.top || globalScope;
            if (targetWindow?.location) {
                targetWindow.location.href = '/my/';
            }
        }, 1000);
    }
}

export { UserManager };
export default UserManager;

export function attachToWindow(target = globalScope) {
    return registerGlobal('UserManager', UserManager, target);
}

attachToWindow();
