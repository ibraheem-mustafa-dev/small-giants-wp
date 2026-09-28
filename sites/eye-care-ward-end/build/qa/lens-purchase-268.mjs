import { chromium } from 'file:///C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/node_modules/playwright/index.mjs';
const W = Number(process.argv[2]||1440);
// How the prescription is sent: later (default), type (fills the SPH boxes) or upload (a small photo).
const MODE = process.argv[3]||'later';
const b = await chromium.launch(); const ctx = await b.newContext({viewport:{width:W,height:W<500?812:900}}); const p = await ctx.newPage();
const errors=[]; p.on('pageerror',e=>errors.push(String(e))); p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await p.goto('https://darkcyan-grouse-898606.hostingersite.com/?p=71&nc='+Date.now(),{waitUntil:'networkidle'});
await p.evaluate(()=>[...document.querySelectorAll('a,button')].find(e=>/add my prescription/i.test(e.textContent)&&e.offsetParent)?.click());
await p.waitForSelector('dialog[open] .sgs-choice-flow'); await p.waitForTimeout(700);
const R='dialog[open] .sgs-choice-flow';
async function pick(label,advance=true){ await p.evaluate(([R,l])=>{[...document.querySelectorAll(R+' .sgs-choice-flow-question__option-button')].find(e=>e.offsetParent&&e.textContent.trim().startsWith(l))?.click();},[R,label]); await p.waitForTimeout(150); if(advance){ await p.click(R+' .sgs-choice-flow__continue'); } await p.waitForTimeout(700); }
await pick('Distance'); await pick('Thin'); await pick('Polarised');
// The last question opens the chosen way under the options, with Add to bag in the footer (no Continue).
await pick({later:'Send it later',type:'Type it in',upload:'Upload a photo'}[MODE],false);
if(MODE==='type'){ await p.fill('#sgs-field-rx_r_sph','-2.25'); await p.fill('#sgs-field-rx_l_sph','-2.00'); }
if(MODE==='upload'){ await p.setInputFiles(R+' input[type=file]','C:/Users/Bean/Projects/small-giants-wp/sites/eye-care-ward-end/assets/flow-mark.png'); await p.waitForTimeout(4000); }
const total = await p.textContent(R+' .sgs-choice-flow__summary-total-value');
await p.screenshot({path:`buy-${W}-${MODE}-result.png`});
const addBtn = R+' .sgs-choice-flow__add-to-basket';
const label = await p.textContent(addBtn);
await p.click(addBtn); await p.waitForTimeout(3000);
const cart = await p.evaluate(async()=>{const r=await fetch('/wp-json/wc/store/v1/cart',{credentials:'include'});const c=await r.json();return {count:c.items_count,items:c.items.map(i=>({name:i.name,qty:i.quantity,line:i.totals.line_total,meta:(i.item_data||[]).map(d=>d.name+': '+(d.value||d.display))}))};});
console.log(JSON.stringify({W,stageTotal:total,addLabel:label,cart,errors},null,1));
await b.close();
