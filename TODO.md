# TODO

- [ ] injecting wpTools module on all webpack sites (like magicrequire everywhere). with webpack 3 support
- [ ] webpack 3 support for everything?
- [ ] glob matching for site names (for examle: \*.twitter.com) in userscript part
- [ ] config validation with descriptive errors
- [x] rework configs
- [ ] check if Function.prototype.toString() is faster than checking for \_\_wpt_funcStr
- [ ] wpTools/findByExports: recurse into objects when searching? getters could pose a problem however
- [ ] add obfuscated code helpers and swc helpers in wpTools
- [ ] find a better way to do userscripts, ideally not fetching remotely
- [ ] log errors while patching (parse, patches that dont fire, etc)
- [ ] actually good documentation and tutorials