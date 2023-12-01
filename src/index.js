import Patcher from "./Patcher";
import { injectEverywhere } from "./injectEverywhere";

export const globalConfig = window.__webpackTools_config;
delete window.__webpackTools_config;

export const siteConfigs = new Set();
for (let siteConfig of globalConfig.siteConfigs) {
  if (siteConfig.matchSites?.includes(window.location.host)) {
    siteConfigs.add(siteConfig);
    break;
  }
}

// todo: magicrequire everywhere impl
if (siteConfigs.size > 0) {
  for (const siteConfig of siteConfigs) {
    const patcher = new Patcher(siteConfig);
    patcher.run();
  }
} else if (globalConfig.wpToolsEverywhere) {
  window.addEventListener("load", injectEverywhere);
}
