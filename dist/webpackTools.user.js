// ==UserScript==
// @name         webpackTools
// @namespace    https://adryd.com
// @version      0.1
// @description  meow meow emwo
// @author       adryd
// @match        https://*
// @match        http://*
// @grant        GM_addElement
// @grant        GM_getResourceText
// @run-at       document-start
// @resource     runtimeScript http://127.0.0.1:8080/webpackToolsRuntime.js
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
      },
      {
        name: "twitter",
        matchSites: ["twitter.com"],
        chunkObject: "webpackChunk_twitter_responsive_web",
        webpackVersion: 5,
        patches: [
          {
            name: "demo",
            find: "(window.__INITIAL_STATE__",
            replace: {
              match: /var .{1,3}=.\..\(window\.__INITIAL_STATE__/,
              replacement: (orig) => `console.log('Patches work!!!');${orig}`,
            },
          },
        ],
        modules: [
          {
            name: "inspect",
            needs: ["(window.__INITIAL_STATE__"],
            entry: true,
            run: function (module, exports, webpackRequire) {
              console.log("meowwie");
              unsafeWindow.wpRequire = webpackRequire;
            },
          },
        ],
      }
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
  