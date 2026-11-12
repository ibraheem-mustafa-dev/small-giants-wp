#!/usr/bin/env node
// Self-test with a negative control: serves synthetic pages from a temporary local server,
// captures BEFORE and AFTER, and checks compare flags the 3px width change but passes the
// ::before cover to .sgs-bg-media > img object-fit cover switch at the same box.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400"><rect width="800" height="400" fill="#c33"/><circle cx="200" cy="200" r="120" fill="#fff"/></svg>';
const shell = (body, css) => `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}${css}</style></head><body>${body}</body></html>`;
const pages = {
  '/before/a.html': shell('<img class="pic" src="/media/hero-300x150.svg" alt="">', '.pic{width:300px;height:150px;display:block}'),
  '/after/a.html': shell('<img class="pic" src="/media/hero-300x150.svg" alt="">', '.pic{width:303px;height:150px;display:block}'),
  '/before/b.html': shell('<section class="sgs-container hero"></section>', '.hero{position:relative;height:400px}.hero::before{content:"";position:absolute;inset:0;background:url(/media/bg-scaled.svg) center/cover no-repeat}'),
  '/after/b.html': shell('<section class="sgs-container hero"><div class="sgs-bg-media"><picture><img src="/media/bg-scaled.svg" alt=""></picture></div></section>', '.hero{position:relative;height:400px}.sgs-bg-media{position:absolute;inset:0}.sgs-bg-media picture,.sgs-bg-media img{display:block;width:100%;height:100%;object-fit:cover;object-position:50% 50%}'),
};

const server = http.createServer((req, res) => {
  const p = req.url.split('?')[0];
  if (p.startsWith('/media/')) { res.writeHead(200, { 'content-type': 'image/svg+xml' }); return res.end(SVG); }
  if (pages[p]) { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(pages[p]); }
  res.writeHead(404); res.end();
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const tmp = fs.mkdtempSync(path.join(process.env.AC25_TMP || os.tmpdir(), 'ac25-selftest-'));
fs.writeFileSync(path.join(tmp, 'urls.txt'), '/a.html\n/b.html\n');
let failures = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); if (!ok) failures++; };
const node = (script, a) => new Promise((resolve) => execFile(process.execPath, [path.join(here, script), ...a], { encoding: 'utf8', maxBuffer: 1 << 26 }, (err, stdout, stderr) => resolve({ status: err ? (typeof err.code === 'number' ? err.code : 1) : 0, stdout, stderr })));

try {
  for (const side of ['before', 'after']) {
    const r = await node('capture.mjs', ['--base', `http://127.0.0.1:${port}/${side}`, '--label', side, '--out', path.join(tmp, side), '--urls', path.join(tmp, 'urls.txt')]);
    if (r.status !== 0) { console.log(r.stdout, r.stderr); throw new Error('capture failed: ' + side); }
    console.log(`capture ${side}: ${r.stdout.trim()}`);
  }
  const c = await node('compare.mjs', [path.join(tmp, 'before'), path.join(tmp, 'after')]);
  console.log(c.stdout);
  check('compare exits 1 on the 3px width change', c.status === 1);
  check('width change on page a flagged at all three viewports', ['a.html.375', 'a.html.768', 'a.html.1440'].every((s) => new RegExp(`${s.replace(/\./g, '\.')}: CHANGED hero .*width 300 -> 303`).test(c.stdout)));
  check('page b (::before cover -> .sgs-bg-media img cover) not flagged', !/^b\.html\.\d+:/m.test(c.stdout));
  fs.writeFileSync(path.join(tmp, 'allow.json'), JSON.stringify([{ page: 'a.*', key: 'hero', property: 'width', reason: 'self-test allowed change' }]));
  const ok = await node('compare.mjs', [path.join(tmp, 'before'), path.join(tmp, 'after'), '--allow', path.join(tmp, 'allow.json')]);
  check('allow file clears the flagged change (exit 0)', ok.status === 0);
  const same = await node('compare.mjs', [path.join(tmp, 'before'), path.join(tmp, 'before')]);
  check('identical captures pass (exit 0)', same.status === 0);
} finally {
  server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log(failures ? `SELF-TEST FAILED (${failures})` : 'SELF-TEST PASSED');
process.exit(failures ? 1 : 0);
