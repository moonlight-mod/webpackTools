// ==UserScript==
// @name         webpackTools
// @namespace    https://adryd.com
// @version      0.1
// @description  meow meow emwo
// @author       adryd
// @include      http://*
// @include      https://*
// @grant        GM_addElement
// @run-at       document-start
// ==/UserScript==

(() => {
  const config = {};

  /* // Example config
  const config = {
    spacepackEverywhere: {
      enabled: true, // Automatically detect webpack objects and inject them with spacepack (Default: true)
      ignoreSites: [], // Don't inject spacepack on matching sites (Default: [])

      // Don't inject spacepack on matching webpack objects (Default: [])
      ignoreChunkObjects: [
        "webpackChunkruffle_extension", // https://ruffle.rs/
      ],
    },
    siteConfigs: [
      {
        name: "twitter", // For debug logging (Required)
        chunkObject: "webpackChunk_twitter_responsive_web", // Name of webpack chunk object to intercept (Required)
        webpackVersion: "5", // Version of webpack used to compile. (Required)

        // String or Array of strings of sites to inject on. (Required)
        matchSites: ["twitter.com"],

        // Whether to isolate every module. with //# sourceURL=. Allows for viewing an individual module in devtools
        // without the whole rest of the chunk, but has a noticable performance impact (Default: false)
        patchAll: true,
        injectSpacepack: true, // Whether to inject spacepack (Default: true)
        patchEntryChunk: true, // Some webpack compatible clones populate webpackRequire.m in the runtime chunk. This patches those modules.
        patches: [
          {
            // Used for debugging purposes, logging if a patch fails (TODO) and a comment of which
            // patches affected a module
            name: "patchingDemo", 
            
            // String, regexp or an array of them to match a module we're patching. Best to keep this a single string if 
            // possible for performance reasons (Required.)
            find: "(window.__INITIAL_STATE__",

            // match and replace are literally passed to `String.prototype.replace(match, replacement)`
            replace: {
              match: /(const|var) .{1,3}=.\..\(window\.__INITIAL_STATE__/,
              replacement: (orig) => `console.log('Patches work!!!');${orig}`,
            },
          },
        ],
        modules: [
          {
            // ID of the module being injected. If this ID is identical to one of another module it will be replaced 
            // with this one. (Required)
            name: "modulesDemo", 
            
            // Set of strings, or regexes of modules that need to be loaded before injecting this one. can also be 
            // `{moduleId: <moduleId>}` if depending on other injected or named modules. (Default: null)
            needs: new Set(), 
            entry: true, // Whether to load immediately or wait to be required by another module (Default: false)

            // The actual webpack module! Treat this sort of like in node where you can require other modules and export
            // your own values. (Required). Hint: you can require("spacepack") if injectSpacepack isn't false.
            run: function (module, exports, webpackRequire) {
              // the actual webpack module.
              console.log("Module injection works!!!");
            },
          },
        ],
      },
    ],
  };
  */

  unsafeWindow.__webpackTools_config = config;

  const runtime = "{{ REPLACE_ME RUNTIME }}";

  GM_addElement("script", {
    textContent: runtime,
  });
})();
