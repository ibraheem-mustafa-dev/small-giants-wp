import { chromium } from 'playwright';
const URL='https://sandybrown-nightingale-600381.hostingersite.com/probe-fr-38-35-timeline-progress-connector/';
const OUT=process.argv[2];
const b=await chromium.launch();

async function run(reduced){
  const p=await b.newPage({viewport:{width:1440,height:950},...(reduced?{reducedMotion:'reduce'}:{})});
  await p.goto(URL,{waitUntil:'networkidle'});
  // count every spark ever created, not just those alive at one instant
  await p.evaluate(()=>{
    window.__sparks=0;
    const host=document.querySelector('.sgs-tl-2da0410a .sgs-timeline__progress');
    new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{
      if(n.classList&&n.classList.contains('sgs-timeline__spark'))window.__sparks++;
    }))).observe(host,{childList:true});
  });
  // human-like scroll
  await p.evaluate(async()=>{
    for(let i=0;i<90;i++){window.scrollBy(0,12);await new Promise(r=>setTimeout(r,16));}
  });
  const live=await p.evaluate(()=>({
    total:window.__sparks,
    alive:document.querySelectorAll('.sgs-tl-2da0410a .sgs-timeline__spark').length,
  }));
  // hold still: spark count must STOP rising (the SC 2.2.2 gate)
  const before=live.total;
  await p.waitForTimeout(2500);
  const after=await p.evaluate(()=>window.__sparks);
  if(OUT&&!reduced){
    await p.evaluate(async()=>{for(let i=0;i<20;i++){window.scrollBy(0,12);await new Promise(r=>setTimeout(r,16));}});
    const el=await p.$('.sgs-tl-2da0410a');
    if(el) await el.screenshot({path:`${OUT}/glow-after.png`});
  }
  await p.close();
  return {total:live.total,alive:live.alive,before,after};
}

const norm=await run(false);
console.log(`NORMAL  : sparks created=${norm.total}  alive at end=${norm.alive}`);
console.log(`  while HELD STILL 2.5s: ${norm.before} -> ${norm.after}  ${norm.before===norm.after?'STOPPED (SC 2.2.2 gate holds)':'STILL SPAWNING — autonomous, would owe a pause control'}`);
const red=await run(true);
console.log(`REDUCED : sparks created=${red.total}  ${red.total===0?'OK (suppressed)':'LEAKING'}`);
await b.close();
