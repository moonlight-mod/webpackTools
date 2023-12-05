import { getWpToolsFunc } from "./wpTools";

function getVersion(chunkObject) {
  if (chunkObject instanceof Array) {
    return "modern";
  } else {
    return "legacy";
  }
}

function injectWpTools(chunkObjectName) {
  const chunkObject = window[chunkObjectName];

  if (chunkObject.__wpt_everywhere_injected) {
    return;
  }
  const version = getVersion(chunkObject);

  console.log("[wpTools] Detected " + chunkObjectName + " using webpack " + version);

  switch (version) {
    case "modern":
      // Gross Hack to support both webpack 4, webpack 5 and cursed rspack discord shenanagains
      var load = function (webpackRequire) {
        webpackRequire("wpTools");
      };
      load[0] = ["wpTools"];
      load[Symbol.iterator] = function () {
        return {
          read: false,
          next() {
            if (!this.read) {
              this.read = true;
              return { done: false, value: 0 };
            } else {
              return { done: true };
            }
          },
        };
      };
      chunkObject.__wpt_everywhere_injected = true;
      chunkObject.push([["wpTools"], { wpTools: getWpToolsFunc(chunkObjectName, true) }, load]);
      break;
  }
}

export function injectEverywhere() {
  for (const key of Object.getOwnPropertyNames(window)) {
    if (
      (key.includes("webpackJsonp") || key.includes("webpackChunk") || key.includes("__LOADABLE_LOADED_CHUNKS__")) &&
      !key.startsWith("wpTools")
    ) {
      injectWpTools(key);
    }
  }
}
