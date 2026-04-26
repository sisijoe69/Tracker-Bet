import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');
const builtHtmlPath = fs.existsSync(path.join(distDir, 'index.template.html'))
  ? path.join(distDir, 'index.template.html')
  : path.join(distDir, 'index.html');

const html = fs.readFileSync(builtHtmlPath, 'utf8');

let inlinedScript = '';

const inlined = html
  .replace(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/g, (_, href) => {
    const cssPath = path.join(distDir, href.replace(/^\.?\//, ''));
    const css = fs.readFileSync(cssPath, 'utf8');
    return `<style>${css}</style>`;
  })
  .replace(/<script[^>]+type="module"[^>]+src="([^"]+)"[^>]*><\/script>/g, (_, src) => {
    const jsPath = path.join(distDir, src.replace(/^\.?\//, ''));
    inlinedScript = fs.readFileSync(jsPath, 'utf8');
    return '';
  })
  .replace(/<link[^>]+rel="modulepreload"[^>]*>/g, '')
  .replace(/<\/body>/, () => `<script>${inlinedScript}</script>\n</body>`);

fs.writeFileSync(path.resolve('index.html'), inlined);
console.log(`Inlined index.html written (${(inlined.length / 1024).toFixed(1)} KB)`);

const PWA_ASSETS = ['manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable.png', 'apple-touch-icon.png'];
for (const name of PWA_ASSETS) {
  const src = path.join(distDir, name);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.resolve(name));
    console.log(`Copied ${name}`);
  }
}
