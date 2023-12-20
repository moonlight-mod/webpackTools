import matchModule from "./matchModule";
import { getSpacepack } from "./spacepackLite";

class ConfigValidationError extends Error {}

function validateProperty(name, object, key, required, validationCallback) {
  if (!Object.prototype.hasOwnProperty.call(object, [key])) {
    if (required) {
      throw new ConfigValidationError(`Required property not found, missing ${key} in ${name}`);
    } else {
      return;
    }
  } else {
    if (!validationCallback(object[key])) {
      throw new ConfigValidationError(
        `Failed to validate ${key} in ${name}. The following check failed: \n${validationCallback.toString()}`,
      );
    }
  }
}

export default class Patcher {
  constructor(config) {
    this._validateConfig(config);
    this.name = config.name;
    this.chunkObject = config.chunkObject;
    this.webpackVersion = config.webpackVersion.toString();
    this.patchAll = config.patchAll;

    this.modules = new Set(config.modules ?? []);
    for (const module of this.modules) {
      this._validateModuleConfig(module);
    }

    this.patches = new Set(config.patches ?? []);
    for (const patch of this.patches) {
      this._validatePatchConfig(patch);
    }

    // Populate patches to apply and modules to inject
    this.patchesToApply = new Set();
    if (this.patches) {
      for (const patch of this.patches) {
        if (patch.replace instanceof Array) {
          for (const index in patch.replace) {
            this.patchesToApply.add({
              name: patch.name + "_" + index,
              find: patch.find,
              replace: patch.replace[index],
            });
          }
          continue;
        }
        this.patchesToApply.add(patch);
      }
    }

    this.modulesToInject = new Set();
    if (this.modules) {
      for (const module of this.modules) {
        if (module.needs !== undefined && module.needs instanceof Array) {
          module.needs = new Set(module.needs);
        }
        this.modulesToInject.add(module);
      }
    }

    if (config.injectSpacepack !== false) {
      this.modulesToInject.add({
        name: "spacepack",
        // This is sorta a scope hack.
        // If we rewrap this function, it will lose its scope (in this case the match module import and the chunk object name)
        run: getSpacepack(this.chunkObject),
        entry: true,
      });
    }

    // Some ven and cyn magic
    if (config.patchEntryChunk) {
      this.modulesToInject.add({
        name: "patchEntryChunk",
        run: (module, exports, webpackRequire) => {this._patchModules(webpackRequire.m)},
        entry: true,
      });
      this.patchEntryChunk = true;
    }
  }

  run() {
    if (this.webpackVersion === "4" || this.webpackVersion === "5") {
      this._interceptWebpackModern();
    } else {
      this._interceptWebpackLegacy;
    }
  }

