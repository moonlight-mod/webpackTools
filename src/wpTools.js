import { matchModule } from "./patcher";

export default function wpTools(module, exports, webpackRequire) {
    // https://github.com/webpack/webpack/blob/main/lib/RuntimeGlobals.js
    // modules: webpackRequire.m
    // exports: webpackRequire.c

    function findModulesByExports(keys, maxDepth) {}

    function findModulesByMatches(search) {}

    function inspectModule(moduleId) {}

    // Obfuscated code helpers
    function findObjectFromKey(exports, key) {}

    function findObjectFromValue(exports, value) {}

    function findObjectFromKeyValuePair(exports, key, value) {}

    function findFunctionByMatches(exports, search) {}

    
    // some cyn magic
    window.wpTools = module.exports.default = exports.default = {
        findModulesByExports,
        findModulesByMatches,
        inspectModule,
        webpackRequire,
        
        findObjectFromKey,
        findObjectFromValue,
        findObjectFromKeyValuePair,
        findFunctionByMatches,

        // magicrequire habits
        exportCache: findModulesByExports,
        generatorText: findModulesByMatches,
    };
}