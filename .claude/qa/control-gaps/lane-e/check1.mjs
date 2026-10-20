import {chromium,env,login,openEditor,desc} from './lib.mjs';
const ID=process.argv[2]; const widths=(process.argv[3]||'1440,768,375').split(',').map(Number);
const SHOTS='C:/Users/Bean/Projects/small-giants-wp/.claude/qa/control-gaps/lane-e/';
const e=env('.claude/secrets/mamas-test.env','MAMASTEST');
const b=await chromium.launch({channel:'chrome',headless:false});
const log=(...a)=>console.log(...a);
const ad=(page)=>page.evaluate(desc);
const frameInfo=(page)=>page.evaluate(()=>{const f=document.querySelector('iframe[name="editor-canvas"]');const d=f.contentDocument;const s=d.getSelection();return {sel:s.toString(),ae:d.activeElement.tagName+'.'+(d.activeElement.className||'').toString().slice(0,40)}});
const popInfo=(page)=>page.evaluate(()=>{const p=document.querySelector('.sgs-inline-format-popover');if(!p)return {present:false};const a=document.activeElement;return {present:true,focusInside:p.contains(a),text:p.innerText.replace(/\s+/g,' ').slice(0,160)}});
async function pointOf(page,word,off,idx=0,img=false){
  return page.evaluate(({word,off,idx,img})=>{const f=document.querySelector('iframe[name="editor-canvas"]');const d=f.contentDocument;const p=d.querySelectorAll('p.wp-block-sgs-text')[idx];p.scrollIntoView({block:'center'});
   const fb=f.getBoundingClientRect();
   if(img){const i=p.querySelector('img.sgs-inline-photo');const b=i.getBoundingClientRect();return {x:fb.left+b.left+b.width/2,y:fb.top+b.top+b.height/2,w:b.width}}
   const w=d.createTreeWalker(p,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){const k=n.textContent.indexOf(word);if(k>=0){const r=d.createRange();r.setStart(n,k+off);r.setEnd(n,k+off+1);const b=r.getBoundingClientRect();return {x:fb.left+b.left+b.width/2,y:fb.top+b.top+b.height/2}}}},{word,off,idx,img});
}
for(const w of widths){
  log(`\n===== width ${w} =====`);
  let ctx=await b.newContext({viewport:{width:w,height:900}});let page=await ctx.newPage();
  page.on('dialog',d=>d.accept());
  const cons=[];page.on('console',m=>{if(['error'].includes(m.type()))cons.push(m.type()+': '+m.text().slice(0,160)+' @'+(m.location().url||'').slice(0,120))});
  await login(page,e);await openEditor(page,e,ID);
  let pt=await pointOf(page,'baked',2);await page.waitForTimeout(700);pt=await pointOf(page,'baked',2);log('H word point:',JSON.stringify(pt));
  await page.mouse.click(pt.x,pt.y);await page.waitForTimeout(800);pt=await pointOf(page,'baked',2);log('H word point after block selected (docked toolbar can shift the canvas):',JSON.stringify(pt));await page.mouse.dblclick(pt.x,pt.y);await page.waitForTimeout(700);
  log('H selection:',JSON.stringify(await frameInfo(page)));
  log('H toolbar buttons (visible):',JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('.block-editor-block-contextual-toolbar button,.block-editor-block-toolbar button,[aria-label="Block tools"] button')].filter(x=>x.offsetParent).map(x=>x.getAttribute('aria-label')||x.textContent))));
  await page.screenshot({path:`${SHOTS}shot-h-${w}-a.png`});
  await page.keyboard.press('Alt+F10');await page.waitForTimeout(300);
  log('H after Alt+F10 active:',await ad(page));
  let found=false;const path=[];
  for(let i=0;i<14;i++){const d=await ad(page);path.push(d.replace(/^.*\[aria-label=/,'').replace(/\].*/,''));if(/aria-label=More/.test(d)){found=true;break}await page.keyboard.press('ArrowRight');await page.waitForTimeout(100)}
  log('H toolbar path via ArrowRight:',path.join(' > '),'| More found:',found);
  if(found){
    await page.keyboard.press('Enter');await page.waitForTimeout(500);
    const items=await page.evaluate(()=>[...document.querySelectorAll('[role=menuitem],[role=menuitemcheckbox],[role=menuitemradio]')].map(x=>x.textContent.trim()));
    log('H More menu items:',JSON.stringify(items));
    let ok=false;for(let i=0;i<items.length+2;i++){const t=await page.evaluate(()=>document.activeElement.textContent.trim());log('  menu focus:',t);if(t==='Highlight'){ok=true;break}await page.keyboard.press('ArrowDown');await page.waitForTimeout(100)}
    if(ok){
      log('H before Enter on Highlight, active:',await ad(page));
      await page.keyboard.press('Enter');await page.waitForTimeout(900);
      log('H popover after Enter:',JSON.stringify(await popInfo(page)));log('H active after open:',await ad(page));
      await page.screenshot({path:`${SHOTS}shot-h-${w}-b.png`});
      await page.keyboard.press('Escape');await page.waitForTimeout(700);
      log('H popover after Escape:',JSON.stringify(await popInfo(page)));log('H active after Escape:',await ad(page));
      log('H canvas selection after Escape:',JSON.stringify(await frameInfo(page)));
    }
  }
  log('H console:',JSON.stringify(cons));
  await ctx.close();

  ctx=await b.newContext({viewport:{width:w,height:900}});page=await ctx.newPage();page.on('dialog',d=>d.accept());
  const cons2=[];page.on('console',m=>{if(['error'].includes(m.type()))cons2.push(m.type()+': '+m.text().slice(0,160)+' @'+(m.location().url||'').slice(0,120))});
  await login(page,e);await openEditor(page,e,ID);
  pt=await pointOf(page,'baked',1);
  await page.mouse.click(pt.x,pt.y);await page.waitForTimeout(500);
  log('P before:',await ad(page),JSON.stringify(await popInfo(page)));
  await page.evaluate(()=>{const f=document.querySelector('iframe[name="editor-canvas"]');f.contentDocument.querySelectorAll('p.wp-block-sgs-text')[0].scrollIntoView({block:'center'})});await page.waitForTimeout(700);
  const bx=await page.evaluate(()=>{const f=document.querySelector('iframe[name="editor-canvas"]');const d=f.contentDocument;const p=d.querySelectorAll('p.wp-block-sgs-text')[0];p.scrollIntoView({block:'center'});const i=p.querySelector('img.sgs-inline-photo');const b=i.getBoundingClientRect();const fb=f.getBoundingClientRect();return {l:fb.left+b.left,r:fb.left+b.right,y:fb.top+b.top+b.height/2,w:b.width}});
  log('P photo box:',JSON.stringify(bx));
  await page.mouse.move(bx.l+2,bx.y);await page.mouse.down();await page.mouse.move(bx.r-2,bx.y,{steps:8});await page.mouse.up();await page.waitForTimeout(800);
  log('P canvas selection:',JSON.stringify(await frameInfo(page)));
  const pi=await popInfo(page);log('P popover after selecting the photo:',JSON.stringify(pi));log('P active:',await ad(page));
  await page.screenshot({path:`${SHOTS}shot-p-${w}-a.png`});
  const tabs=[];let reached=false;
  for(let i=0;i<10;i++){await page.keyboard.press('Tab');await page.waitForTimeout(150);const d=await ad(page);const inside=await page.evaluate(()=>{const p=document.querySelector('.sgs-inline-format-popover');return !!p&&p.contains(document.activeElement)});tabs.push((inside?'[IN POPOVER] ':'')+d.slice(0,90));if(inside){reached=true;break}}
  if(!reached){const st=[];for(let i=0;i<6;i++){await page.keyboard.press('Shift+Tab');await page.waitForTimeout(150);const d=await ad(page);const inside=await page.evaluate(()=>{const p=document.querySelector('.sgs-inline-format-popover');return !!p&&p.contains(document.activeElement)});st.push((inside?'[IN POPOVER] ':'')+d.slice(0,70));if(inside){reached=true;break}}log('P Shift+Tab trail:',JSON.stringify(st));log('P popover still present after tabbing:',JSON.stringify(await popInfo(page)))}
  log('P Tab trail:',JSON.stringify(tabs));log('P popover reachable by Tab:',reached);
  if(reached){
    log('P popover focus:',await page.evaluate(()=>{const a=document.activeElement;return a.tagName+' type='+a.type+' label='+(a.labels&&a.labels[0]&&a.labels[0].textContent)}));
    await page.keyboard.press('Escape');await page.waitForTimeout(600);
    log('P Escape from toggle: popover',JSON.stringify(await popInfo(page)),'| active',await ad(page));
    if(!(await popInfo(page)).present){log('P popover closed by Escape')}else{
    await page.keyboard.press('Space');await page.waitForTimeout(500);
    log('P after Space on toggle:',JSON.stringify(await popInfo(page)));
    await page.keyboard.press('Tab');await page.waitForTimeout(200);
    log('P next focus:',await page.evaluate(()=>{const a=document.activeElement;return a.tagName+' label='+(a.labels&&a.labels[0]&&a.labels[0].textContent)}));
  }}
  await page.keyboard.press('Escape');await page.waitForTimeout(700);
  log('P popover after Escape:',JSON.stringify(await popInfo(page)));log('P active after Escape:',await ad(page));
  log('P console:',JSON.stringify(cons2));
  await ctx.close();
}
await b.close();
