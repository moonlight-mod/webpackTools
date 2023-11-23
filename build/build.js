import * as esbuild from "esbuild";
import * as fs from "fs";

const buildResult = await esbuild.build({
  entryPoints: ["src/index.js"],
  bundle: true,
  write: false,
  logLevel: "info",
  target: ["es2020"],
});

const runtimeWithSourceUrl = buildResult.outputFiles[0].text + "\n//# sourceURL=wpTools"
const templateStr = await fs.promises.readFile("userscriptTemplate.js", { encoding: "utf-8" });
const runtimeStr = JSON.stringify(runtimeWithSourceUrl)

fs.promises.writeFile("dist/webpackTools.user.js", templateStr.replace('"{{ REPLACE_ME RUNTIME }}"', runtimeStr));
fs.promises.writeFile("dist/webpackTools.runtime.json", runtimeStr)
fs.promises.writeFile("dist/webpackTools.runtime.js", buildResult.outputFiles[0].text)