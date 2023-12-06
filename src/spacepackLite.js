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
      console.log("[wpTools] spacepack loaded in " + chunkObject);
    }

    // https://github.com/webpack/webpack/blob/main/lib/RuntimeGlobals.js
    // modules functions: webpackRequire.m
    // modules require cache (exports): webpackRequire.c

    // TODO: recurse in objects
    function findModulesByExports(keysArg) {
      if (!webpackRequire.c) {
        throw new Error("webpack runtime didn't export its moduleCache");
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
          try {
            return {
              id: moduleId,
              exports: webpackRequire(moduleId),
            };
          } catch (error) {
            console.error("Failed to require module: " + error);
            return {
              id: moduleId,
              exports: {},
            };
          }
        });
    }

    function findObjectFromKey(exports, key) {
      let subKey;
      if (key.indexOf(".") > -1) {
        const splitKey = key.split(".");
        key = splitKey[0];
        subKey = splitKey[1];
      }
      for (const exportKey in exports) {
        const obj = exports[exportKey];
        if (obj && obj[key] !== undefined) {
          if (subKey) {
            if (obj[key][subKey]) return obj;
          } else {
            return obj;
          }
        }
      }
      return null;
    }

    function findObjectFromValue(exports, value) {
      for (const exportKey in exports) {
        const obj = exports[exportKey];
        // eslint-disable-next-line eqeqeq
        if (obj == value) return obj;
        for (const subKey in obj) {
          // eslint-disable-next-line eqeqeq
          if (obj && obj[subKey] == value) {
            return obj;
          }
        }
      }
      return null;
    }

    function findObjectFromKeyValuePair(exports, key, value) {
      for (const exportKey in exports) {
        const obj = exports[exportKey];
        // eslint-disable-next-line eqeqeq
        if (obj && obj[key] == value) {
          return obj;
        }
      }
      return null;
    }

    function findFunctionByStrings(exports, ...strings) {
      return (
        Object.entries(exports).filter(
          ([index, func]) =>
            typeof func === "function" &&
            !strings.some(
              (query) => !(query instanceof RegExp ? func.toString().match(query) : func.toString().includes(query)),
            ),
        )?.[0]?.[1] ?? null
      );
    }

    function inspect(moduleId) {
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
          modules: webpackRequire.m,
          cache: webpackRequire.c,
          
          __namedRequire: getNamedRequire(webpackRequire),
          chunkObject: window[chunkObject],
          name: chunkObject,

          findModulesByCode,
          findModulesByExports,
          findObjectFromKey,
          findObjectFromKeyValuePair,
          findObjectFromValue,
          findFunctionByStrings,
          inspect,
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
    window["spacepack_" + chunkObject] = exportedRequire;
    window["spacepack"] = exportedRequire;
  }

  // Mark as processed as to not loose scope if somehow passed to Patcher._patchModules()
  wpTools.__wpt_processed = true;

  return wpTools;
}
