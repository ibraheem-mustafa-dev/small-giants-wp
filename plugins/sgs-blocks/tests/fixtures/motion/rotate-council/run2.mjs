import { createRequire } from 'module';
const require = createRequire('C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/package.json');
const pw = require('playwright');
import path from 'path'; import { pathToFileURL } from 'url';
const url = pathToFileURL(path.resolve('t2.html')).href;
const out = {};
for (const name of ['chromium','firefox','webkit']) {
  try {
    const b = await pw[name].launch();
    const p = await b.newPage({viewport:{width:2000,height:450}});
    await p.goto(url);
    // pixel extents of black child in each parent, via screenshot
    const png = await p.screenshot();
    const dataUrl = 'data:image/png;base64,'+png.toString('base64');
    const px = await p.evaluate(async (d) => {
      const img = new Image(); img.src=d; await img.decode();
      const c=document.createElement('canvas'); c.width=img.width; c.height=img.height; const x=c.getContext('2d'); x.drawImage(img,0,0);
      const R={};
      for (const [id,left] of [['A',0],['B',400],['C',800],['D',1200],['E',1600]]) {
        const sc = img.width/2000; const data = x.getImageData(left*sc,0,400*sc,300*sc);
        let minx=1e9,maxx=-1,miny=1e9,maxy=-1,area=0;
        for(let y=0;y<data.height;y++)for(let xx=0;xx<data.width;xx++){const i=(y*data.width+xx)*4; const lum=data.data[i]; if(lum<128){area++;if(xx<minx)minx=xx;if(xx>maxx)maxx=xx;if(y<miny)miny=y;if(y>maxy)maxy=y;}}
        R[id]={minx,maxx,miny,maxy,area};
      }
      return R;
    }, dataUrl);
    const r = await p.evaluate(async () => {
      const R={};
      const cs=id=>getComputedStyle(document.getElementById(id));
      R.persp_none_matrix_C = getComputedStyle(document.querySelector('#C .ch')).transform;
      R.persp_parent_A = getComputedStyle(document.querySelector('#A .ch')).transform;
      R.F_pf_none = cs('F').transform; R.G_pf_800 = cs('G').transform;
      // smoothness + independence
      const el=document.getElementById('R');
      const rec=[]; let t0=performance.now();
      el.classList.add('gb');
      const sample=()=>({t:Math.round(performance.now()-t0),a:parseFloat(cs('R').getPropertyValue('--a')),b:parseFloat(cs('R').getPropertyValue('--b'))});
      await new Promise(res=>{
        let started=false;
        function f(){ const s=sample(); rec.push(s);
          if(s.t>600 && !started){started=true; el.classList.add('ga'); R.ga_added_at=s.t; R.b_at_ga_add=s.b;}
          if(s.t<2300) requestAnimationFrame(f); else res(); }
        requestAnimationFrame(f);
      });
      // b should be linear 30*t/2000 throughout irrespective of a
      let maxDev=0; for(const s of rec){const exp=Math.min(30,30*s.t/2000); maxDev=Math.max(maxDev,Math.abs(s.b-exp));}
      R.b_max_deviation_from_linear_deg = +maxDev.toFixed(2);
      // a started when ga added
      const ga0=rec.find(s=>s.t>=R.ga_added_at+0 && s.a>0);
      let aMaxStep=0,bMaxStep=0; for(let i=1;i<rec.length;i++){aMaxStep=Math.max(aMaxStep,Math.abs(rec[i].a-rec[i-1].a));bMaxStep=Math.max(bMaxStep,Math.abs(rec[i].b-rec[i-1].b));}
      R.frames=rec.length; R.a_max_frame_step=+aMaxStep.toFixed(2); R.b_max_frame_step=+bMaxStep.toFixed(2);
      R.final={a:rec[rec.length-1].a,b:rec[rec.length-1].b};
      R.a_first_nonzero_t = ga0 && ga0.t;
      // retarget a back while b runs: remove ga then check a eases back and b untouched
      return R;
    });
    out[name]={pixels:px, ...r}; await b.close();
  } catch(e){ out[name]={error:String(e).slice(0,400)}; }
}
console.log(JSON.stringify(out));
