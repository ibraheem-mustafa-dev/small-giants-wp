import fs from 'node:fs';
const dir='sites/eye-care-ward-end/build/qa/triage/';
const all=[];
for(const f of fs.readdirSync(dir)){const j=JSON.parse(fs.readFileSync(dir+f,'utf8'));for(const v of j.verdicts) all.push({...v,surface:f.replace('.json','')});}
const F=all.filter(v=>v.class==='F');
const MECH=[
 ['M1-hardcode', v=>v.decidedBy==='hardcode'],
 ['M2-box-spacing', v=>/^(padding|margin)-(top|right|bottom|left)$|^(gap|column-gap|row-gap)$/.test(v.property)],
 ['M3-layout-alignment', v=>/^(flex-grow|flex-shrink|flex-basis|align-items|align-self|justify-content|justify-items|display|flex-direction|flex-wrap|order|grid-template-columns|grid-auto-flow)$/.test(v.property)],
 ['M4-typography', v=>/^(line-height|font-size|font-weight|font-style|font-family|letter-spacing|word-spacing|text-transform|text-align|text-wrap|white-space|text-decoration.*|text-indent|text-overflow)$/.test(v.property)],
 ['M5-motion', v=>/^(transition|transform|animation|translate|rotate|scale)$|^(transition|animation)-|^hover-effects$/.test(v.property)],
 ['M6-icon-paint', v=>/^icon-/.test(v.property)],
 ['M7-decoration', v=>/shadow|^border|^outline|^opacity$|^filter$|^backdrop-filter$|^background/.test(v.property)],
 ['M8-colour', v=>/^(color|fill|stroke|painted-ground)$/.test(v.property)],
 ['M9-measure', v=>/^(max-width|min-width|width|max-height|min-height|height|aspect-ratio|object-fit|object-position)$/.test(v.property)],
 ['M10-pseudo-content', v=>/^content$/.test(v.property)],
];
const grouped=new Map(MECH.map(([n])=>[n,[]]));
const leftover=[];
for(const v of F){const hit=MECH.find(([,fn])=>fn(v)); if(hit) grouped.get(hit[0]).push(v); else leftover.push(v);}
const comboKey=v=>`${v.block||'(none)'}|${v.path||''}|${v.property}`;
const out={};
console.log('grp'.padEnd(21),'rows','combos','blocks');
for(const [n,rows] of grouped){
  if(!rows.length) continue;
  const combos=new Map();
  for(const v of rows){const k=comboKey(v); if(!combos.has(k)) combos.set(k,{block:v.block,path:v.path,property:v.property,kind:v.kind,surfaces:new Set(),rows:0,decidedBy:v.decidedBy,examples:[]});
    const c=combos.get(k); c.surfaces.add(v.surface); c.rows++; if(c.examples.length<2) c.examples.push({surface:v.surface,ref:v.ref,widths:v.widths,solveReason:v.solveReason,evidence:v.evidence,source:v.source||null});}
  const list=[...combos.values()].map(c=>({...c,surfaces:[...c.surfaces]})).sort((a,b)=>b.rows-a.rows);
  out[n]={rows:rows.length,combos:list};
  console.log(n.padEnd(21),String(rows.length).padStart(4),String(list.length).padStart(6),'  ',[...new Set(rows.map(r=>r.block))].filter(Boolean).length);
}
console.log('leftover',leftover.length,leftover.map(v=>v.property).join(','));
fs.writeFileSync('.claude/reports/2026-10-05-session-b/f-groups.json',JSON.stringify(out,null,1));
console.log('total rows',Object.values(out).reduce((a,g)=>a+g.rows,0),'total combos',Object.values(out).reduce((a,g)=>a+g.combos.length,0));
