import { createRequire } from 'module';
const require = createRequire('C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/package.json');
const pw = require('playwright'); import path from 'path'; import { pathToFileURL } from 'url';
const url = pathToFileURL(path.resolve('t3.html')).href; const out={};
for (const n of ['chromium','firefox','webkit']) { const b=await pw[n].launch(); const p=await b.newPage({viewport:{width:1000,height:300}}); await p.goto(url);
 out[n]={version:b.version(), rects: await p.evaluate(()=>['P','N','S'].map(id=>{const r=document.querySelector('#'+id+' .ch').getBoundingClientRect();return id+': w='+r.width.toFixed(1)+' h='+r.height.toFixed(1)}))};
 const png=await p.screenshot(); const d='data:image/png;base64,'+png.toString('base64');
 out[n].px=await p.evaluate(async d=>{const img=new Image();img.src=d;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);const R={};[['P',0],['N',320],['S',640]].forEach(([id,l])=>{const dd=x.getImageData(l,0,320,260);let minx=1e9,maxx=-1,miny=1e9,maxy=-1;for(let y=0;y<dd.height;y++)for(let xx=0;xx<dd.width;xx++){if(dd.data[(y*dd.width+xx)*4]<128){minx=Math.min(minx,xx);maxx=Math.max(maxx,xx);miny=Math.min(miny,y);maxy=Math.max(maxy,y);}}R[id]=`w=${maxx-minx+1} h=${maxy-miny+1}`});return R},d); await b.close(); }
console.log(JSON.stringify(out,null,1));
