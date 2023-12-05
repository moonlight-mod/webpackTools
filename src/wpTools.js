import matchModule from "./matchModule";

const namedRequireMap = {
  p: "publicPath",
  s: "entryModuleId",
  c: "moduleCache",
  m: "moduleFactories",
  e: "ensureChunk",
  f: "ensureChunkHandlers",
  E: "prefetchChunk",
  F: "prefetchChunkHandlers",
  G: "preloadChunk",
  H: "preloadChunkHandlers",
  d: "definePropertyGetters",
  r: "makeNamespaceObject",
  t: "createFakeNamespaceObject",
  n: "compatGetDefaultExport",
  hmd: "harmonyModuleDecorator",
  nmd: "nodeModuleDecorator",
  h: "getFullHash",
  w: "wasmInstances",
  v: "instantiateWasm",
  oe: "uncaughtErrorHandler",
  nc: "scriptNonce",
  l: "loadScript",
  ts: "createScript",
  tu: "createScriptUrl",
  tt: "getTrustedTypesPolicy",
  cn: "chunkName",
  j: "runtimeId",
  u: "getChunkScriptFilename",
  k: "getChunkCssFilename",
  hu: "getChunkUpdateScriptFilename",
  hk: "getChunkUpdateCssFilename",
  x: "startup",
  X: "startupEntrypoint",
  O: "onChunksLoaded",
  C: "externalInstallChunk",
  i: "interceptModuleExecution",
  g: "global",
  S: "shareScopeMap",
  I: "initializeSharing",
  R: "currentRemoteGetScope",
  hmrF: "getUpdateManifestFilename",
  hmrM: "hmrDownloadManifest",
  hmrC: "hmrDownloadUpdateHandlers",
  hmrD: "hmrModuleData",
  hmrI: "hmrInvalidateModuleHandlers",
  hmrS: "hmrRuntimeStatePrefix",
  amdD: "amdDefine",
  amdO: "amdOptions",
  System: "system",
  o: "hasOwnProperty",
  y: "systemContext",
  b: "baseURI",
  U: "relativeUrl",
  a: "asyncModule",
};

function getNamedRequire(webpackRequire) {
  const namedRequireObj = {};
  Object.getOwnPropertyNames(webpackRequire).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(namedRequireMap, key)) {
      namedRequireObj[namedRequireMap[key]] = webpackRequire[key];
    }
  });
  return namedRequireObj;
}

export function getWpToolsFunc(chunkObject, logSuccess = false) {
  function wpTools(module, exports, webpackRequire) {
    if (logSuccess) {
      console.log("[wpTools] wpTools loaded in " + chunkObject);
    }

    // https://github.com/webpack/webpack/blob/main/lib/RuntimeGlobals.js
    // modules functions: webpackRequire.m
    // modules require cache (exports): webpackRequire.c

    // TODO: recurse in objects
    function findModulesByExports(keysArg) {
      if (!webpackRequire.c) {
        throw new Error("webpack runtime didn't export its moduleCache")
      }
      const keys = keysArg instanceof Array ? keysArg : [keysArg];
      return Object.entries(webpackRequire.c)
        .filter(([moduleId, exportCache]) => {
          return !keys.some((searchKey) => {
            return !(
              exportCache !== undefined &&
              exportCache !== window &&
              (exports?.[searchKey] || exports?.default?.[searchKey])
            );
          });
        })
        .map(([moduleId, exportCache]) => {
          return exportCache;
        });
    }

    function findModulesByCode(search) {
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

    const exportedRequire =
      (module.exports.default =
      exports.default =
        {
          require: webpackRequire,
          named: getNamedRequire(webpackRequire),
          chunkCallback: window[chunkObject],

          findModulesByCode,
          findModulesByExports,
          inspectModule,
        });

    const runtimesRegistry = window.wpTools.runtimes;

    // If already registered with the same chunk object name
    if (runtimesRegistry[chunkObject]) {
      console.warn("[wpTools] Multiple active runtimes for " + chunkObject);

      let currId = 0;
      if (runtimesRegistry[chunkObject].__wpTools_multiRuntime_id) {
        currId = runtimesRegistry[chunkObject].__wpTools_multiRuntime_id;
      }

      runtimesRegistry[chunkObject + "_" + currId] = runtimesRegistry[chunkObject];

      currId++;
      runtimesRegistry[chunkObject + "_" + currId] = exportedRequire;

      // The last runtime load seems to be the one that's most active
      runtimesRegistry[chunkObject] = exportedRequire;
    }
    runtimesRegistry[chunkObject] = exportedRequire;
    window["wpTools_"+chunkObject] = exportedRequire;
  }

  // Mark as processed as to not loose scope if somehow passed to Patcher._patchModules()
  wpTools.__wpt_processed = true;

  return wpTools;
}
