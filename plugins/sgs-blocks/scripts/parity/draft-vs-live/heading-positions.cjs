// Draft-vs-live comparison tool. Method and usage: README.md in this folder.
// Env: DRAFT_URL (draft served locally), LIVE_URL (live page, no query string), OUT_DIR (captures + result json).
const { createRequire } = require('module');
const { chromium } = createRequire('C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/package.json')('playwright');
const P=[['draft',(process.env.DRAFT_URL || 'http://localhost:8731/Eye%20Care%20Birmingham.dc.html')],['live',(process.env.LIVE_URL || 'https://darkcyan-grouse-898606.hostingersite.com/eye-care-birmingham/') + '?cb=' + Date.now()]];
(async()=>{const b=await chromium.launch();const out={};
for(const w of [1920,1440]) for(const [n,u] of P){const pg=await (await b.newContext({viewport:{width:w,height:900}})).newPage();
await pg.goto(u,{waitUntil:'networkidle',timeout:90000}).catch(()=>{});await pg.waitForTimeout(2000);
await pg.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=900){scrollTo(0,y);await new Promise(r=>setTimeout(r,60));}});
out[n+w]=await pg.evaluate(()=>[...document.querySelectorAll('h1,h2')].filter(h=>h.offsetParent&&h.getBoundingClientRect().width>0).map(h=>{const r=h.getBoundingClientRect();let p=h.parentElement;while(p&&p.getBoundingClientRect().width<=r.width+1)p=p.parentElement;return [h.textContent.trim().replace(/\s+/g,' ').slice(0,28),Math.round(r.left),Math.round(r.width)];}));}
await b.close();
for(const w of [1920,1440]){const d=new Map(out['draft'+w].map(x=>[x[0],x]));console.log('=== '+w);for(const l of out['live'+w]){const dd=d.get(l[0]);console.log((dd&&dd[1]===l[1]?'   ':'XX ')+l[0].padEnd(30)+' draft x='+(dd?dd[1]:'-')+' live x='+l[1]+'   (w '+(dd?dd[2]:'-')+'/'+l[2]+')');}}
})();
