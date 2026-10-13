import { createRequire } from 'module';
const require = createRequire('C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/package.json');
const pw = require('playwright');
import path from 'path';
import { pathToFileURL } from 'url';
// Usage: node run.mjs [page]   page is a path or an http(s)/file URL; the default is rotate-test.html in the cwd.
// A page without the council's other boxes (the rendered fixture) is measured on #ind only.
const arg = process.argv[2] || 'rotate-test.html';
const url = /^(https?|file):/.test(arg) ? arg : pathToFileURL(path.resolve(arg)).href;
const out = {};
for (const name of ['chromium','firefox','webkit']) {
  try {
    const b = await pw[name].launch();
    const p = await b.newPage({viewport:{width:1100,height:400}});
    await p.goto(url);
    const r = await p.evaluate(async () => {
      const R = {};
      const box = id => { const r=document.getElementById(id).getBoundingClientRect(); return [r.left,r.top,r.width,r.height].map(v=>+v.toFixed(3)); };
      const cs = id => getComputedStyle(document.getElementById(id));
      for (const id of ['ind','ref','tiltonly','zonly','swapped']) if (document.getElementById(id)) R['box_'+id]=box(id);
      R.ind_transform = cs('ind').transform; R.ind_rotate=cs('ind').rotate; R.ind_translate=cs('ind').translate; R.ind_scale=cs('ind').scale;
      if (!document.getElementById('ref')) return R;
      R.ref_transform = cs('ref').transform;
      // projected corners via DOMMatrix: build composed matrix manually T*R*S*transform around origin (center)
      const m = new DOMMatrix().translate(20,10).rotate(-1).scale(1.1,1.1).multiply(new DOMMatrix(cs('ind').transform));
      R.manual_matrix = m.toString();
      // the Z rotation is retained: compare projected top edge angle
      const pts = [[-100,-50],[100,-50]].map(([x,y])=>{const q=new DOMPoint(x,y,0,1).matrixTransform(new DOMMatrix().translate(20,10).rotate(-1).scale(1.1,1.1).multiply(new DOMMatrix(cs('ind').transform)));return [q.x/q.w,q.y/q.w]});
      R.top_edge_angle_deg_combined = +(Math.atan2(pts[1][1]-pts[0][1],pts[1][0]-pts[0][0])*180/Math.PI).toFixed(4);
      const t = new DOMMatrix(cs('tiltonly').transform);
      const pt = [[-100,-50],[100,-50]].map(([x,y])=>{const q=new DOMPoint(x,y,0,1).matrixTransform(t);return [q.x/q.w,q.y/q.w]});
      R.top_edge_angle_deg_tiltonly = +(Math.atan2(pt[1][1]-pt[0][1],pt[1][0]-pt[0][0])*180/Math.PI).toFixed(4);
      // test 2: summed registered props, paused at fixed times
      const s = document.getElementById('sum');
      s.classList.add('held'); // c=5 set instantly? c has no transition
      s.classList.add('go');
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const anims = document.getAnimations().filter(a=>a.transitionProperty && a.effect.target===s);
      R.anim_props = anims.map(a=>a.transitionProperty).sort();
      const samples = {};
      for (const t of [0,250,500,1000,1500,2000]) {
        anims.forEach(a=>{a.pause(); a.currentTime=t;});
        const c=cs('sum'); const g=n=>c.getPropertyValue(n).trim();
        samples[t]={a:g('--a'),b:g('--b'),c:g('--c'),ry:g('--ry'),matrix:c.transform};
      }
      R.sum_samples = samples;
      R.sum_expected = 'X=a+b+c: t0 5, t500 10+7.5+5=22.5, t1000 20+15+5=40, t2000 20+30+5=55';
      // expected matrix for t=500 from reference construction
      const ref = document.createElement('div'); ref.style.cssText='position:absolute;transform:perspective(800px) rotateX(22.5deg) rotateY(5deg)'; document.body.appendChild(ref);
      R.sum_ref_t500 = getComputedStyle(ref).transform;
      // unregistered control
      const u=document.getElementById('unreg'); u.classList.add('go');
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      R.unreg_transitions = document.getAnimations().filter(a=>a.effect.target===u).length;
      // test 3
      for (const id of ['pp','ps','pb','p0']) R['persp_'+id] = {childBox: (()=>{const r=document.querySelector('#'+id+' .ch').getBoundingClientRect();return [r.left-600,r.top,r.width,r.height].map(v=>+v.toFixed(3))})(), matrix: getComputedStyle(document.querySelector('#'+id+' .ch')).transform};
      return R;
    });
    out[name]=r; await b.close();
  } catch(e){ out[name]={error:String(e).slice(0,300)}; }
}
console.log(JSON.stringify(out,null,1));
