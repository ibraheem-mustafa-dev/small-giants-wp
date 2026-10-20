import { createRequire } from 'module';
const require = createRequire('C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/package.json');
const { chromium } = require('playwright');
const base='https://lightsalmon-tarsier-683012.hostingersite.com';
const pages={base:'qa-lanee-g10b',override:'qa-lanee-g10o'};
const b=await chromium.launch({channel:'chrome',headless:false});
const out={};
for (const w of [375,768,1440]) {
  const ctx=await b.newContext({viewport:{width:w,height:900}}); const p=await ctx.newPage();
  for (const [k,slug] of Object.entries(pages)) {
    await p.goto(`${base}/${slug}/`,{waitUntil:'networkidle'});
    const r=await p.evaluate(()=>[...document.querySelectorAll('.sgs-choice-flow')].map(f=>({flow:f.className.match(/sgs-choice-flow--[a-z]+/g)?.join(' '),
      id:f.getAttribute('data-flow-id')||f.id,
      descs:[...f.querySelectorAll('.sgs-choice-flow-question__option-description')].map(e=>{const c=getComputedStyle(e);return {t:e.textContent.slice(0,25),fs:c.fontSize,color:c.color,vis:e.getBoundingClientRect().height>0}})})));
    out[`${w}-${k}`]=r;
  }
  await ctx.close();
}
await b.close();
console.log(JSON.stringify(out,null,1));
