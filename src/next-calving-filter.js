const FARM_ID='72bb5d54-f614-4394-8da9-7113a8e48a29'
let ready=false
let active=false
let dateByNumber=new Map()

function normalize(value){return String(value||'').trim().toLowerCase()}
function parseDate(value){if(!value)return null;const d=new Date(`${String(value).slice(0,10)}T12:00:00`);return Number.isNaN(d.getTime())?null:d}
function today(){const n=new Date();return new Date(n.getFullYear(),n.getMonth(),n.getDate(),12)}
function daysUntil(value){const d=parseDate(value);return d?Math.round((d-today())/86400000):99999}
function cowNumber(card){return String(card.dataset.id||card.innerText.match(/🐄\s*([^\s]+)/)?.[1]||'').trim()}

async function loadDates(){
  const sb=window.lavouraSupabase
  if(!sb)return
  const [{data:animals,error:animalsError},{data:reproduction,error:reproError}]=await Promise.all([
    sb.from('animals').select('id,number').eq('farm_id',FARM_ID),
    sb.from('reproduction').select('animal_id,event_type,event_date,result,expected_calving').eq('farm_id',FARM_ID).order('event_date',{ascending:false})
  ])
  if(animalsError||reproError){console.error('Próxima parição:',animalsError||reproError);return}
  const eventsByAnimal=new Map()
  for(const e of reproduction||[]){const key=String(e.animal_id);if(!eventsByAnimal.has(key))eventsByAnimal.set(key,[]);eventsByAnimal.get(key).push(e)}
  dateByNumber=new Map()
  for(const animal of animals||[]){
    const latestIA=(eventsByAnimal.get(String(animal.id))||[]).find(e=>e.event_type==='IA')
    const result=normalize(latestIA?.result)
    const pregnant=result==='prenhe'||result.includes('positiv')
    const date=latestIA?.expected_calving
    if(pregnant&&date&&daysUntil(date)>=0)dateByNumber.set(String(animal.number),date)
  }
}

function apply(){
  const main=document.querySelector('#app main')
  const list=main?.querySelector('#animalList')
  const search=main?.querySelector('#animalSearch')
  const tools=main?.querySelector('.herd-tools')
  if(!list||!search||!tools)return
  const cards=[...list.querySelectorAll('.cow-card')]
  if(active){
    cards.sort((a,b)=>daysUntil(dateByNumber.get(cowNumber(a)))-daysUntil(dateByNumber.get(cowNumber(b))))
    let visible=0
    const term=normalize(search.value)
    for(const card of cards){
      list.appendChild(card)
      const number=cowNumber(card)
      const show=dateByNumber.has(number)&&(!term||normalize(card.innerText).includes(term))
      card.style.display=show?'':'none'
      if(show)visible++
    }
    const counter=tools.querySelector('.herd-result-count')
    if(counter)counter.textContent=`${visible} animal${visible===1?'':'ais'} visível${visible===1?'':'eis'}`
  }
}

async function enhance(){
  const main=document.querySelector('#app main')
  const row=main?.querySelector('.herd-filter-row')
  const search=main?.querySelector('#animalSearch')
  if(!row||!search)return
  if(!ready){await loadDates();ready=true}
  if(!row.querySelector('[data-next-calving]')){
    const button=document.createElement('button')
    button.type='button'
    button.className='herd-filter'
    button.dataset.nextCalving='1'
    button.textContent='📅 Próxima parição'
    row.appendChild(button)
    button.addEventListener('click',event=>{
      event.preventDefault()
      active=true
      row.querySelectorAll('.herd-filter').forEach(x=>x.classList.toggle('active',x===button))
      apply()
    })
    row.addEventListener('click',event=>{
      if(event.target.closest('[data-filter]'))active=false
    },true)
    search.addEventListener('input',()=>{if(active)queueMicrotask(apply)},true)
  }
}

let queued=false
function schedule(){if(queued)return;queued=true;queueMicrotask(async()=>{queued=false;try{await enhance()}catch(error){console.error('Filtro próxima parição:',error)}})}
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true})
schedule()
