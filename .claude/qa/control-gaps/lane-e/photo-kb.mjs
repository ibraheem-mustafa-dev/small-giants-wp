import {chromium,env,login,openEditor,desc} from './lib.mjs';
const e=env('.claude/secrets/mamas-test.env','MAMASTEST');
const b=await chromium.launch({channel:'chrome',headless:false});
for(const w of [1440,768,375]){
 const ctx=await b.newContext({viewport:{width:w,height:900}});const page=await ctx.newPage();page.on('dialog',d=>d.accept());
 await login(page,e);await openEditor(page,e,Number(process.env.POST_ID));
 const fr=page.frameLocator('iframe[name="editor-canvas"]');
 const p=fr.locator('p.wp-block-sgs-text').nth(1);await p.scrollIntoViewIfNeeded();await page.waitForTimeout(500);
 await p.click({position:{x:30,y:8}});await page.waitForTimeout(900);
 const pop=()=>page.evaluate(()=>{const q=document.querySelector('.sgs-inline-format-popover');return q?{in:q.contains(document.activeElement),t:q.innerText.replace(/\s+/g,' ').slice(0,50)}:null});
 let hit=null;
 for(let k=10;k<=24&&!hit;k++){
   await page.keyboard.press('Home');for(let j=0;j<k;j++)await page.keyboard.press('ArrowRight');
   await page.keyboard.press('Shift+ArrowRight');await page.waitForTimeout(200);
   const s=await page.evaluate(()=>{const f=document.querySelector('iframe[name="editor-canvas"]');return f.contentDocument.getSelection().toString()});
   const q=await pop(); if(q)hit={rightArrowsFromHome:k,sel:s,q};
 }
 console.log(w,'keyboard-only photo select:',JSON.stringify(hit));
 if(hit){
  await page.keyboard.press('Tab');await page.waitForTimeout(300);
  console.log(w,' Tab ->',await page.evaluate(desc).then(x=>x.slice(0,80)),JSON.stringify(await pop()));
  await page.keyboard.press('Escape');await page.waitForTimeout(500);
  console.log(w,' Escape -> popover',JSON.stringify(await pop()),'active',(await page.evaluate(desc)).slice(0,90));
 }
 await ctx.close();
}
await b.close();
