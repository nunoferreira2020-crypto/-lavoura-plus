const RWP_FARM_ID='72bb5d54-f614-4394-8da9-7113a8e48a29'
const RWP_NS='http://www.w3.org/2000/svg'
const RWP_CX=300,RWP_CY=310,RWP_START=220,RWP_TERM=283

function rwpPolar(r,deg){const a=(deg-90)*Math.PI/180;return{x:RWP_CX+r*Math.cos(a),y:RWP_CY+r*Math.sin(a)}}
function rwpDays(a,b){return Math.round((new Date(`${b}T12:00:00`)-new Date(`${a}T12:00:00`))/86400000)}
function rwpToday(){return new Date().toISOString().slice(0,10)}
function rwpNorm(v){return String(v||'').trim().toLocaleLowerCase('pt-PT')}

async function rwpData(){
 const sb=window.lavouraSupabase
 if(!sb)return[]
 const {data:animals,error:aErr}=await sb.from('animals').select('id,number,name,status').eq('farm_id',RWP_FARM_ID)
 if(aErr||!animals?.length)return[]
 const ids=animals.map(a=>a.id)
 const {data:events,error:eErr}=await sb.from('reproduction').select('animal_id,event_type,event_date,result,expected_dry_off,expected_calving').eq('farm_id',RWP_FARM_ID).in('animal_id',ids)
 if(eErr)return[]
 return animals.map(animal=>{
   const ia=(events||[]).filter(e=>e.animal_id===animal.id&&e.event_type==='IA').sort((a,b)=>String(b.event_date||'').localeCompare(String(a.event_date||'')))[0]||null
   const day=ia?.event_date?rwpDays(ia.event_date,rwpToday()):null
   const validDay=Number.isFinite(day)&&day>=0&&day<=RWP_TERM
   return{animal,ia,day,validDay}
 })
}

function rwpFindGroup(svg,item){
 const target=rwpNorm(item.animal.name||item.animal.number)
 return [...svg.querySelectorAll('g[role="button"][aria-label]')].find(g=>rwpNorm(g.getAttribute('aria-label'))===target)
}

function rwpSetGroupPosition(g,day,lane){
 const deg=RWP_START+(day/RWP_TERM)*360
 const r=208-(lane*25)
 const p=rwpPolar(r,deg)
 const circle=g.querySelector('circle')
 const text=g.querySelector('text')
 if(!circle||!text)return
 circle.setAttribute('cx',p.x);circle.setAttribute('cy',p.y)
 const normalized=((deg%360)+360)%360
 const left=normalized>180
 const tx=p.x+(left?-10:10),ty=p.y+3
 text.setAttribute('x',tx);text.setAttribute('y',ty)
 text.setAttribute('text-anchor',left?'end':'start')
 g.dataset.gestationDay=String(day)
}

function rwpSetReviewPosition(g,index,total){
 // Dados sem uma IA válida não são inventados: ficam num pequeno grupo cinzento de revisão.
 const start=18,end=52
 const deg=total<=1?(start+end)/2:start+((end-start)*index/(total-1))
 const lane=index%3
 const p=rwpPolar(190-lane*25,deg)
 const circle=g.querySelector('circle'),text=g.querySelector('text')
 if(!circle||!text)return
 circle.setAttribute('cx',p.x);circle.setAttribute('cy',p.y);circle.setAttribute('fill','#8a9490')
 const left=((deg%360)+360)%360>180
 text.setAttribute('x',p.x+(left?-10:10));text.setAttribute('y',p.y+3);text.setAttribute('text-anchor',left?'end':'start')
 g.dataset.gestationDay='review'
}

function rwpAssignLanes(items){
 const sorted=[...items].sort((a,b)=>a.day-b.day||String(a.animal.name||'').localeCompare(String(b.animal.name||''),'pt'))
 const recent=[]
 return sorted.map(item=>{
   // Vacas com datas próximas recebem raios diferentes para os nomes não ficarem por cima.
   for(let i=recent.length-1;i>=0;i--){if(item.day-recent[i].day>9)recent.splice(i,1)}
   const used=new Set(recent.map(x=>x.lane))
   let lane=0
   while(used.has(lane)&&lane<5)lane++
   lane=lane%5
   recent.push({day:item.day,lane})
   return{...item,lane}
 })
}

async function organizeReproductionWheel(){
 const svg=document.querySelector('[data-reproduction-wheel] .rw-wrap svg')
 if(!svg||svg.dataset.positionVersion==='2')return
 const data=await rwpData()
 if(!data.length)return
 const valid=data.filter(x=>x.validDay)
 const review=data.filter(x=>!x.validDay)
 rwpAssignLanes(valid).forEach(item=>{const g=rwpFindGroup(svg,item);if(g)rwpSetGroupPosition(g,item.day,item.lane)})
 review.forEach((item,i)=>{const g=rwpFindGroup(svg,item);if(g)rwpSetReviewPosition(g,i,review.length)})
 svg.dataset.positionVersion='2'
}

organizeReproductionWheel()
let rwpQueued=false
new MutationObserver(()=>{if(rwpQueued)return;rwpQueued=true;queueMicrotask(()=>{rwpQueued=false;organizeReproductionWheel()})}).observe(document.body,{childList:true,subtree:true})
