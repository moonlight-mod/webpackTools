import * as esbuild from "esbuild";
import * as fs from "fs";

const userscriptBuildResult = await esbuild.build({
  entryPoints: ["src/entry/userscript.js"],
  bundle: true,
  write: false,
  logLevel: "info",
  target: ["es2020"],
});

await esbuild.build({
  entryPoints: ["src/entry/snippet.js"],
  bundle: true,
  treeShaking: true,
  outfile: "dist/webpackTools.snippet.js",
  logLevel: "info",
  minifyWhitespace: true,
  minifySyntax: true,
  target: ["es2020"],
});

const runtimeWithSourceUrl = userscriptBuildResult.outputFiles[0].text + "\n//# sourceURL=wpTools";
const templateStr = await fs.promises.readFile("userscriptTemplate.js", { encoding: "utf-8" });
const runtimeStr = JSON.stringify(runtimeWithSourceUrl);

fs.promises.writeFile("dist/webpackTools.user.js", templateStr.replace('"{{ REPLACE_ME RUNTIME }}"', runtimeStr));
fs.promises.writeFile("dist/webpackTools.runtime.js", userscriptBuildResult.outputFiles[0].text);
fs.promises.writeFile("dist/webpackTools.tampermonkey-runtime.js", "const runtime = " + runtimeStr + ";\n");
