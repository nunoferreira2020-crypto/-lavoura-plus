const RW_NS='http://www.w3.org/2000/svg'
function rwPolar(cx,cy,r,deg){const a=(deg-90)*Math.PI/180;return{x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)}}
function rwText(svg,text,x,y,size=10,weight='700',fill='#52605a'){const t=document.createElementNS(RW_NS,'text');t.setAttribute('x',x);t.setAttribute('y',y);t.setAttribute('text-anchor','middle');t.setAttribute('dominant-baseline','middle');t.setAttribute('font-size',size);t.setAttribute('font-weight',weight);t.setAttribute('fill',fill);t.textContent=text;svg.appendChild(t);return t}
function decorateReproductionWheel(){
 const svg=document.querySelector('[data-reproduction-wheel] .rw-wrap svg');
 if(!svg||svg.dataset.scaleReady==='1')return;
 svg.dataset.scaleReady='1';
 svg.setAttribute('viewBox','0 0 600 620');
 const cx=300,cy=310,start=220,total=283;
 const g=document.createElementNS(RW_NS,'g');g.setAttribute('class','rw-outer-scale');
 svg.appendChild(g);
 const ring=document.createElementNS(RW_NS,'circle');ring.setAttribute('cx',cx);ring.setAttribute('cy',cy);ring.setAttribute('r','266');ring.setAttribute('fill','none');ring.setAttribute('stroke','#8e9a94');ring.setAttribute('stroke-width','1.2');g.appendChild(ring);
 for(let day=0;day<=280;day+=10){
  const deg=start+(day/total)*360;
  const major=day%30===0;
  const p1=rwPolar(cx,cy,major?258:262,deg),p2=rwPolar(cx,cy,270,deg);
  const line=document.createElementNS(RW_NS,'line');line.setAttribute('x1',p1.x);line.setAttribute('y1',p1.y);line.setAttribute('x2',p2.x);line.setAttribute('y2',p2.y);line.setAttribute('stroke',major?'#53615a':'#a7b0ab');line.setAttribute('stroke-width',major?'1.7':'1');g.appendChild(line);
  if(major){const p=rwPolar(cx,cy,282,deg);rwText(g,String(day),p.x,p.y,10,'700','#4f5b55')}
 }
 const todayDeg=start;
 const todayP=rwPolar(cx,cy,294,todayDeg);rwText(g,'HOJE',todayP.x,todayP.y,11,'900','#1f6f43');
 const birthDeg=start+360;
 const birthP=rwPolar(cx,cy,294,birthDeg);rwText(g,'PARTO',birthP.x,birthP.y+14,11,'900','#b3261e');
 const zeroP=rwPolar(cx,cy,278,todayDeg);rwText(g,'0',zeroP.x,zeroP.y,10,'800','#1f6f43');
 const endP=rwPolar(cx,cy,278,birthDeg);rwText(g,'283',endP.x,endP.y+14,10,'800','#b3261e');
}
decorateReproductionWheel();let rwQueued=false;new MutationObserver(()=>{if(rwQueued)return;rwQueued=true;queueMicrotask(()=>{rwQueued=false;decorateReproductionWheel()})}).observe(document.body,{childList:true,subtree:true});
