// build.js — inlines core.js + html.js into a single static index.html
// usable anywhere (GitHub Pages, IPFS/IMD, Netlify drop, plain nginx).
// The client fetches Squeekchain's public API directly and falls back to the
// bundled snapshot when CORS/offline blocks it, so the page never renders empty.
const fs = require('fs');
const path = require('path');

const read = f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');

const coreSrc = read('core.js')
  .replace(/^export\s+default\s+\{\s*fetchState,\s*historyPath\s*\};?\s*$/m, '')
  .replace(/^export\s+default\s+\{\s*fetchState\s*\};?\s*$/m, '')
  .replace(/^export\s*\{[^}]*\};?\s*$/gm, '')
  .replace(/^export\s+/gm, '');

const htmlSrc = read('html.js');
const tplStart = htmlSrc.indexOf('export const HTML = `') + 'export const HTML = `'.length;
const tplEnd = htmlSrc.lastIndexOf('`;');
const html = htmlSrc.slice(tplStart, tplEnd);

const patched = html.replace(
  `async function poll() {
  try {
    const r = await fetch('/api/wheel', { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    render(await r.json());
  } catch (e) {
    $('state').lastChild.nodeValue = ' offline';
    $('dot').className = 'pulse';
  }
  setTimeout(poll, 6000);
}`,
  `const SNAPSHOT = __SNAPSHOT__;
let usingSnapshot = false;
async function poll() {
  try {
    const s = await fetchState();
    usingSnapshot = false;
    $('state').lastChild.nodeValue = ' ' + String(s.coreStatus || 'live').toLowerCase();
    render(s);
  } catch (e) {
    if (!usingSnapshot && SNAPSHOT) {
      usingSnapshot = true;
      $('state').lastChild.nodeValue = ' snapshot (api blocked)';
      render(SNAPSHOT);
    } else {
      $('state').lastChild.nodeValue = ' offline';
      $('dot').className = 'pulse';
    }
  }
  setTimeout(poll, 6000);
}`
);

if (patched === html) throw new Error('poll() patch did not apply');

const snapshot = JSON.parse(fs.readFileSync(path.join(__dirname, 'snapshot.json'), 'utf8'));

// Build the page from fresh parts only — never re-inject the template's own
// <head>/<body> wrappers (that duplication made index.html contain two documents).
const styleCss = patched.match(/<style>([\s\S]*?)<\/style>/)[1];
const bodyInner = patched.match(/<body>([\s\S]*?)<script>/)[1];
const pageScript = patched.match(/<script>([\s\S]*?)<\/script>/)[1];

if (!styleCss || !bodyInner || !pageScript) throw new Error('template split failed');

const finalScript = pageScript.replace('__SNAPSHOT__', JSON.stringify(snapshot));

const out = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>WheelTrace — live Squeekchain telemetry</title>
<meta name="description" content="A live, read-only view of Squeekchain's hamster wheel: RPM, block progress, cumulative work and distance, drawn from the public API." />
<style>${styleCss}</style>
</head>
<body>${bodyInner}
<script>
${coreSrc}
${finalScript}
</script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'index.html'), out);

// Self-check: exactly one script pair, and the script must parse.
const opens = (out.match(/<script>/g) || []).length;
const closes = (out.match(/<\/script>/g) || []).length;
if (opens !== 1 || closes !== 1) throw new Error(`script tag mismatch: ${opens}/${closes}`);
const bodyCount = (out.match(/<body>/g) || []).length;
if (bodyCount !== 1) throw new Error(`body tag count ${bodyCount}`);
try { new Function(out.match(/<script>([\s\S]*)<\/script>/)[1]); } catch (e) {
  throw new Error('script does not parse: ' + e.message);
}
console.log('index.html written:', out.length, 'bytes · single script · parses OK');
