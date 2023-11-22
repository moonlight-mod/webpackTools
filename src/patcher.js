import config from "./config";
import wpTools from "./wpTools";

export function interceptWebpack() {
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

const patchesToApply = new Set();
if (config.patches) {
for (const patch of config.patches) {
  patchesToApply.add(patch);
}
}
export function patchModules(modules) {
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

const modulesToInject = new Set();
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
  run: wpTools,
  entry: true,
});

export function injectModules(chunk) {
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

    // Patch our own modules, for fun :)
    patchModules(injectModules)
    chunk[1] = Object.assign(chunk[1], injectModules);
    if (injectEntries.length > 0) {
      switch (config.webpackVersion) {
        case 5:
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
        case 4:
          chunk[2] = (chunk[2] ?? []).concat(injectEntries);
          break;
      }
    }
  }
}
