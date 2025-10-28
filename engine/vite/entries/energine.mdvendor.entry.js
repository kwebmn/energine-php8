import './styles/mdvendor.css';
import 'mdb-ui-kit/css/mdb.min.css';
import 'mdb-ui-kit/js/mdb.umd.min.js';

if (typeof window !== 'undefined'
    && typeof window.bootstrap === 'undefined'
    && typeof window.mdb !== 'undefined') {
    window.bootstrap = window.mdb;
}
