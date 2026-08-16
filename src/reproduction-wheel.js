const FARM_ID='72bb5d54-f614-4394-8da9-7113a8e48a29'

const NS='http://www.w3.org/2000/svg'

function datePT(v){if(!v)return '—';const p=String(v).split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:v}
function daysBetween(a,b){const x=new Date(`${a}T12:00:00`),y=new Date(`${b}T12:00:00`);return Math.round((y-x)/86400000)}
function todayISO(){return new Date().toISOString().slice(0,10)}
function polar(cx,cy,r,deg){const a=(deg-90)*Math.PI/180;return {x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)}}
function arcPath(cx,cy,r,start,end){const a=polar(cx,cy,r,end),b=polar(cx,cy,r,start),large=end-start<=180?0:1;return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 0 ${b.x} ${b.y}`}
function svgEl(tag,attrs={}){const el=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));return el}

function latestByType(events,type){return events.filter(e=>e.event_type===type).sort((a,b)=>String(b.event_date||'').localeCompare(String(a.event_date||'')))[0]||null}

function stageFor(ia,animal){
 const d=ia?.event_date?daysBetween(ia.event_date,todayISO()):null
 if(animal?.status==='SECA') return {label:'SECA',color:'#36a853'}
 if(ia?.result&&String(ia.result).toLowerCase().includes('vazia')) return {label:'VAZIA',color:'#e53935'}
 if(d===null) return {label:'SEM IA',color:'#9aa0a6'}
 if(d<30) return {label:'IA RECENTE',color:'#f4c20d'}
 if(d<90) return {label:'DIAGNÓSTICO',color:'#f39c12'}
 if(d<223) return {label:'PRENHE',color:'#2f80ed'}
 return {label:'PRÉ-PARTO',color:'#d93025'}
}

function wheelAngle(ia){
 if(!ia?.event_date)return null
 let d=daysBetween(ia.event_date,todayISO())
 d=Math.max(0,Math.min(283,d))
 return 220+(d/283)*360
}

async function loadWheelData(){
 const sb=window.lavouraSupabase;if(!sb) return []
 const {data:animals,error:aErr}=await sb.from('animals').select('id,number,name,status').eq('farm_id',FARM_ID)
 if(aErr||!animals?.length)return []
 const ids=animals.map(a=>a.id)
 const {data:events,error:eErr}=await sb.from('reproduction').select('animal_id,event_type,event_date,result,expected_dry_off,expected_calving').eq('farm_id',FARM_ID).in('animal_id',ids)
 if(eErr)return []
 return animals.map(a=>{
  const ev=(events||[]).filter(e=>e.animal_id===a.id)
  const ia=latestByType(ev,'IA'),dry=latestByType(ev,'SECAGEM'),calving=latestByType(ev,'PARTO')
  return {animal:a,ia,dry,calving,stage:stageFor(ia,a)}
 }).filter(x=>x.ia||x.dry||x.calving)
}

function showInfo(host,item){
 let box=host.querySelector('.rw-info')
 if(!box){box=document.createElement('div');box.className='rw-info';host.appendChild(box)}
 box.innerHTML=`<button type="button" class="rw-close" aria-label="Fechar">×</button><strong>🐄 ${item.animal.number}${item.animal.name?` — ${item.animal.name}`:''}</strong><div>${item.stage.label}</div><div>IA: ${datePT(item.ia?.event_date)}</div><div>Secagem prevista: ${datePT(item.ia?.expected_dry_off)}</div><div>Parto previsto: ${datePT(item.ia?.expected_calving)}</div>`
 box.querySelector('.rw-close').onclick=()=>box.remove()
}

function buildWheel(items){
 const host=document.createElement('section');host.className='card reproduction-wheel-card';host.dataset.reproductionWheel='1'
 host.innerHTML='<h2>⭕ Roda da Reprodução</h2><p class="muted rw-subtitle">Situação reprodutiva atual do rebanho</p>'
 const wrap=document.createElement('div');wrap.className='rw-wrap';host.appendChild(wrap)
 const svg=svgEl('svg',{viewBox:'0 0 600 600',role:'img','aria-label':'Roda da Reprodução'});wrap.appendChild(svg)
 const cx=300,cy=300
 svg.appendChild(svgEl('circle',{cx,cy,r:235,fill:'#fff',stroke:'#b8c2bd','stroke-width':2}))
 svg.appendChild(svgEl('circle',{cx,cy,r:72,fill:'#fff',stroke:'#c7d1cc','stroke-width':2}))
 const arcs=[[-60,35,'#1e88e5'],[35,110,'#34a853'],[110,225,'#e53935'],[225,300,'#f4c20d']]
 arcs.forEach(([s,e,c])=>svg.appendChild(svgEl('path',{d:arcPath(cx,cy,247,s,e),fill:'none',stroke:c,'stroke-width':16,'stroke-linecap':'butt'})))
 for(let i=0;i<60;i++){
  const deg=i*6,p1=polar(cx,cy,78,deg),p2=polar(cx,cy,232,deg)
  svg.appendChild(svgEl('line',{x1:p1.x,y1:p1.y,x2:p2.x,y2:p2.y,stroke:i%5===0?'#aab4af':'#d8dedb','stroke-width':i%5===0?1.4:.7}))
 }
 for(let d=0;d<=270;d+=30){const deg=220+(d/283)*360,p=polar(cx,cy,260,deg);const t=svgEl('text',{x:p.x,y:p.y,'text-anchor':'middle','dominant-baseline':'middle','font-size':12,fill:'#56615c'});t.textContent=String(d);svg.appendChild(t)}
 const title=svgEl('text',{x:cx,y:cy-7,'text-anchor':'middle','font-size':22,'font-weight':'800',fill:'#245c3b'});title.textContent='Lavoura+';svg.appendChild(title)
 const count=svgEl('text',{x:cx,y:cy+22,'text-anchor':'middle','font-size':14,fill:'#68736e'});count.textContent=`${items.length} animais`;svg.appendChild(count)
 const today=svgEl('text',{x:cx,y:574,'text-anchor':'middle','font-size':12,'font-weight':'700',fill:'#444'});today.textContent='HOJE / PARTO';svg.appendChild(today)
 const used=new Map()
 items.forEach((item,idx)=>{
  let deg=wheelAngle(item.ia)
  if(deg===null)deg=idx*11
  const key=Math.round(deg/3);const stack=used.get(key)||0;used.set(key,stack+1)
  const r=205-stack*13,p=polar(cx,cy,Math.max(110,r),deg)
  const g=svgEl('g',{tabindex:'0',role:'button','aria-label':`${item.animal.number} ${item.animal.name||''}`});g.style.cursor='pointer'
  const dot=svgEl('circle',{cx:p.x,cy:p.y,r:7.5,fill:item.stage.color,stroke:'#fff','stroke-width':2});g.appendChild(dot)
  const text=svgEl('text',{x:p.x+10,y:p.y+4,'font-size':10,'font-weight':'700',fill:'#26332d'});text.textContent=String(item.animal.number);g.appendChild(text)
  g.addEventListener('click',()=>showInfo(host,item));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showInfo(host,item)}})
  svg.appendChild(g)
 })
 const legend=document.createElement('div');legend.className='rw-legend';legend.innerHTML='<span><i style="background:#f4c20d"></i>IA recente</span><span><i style="background:#f39c12"></i>Diagnóstico</span><span><i style="background:#2f80ed"></i>Prenhe</span><span><i style="background:#34a853"></i>Seca</span><span><i style="background:#e53935"></i>Pré-parto / vazia</span>';host.appendChild(legend)
 return host
}

function ensureStyles(){if(document.querySelector('#reproduction-wheel-style'))return;const s=document.createElement('style');s.id='reproduction-wheel-style';s.textContent=`.reproduction-wheel-card{position:relative;overflow:hidden}.rw-subtitle{margin-top:-6px}.rw-wrap{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}.rw-wrap svg{display:block;width:min(100%,620px);min-width:520px;height:auto;margin:0 auto}.rw-legend{display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:12px;font-size:13px;color:#56615c}.rw-legend span{display:flex;align-items:center;gap:6px}.rw-legend i{width:10px;height:10px;border-radius:50%;display:inline-block}.rw-info{position:absolute;left:18px;right:18px;top:90px;background:#fff;border:1px solid #dce5e0;border-radius:16px;padding:16px 42px 16px 16px;box-shadow:0 12px 30px rgba(0,0,0,.16);z-index:5;line-height:1.55}.rw-close{position:absolute;right:9px;top:7px;border:0;background:transparent;font-size:28px;line-height:1;color:#56615c}@media(max-width:620px){.rw-wrap svg{min-width:500px}}`;document.head.appendChild(s)}

let mounting=false
async function mount(){if(mounting)return;const main=document.querySelector('#app main');if(!main||main.querySelector('[data-reproduction-wheel]'))return;const h1=[...main.querySelectorAll('h1')].find(x=>/Reprodução/i.test(x.textContent||''));if(!h1)return;mounting=true;try{ensureStyles();const items=await loadWheelData();const wheel=buildWheel(items);const stats=main.querySelector('.stats-grid');(stats||h1).insertAdjacentElement('afterend',wheel)}finally{mounting=false}}

mount();let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;mount()})}).observe(document.body,{childList:true,subtree:true})
