import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'dist/webpackToolsRuntime.js',
  logLevel: 'info',
  target: [
    'es2020',
  ],
})