  _interceptWebpackModern() {
    // This is necesary since some sites (twitter) define the chunk object earlier
    let realChunkObject = window[this.chunkObject];
    const patcher = this;

    Object.defineProperty(window, this.chunkObject, {
      set: function set(value) {
        realChunkObject = value;
        if (patcher.patchEntryChunk) {
          let newChunk = [["patchEntryChunk"], {}]
          patcher._injectModules(newChunk);
          realChunkObject.push(newChunk);
        }

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
              patcher._patchModules(chunk[1]);
              patcher._injectModules(chunk);
            }
            return realPush.apply(this, arguments);
          };

          value.push.__wpt_injected = true;
          if (realPush === Array.prototype.push) {
            console.log("[wpTools] Injected " + patcher.chunkObject + " (before webpack runtime)");
          } else {
            console.log("[wpTools] Injected " + patcher.chunkObject + " (at webpack runtime)");
          }
        }
      },
      get: function get() {
        return realChunkObject;
      },
      configurable: true,
    });
  }

  _interceptWebpackLegacy() {}

  _patchModules(modules) {
    for (const id in modules) {
      if (modules[id].__wpt_processed) {
        continue;
      }
      let funcStr = Function.prototype.toString.apply(modules[id]);

      const matchingPatches = [];
      for (const patch of this.patchesToApply) {
        if (matchModule(funcStr, patch.find)) {
          matchingPatches.push(patch);
          this.patchesToApply.delete(patch);
        }
      }

      for (const patch of matchingPatches) {
        funcStr = funcStr.replace(patch.replace.match, patch.replace.replacement);
      }

      if (matchingPatches.length > 0 || this.patchAll) {
        let debugString = "";
        if (matchingPatches.length > 0) {
          debugString += "Patched by: " + matchingPatches.map((patch) => patch.name).join(", ");
        }

        modules[id] = new Function(
          "module",
          "exports",
          "webpackRequire",
          `(${funcStr}).apply(this, arguments)\n// ${debugString}\n//# sourceURL=${this.chunkObject}-Module-${id}`,
        );
        modules[id].__wpt_patched = true;
      }

      modules[id].__wpt_funcStr = funcStr;
      modules[id].__wpt_processed = true;
    }
  }

  _injectModules(chunk) {
    const readyModules = new Set();

    for (const moduleToInject of this.modulesToInject) {
      if (moduleToInject?.needs?.size > 0) {
        for (const need of moduleToInject.needs) {
          for (const wpModule of Object.entries(chunk[1])) {
            // match { moduleId: "id" } as well as strings and regex
            if ((need?.moduleId && wpModule[0] === need.moduleId) || matchModule(wpModule[1].__wpt_funcStr, need)) {
              moduleToInject.needs.delete(need);
              if (moduleToInject.needs.size === 0) {
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
        this.modulesToInject.delete(readyModule);
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
        switch (this.webpackVersion) {
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
    }
  }
  _validateConfig(config) {
    validateProperty("siteConfigs[?]", config, "name", true, (value) => {
      return typeof value === "string";
    });

    const name = config.name;

    validateProperty(`siteConfigs[${name}]`, config, "chunkObject", true, (value) => {
      return typeof value === "string";
    });

    validateProperty(`siteConfigs[${name}]`, config, "webpackVersion", true, (value) => {
      return ["4", "5"].includes(value.toString());
    });

    validateProperty(`siteConfigs[${name}]`, config, "patchAll", false, (value) => {
      return typeof value === "boolean";
    });

    validateProperty(`siteConfigs[${name}]`, config, "modules", false, (value) => {
      return value instanceof Array;
    });

    validateProperty(`siteConfigs[${name}]`, config, "patches", false, (value) => {
      return value instanceof Array;
    });

    validateProperty(`siteConfigs[${name}]`, config, "injectSpacepack", false, (value) => {
      return typeof value === "boolean";
    });

    validateProperty(`siteConfigs[${name}]`, config, "patchEntryChunk", false, (value) => {
      return typeof value === "boolean";
    });
  }

  _validatePatchReplacement(replace, name, index) {
    let indexStr = index === undefined ? "" : `[${index}]`;
    validateProperty(
      `siteConfigs[${this.name}].patches[${name}].replace${indexStr}`,
      replace,
      "match",
      true,
      (value) => {
        return typeof value === "string" || value instanceof RegExp;
      },
    );

    validateProperty(`siteConfigs[${this.name}].patches[${name}].replace`, replace, "replacement", true, (value) => {
      return typeof value === "string" || value instanceof Function;
    });
  }

  _validatePatchConfig(config) {
    validateProperty(`siteConfigs[${this.name}].patches[?]`, config, "name", true, (value) => {
      return typeof value === "string";
    });

    const name = config.name;

    validateProperty(`siteConfigs[${this.name}].patches[${name}]`, config, "find", true, (value) => {
      return (
        // RegExp, String, or an Array of RegExps and Strings
        typeof value === "string" ||
        value instanceof RegExp ||
        (value instanceof Array &&
          !value.some((value) => {
            !(typeof value === "string" || value instanceof RegExp);
          }))
      );
    });

    validateProperty(`siteConfigs[${this.name}].patches[${name}]`, config, "replace", true, (value) => {
      return typeof value === "object";
    });

    if (config.replace instanceof Array) {
      config.replace.forEach((replacement, index) => {
        this._validatePatchReplacement(replacement, name, index);
      });
    } else {
      this._validatePatchReplacement(config.replace, name);
    }
  }

  _validateModuleConfig(config) {
    validateProperty(`siteConfigs[${this.name}].modules[?]`, config, "name", true, (value) => {
      return typeof value === "string";
    });

    const name = config.name;

    validateProperty(`siteConfigs[${this.name}].modules[${name}]`, config, "needs", false, (value) => {
      // A set or array of strings, RegExps or `{moduleId: ""}`'s      return (
      return (
        (value instanceof Array || value instanceof Set) &&
        ![...value].some((value) => {
          !(
            typeof value === "string" ||
            value instanceof RegExp ||
            (value instanceof Object && typeof value.moduleId === "string")
          );
        })
      );
    });

    validateProperty(`siteConfigs[${this.name}].modules[${name}]`, config, "run", true, (value) => {
      return typeof value === "function";
    });

    validateProperty(`siteConfigs[${this.name}].modules[${name}]`, config, "entry", false, (value) => {
      return typeof value === "boolean";
    });
    if (config.entry === undefined) {
      config.entry = false;
    }

    // Possible future thing
    // validateProperty(`siteConfigs[${this.name}].modules[${name}]`, config, "rewrap", false, (value) => {
    //   return typeof value === "boolean";
    // });
  }
}
