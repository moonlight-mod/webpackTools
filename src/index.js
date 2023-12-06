import Patcher from "./Patcher";
import { spacepackEverywhere } from "./spacepackEverywhere";

export const globalConfig = window.__webpackTools_config;
delete window.__webpackTools_config;

export const siteConfigs = new Set();
for (let siteConfig of globalConfig.siteConfigs) {
  if (siteConfig.matchSites?.includes(window.location.host)) {
    siteConfigs.add(siteConfig);
    break;
  }
}

window.wpTools = {
  globalConfig,
  activeSiteConfigs: siteConfigs,
  spacepackEverywhereDetect: () => {
    spacepackEverywhere(globalConfig.spacepackEverywhere);
  },

  runtimes: {},
};

if (siteConfigs.size > 0) {
  for (const siteConfig of siteConfigs) {
    const patcher = new Patcher(siteConfig);
    patcher.run();
  }
} else if (globalConfig?.spacepackEverywhere?.enabled !== false) {
  window.addEventListener("load", () => {
    spacepackEverywhere(globalConfig.spacepackEverywhere);
  });
}
