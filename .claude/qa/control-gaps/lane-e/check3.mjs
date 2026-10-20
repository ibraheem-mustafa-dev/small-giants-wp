import {chromium,env,login,openEditor} from './lib.mjs';
const e=env('.claude/secrets/sandybrown.env','SANDYBROWN');
const b=await chromium.launch({channel:'chrome',headless:false});
const ctx=await b.newContext({viewport:{width:1440,height:900}});const page=await ctx.newPage();
page.on('dialog',d=>d.accept());
await login(page,e);
for(const id of (process.argv[2]||'2158,2300,2900').split(',').map(Number)){
  const cons=[];const h1=m=>{if(['error'].includes(m.type()))cons.push(m.type()+': '+m.text().slice(0,120)+' @'+(m.location().url||'').slice(-110))};
  page.on('console',h1);
  await openEditor(page,e,id);
  await page.waitForTimeout(6000);
  const r=await page.evaluate(()=>{
    const all=[];const walk=(bs)=>bs.forEach(b=>{all.push(b);walk(b.innerBlocks||[])});
    walk(wp.data.select('core/block-editor').getBlocks());
    const sel=wp.data.select('core/block-editor');const di=sel.getBlocksByName('sgs/decorative-image').map(c=>sel.getBlock(c));
    const iframe=document.querySelector('iframe[name="editor-canvas"]');
    const docs=[document,iframe&&iframe.contentDocument].filter(Boolean);
    const warn=docs.reduce((n,d)=>n+d.querySelectorAll('.block-editor-warning').length,0);
    const txt=docs.map(d=>d.body.innerText).join(' ');
    return {total:all.length,invalid:all.filter(b=>!b.isValid).map(b=>b.name),decorativeImages:di.map(b=>({valid:b.isValid,inner:b.innerBlocks.length,imageUrl:(b.attributes.imageUrl||'').split('/').pop()})),warningNodes:warn,unexpectedText:/unexpected or invalid content/i.test(txt),recoveryText:/Attempt Block Recovery/i.test(txt),decorativeEls:(iframe?iframe.contentDocument:document).querySelectorAll('[data-type="sgs/decorative-image"]').length};
  });
  console.log(id,JSON.stringify(r));
  console.log(id,'console errors/warnings:',JSON.stringify(cons));
  page.off('console',h1);
}
await b.close();
