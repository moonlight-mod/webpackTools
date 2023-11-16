import config from "./config";

const patchesToApply = new Set();
for (const patch of config.patches) {
  patchesToApply.add(patch);
}

export function patchModules(modules) {
  for (let id in modules) {
    let funcStr = Function.prototype.toString.apply(modules[id]);

    const patchesToApply = [];
    for (let patch of config.patches) {
      // TODO: support regexp matches
      if (funcStr.indexOf(patch.find) != -1) {
        patchesToApply.push(patch.replace);
      }
    }

    for (let patchToApply of patchesToApply) {
      funcStr = funcStr.replace(patchToApply.match, patchToApply.replacement);
    }

    if (patchesToApply.length > 0 || config.inspectAll) {
      const debugString =
        "Patched by: " + patchesToApply.map((patch) => patch.name).join(", ");

      modules[id] = new Function(
        "module",
        "exports",
        "webpackRequire",
        `(${funcStr}).apply(this, arguments)\n// ${debugString}\n//# sourceURL=Webpack-Module-${id}`
      );
      modules[id].__wpt_patched = true;
    }

    modules[id].__wpt_funcStr = funcStr;
    modules[id].__wpt_processed = true;
  }
}

const modulesToInject = new Set();
for (const module of config.modules) {
  module.needs = new Set(module.needs);
  modulesToInject.add(module);
}

//// Expose webpackRequire in global scope
// modulesToInject.add({
//   name: "webpackRequire",
//   run: (module, exports, webpackRequire) => {
//     window.webpackRequire = webpackRequire;
//   },
//   entry: true,
// });

export function injectModules(chunk) {
  const readyModules = new Set();

  for (let moduleToInject of modulesToInject) {
    if (moduleToInject?.needs?.size > 0) {
      for (const need of moduleToInject.needs) {
        for (let wpModule of Object.values(chunk[1])) {
          // TODO: optimize
          // TODO: support regexp and moduleId
          if (wpModule.__wpt_funcStr.includes(need)) {
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
          const originalEntry = chunk[2] ?? [];
          chunk[2] = originalEntry.concat(injectEntries);
          break;
      }
    }
  }
}
