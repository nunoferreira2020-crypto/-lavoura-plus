const RWC_FARM='72bb5d54-f614-4394-8da9-7113a8e48a29'
const RWC_NS='http://www.w3.org/2000/svg'
const RWC_CX=300,RWC_CY=310,RWC_TERM=283,RWC_START=180
function rwcPolar(r,deg){const a=(deg-90)*Math.PI/180;return{x:RWC_CX+r*Math.cos(a),y:RWC_CY+r*Math.sin(a)}}
function rwcArc(r,s,e){const p1=rwcPolar(r,s),p2=rwcPolar(r,e),large=e-s>180?1:0;return`M ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y}`}
function rwcDays(a,b){return Math.round((new Date(`${b}T12:00:00`)-new Date(`${a}T12:00:00`))/86400000)}
function rwcToday(){return new Date().toISOString().slice(0,10)}
function rwcNorm(v){return String(v||'').trim().toLocaleLowerCase('pt-PT')}
function rwcColor(item){
 const status=String(item.animal.status||'').trim().toUpperCase()
 const result=String(item.ia?.result||'').trim().toLowerCase()
 const day=item.day
 const toCalving=item.ia?.expected_calving?rwcDays(rwcToday(),item.ia.expected_calving):null
 if(status==='SECA')return{color:'#34a853',key:'dry'}
 if(result.includes('vazia')||result.includes('negativ')||status==='VAZIA')return{color:'#e53935',key:'red'}
 if(Number.isFinite(toCalving)&&toCalving>=0&&toCalving<=21)return{color:'#e53935',key:'red'}
 if(result.includes('prenhe')||result.includes('positiv'))return{color:'#2f80ed',key:'preg'}
 if(Number.isFinite(day)&&day<=30)return{color:'#f4c20d',key:'recent'}
 if(Number.isFinite(day)&&day<=60)return{color:'#f39c12',key:'diag'}
 if(Number.isFinite(day)&&day<=RWC_TERM)return{color:'#2f80ed',key:'preg'}
 return{color:null,key:'invalid'}
}
async function rwcData(){
 const sb=window.lavouraSupabase;if(!sb)return[]
 const {data:animals}=await sb.from('animals').select('id,number,name,status').eq('farm_id',RWC_FARM);if(!animals?.length)return[]
 const ids=animals.map(a=>a.id)
 const {data:events}=await sb.from('reproduction').select('animal_id,event_type,event_date,result,expected_calving,created_at').eq('farm_id',RWC_FARM).in('animal_id',ids)
 return animals.map(animal=>{const ia=(events||[]).filter(e=>e.animal_id===animal.id&&e.event_type==='IA').sort((a,b)=>String(b.event_date||'').localeCompare(String(a.event_date||''))||String(b.created_at||'').localeCompare(String(a.created_at||'')))[0]||null;const day=ia?.event_date?rwcDays(ia.event_date,rwcToday()):null;return{animal,ia,day}})
}
function rwcGroup(svg,item){const target=rwcNorm(item.animal.name||item.animal.number);return[...svg.querySelectorAll('g[role="button"][aria-label]')].find(g=>rwcNorm(g.getAttribute('aria-label'))===target)}
function rwcRing(svg){
 ;[...svg.querySelectorAll('path')].filter(p=>p.getAttribute('stroke-width')==='18').forEach(p=>p.remove())
 const ranges=[[0,30,'#f4c20d'],[30,60,'#f39c12'],[60,220,'#2f80ed'],[220,260,'#34a853'],[260,283,'#e53935']]
 ranges.forEach(([a,b,c])=>{const p=document.createElementNS(RWC_NS,'path');p.setAttribute('d',rwcArc(247,RWC_START+a/RWC_TERM*360,RWC_START+b/RWC_TERM*360));p.setAttribute('fill','none');p.setAttribute('stroke',c);p.setAttribute('stroke-width','18');svg.insertBefore(p,svg.firstChild)})
}
async function correctWheel(){
 const svg=document.querySelector('[data-reproduction-wheel] .rw-wrap svg');if(!svg||svg.dataset.corrected==='4')return
 const data=await rwcData();if(!data.length)return
 rwcRing(svg)
 const counts={recent:0,diag:0,preg:0,dry:0,red:0}
 data.forEach(item=>{const g=rwcGroup(svg,item);if(!g)return;const st=rwcColor(item);if(st.key==='invalid'){g.style.display='none';return}g.style.display='';const circle=g.querySelector('circle');if(circle&&st.color)circle.setAttribute('fill',st.color);counts[st.key]=(counts[st.key]||0)+1})
 const summary=document.querySelector('.rw-summary');if(summary){const boxes=summary.querySelectorAll(':scope > div');if(boxes[0])boxes[0].querySelector('b').textContent=counts.recent+counts.diag;if(boxes[1])boxes[1].querySelector('b').textContent=counts.preg;if(boxes[2])boxes[2].querySelector('b').textContent=counts.dry;if(boxes[3])boxes[3].querySelector('b').textContent=counts.red}
 const legend=document.querySelector('.rw-legend');if(legend)legend.innerHTML='<span><i style="background:#f4c20d"></i>IA recente</span><span><i style="background:#f39c12"></i>Diagnóstico</span><span><i style="background:#2f80ed"></i>Prenhe</span><span><i style="background:#34a853"></i>Seca</span><span><i style="background:#e53935"></i>Pré-parto / vazia</span>'
 const help=document.querySelector('.rw-help span');if(help)help.textContent='Cada vaca é posicionada pelos dias desde a IA mais recente. Registos sem uma IA atual válida não são inventados nem colocados numa posição falsa.'
 svg.dataset.corrected='4'
}
correctWheel();let rwcQueued=false;new MutationObserver(()=>{if(rwcQueued)return;rwcQueued=true;queueMicrotask(()=>{rwcQueued=false;correctWheel()})}).observe(document.body,{childList:true,subtree:true})
