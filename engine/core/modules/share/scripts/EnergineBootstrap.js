import EnergineAPI, { createBootstrapRuntime } from './Energine.js';

const autoBootstrapRuntime = createBootstrapRuntime();
autoBootstrapRuntime();

export default {
    autoBootstrapRuntime,
    runtime: EnergineAPI.runtime,
};
