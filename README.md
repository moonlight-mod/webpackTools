Hi, while this "Works" right now, its not well documented; and a lot is subject to change.

## Installing
The runtime with an example config for twitter can be installed from https://moonlight-mod.github.io/webpackTools/webpackTools.user.js

## Updating
To update to the latest webpackTools runtime while maintaining your existing config, edit your userscript and replace the string after `const runtime = ` with https://moonlight-mod.github.io/webpackTools/webpackTools.runtime.json. 

## How to determine if something is Webpack 4 or Webpack 5
TODO: actually explain this

Webpack 5 typically names its jsonp array webpackChunk\<projectName\>
Webpack 4 typically names its jsonp array webpackJsonp

to double check you can find the first array with 3 entries
if the 3rd entry is an array with strings, its webpack 4
if the 3rd entry is a function it's webpack 5

rspack seems to compile to webpack 5 runtime

## Caveats

Some sites, namely Discord, will start multiple webpack runtimes running on the same webpackChunk object. Duplicate runtimes can be found in `window.wpTools.runtimes`. Injected modules will run multiple times, one for each runtime.

## Credits
A lot of this is based on research by [Mary](https://github.com/mstrodl) and [Cynthia](https://github.com/cynosphere) (HH3), and [Twilight Sparkle](https://github.com/twilight-sparkle-irl/) (webcrack, crispr)