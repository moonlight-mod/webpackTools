const config = window.__webpackTools_config;
delete window.__webpackTools_config;

let thisSiteConfig;
for (let siteConfig of config.siteConfigs) {
  if (siteConfig.matchSites?.includes(window.location.host)) {
    thisSiteConfig = siteConfig;
    break;
  }
}

export default thisSiteConfig;
