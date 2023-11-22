// ==UserScript==
// @name         webpackTools
// @namespace    https://adryd.com
// @version      0.1
// @description  meow meow emwo
// @author       adryd
// @include      http://*
// @include      https://*
// @grant        GM_addElement
// @grant        GM_getResourceText
// @run-at       document-start
// @resource     runtimeScript https://adryd325.github.io/webpackTools/webpackToolsRuntime.js
// ==/UserScript==

(() => {
  const configs = [
    {
      name: "discord",
      matchSites: ["discord.com", "ptb.discord.com", "canary.discord.com"],
      chunkObject: "webpackChunkdiscord_app",
      webpackVersion: 5,
      patches: [],
      modules: [],
      inspectAll: true,
    },
    {
      name: "twitter",
      matchSites: ["twitter.com"],
      chunkObject: "webpackChunk_twitter_responsive_web",
      webpackVersion: 5,
      patches: [
        {
          name: "patchingDemo",
          find: "(window.__INITIAL_STATE__",
          replace: {
            match: /const .{1,3}=.\..\(window\.__INITIAL_STATE__/,
            replacement: (orig) => `console.log('Patches work!!!');${orig}`,
          },
        },
      ],
      modules: [
        {
          name: "exposeWpRequire",
          needs: [],
          entry: true,
          run: function (module, exports, webpackRequire) {
            console.log("meowwie");
            unsafeWindow.wpRequire = webpackRequire;
          },
        },
      ],
    },
  ];

  let thisSiteConfig;
  for (let siteConfig of configs) {
    if (siteConfig.matchSites?.includes(window.location.host)) {
      thisSiteConfig = siteConfig;
      break;
    }
  }
  if (!thisSiteConfig) {
    return;
  }

  unsafeWindow.__webpackTools_siteConfig = thisSiteConfig;

  GM_addElement("script", {
    textContent: GM_getResourceText("runtimeScript"),
  });
})();
