// ==UserScript==
// @name         WebpackPreload
// @namespace    Violentmonkey Scripts
// @version      0.1
// @description  meow meow emwo
// @author       adryd
// @match        https://twitter.com/*
// @match        https://discord.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    "use strict";
    function i() {
      const siteConfigs = {
        twitter: {
          chunkObject: "webpackChunk_twitter_responsive_web",
          patches: [
            {
              find: "(window.__INITIAL_STATE__",
              replace: {
                match: /var .{1,3}=.\..\(window\.__INITIAL_STATE__/,
                replacement: (orig) => `console.log('Patches work!!!');${orig}`,
              },
            },
          ],
          inspectAll: true
        },
        discord: {
          chunkObject: "webpackChunkdiscord_app",
          patches: [],
          inspectAll: false
        }
      };
      let thisConfig = siteConfigs["twitter.com"];
      switch (window.location.host) {
        case "discord.com":
        case "ptb.discord.com":
        case "canary.discord.com":
          thisConfig = siteConfigs.discord;
          break;
        case "twitter.com":
        case "mobile.twitter.com":
          thisConfig = siteConfigs.twitter;
          break;
        default:
          return;
      }
  
      let realWebpackChunk = window[thisConfig.chunkObject];
  
      const hasInjected = false;
      Object.defineProperty(window, thisConfig.chunkObject, {
        set: function set(value) {
          // Don't infinitely re-wrap .push()
          if (!value.push.__injected) {
            realWebpackChunk = value;
            const webpackPush = value.push;
  
            value.push = function (chunk) {
              if (!webpackPush.__injected) {
                patchModules(chunk[1]);
              }
              return webpackPush.apply(this, arguments);
            };
  
            value.push.__injected = true;
            console.log("injected " + thisConfig.chunkObject);
          }
        },
        get: function get() {
          return realWebpackChunk;
        },
        configurable: true,
      });
  
      function patchModules(modules) {
        for (let id in modules) {
          let funcStr = Function.prototype.toString.apply(modules[id]);
  
          const patchesToApply = [];
          for (let patch of thisConfig.patches) {
            // todo regex matches
            if (funcStr.indexOf(patch.find) != -1) {
              patchesToApply.push(patch.replace);
            }
          }
  
          for (let toApply of patchesToApply) {
            funcStr = funcStr.replace(toApply.match, toApply.replacement);
          }
  
          if (patchesToApply.length > 0 || thisConfig.inspectAll) {
            modules[id] = new Function(
              "module",
              "exports",
              "webpackRequire",
              "(" +
                funcStr +
                ").apply(this, arguments)\n//# sourceURL=Webpack-Module-" +
                id +
                "\n"
            );
          }
        }
      }
    }
    // Early loading hack
    const script = document.createElement("script");
    script.text = "(" + i.toString() + ")()";
    document.documentElement.appendChild(script);
  })();
  