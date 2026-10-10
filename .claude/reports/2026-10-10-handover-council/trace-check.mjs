import { pathToFileURL } from 'node:url'; import fs from 'node:fs';
const REPO='C:/Users/Bean/Projects/small-giants-wp';
const { serveDraft } = await import(pathToFileURL(REPO+'/scripts/computed-route/lib/draft.mjs').href);
const { chromium } = await import(pathToFileURL(REPO+'/plugins/sgs-blocks/node_modules/playwright/index.mjs').href);
const folder=process.argv[2];
const recs=JSON.parse(fs.readFileSync(folder+'/animations.json','utf8')).records;
const srv=await serveDraft(folder,{index:'Indus Foods Website v2.dc.html'});
const browser=await chromium.launch(); const page=await browser.newPage({viewport:{width:1440,height:900}});
await page.addInitScript(()=>{window.__log=[];const o=Element.prototype.animate;Element.prototype.animate=function(kf,opt){const h=this.closest('[data-dc-tpl]');const op=typeof opt==='number'?{duration:opt}:(opt||{});window.__log.push({tpl:this.getAttribute&&this.getAttribute('data-dc-tpl'),near:h&&h.getAttribute('data-dc-tpl'),tag:this.tagName,id:this.id||'',dur:op.duration,ease:op.easing||'linear'});return o.call(this,kf,opt);};});
await page.goto(srv.url+encodeURI('Indus Foods Website v2.dc.html'),{waitUntil:'networkidle',timeout:60000});
await page.waitForTimeout(3000);
await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=300){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,120));}});
await page.waitForTimeout(1500);
const log=await page.evaluate(()=>window.__log); await browser.close(); await srv.close();
const norm=e=>String(e||'').replace(/\s+/g,'');
const combos=new Map(); for(const c of log){const k=`${c.tpl||'-'}|${c.near}|${c.tag}|${c.dur}|${norm(c.ease)}`;combos.set(k,(combos.get(k)||0)+1);}
let matched=0; const miss=[];
for(const [k,n] of combos){const [tpl,near,tag,dur,ease]=k.split('|');
  const hit=recs.find(r=>Number(r.duration_ms)===Number(dur)&&norm(r.easing)===ease&&[tpl,near].some(t=>t&&t!=='-'&&(String(r.element?.template_tpl_id)===t||JSON.stringify(r.trace||{}).includes(t)||JSON.stringify(r.element||{}).includes('"'+t+'"'))));
  if(hit) matched++; else miss.push(`${k} x${n}`);}
console.log(`calls ${log.length}, distinct ${combos.size}, matched to a record ${matched}`); console.log(miss.slice(0,25).join('\n'));
