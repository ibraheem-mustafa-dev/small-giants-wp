// Draft-vs-live comparison tool. Method and usage: README.md in this folder.
// Env: DRAFT_URL (draft served locally), LIVE_URL (live page, no query string), OUT_DIR (captures + result json).
const { createRequire } = require('module');
const { chromium } = createRequire('C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/package.json')('playwright');
(async()=>{const b=await chromium.launch();const pg=await (await b.newContext()).newPage();const hosts=new Set();
pg.on('request',r=>{if(/\.woff2?(\?|$)|fonts\.g/.test(r.url()))hosts.add(new URL(r.url()).host+' '+r.url().split('/').pop().slice(0,50));});
await pg.goto((process.env.LIVE_URL || 'https://darkcyan-grouse-898606.hostingersite.com/eye-care-birmingham/') + '?cb=' + Date.now(),{waitUntil:'networkidle'});
await pg.evaluate(()=>document.fonts.ready);console.log([...hosts].join('\n'));await b.close();})();
