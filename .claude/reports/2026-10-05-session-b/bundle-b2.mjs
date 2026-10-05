import fs from 'node:fs';
const g=JSON.parse(fs.readFileSync('.claude/reports/2026-10-05-session-b/f-groups.json','utf8'));
const BATCH={
 b2a:['M2-box-spacing'], b2b:['M4-typography'], b2c:['M5-motion'],
 b2d:['M3-layout-alignment','M9-measure'], b2e:['M7-decoration','M6-icon-paint'],
 b2f:['M1-hardcode','M8-colour','M10-pseudo-content'],
};
const dir='.claude/reports/2026-10-05-session-b/b2/';
fs.mkdirSync(dir,{recursive:true});
for(const [b,ms] of Object.entries(BATCH)){
  const payload={batch:b,mechanisms:{}};
  let rows=0,combos=0;
  for(const m of ms){ payload.mechanisms[m]=g[m]; rows+=g[m].rows; combos+=g[m].combos.length; }
  payload.totals={rows,combos};
  fs.writeFileSync(dir+b+'-input.json',JSON.stringify(payload,null,1));
  console.log(b, ms.join('+'), 'rows',rows,'combos',combos, (fs.statSync(dir+b+'-input.json').size/1024).toFixed(0)+'KB');
}
