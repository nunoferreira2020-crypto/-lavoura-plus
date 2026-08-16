const FARM_ID='72bb5d54-f614-4394-8da9-7113a8e48a29'
const NS='http://www.w3.org/2000/svg'
const CX=300,CY=305,TERM=283,START=180
function el(tag,attrs={}){const n=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));return n}
function polar(r,deg){const a=(deg-90)*Math.PI/180;return{x:CX+r*Math.cos(a),y:CY+r*Math.sin(a)}}
function arc(r,s,e){const a=polar(r,s),b=polar(r,e),large=e-s>180?1:0;return`M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`}
function today(){return new Date().toISOString().slice(0,10)}
function days(a,b){return Math.round((new Date(`${b}T12:00:00`)-new Date(`${a}T12:00:00`))/86400000)}
function pt(v){if(!v)return '—';const p=String(v).split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:v}
function latest(ev,type){return ev.filter(x=>x.event_type===type).sort((a,b)=>String(b.event_date||'').localeCompare(String(a.event_date||''))||String(b.created_at||'').localeCompare(String(a.created_at||'')))[0]||null}
function state(item){
 const status=String(item.animal.status||'').trim().toUpperCase()
 const result=String(item.ia?.result||'').trim().toLowerCase()
 const d=item.day
 const toCalving=item.ia?.expected_calving?days(today(),item.ia.expected_calving):null
 if(!Number.isFinite(d)||d<0||d>TERM)return null
 if(status==='VAZIA'||result.includes('vazia')||result.includes('negativ'))return{key:'red',label:'Vazia',color:'#e31b23'}
 if(d<=30)return{key:'recent',label:'IA recente',color:'#ffd900'}
 if(d<=60)return{key:'diag',label:'Diagnóstico',color:'#ff9d00'}
 if(status==='SECA')return{key:'dry',label:'Seca',color:'#4caf50'}
 if(Number.isFinite(toCalving)&&toCalving>=0&&toCalving<=21)return{key:'red',label:'Pré-parto',color:'#e31b23'}
 return{key:'preg',label:'Prenhe',color:'#199ee8'}
}
async function data(){
 const sb=window.lavouraSupabase;if(!sb)return[]
 const{data:animals,error:aErr}=await sb.from('animals').select('id,number,name,status').eq('farm_id',FARM_ID);if(aErr||!animals?.length)return[]
 const ids=animals.map(a=>a.id)
 const{data:events,error:eErr}=await sb.from('reproduction').select('animal_id,event_type,event_date,result,expected_dry_off,expected_calving,created_at').eq('farm_id',FARM_ID).in('animal_id',ids);if(eErr)return[]
 return animals.map(animal=>{const ev=(events||[]).filter(e=>e.animal_id===animal.id);const ia=latest(ev,'IA');const item={animal,ia,day:ia?.event_date?days(ia.event_date,today()):null};item.stage=state(item);return item}).filter(x=>x.stage)
}
function info(host,item){let b=host.querySelector('.rw-info');if(!b){b=document.createElement('div');b.className='rw-info';host.appendChild(b)}b.innerHTML=`<button class="rw-close" type="button">×</button><strong>🐄 ${item.animal.name||item.animal.number}</strong><div>Brinco: ${item.animal.number}</div><div>Estado: ${item.stage.label}</div><div>Última IA: ${pt(item.ia?.event_date)}</div><div>Secagem prevista: ${pt(item.ia?.expected_dry_off)}</div><div>Parto previsto: ${pt(item.ia?.expected_calving)}</div>`;b.querySelector('.rw-close').onclick=()=>b.remove()}
function laneItems(items){const sorted=[...items].sort((a,b)=>a.day-b.day);const active=[];return sorted.map(item=>{for(let i=active.length-1;i>=0;i--)if(item.day-active[i].day>8)active.splice(i,1);const used=new Set(active.map(x=>x.lane));let lane=0;while(used.has(lane)&&lane<6)lane++;lane%=6;active.push({day:item.day,lane});return{...item,lane}})}
function drawWheel(items){
 const host=document.createElement('section');host.className='card reproduction-wheel-card';host.dataset.reproductionWheel='1';host.innerHTML='<div class="rw-card-head"><h2><span class="rw-wheel-icon">◉</span> Roda da Reprodução</h2><p class="muted rw-subtitle">Situação reprodutiva atual do rebanho</p></div>'
 const wrap=document.createElement('div');wrap.className='rw-wrap';host.appendChild(wrap)
 const svg=el('svg',{viewBox:'0 0 600 650',role:'img','aria-label':'Roda da Reprodução'});wrap.appendChild(svg)
 // fundo, anéis e setores inspirados na roda Embrapa
 svg.appendChild(el('circle',{cx:CX,cy:CY,r:236,fill:'#fff',stroke:'#111','stroke-width':'1.8'}))
 const ranges=[[0,30,'#ffd900'],[30,60,'#ff9d00'],[60,220,'#199ee8'],[220,260,'#4caf50'],[260,283,'#e31b23']]
 ranges.forEach(([a,b,c])=>svg.appendChild(el('path',{d:arc(248,START+a/TERM*360,START+b/TERM*360),fill:'none',stroke:c,'stroke-width':'18'})))
 svg.appendChild(el('circle',{cx:CX,cy:CY,r:258,fill:'none',stroke:'#111','stroke-width':'1'}))
 svg.appendChild(el('circle',{cx:CX,cy:CY,r:224,fill:'none',stroke:'#111','stroke-width':'1'}))
 // raios finos, semelhantes à referência
 for(let d=0;d<TERM;d+=7){const deg=START+d/TERM*360,p1=polar(67,deg),p2=polar(235,deg);svg.appendChild(el('line',{x1:p1.x,y1:p1.y,x2:p2.x,y2:p2.y,stroke:d%28===0?'#222':'#6f7773','stroke-width':d%28===0?'1.15':'.65'}))}
 // escala de gestação: 0 e 283 coincidem em baixo
 for(let d=0;d<=270;d+=30){const deg=START+d/TERM*360,p1=polar(258,deg),p2=polar(269,deg);svg.appendChild(el('line',{x1:p1.x,y1:p1.y,x2:p2.x,y2:p2.y,stroke:'#111','stroke-width':'1.5'}));const p=polar(279,deg),t=el('text',{x:p.x,y:p.y+3,'text-anchor':'middle','font-size':'10','font-weight':'700',fill:'#222'});t.textContent=String(d);svg.appendChild(t)}
 // centro pequeno, como a roda de referência
 svg.appendChild(el('circle',{cx:CX,cy:CY,r:62,fill:'#fff',stroke:'#111','stroke-width':'1.7'}))
 const brand=el('text',{x:CX,y:CY-4,'text-anchor':'middle','font-size':'21','font-weight':'900',fill:'#245c3b'});brand.textContent='Lavoura+';svg.appendChild(brand)
 const count=el('text',{x:CX,y:CY+20,'text-anchor':'middle','font-size':'12',fill:'#59645f'});count.textContent=`${items.length} animais`;svg.appendChild(count)
 // animais: posição exclusivamente pelos dias desde a IA mais recente
 laneItems(items).forEach(item=>{const deg=START+item.day/TERM*360,r=212-item.lane*24,p=polar(r,deg);const g=el('g',{role:'button',tabindex:'0','aria-label':item.animal.name||item.animal.number});g.style.cursor='pointer';g.appendChild(el('circle',{cx:p.x,cy:p.y,r:'7',fill:item.stage.color,stroke:'#111','stroke-width':'1'}));const left=((deg%360)+360)%360>180;const text=el('text',{x:p.x+(left?-9:9),y:p.y+3,'text-anchor':left?'end':'start','font-size':'8.7','font-weight':'700',fill:'#111'});let label=(item.animal.name||String(item.animal.number)).trim();if(label.length>12)label=label.slice(0,11)+'…';text.textContent=label;g.appendChild(text);g.onclick=()=>info(host,item);g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();info(host,item)}};svg.appendChild(g)})
 // TODAY CALVING / HOJE PARTO exactamente em baixo ao centro
 const todayText=el('text',{x:CX,y:598,'text-anchor':'middle','font-size':'11','font-weight':'900',fill:'#111'});todayText.textContent='HOJE';svg.appendChild(todayText)
 const calvingText=el('text',{x:CX,y:613,'text-anchor':'middle','font-size':'11','font-weight':'900',fill:'#111'});calvingText.textContent='PARTO';svg.appendChild(calvingText)
 const term=el('text',{x:CX,y:629,'text-anchor':'middle','font-size':'10','font-weight':'800',fill:'#e31b23'});term.textContent='283';svg.appendChild(term)
 const legend=document.createElement('div');legend.className='rw-legend';legend.innerHTML='<span><i style="background:#ffd900"></i>IA recente</span><span><i style="background:#ff9d00"></i>Diagnóstico</span><span><i style="background:#199ee8"></i>Prenhe</span><span><i style="background:#4caf50"></i>Seca</span><span><i style="background:#e31b23"></i>Pré-parto / vazia</span>';host.appendChild(legend)
 return host
}
function summary(items){const c={recent:0,diag:0,preg:0,dry:0,red:0};items.forEach(x=>c[x.stage.key]++);const s=document.createElement('section');s.className='rw-summary';s.innerHTML=`<div><b style="color:#e5ae00">${c.recent+c.diag}</b><span>IA / diagnóstico</span></div><div><b style="color:#199ee8">${c.preg}</b><span>Prenhes</span></div><div><b style="color:#4caf50">${c.dry}</b><span>Secas</span></div><div><b style="color:#e31b23">${c.red}</b><span>Pré-parto / vazias</span></div>`;return s}
function styles(){if(document.querySelector('#reproduction-wheel-style'))return;const s=document.createElement('style');s.id='reproduction-wheel-style';s.textContent=`.reproduction-wheel-card{position:relative;overflow:hidden}.rw-card-head h2{display:flex;align-items:center;gap:8px;margin:0 0 4px}.rw-wheel-icon{display:inline-grid;place-items:center;width:28px;height:28px;border:4px solid #199ee8;border-right-color:#4caf50;border-bottom-color:#e31b23;border-left-color:#ffd900;border-radius:50%;font-size:10px;color:#ffd900}.rw-subtitle{margin:0 0 8px}.rw-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0}.rw-summary>div{background:#fff;border:1px solid #e2e8e4;border-radius:14px;padding:10px 5px;text-align:center;box-shadow:0 3px 10px rgba(0,0,0,.05)}.rw-summary b{display:block;font-size:23px}.rw-summary span{display:block;font-size:11px;color:#65716b}.rw-wrap{width:100%;overflow:hidden}.rw-wrap svg{display:block;width:100%;max-width:650px;height:auto;margin:0 auto}.rw-legend{display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:4px;padding:0 6px;font-size:12px;color:#4f5954}.rw-legend span{display:flex;align-items:center;gap:6px}.rw-legend i{width:10px;height:10px;border-radius:50%;display:inline-block;border:1px solid rgba(0,0,0,.25)}.rw-info{position:absolute;left:18px;right:18px;top:90px;background:#fff;border:1px solid #dce5e0;border-radius:16px;padding:16px 42px 16px 16px;box-shadow:0 12px 30px rgba(0,0,0,.16);z-index:5;line-height:1.55}.rw-close{position:absolute;right:9px;top:7px;border:0;background:transparent;font-size:28px;color:#56615c}@media(max-width:620px){.reproduction-wheel-card{padding-left:5px!important;padding-right:5px!important}.rw-wrap svg{width:100%}.rw-summary{gap:5px}.rw-summary>div{padding:8px 2px}.rw-summary b{font-size:20px}.rw-summary span{font-size:10px}}`;document.head.appendChild(s)}
function icon(main){const h1=[...main.querySelectorAll('h1')].find(x=>/Reprodução/i.test(x.textContent||''));if(h1&&!h1.dataset.wheelIcon){h1.dataset.wheelIcon='1';h1.innerHTML='<span class="rw-wheel-icon">◉</span> Reprodução'}return h1}
let mounting=false
async function mount(){if(mounting)return;const main=document.querySelector('#app main');if(!main)return;styles();const h1=icon(main);if(!h1||main.querySelector('[data-reproduction-wheel]'))return;mounting=true;try{const items=await data();const old=main.querySelector('.stats-grid');if(old)old.style.display='none';const s=summary(items);h1.insertAdjacentElement('afterend',s);s.insertAdjacentElement('afterend',drawWheel(items))}finally{mounting=false}}
mount();let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;mount()})}).observe(document.body,{childList:true,subtree:true})
