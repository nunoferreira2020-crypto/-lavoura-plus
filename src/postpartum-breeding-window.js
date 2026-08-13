const FARM_ID='72bb5d54-f614-4394-8da9-7113a8e48a29'
const BREEDING_WINDOW_START=45
const OVERDUE_START=80
const STYLE_ID='postpartum-breeding-window-style'
let cache=null
let cacheAt=0
let queued=false

function dateKey(value){return String(value||'').slice(0,10)}
function parseDate(value){
  if(!value)return null
  const d=new Date(`${dateKey(value)}T12:00:00`)
  return Number.isNaN(d.getTime())?null:d
}
function daysSince(value){
  const d=parseDate(value)
  if(!d)return null
  const now=new Date()
  const today=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12)
  return Math.floor((today.getTime()-d.getTime())/86400000)
}
function esc(value){return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
function formatDate(value){
  const p=dateKey(value).split('-')
  return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:'—'
}
function statusFor(days,hasIaAfterCalving){
  if(days==null||days<0)return {key:'none',label:'—'}
  if(hasIaAfterCalving)return {key:'served',label:'🧬 Nova IA registada'}
  if(days<BREEDING_WINDOW_START)return {key:'recovery',label:`🟢 Recuperação pós-parto · ${days} dias`}
  if(days<OVERDUE_START)return {key:'window',label:`🧬 Janela para nova IA · ${days} dias`}
  return {key:'overdue',label:`🔴 Prioridade reprodutiva · ${days} dias pós-parto`}
}

function ensureStyle(){
  if(document.getElementById(STYLE_ID))return
  const style=document.createElement('style')
  style.id=STYLE_ID
  style.textContent=`
    .postpartum-card{margin-top:14px}
    .postpartum-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:12px 0}
    .postpartum-stat{padding:12px;border-radius:15px;background:#f6f8f6;border:1px solid #e1e7e2}
    .postpartum-stat strong{display:block;font-size:22px;line-height:1.1}.postpartum-stat span{display:block;margin-top:4px;font-size:12px;color:#68756d;font-weight:700}
    .postpartum-list{display:grid;gap:9px;margin-top:10px}.postpartum-row{display:grid;grid-template-columns:1fr auto;gap:10px;padding:11px 12px;border-radius:14px;background:#f8faf8;border:1px solid #e5eae6}
    .postpartum-row.overdue{background:#fff5f5;border-color:#eccccc}.postpartum-row.window{background:#fffaf0;border-color:#ead8a5}
    .postpartum-row strong{display:block}.postpartum-row small{color:#68756d}.postpartum-days{font-weight:900;white-space:nowrap}
    .postpartum-detail{margin-top:12px}.postpartum-detail .status{font-weight:850;margin-top:5px}
    @media(max-width:560px){.postpartum-summary{grid-template-columns:1fr}.postpartum-row{grid-template-columns:1fr}.postpartum-days{justify-self:start}}
  `
  document.head.appendChild(style)
}

async function loadData(){
  if(cache&&Date.now()-cacheAt<30000)return cache
  const sb=window.lavouraSupabase
  if(!sb)return null
  const [animalsRes,reproRes]=await Promise.all([
    sb.from('animals').select('id,number,breed,last_calving_date').eq('farm_id',FARM_ID),
    sb.from('reproduction').select('animal_id,event_type,event_date').eq('farm_id',FARM_ID).eq('event_type','IA').order('event_date',{ascending:false})
  ])
  if(animalsRes.error||reproRes.error)throw animalsRes.error||reproRes.error
  const iaByAnimal=new Map()
  for(const event of reproRes.data||[]){
    const key=String(event.animal_id)
    if(!iaByAnimal.has(key))iaByAnimal.set(key,[])
    iaByAnimal.get(key).push(event)
  }
  const states=[]
  for(const animal of animalsRes.data||[]){
    if(!animal.last_calving_date)continue
    const days=daysSince(animal.last_calving_date)
    if(days==null||days<0)continue
    const ias=iaByAnimal.get(String(animal.id))||[]
    const iaAfterCalving=ias.find(e=>dateKey(e.event_date)>dateKey(animal.last_calving_date))||null
    states.push({animal,days,iaAfterCalving,status:statusFor(days,Boolean(iaAfterCalving))})
  }
  cache=states
  cacheAt=Date.now()
  return states
}

function renderSummary(states){
  const recovery=states.filter(s=>s.status.key==='recovery')
  const window=states.filter(s=>s.status.key==='window')
  const overdue=states.filter(s=>s.status.key==='overdue')
  const attention=[...overdue,...window].sort((a,b)=>b.days-a.days)
  return `
    <section class="card postpartum-card" data-postpartum-summary="1">
      <h2>🐄 Pós-parto e próxima IA</h2>
      <p class="muted">Acompanha vacas sem nova IA depois do último parto.</p>
      <div class="postpartum-summary">
        <div class="postpartum-stat"><strong>${recovery.length}</strong><span>🟢 Em recuperação &lt; ${BREEDING_WINDOW_START} dias</span></div>
        <div class="postpartum-stat"><strong>${window.length}</strong><span>🧬 Janela ${BREEDING_WINDOW_START}–${OVERDUE_START-1} dias</span></div>
        <div class="postpartum-stat"><strong>${overdue.length}</strong><span>🔴 Prioridade ≥ ${OVERDUE_START} dias</span></div>
      </div>
      ${attention.length?`<div class="postpartum-list">${attention.slice(0,12).map(item=>`
        <div class="postpartum-row ${item.status.key}" data-animal="${esc(item.animal.number)}">
          <div><strong>🐄 ${esc(item.animal.number)}</strong><small>${esc(item.animal.breed||'—')} · parto ${formatDate(item.animal.last_calving_date)}</small></div>
          <span class="postpartum-days">${item.days} dias</span>
        </div>`).join('')}</div>`:'<p class="muted">Sem vacas na janela ou em atraso neste momento.</p>'}
      <p class="muted">Limites de gestão desta versão: janela a partir de ${BREEDING_WINDOW_START} dias e prioridade a partir de ${OVERDUE_START} dias. Estes valores podem ser ajustados futuramente nas Definições.</p>
    </section>`
}

function cowNumberFromDetail(main){
  const h=main.querySelector('h1')
  if(!h||!h.innerText.includes('🐄')||main.querySelector('#animalList'))return''
  return h.innerText.match(/🐄\s*([^\s]+)/)?.[1]?.trim()||''
}

async function enhance(){
  ensureStyle()
  const main=document.querySelector('#app main')
  if(!main)return
  const states=await loadData()
  if(!states)return

  if(main.innerText.includes('Reprodução')&&!main.querySelector('[data-postpartum-summary="1"]')){
    const wrapper=document.createElement('div')
    wrapper.innerHTML=renderSummary(states)
    const firstStats=main.querySelector('.stats-grid')
    if(firstStats)firstStats.insertAdjacentElement('afterend',wrapper.firstElementChild)
    else main.prepend(wrapper.firstElementChild)
  }

  const number=cowNumberFromDetail(main)
  if(number&&!main.querySelector('[data-postpartum-detail="1"]')){
    const state=states.find(s=>String(s.animal.number)===number)
    if(state){
      const card=document.createElement('section')
      card.className='card postpartum-detail'
      card.dataset.postpartumDetail='1'
      card.innerHTML=`<h2>🐄 Estado pós-parto</h2><div><strong>${state.days} dias pós-parto</strong></div><div class="status">${state.status.label}</div><p class="muted">Último parto: ${formatDate(state.animal.last_calving_date)}${state.iaAfterCalving?` · nova IA: ${formatDate(state.iaAfterCalving.event_date)}`:''}</p>`
      const reproCard=[...main.querySelectorAll('.card')].find(c=>(c.querySelector('h2')?.innerText||'').toLowerCase().includes('reprodução'))
      if(reproCard)reproCard.insertAdjacentElement('afterend',card)
      else main.appendChild(card)
    }
  }
}

function schedule(){
  if(queued)return
  queued=true
  queueMicrotask(async()=>{queued=false;try{await enhance()}catch(error){console.error('Postpartum breeding window:',error)}})
}
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true})
schedule()

export { daysSince, statusFor, BREEDING_WINDOW_START, OVERDUE_START }
