import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const OUT = path.dirname(fileURLToPath(import.meta.url));
const J = path.join(OUT, 'inventory.json');
const inv = JSON.parse(fs.readFileSync(J, 'utf8'));
const els = inv.elements;

// SVG localNames keep camelCase in the DOM (linearGradient); compare tags case-insensitively.
const tagOk = (r) => !!r.srcTag && r.srcTag.replace(/^sc-raw-/, '').toLowerCase() === r.tag.toLowerCase();
inv.checks.tagAgree = els.filter(tagOk).length;
inv.checks.tagDisagree = els.filter((r) => !tagOk(r)).map((r) => [r.key, r.srcTag, r.tag]);
inv.checks.tagCompare = 'case-insensitive, sc-raw- prefix stripped';
fs.writeFileSync(J, JSON.stringify(inv, null, 1));

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const mem = (r) => (r.membership.length ? r.membership.map((m) => m.kind === 'sc-for' ? `sc-for ${m.as} in ${m.list}` : m.kind === 'sc-if' ? `sc-if ${m.value}` : m.kind === 'dc-import' ? `dc-import ${m.name}` : m.kind === 'inside-import' ? `in template ${m.template}` : m.kind).join(' › ') : 'static (no loop, condition or import)');
const boxS = (b) => (b ? `${b.w}×${b.h}` : 'not rendered');
const attrS = (a) => Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(' ');

const rows = els.map((r) => {
  const shots = Object.entries(r.screenshots).sort((a, b) => b[0] - a[0]).map(([w, p]) => `<figure><a href="${esc(p)}"><img src="${esc(p)}" alt="Screenshot of ${esc(r.key)} at ${w}px" loading="lazy"></a><figcaption>${w}px</figcaption></figure>`).join('');
  const why = !Object.keys(r.screenshots).length ? `<p class="muted">No screenshot: ${r.box[1440] ? 'zero width or hidden' : 'not rendered (no layout box)'}</p>` : '';
  return `<tr class="d${Math.min(r.depth, 6)}">
<td data-label="Key"><span class="indent" style="--d:${r.depth}"></span><code class="key">${esc(r.key)}</code></td>
<td data-label="Tag"><code>&lt;${esc(r.tag)}&gt;</code>${r.attrs && Object.keys(r.attrs).length ? `<div class="attrs">${esc(attrS(r.attrs))}</div>` : ''}</td>
<td data-label="Words">${esc(r.words) || '<span class="muted">none</span>'}</td>
<td data-label="Membership">${esc(mem(r))}</td>
<td data-label="Boxes"><span class="box">1440: ${boxS(r.box[1440])}</span><span class="box">768: ${boxS(r.box[768])}</span><span class="box">375: ${boxS(r.box[375])}</span>${r.visible[1440] ? '' : '<span class="flag">not visible</span>'}</td>
<td data-label="Source"><pre>${esc(r.snippet)}</pre></td>
<td data-label="Screenshots" class="shots">${shots}${why}</td>
<td data-label="Proposed block" class="blank"></td>
<td data-label="Confidence" class="blank"></td>
<td data-label="Bean's decision" class="blank"></td>
</tr>`;
}).join('\n');

const c = inv.checks;
const html = `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Footer Draft Inventory</title>
<style>
:root{--bg:#fbfaf8;--fg:#1d1b19;--muted:#6b665f;--line:#e2ddd5;--card:#fff;--accent:#2f5d8a;--code:#f3f0ea}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#1a1917;--fg:#ece8e1;--muted:#a49d92;--line:#3a3732;--card:#23211e;--accent:#8db7e0;--code:#2c2a26}}
:root[data-theme="dark"]{--bg:#1a1917;--fg:#ece8e1;--muted:#a49d92;--line:#3a3732;--card:#23211e;--accent:#8db7e0;--code:#2c2a26}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{padding:24px 16px;max-width:1800px;margin:0 auto}
h1{font-size:1.5rem;margin:0 0 4px}
.muted{color:var(--muted)}
.summary{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}
.summary span{background:var(--card);border:1px solid var(--line);border-radius:6px;padding:6px 10px}
table{width:100%;border-collapse:collapse;background:var(--card)}
th,td{border-bottom:1px solid var(--line);padding:8px;vertical-align:top;text-align:left}
th{position:sticky;top:0;background:var(--card);font-size:.85rem;z-index:1}
code,pre{font-family:ui-monospace,Consolas,monospace;font-size:.8rem}
pre{white-space:pre-wrap;word-break:break-word;background:var(--code);padding:6px;border-radius:4px;margin:0;min-width:220px;max-width:320px}
.key{white-space:nowrap;color:var(--accent)}
.indent{display:inline-block;width:calc(var(--d)*14px)}
.attrs{font-size:.75rem;color:var(--muted);word-break:break-all;max-width:240px}
.box{display:block;font-size:.8rem;white-space:nowrap}
.flag{display:inline-block;font-size:.75rem;background:#f6e3c5;color:#5a3b00;border-radius:4px;padding:0 6px}
.shots{min-width:180px}
figure{margin:0 0 6px}
figure img{max-width:200px;max-height:160px;border:1px solid var(--line);background:repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0 0/12px 12px}
figcaption{font-size:.7rem;color:var(--muted)}
.blank{min-width:110px;border-left:1px dashed var(--line)}
tr.d0 td{background:color-mix(in srgb,var(--accent) 7%,transparent)}
a:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
@media (max-width:800px){
  table,thead,tbody,tr,td{display:block}thead{display:none}
  tr{border:1px solid var(--line);border-radius:8px;margin:0 0 12px;padding:8px}
  td{border:0;padding:4px 0}
  td::before{content:attr(data-label);display:block;font-size:.72rem;font-weight:600;color:var(--muted);text-transform:uppercase}
  .indent{display:none}.blank{border-left:0;min-height:28px;border-bottom:1px dashed var(--line)}
  pre{max-width:100%}figure img{max-width:100%}
}
</style></head><body><main>
<h1>Footer Draft Inventory</h1>
<p class="muted">Source: ${esc(inv.source)} · generated ${esc(inv.generated)} · key = import path / template number # copy index</p>
<div class="summary">
<span>Elements: ${els.length}</span>
<span>[data-dc-tpl] in footer (incl. footer): ${c.stampedDescendantsPlusFooter}</span>
<span>Unstamped: ${c.unstamped.length} (${esc(c.unstamped.map((u) => u.tag + '.' + u.cls).join(', '))})</span>
<span>Tag matches source: ${c.tagAgree}/${els.length}</span>
<span>Screenshots: ${c.shotCount}</span>
</div>
<table><thead><tr><th>Key</th><th>Tag</th><th>Words</th><th>Membership</th><th>Boxes</th><th>Source (annotated template)</th><th>Screenshots</th><th>Proposed block</th><th>Confidence</th><th>Bean's decision</th></tr></thead>
<tbody>
${rows}
</tbody></table>
</main></body></html>`;
fs.writeFileSync(path.join(OUT, 'review.html'), html);
console.log('rows', els.length, 'tagAgree', c.tagAgree, 'dis', JSON.stringify(c.tagDisagree));
