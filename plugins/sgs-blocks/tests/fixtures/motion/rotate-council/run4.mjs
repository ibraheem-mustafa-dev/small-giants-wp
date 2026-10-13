import { createRequire } from 'module';
const require = createRequire('C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/package.json');
const pw = require('playwright');
const b=await pw.chromium.launch(); const p=await b.newPage();
await p.setContent(`<div id=par style="perspective:1100px;width:600px;height:500px;position:relative"><div id=card style="position:absolute;left:100px;top:100px;width:400px;height:300px;background:#000"></div></div>`);
const r = await p.evaluate(()=>{
 const W=400,H=300, corners=[[-200,-150],[200,-150],[200,150],[-200,150]];
 const P=new DOMMatrix().multiply(new DOMMatrix([1,0,0,0, 0,1,0,0, 0,0,1,-1/1100, 0,0,0,1]));
 const proj=(M,[x,y])=>{const q=new DOMPoint(x,y,0,1).matrixTransform(P.multiply(M));return [q.x/q.w,q.y/q.w]};
 let worstXY=0,worstYX=0,worstTrue=0, rows=[], cornerCase;
 for(let i=0;i<=10;i++)for(let j=0;j<=10;j++){
  const x=i/10,y=j/10, ax=0.5-y, ay=x-0.5, th=Math.hypot(ax,ay)*16;
  let D = th===0? new DOMMatrix(): new DOMMatrix().rotateAxisAngle(ax,ay,0,th);
  // browser's own for check
  const XY=new DOMMatrix().rotate(16*ax,0,0).rotate(0,16*ay,0); // DOMMatrix.rotate(rx,ry,rz): applies rz,ry,rx order? build explicitly instead
  const RX=new DOMMatrix().rotateAxisAngle(1,0,0,16*ax), RY=new DOMMatrix().rotateAxisAngle(0,1,0,16*ay);
  const M1=RX.multiply(RY), M2=RY.multiply(RX); // rotateX(a) rotateY(b)  vs rotateY(b) rotateX(a)
  let e1=0,e2=0; for(const c of corners){const d=proj(D,c),a=proj(M1,c),bb=proj(M2,c);e1=Math.max(e1,Math.hypot(d[0]-a[0],d[1]-a[1]));e2=Math.max(e2,Math.hypot(d[0]-bb[0],d[1]-bb[1]));}
  worstXY=Math.max(worstXY,e1);worstYX=Math.max(worstYX,e2);
  if(i==10&&j==0) cornerCase={x,y,theta:th,rotX_deg:16*ax,rotY_deg:16*ay,errXY_px:e1,errYX_px:e2};
 }
 // browser-verified: set draft rotate vs proposal transform on two real elements at the corner and compare getBoundingClientRect
 const card=document.getElementById('card'); card.style.rotate='0.5 0.5 0 11.31deg'; const bd=card.getBoundingClientRect().toJSON();
 card.style.rotate='none'; card.style.transform='rotateX(8deg) rotateY(8deg)'; const bp=card.getBoundingClientRect().toJSON();
 card.style.transform='rotateY(8deg) rotateX(8deg)'; const bp2=card.getBoundingClientRect().toJSON();
 card.style.transform='none';
 return {worst_err_px_rotateX_then_Y_over_grid:+worstXY.toFixed(3),worst_err_px_rotateY_then_X:+worstYX.toFixed(3),cornerCase,draft_box:[bd.left,bd.top,bd.width,bd.height].map(v=>+v.toFixed(3)),proposal_XthenY_box:[bp.left,bp.top,bp.width,bp.height].map(v=>+v.toFixed(3)),proposal_YthenX_box:[bp2.left,bp2.top,bp2.width,bp2.height].map(v=>+v.toFixed(3))};
});
console.log(JSON.stringify(r,null,1)); await b.close();
