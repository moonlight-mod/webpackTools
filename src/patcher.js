import config from "./config";
import wpTools from "./wpTools";

let patchesToApply, modulesToInject;

if (config) {
  patchesToApply = new Set();
  if (config.patches) {
    for (const patch of config.patches) {
      patchesToApply.add(patch);
    }
  }

  modulesToInject = new Set();
  if (config.modules) {
    for (const module of config.modules) {
      if (module.needs != undefined && module.needs instanceof Array) {
        module.needs = new Set(module.needs);
      }
      modulesToInject.add(module);
    }
  }

  modulesToInject.add({
    name: "wpTools",
    // This is sorta a scope hack.
    // If we rewrap this function, it will lose its scope (in this case the match module import)
    run: wpTools,
    entry: true,
  });
}

export function interceptWebpack() {
  const chunkObjectName = config.chunkObject;

  // This is necesary since some sites (twitter) define the chunk object earlier
  let realChunkObject = window[chunkObjectName];

  Object.defineProperty(window, chunkObjectName, {
    set: function set(value) {
      realChunkObject = value;
      // Don't infinitely re-wrap .push()
      // Every webpack chunk reassigns the chunk array, triggering the setter every time
      // `(self.webpackChunk = self.webpackChunk || [])`
      if (!value.push.__wpt_injected) {
        realChunkObject = value;
        const realPush = value.push;

        value.push = function (chunk) {
          // This is necesary because webpack will re-wrap the .push function
          // Without this check, we'll patch modules multiple times
          if (!chunk.__wpt_processed) {
            chunk.__wpt_processed = true;
            patchModules(chunk[1]);
            injectModules(chunk);
          }
          return realPush.apply(this, arguments);
        };

        value.push.__wpt_injected = true;
        if (realPush == Array.prototype.push) {
          console.log("Injected " + chunkObjectName + " (before webpack runtime)");
        } else {
          console.log("Injected " + chunkObjectName + " (at webpack runtime)");
        }
      }
    },
    get: function get() {
      return realChunkObject;
    },
    configurable: true,
  });
}

export function matchModule(moduleStr, queryArg) {
  const queryArray = queryArg instanceof Array ? queryArg : [queryArg];
  return queryArray.some((query) => {
    // we like our microoptimizations https://jsben.ch/Zk8aw
    if (query instanceof RegExp) {
      return query.test(moduleStr);
    } else {
      return moduleStr.includes(query);
    }
  });
}

function patchModules(modules) {
  for (const id in modules) {
    let funcStr = Function.prototype.toString.apply(modules[id]);

    const matchingPatches = [];
    for (const patch of patchesToApply) {
      if (matchModule(funcStr, patch.find)) {
        matchingPatches.push(patch);
        patchesToApply.delete(patch);
      }
    }

    for (const patch of matchingPatches) {
      funcStr = funcStr.replace(patch.replace.match, patch.replace.replacement);
    }

    if (matchingPatches.length > 0 || config.inspectAll) {
      const debugString = "Patched by: " + matchingPatches.map((patch) => patch.name).join(", ");

      modules[id] = new Function(
        "module",
        "exports",
        "webpackRequire",
        `(${funcStr}).apply(this, arguments)\n// ${debugString}\n//# sourceURL=Webpack-Module-${id}`,
      );
      modules[id].__wpt_patched = true;
    }

    modules[id].__wpt_funcStr = funcStr;
    modules[id].__wpt_processed = true;
  }
}

function injectModules(chunk) {
  const readyModules = new Set();

  for (const moduleToInject of modulesToInject) {
    if (moduleToInject?.needs?.size > 0) {
      for (const need of moduleToInject.needs) {
        for (const wpModule of Object.entries(chunk[1])) {
          // match { moduleId: "id" } as well as strings and regex
          if ((need?.moduleId && wpModule[0] == need.moduleId) || matchModule(wpModule[1].__wpt_funcStr, need)) {
            moduleToInject.needs.delete(need);
            if (moduleToInject.needs.size == 0) {
              readyModules.add(moduleToInject);
            }
            break;
          }
        }
      }
    } else {
      readyModules.add(moduleToInject);
    }
  }

  if (readyModules.size > 0) {
    const injectModules = {};
    const injectEntries = [];

    for (const readyModule of readyModules) {
      modulesToInject.delete(readyModule);
      injectModules[readyModule.name] = readyModule.run;
      if (readyModule.entry) {
        injectEntries.push(readyModule.name);
      }
    }

    // Convert array to object for named modules
    if (chunk[1] instanceof Array) {
      const origChunkArray = chunk[1];
      chunk[1] = {};
      origChunkArray.forEach((module, index) => {
        chunk[1][index] = module;
      });
    }

    // merge our modules with original modules
    chunk[1] = Object.assign(chunk[1], injectModules);

    if (injectEntries.length > 0) {
      switch (config.webpackVersion) {
        case "5":
          if (chunk[2]) {
            const originalEntry = chunk[2];
            chunk[2] = function (webpackRequire) {
              originalEntry.apply(this, arguments);
              injectEntries.forEach(webpackRequire);
            };
          } else {
            chunk[2] = function (webpackRequire) {
              injectEntries.forEach(webpackRequire);
            };
          }
          break;
        case "4":
          if (chunk[2]?.[0]) {
            chunk[2]?.[0].concat([injectEntries]);
          } else {
            chunk[2] = [injectEntries];
          }
          break;
      }
    }
    console.log(chunk);
  }
}
