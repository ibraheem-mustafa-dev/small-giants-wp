import fs from 'fs'; import { pathToFileURL } from 'url';
const R='C:/Users/Bean/Projects/small-giants-wp/scripts/computed-route/';
const { openDb } = await import(pathToFileURL(R+'lib/db.mjs').href);
const { longhands, READ_PROPS } = await import(pathToFileURL(R+'lib/calibrate.mjs').href);
const db=openDb(); const out={unreadProp:{},staleExt:0,staleSgs:0,enumNoCss:0, unreadList:{}};
for (const f of fs.readdirSync(R+'cache')) {
  if (!f.endsWith('.json')||f.endsWith('.tree.json')) continue;
  const c=JSON.parse(fs.readFileSync(R+'cache/'+f,'utf8'));
  const seen=new Set([...Object.keys(c.settings),...c.dead,...c.noMarker,...Object.keys(c.discovered||{}),...c.untestedStates.map(s=>s.split(':')[0]),...(c.rejected||[]).map(r=>r.key.split('-')[0])]);
  for (const r of db.prepare("select attr_name,source,css_property,enum_values from block_attributes where block_slug=? and source in ('sgs','sgs-ext') and (css_property is not null or enum_values is not null)").all(c.block)) {
    if (seen.has(r.attr_name)) continue;
    if (r.css_property && !longhands(r.css_property).length) { for (const p of r.css_property.split(',')) {out.unreadProp[p.trim()]=(out.unreadProp[p.trim()]||0)+1;} out.unreadList[r.source]=(out.unreadList[r.source]||0)+1; continue; }
    if (r.source==='sgs-ext') out.staleExt++; else out.staleSgs++;
  }
}
out.unreadProp=Object.entries(out.unreadProp).sort((a,b)=>b[1]-a[1]).slice(0,40);
console.log(JSON.stringify(out,null,0));
console.log('READ has writing-mode?',READ_PROPS.includes('writing-mode'),READ_PROPS.length);
