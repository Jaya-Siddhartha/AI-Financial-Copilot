// Builds the standalone browser demo and inlines its JS and CSS into one HTML page
// (dist-demo/fincopilot-demo.html) that runs without a server.
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const outDir = path.join(root, 'dist-demo');

execSync('npx vite build --mode demo', { cwd: root, stdio: 'inherit' });

const html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf-8');
const read = (href) => fs.readFileSync(path.join(outDir, href.replace(/^\//, '')), 'utf-8');

const cssHref = html.match(/<link rel="stylesheet"[^>]*href="([^"]+)"/)[1];
const jsSrc = html.match(/<script type="module"[^>]*src="([^"]+)"/)[1];
const css = read(cssHref);
const js = read(jsSrc).replace(/<\/script/gi, '<\\/script');
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
  .replace(/<meta charset[^>]*>/, '')
  .replace(/<meta name="viewport"[^>]*>/, '')
  .replace(/<link rel="stylesheet"[^>]*>/, '')
  .replace(/<script type="module"[^>]*><\/script>/, '')
  .replace('<title>FinCopilot</title>', '<title>FinCopilot Demo</title>')
  .trim();

// The artifact host supplies <!doctype>, <html>, <head> and <body>; write only the content.
const page = `${head}
<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${js}
</script>
`;

const outFile = path.join(outDir, 'fincopilot-demo.html');
fs.writeFileSync(outFile, page);
console.log(`Standalone demo: ${outFile} (${Math.round(page.length / 1024)} kB)`);
