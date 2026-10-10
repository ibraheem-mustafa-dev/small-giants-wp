import { pathToFileURL } from 'node:url';
const REPO='C:/Users/Bean/Projects/small-giants-wp';
const { serveDraft } = await import(pathToFileURL(REPO+'/scripts/computed-route/lib/draft.mjs').href);
const { chromium } = await import(pathToFileURL(REPO+'/plugins/sgs-blocks/node_modules/playwright/index.mjs').href);
const folder=process.argv[2]; const n=Number(process.argv[3]||15);
const srv=await serveDraft(folder,{index:'Indus Foods Website v2.dc.html'});
let crashes=0; const rows=[];
try{ for(let i=0;i<n;i++){
  const browser=await chromium.launch();
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errs=[]; page.on('pageerror',e=>errs.push(String(e.message).slice(0,90)));
  await page.goto(srv.url+encodeURI('Indus Foods Website v2.dc.html'),{waitUntil:'networkidle',timeout:60000});
  await page.waitForTimeout(2500);
  const tpl=await page.evaluate(()=>document.querySelectorAll('[data-dc-tpl]').length);
  const bad=tpl<100||errs.some(e=>/removeChild/.test(e)); if(bad) crashes++;
  rows.push(`${i+1}: tpl=${tpl} errors=${errs.length}${errs[0]?' '+errs[0]:''}`);
  await browser.close();
}} finally { await srv.close(); }
console.log(rows.join('\n')); console.log(`crashed ${crashes}/${n}`);
