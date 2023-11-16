import config from "./config";
import {patchModules, injectModules} from "./patcher";

const chunkObjectName = config.chunkObject;

// This is necesary since some sites (twitter) define the chunk object earlier
let realChunkObject = window[chunkObjectName];

Object.defineProperty(window, chunkObjectName, {
  set: function set(value) {
    // Don't infinitely re-wrap .push()
    if (!value.push.__wpt_injected) {
      realChunkObject = value;
      const webpackPush = value.push;

      value.push = function (chunk) {
        if (!webpackPush.__wpt_injected) {
          patchModules(chunk[1]);
          injectModules(chunk);
        }
        return webpackPush.apply(this, arguments);
      };

      value.push.__wpt_injected = true;
      console.log("injected " + chunkObjectName);
    }
  },
  get: function get() {
    return realChunkObject;
  },
  configurable: true,
});
