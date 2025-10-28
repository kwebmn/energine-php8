import './styles/mdvendor.css';
import 'mdb-ui-kit/css/mdb.min.css';

import mdb from 'mdb-ui-kit/js/mdb.umd.min.js';

if (typeof window !== 'undefined' && mdb && !window.mdb) {
    window.mdb = mdb;
}

export default mdb;
