const FARM_ID='72bb5d54-f614-4394-8da9-7113a8e48a29'
const PANEL_ID='diagnosticos-muito-atrasados'
let loading=false

function dateOnly(value){
  if(!value)return null
  const d=new Date(`${value}T00:00:00`)
  return Number.isNaN(d.getTime())?null:d
}

function daysSince(value){
  const d=dateOnly(value)
  if(!d)return null
  const now=new Date()
  const today=new Date(now.getFullYear(),now.getMonth(),now.getDate())
  return Math.floor((today-d)/86400000)
}

function hasResult(value){
  return Boolean(String(value||'').trim())
}

function currentScreen(){
  const title=document.querySelector('#app main h1')?.textContent?.trim()||''
  if(title.includes('Reprodução'))return 'reproducao'
  if(title==='📋 Hoje'||title.endsWith('Hoje'))return 'hoje'
  return null
}

async function loadOverdue(){
  const screen=currentScreen()
  if(!screen)return
  const main=document.querySelector('#app main')
  if(!main||main.querySelector(`#${PANEL_ID}`)||loading)return
  const sb=window.lavouraSupabase
  if(!sb)return
  loading=true
  try{
    const [{data:animals,error:animalsError},{data:events,error:eventsError}]=await Promise.all([
      sb.from('animals').select('id,number,name,breed').eq('farm_id',FARM_ID),
      sb.from('reproduction').select('id,animal_id,event_type,event_date,result').eq('farm_id',FARM_ID).order('event_date',{ascending:false})
    ])
    if(animalsError||eventsError)return

    const animalById=new Map((animals||[]).map(a=>[a.id,a]))
    const grouped=new Map()
    for(const event of events||[]){
      if(!grouped.has(event.animal_id))grouped.set(event.animal_id,[])
      grouped.get(event.animal_id).push(event)
    }

    const overdue=[]
    for(const [animalId,list] of grouped){
      const ia=list.find(e=>e.event_type==='IA')
      if(!ia||hasResult(ia.result))continue
      const parto=list.find(e=>e.event_type==='PARTO')
      if(parto&&String(parto.event_date)>=String(ia.event_date))continue
      const dias=daysSince(ia.event_date)
      if(dias===null||dias<=60)continue
      const animal=animalById.get(animalId)
      if(!animal)continue
      overdue.push({animal,ia,dias})
    }

    if(!overdue.length)return
    overdue.sort((a,b)=>b.dias-a.dias)
    const panel=document.createElement('section')
    panel.id=PANEL_ID
    panel.className='card'
    panel.innerHTML=`
      <h2>🩺 Diagnósticos muito atrasados</h2>
      <p class="muted">IA sem diagnóstico há mais de 60 dias.</p>
      ${overdue.map(({animal,ia,dias})=>`
        <section class="cow-card alerta" data-action="detalhe" data-id="${String(animal.number||'').replaceAll('"','&quot;')}" data-voltar="${screen}">
          <div>
            <strong>🐄 ${animal.number}${animal.name?` — ${animal.name}`:''}</strong>
            <div class="muted">IA: ${String(ia.event_date).split('-').reverse().join('/')}</div>
            <div class="muted">${animal.breed||'—'}</div>
          </div>
          <div class="right">
            <strong>${dias} dias após IA</strong>
            <div class="urgente">MUITO ATRASADO</div>
          </div>
        </section>
      `).join('')}
    `
    const firstCard=main.querySelector('.card')
    if(firstCard?.parentNode){
      firstCard.parentNode.insertBefore(panel,firstCard.nextSibling)
    }else{
      main.appendChild(panel)
    }
  }finally{
    loading=false
  }
}

let queued=false
function schedule(){
  if(queued)return
  queued=true
  queueMicrotask(()=>{
    queued=false
    loadOverdue().catch(error=>console.error('Diagnósticos atrasados:',error))
  })
}

schedule()
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true})
