import fs from 'fs'; import path from 'path'; import { pathToFileURL } from 'url';
const R='C:/Users/Bean/Projects/small-giants-wp/scripts/computed-route/';
const imp=(p)=>import(pathToFileURL(R+p).href);
const { openDb } = await imp('lib/db.mjs');
const { markersFor, longhands, triggerFor } = await imp('lib/calibrate.mjs');
const { blockSchema } = await imp('lib/resolve.mjs');
const { loadSnapshot } = await imp('lib/normalise.mjs');
const snaps={ 'eye-care-test': loadSnapshot('C:/Users/Bean/Projects/small-giants-wp/sites/eye-care-ward-end/theme-snapshot.json'), sandybrown: loadSnapshot('C:/Users/Bean/Projects/small-giants-wp/sites/mamas-munches/theme-snapshot.json') };
const db=openDb();
const fixtures=JSON.parse(fs.readFileSync(R+'calibration-fixtures.json','utf8'));
const out=[];
const allRows=db.prepare("select * from block_attributes where block_slug=? and attr_name=?");
for (const f of fs.readdirSync(R+'cache')) {
  if (!f.endsWith('.json')||f.endsWith('.tree.json')) continue;
  const c=JSON.parse(fs.readFileSync(R+'cache/'+f,'utf8'));
  const schema=blockSchema(c.block)||{};
  const fx=fixtures[c.block]||{};
  const vattrs={...(fx.attributes||{}),...((fx.variants||[{}])[0])};
  const add=(cat,attr,extra={})=>{
    const rows=allRows.all(c.block,attr);
    const ms=rows.filter(r=>r.css_property&&longhands(r.css_property).length).map(r=>({prop:r.css_property,state:r.css_state,markers:markersFor(r,schema,snaps[c.site]||snaps.sandybrown,vattrs).map(m=>({label:m.label,attrs:m.attrs}))}));
    out.push({cat,block:c.block,attr,measured:c.measured,site:c.site,def:schema[attr]||null,rows:rows.map(r=>({attr_type:r.attr_type,default_value:r.default_value,enum_values:r.enum_values,css_property:r.css_property,css_element:r.css_element,css_state:r.css_state,css_tier:r.css_tier,tier_shape:r.tier_shape,box_family:r.box_family,emit_shape:r.emit_shape,role:r.role,source:r.source,inspector:r.inspector_control_type,alt:r.alt_companion_attr,canonical_slot:r.canonical_slot})),markersNow:ms,fixtureVal:vattrs[attr],...extra});
  };
  c.dead.forEach(a=>add('dead',a));
  c.noMarker.forEach(a=>add('noMarker',a));
  c.untestedStates.forEach(s=>add('untested',s.split(':')[0],{raw:s}));
  c.oneWidth.forEach(o=>add('oneWidth',o.key.replace(/-(tiers|box-tiers|corners-tiers|length|box|hex|slug|bool|weight|number|enum-.*|kw-.*)-v\d+$/,''),{raw:o}));
  (c.rejected||[]).forEach(o=>add('rejected',o.key.split('-')[0],{raw:o}));
  Object.entries(c.discovered||{}).forEach(([a,v])=>add('discovered',a,{effects:v}));
}
fs.writeFileSync('entries.json',JSON.stringify(out,null,1));
const cnt={}; out.forEach(e=>cnt[e.cat]=(cnt[e.cat]||0)+1); console.log(cnt);
