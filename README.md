# webpackTools

⚠️ All (including the name of the project) is subject to change, I still haven't settled entirely on the structure of everything ⚠️

A userscript for reverse engineering, debugging, and modifying sites using webpack.

## Installing
The runtime with an example config for twitter can be installed from https://moonlight-mod.github.io/webpackTools/webpackTools.user.js

## Usage

An example config exists in the userscript with all fields documented.

### Spacepack Everywhere

By enabling `spacepackEverywhere` in your config, spacepack will automatically be injected into any webpack instances found. 

spacepack will then be accessible from `window.spacepack` or window.spacepack_<webpackChunkObject> if there happens to be multiple webpack instances

This version of spacepack is *slightly* different to the one in moonlight, however usage should be nearly the same. `__namedRequire`, `chunkObject`, and `name` are new to this version however.

TODO: Either write own docs about spacepack or link to moonlight docs

### Full patching support

TODO

## Updating
To update to the latest webpackTools runtime while maintaining your existing config, edit your userscript and replace the string after `const runtime = ` with https://moonlight-mod.github.io/webpackTools/webpackTools.runtime.json. 

## Caveats

Some sites, namely Discord, will start multiple webpack runtimes running on the same webpackChunk object. Duplicate runtimes can be found in `window.wpTools.runtimes`. Injected modules will run multiple times, one for each runtime.

Some sites don't expose their export cache, making `spacepack.findModulesByExports` unusable and `spacepack.exports` undefined.

## Credits

A lot of this is based on research by [Mary](https://github.com/mstrodl) and [Cynthia](https://github.com/cynosphere) (HH3), and [Twilight Sparkle](https://github.com/twilight-sparkle-irl/) (webcrack, crispr, Endpwn)

## Terminology

We use our own names for a lot of things as we feel they make more sense, however here's some mappings to webpack's "official" namings and it can be slightly confusing

 - modules, or module cache: `moduleFactories`  
 - exports, or export cache: `moduleCache`  
 - chunkObject (typically webpackJsonp or webpackChunk): `chunkCallback` or `chunkLoadingGlobal`
