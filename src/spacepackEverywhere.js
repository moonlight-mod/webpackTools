import { getWpToolsFunc } from "./spacepackLite";

function getWebpackVersion(chunkObject) {
  if (chunkObject instanceof Array) {
    return "modern";
  } else {
    return "legacy";
  }
}

// Gross Hack to support both webpack 4, webpack 5
const onChunkLoaded = function (webpackRequire) {
  webpackRequire("spacepack");
};
onChunkLoaded[0] = ["spacepack"];
onChunkLoaded[Symbol.iterator] = function () {
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

function pushSpacepack(chunkObjectName) {
  const chunkObject = window[chunkObjectName];
  if (chunkObject.__spacepack_everywhere_injected) {
    return;
  }
  const version = getWebpackVersion(chunkObject);
  console.log("[wpTools] Detected " + chunkObjectName + " using webpack " + version);
  switch (version) {
    case "modern":
      chunkObject.__spacepack_everywhere_injected = true;
      chunkObject.push([["spacepack"], { spacepack: getWpToolsFunc(chunkObjectName, true) }, onChunkLoaded]);
      break;
  }
}

export function spacepackEverywhere(config) {
  if (config?.ignoreSites?.includes(window.location.host)) {
    return;
  }

  for (const key of Object.getOwnPropertyNames(window)) {
    if (
      (key.includes("webpackJsonp") || key.includes("webpackChunk") || key.includes("__LOADABLE_LOADED_CHUNKS__")) &&
      !key.startsWith("spacepack") && !config?.ignoreChunkObjects?.includes(key)
    ) {
      pushSpacepack(key);
    }
  }
}
