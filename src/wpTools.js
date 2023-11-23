import { matchModule } from "./patcher";

export default function wpTools(module, exports, webpackRequire) {
  // https://github.com/webpack/webpack/blob/main/lib/RuntimeGlobals.js
  // modules functions: webpackRequire.m
  // modules require cache (exports): webpackRequire.c

  // TODO: recurse in objects
  function findModulesByExports(keysArg) {
    const keys = keysArg instanceof Array ? keysArg : [keysArg];
    return Object.entries(webpackRequire.c)
      .filter(([moduleId, exportCache]) => {
        return !keys.some((searchKey) => {
          return !(
            exportCache != undefined &&
            exportCache != window &&
            (exports?.[searchKey] || exports?.default?.[searchKey])
          );
        });
      })
      .map(([moduleId, exportCache]) => {
        return exportCache;
      });
  }

  function findModulesByMatches(search) {
    return Object.entries(webpackRequire.m)
      .filter(([moduleId, moduleFunc]) => {
        const funcStr = Function.prototype.toString.apply(moduleFunc);
        return matchModule(funcStr, search);
      })
      .map(([moduleId, moduleFunc]) => {
        return {
          id: moduleId,
          exports: webpackRequire(moduleId),
        };
      });
  }

  function inspectModule(moduleId) {
    /* TODO: rewrap modules if not patched.
     * This used to isolate modules like wrapping them in the patcher stage did,
     * however this seems to have broken in newer browsers */
    return webpackRequire.m[moduleId];
  }

  // TODO: Obfuscated code helpers
  // function findObjectFromKey(object, key) {}
  // function findObjectFromValue(object, value) {}
  // function findObjectFromKeyValuePair(object, key, value) {}
  // function findFunctionByMatches(object, search) {}

  // TODO: SWC helpers
  // function getDefault() {}

  window.wpTools =
    module.exports.default =
    exports.default =
      {
        findModulesByExports,
        findModulesByMatches,
        inspectModule,
        webpackRequire,
      };
}
