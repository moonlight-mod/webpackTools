import * as esbuild from 'esbuild'

const context = await esbuild.context({
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'dist/webpackToolsRuntime.js',
  logLevel: 'info',
  target: [
    'es2020',
  ],
})

await context.build()