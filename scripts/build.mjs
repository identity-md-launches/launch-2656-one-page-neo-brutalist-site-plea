import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { requireTool, toolRoot } from './toolchain.mjs';

const { build } = requireTool('esbuild');
const js = await build({
  entryPoints: ['src/main.ts'], bundle: true, write: false, minify: true,
  target: ['es2022'], format: 'iife', legalComments: 'inline',
  nodePaths: [resolve(toolRoot, 'node_modules')],
});
let css = await readFile('src/style.css', 'utf8');
css = await replaceAsync(css, /url\(['"]?\.\/assets\/([^)'"\s]+)['"]?\)/g, async (_, name) => {
  const data = await readFile(resolve('src/assets', name));
  return `url(data:font/woff2;base64,${data.toString('base64')})`;
});
const template = await readFile('src/index.html', 'utf8');
const html = template.replace('<!-- INLINE_STYLES -->', () => `<style>${css}</style>`)
  .replace('<!-- INLINE_SCRIPT -->', () => `<script>${js.outputFiles[0].text.replaceAll('</script', '<\\/script')}</script>`);
if (/<!-- INLINE_/.test(html)) throw new Error('Unresolved build placeholder');
await mkdir('dist', { recursive: true });
await writeFile('dist/index.html', html);
await copyFile('src/assets/share.png', 'dist/share.png');
console.log(`Built dist/index.html (${Buffer.byteLength(html).toLocaleString()} bytes), inline CSS / JS / fonts. Share card: dist/share.png.`);

async function replaceAsync(text, expression, fn) {
  const matches = [...text.matchAll(expression)];
  const replacements = await Promise.all(matches.map(match => fn(...match)));
  let i = 0;
  return text.replace(expression, () => replacements[i++]);
}
