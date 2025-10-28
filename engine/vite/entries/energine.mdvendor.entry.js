import './styles/mdvendor.css';
import 'mdb-ui-kit/css/mdb.min.css';
import mdb from 'mdb-ui-kit/js/mdb.es.min.js';

if (typeof window !== 'undefined') {
    if (typeof window.mdb === 'undefined') {
        window.mdb = mdb;
    }

    if (typeof window.bootstrap === 'undefined' && typeof window.mdb !== 'undefined') {
        window.bootstrap = window.mdb;
    }

    const activeMdb = window.mdb;

    if (activeMdb && typeof activeMdb.initMDB === 'function') {
        activeMdb.initMDB(activeMdb);
    }
}

export default mdb;
