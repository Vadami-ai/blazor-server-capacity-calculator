// Build: bundles src/main.jsx (+ styles) into dist/, copies index.html, and
// emits a single-file standalone HTML as a release artifact.
// Usage: node build.mjs [--serve]
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';

const serve = process.argv.includes('--serve');

const options = {
  entryPoints: ['src/main.jsx'],
  bundle: true,
  minify: !serve,
  sourcemap: serve,
  format: 'iife',
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': serve ? '"development"' : '"production"' },
  outdir: 'dist',
  logLevel: 'info',
};

mkdirSync('dist', { recursive: true });
copyFileSync('src/index.html', 'dist/index.html');

if (serve) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  const { hosts, port } = await ctx.serve({ servedir: 'dist' });
  console.log(`Serving on http://${hosts[0] ?? 'localhost'}:${port}`);
} else {
  await esbuild.build(options);

  // Standalone single-file build — everything inlined, works from file://
  // (fonts fall back to the system stack when offline).
  const css = readFileSync('dist/main.css', 'utf8');
  const js = readFileSync('dist/main.js', 'utf8').replace(/<\/script/gi, '<\\/script');
  const html = readFileSync('src/index.html', 'utf8')
    .replace(/\s*<link rel="stylesheet" href="\.\/main\.css">/, `\n  <style>\n${css}\n  </style>`)
    .replace(/\s*<script defer src="\.\/main\.js"><\/script>/, `\n  <script>\n${js}\n  </script>`);
  writeFileSync('dist/blazor-server-capacity-calculator-standalone.html', html);
  console.log('Wrote dist/blazor-server-capacity-calculator-standalone.html');
}
