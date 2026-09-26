import { chromium } from 'file:///C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/node_modules/playwright/index.mjs';
const DRAFT='https://mintcream-lyrebird-224487.hostingersite.com/', LIVE='https://darkcyan-grouse-898606.hostingersite.com/product/gucci-oversized-cat-eye/?nc='+Date.now();
async function clickText(page, src){ await page.evaluate((src)=>{const re=new RegExp(src,'i');const els=[...document.querySelectorAll('a,button,[role=button],div,span,h3')].filter(e=>re.test((e.textContent||'').trim())&&e.offsetParent!==null);els.sort((a,b)=>a.textContent.length-b.textContent.length);els[0]&&els[0].click();},src); await page.waitForTimeout(900); }
const b = await chromium.launch(); const out={};
for (const which of ['draft','live']) {
  const p = await b.newPage({viewport:{width:1440,height:900}});
  if (which==='draft'){ await p.goto(DRAFT,{waitUntil:'networkidle'}); await clickText(p,'^sunglasses$'); await clickText(p,'^oversized cat-eye$'); }
  else { await p.goto(LIVE,{waitUntil:'networkidle'}); await p.waitForTimeout(500); }
  // PDP button
  const btn = await p.evaluateHandle(()=>[...document.querySelectorAll('a,button')].find(e=>/add my prescription/i.test(e.textContent)&&e.offsetParent));
  const bb = await btn.boundingBox();
  const rest = await btn.evaluate(e=>{const s=getComputedStyle(e);return {text:e.innerText.replace(/\n/g,' | '),h:Math.round(e.getBoundingClientRect().height),bg:s.backgroundColor,transition:s.transition.slice(0,80),justify:s.justifyContent}});
  await p.mouse.move(bb.x+bb.width/2, bb.y+bb.height/2); await p.waitForTimeout(500);
  const hov = await btn.evaluate(e=>{const s=getComputedStyle(e);return {bg:s.backgroundColor,transform:s.transform}});
  await p.screenshot({path:`pdp-${which}.png`, clip:{x:Math.max(0,bb.x-10),y:bb.y-10,width:bb.width+20,height:bb.height+20}});
  await p.mouse.move(5,5); await btn.evaluate(e=>e.click()); await p.waitForTimeout(1200);
  const R = which==='draft'?'[aria-label="Add prescription lenses"]':'dialog[open] .sgs-choice-flow';
  const hoverOf = async (fn) => { const box = await p.evaluate(fn, R); if(!box) return null; await p.mouse.move(box.x,box.y); await p.waitForTimeout(500); const r = await p.evaluate(([x,y])=>{const e=document.elementFromPoint(x,y).closest('a,button');const s=getComputedStyle(e);return {bg:s.backgroundColor,color:s.color,border:s.borderTopColor}},[box.x,box.y]); await p.mouse.move(5,5); await p.waitForTimeout(300); return r; };
  const close = await hoverOf((R)=>{const e=[...document.querySelector(R).querySelectorAll('button')].find(b=>/^close/i.test(b.textContent.trim())&&b.offsetParent);const b=e.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2}});
  const help = await hoverOf((R)=>{const e=[...document.querySelector(R).querySelectorAll('button')].find(b=>b.textContent.trim()==='?'&&b.offsetParent);const b=e.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2}});
  // open help panel
  await p.evaluate((R)=>[...document.querySelector(R).querySelectorAll('button')].find(b=>b.textContent.trim()==='?'&&b.offsetParent).click(), R); await p.waitForTimeout(500);
  const panel = await p.evaluate((R)=>{const r=document.querySelector(R);const e=[...r.querySelectorAll('div,p')].find(d=>/main line of your prescription/i.test(d.textContent)&&d.children.length===0&&d.offsetParent);if(!e)return null;const s=getComputedStyle(e);return {bg:s.backgroundColor,color:s.color,fs:s.fontSize,pad:s.padding,anim:s.animationName+' '+s.animationDuration}}, R);
  await p.screenshot({path:`help-${which}.png`});
  // scroll stage to reveal note & hover it
  const note = await hoverOf((R)=>{const e=[...document.querySelector(R).querySelectorAll('a')].find(a=>/not sure/i.test(a.textContent)&&a.offsetParent);if(!e)return null;e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2}});
  out[which]={pdp:{rest,hov},close,help,panel,note};
  await p.close();
}
await b.close();
console.log(JSON.stringify(out,null,1));
