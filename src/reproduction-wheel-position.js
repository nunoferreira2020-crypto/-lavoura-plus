const RWP_FARM_ID='72bb5d54-f614-4394-8da9-7113a8e48a29'
const RWP_NS='http://www.w3.org/2000/svg'
const RWP_CX=300,RWP_CY=310,RWP_START=180,RWP_TERM=283

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
 const {data:events,error:eErr}=await sb.from('reproduction').select('animal_id,event_type,event_date,result,expected_dry_off,expected_calving,created_at').eq('farm_id',RWP_FARM_ID).in('animal_id',ids)
 if(eErr)return[]
 return animals.map(animal=>{
   const ia=(events||[])
    .filter(e=>e.animal_id===animal.id&&e.event_type==='IA')
    .sort((a,b)=>String(b.event_date||'').localeCompare(String(a.event_date||''))||String(b.created_at||'').localeCompare(String(a.created_at||'')))[0]||null
   let day=ia?.event_date?rwpDays(ia.event_date,rwpToday()):null
   // Se existir uma previsão de parto coerente, ela serve apenas como controlo de consistência.
   // A posição continua baseada na IA mais recente, nunca numa IA antiga.
   if(Number.isFinite(day)&&day<0)day=null
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
 const r=210-(lane*24)
 const p=rwpPolar(r,deg)
 const circle=g.querySelector('circle'),text=g.querySelector('text')
 if(!circle||!text)return
 circle.setAttribute('cx',p.x);circle.setAttribute('cy',p.y)
 const normalized=((deg%360)+360)%360
 const left=normalized>180
 text.setAttribute('x',p.x+(left?-10:10));text.setAttribute('y',p.y+3)
 text.setAttribute('text-anchor',left?'end':'start')
 g.dataset.gestationDay=String(day)
}

function rwpSetUnpositioned(g,index,total){
 // Sem IA válida não inventamos uma data. Mantemos a cor real do estado da vaca
 // e colocamos o ponto junto ao centro, fora da escala temporal.
 const start=330,end=390
 const deg=total<=1?(start+end)/2:start+((end-start)*index/(total-1))
 const lane=index%3
 const p=rwpPolar(118-lane*18,deg)
 const circle=g.querySelector('circle'),text=g.querySelector('text')
 if(!circle||!text)return
 circle.setAttribute('cx',p.x);circle.setAttribute('cy',p.y)
 // Não alterar o fill: elimina o cinzento e conserva PRENHE/SECA/etc.
 const left=((deg%360)+360)%360>180
 text.setAttribute('x',p.x+(left?-10:10));text.setAttribute('y',p.y+3);text.setAttribute('text-anchor',left?'end':'start')
 g.dataset.gestationDay='sem-data'
}

function rwpAssignLanes(items){
 const sorted=[...items].sort((a,b)=>a.day-b.day||String(a.animal.name||'').localeCompare(String(b.animal.name||''),'pt'))
 const recent=[]
 return sorted.map(item=>{
   for(let i=recent.length-1;i>=0;i--){if(item.day-recent[i].day>7)recent.splice(i,1)}
   const used=new Set(recent.map(x=>x.lane))
   let lane=0
   while(used.has(lane)&&lane<6)lane++
   lane=lane%6
   recent.push({day:item.day,lane})
   return{...item,lane}
 })
}

async function organizeReproductionWheel(){
 const svg=document.querySelector('[data-reproduction-wheel] .rw-wrap svg')
 if(!svg||svg.dataset.positionVersion==='3')return
 const data=await rwpData()
 if(!data.length)return
 const valid=data.filter(x=>x.validDay)
 const noDate=data.filter(x=>!x.validDay)
 rwpAssignLanes(valid).forEach(item=>{const g=rwpFindGroup(svg,item);if(g)rwpSetGroupPosition(g,item.day,item.lane)})
 noDate.forEach((item,i)=>{const g=rwpFindGroup(svg,item);if(g)rwpSetUnpositioned(g,i,noDate.length)})
 svg.dataset.positionVersion='3'
}

organizeReproductionWheel()
let rwpQueued=false
new MutationObserver(()=>{if(rwpQueued)return;rwpQueued=true;queueMicrotask(()=>{rwpQueued=false;organizeReproductionWheel()})}).observe(document.body,{childList:true,subtree:true})
