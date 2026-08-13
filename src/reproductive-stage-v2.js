const FARM_ID='72bb5d54-f614-4394-8da9-7113a8e48a29'
const STYLE_ID='reproductive-stage-v2-style'
let queued=false

function ensureStyle(){
  if(document.getElementById(STYLE_ID))return
  const style=document.createElement('style')
  style.id=STYLE_ID
  style.textContent=`
    .repro-stage{display:inline-flex;align-items:center;margin-top:8px;padding:5px 9px;border-radius:999px;background:#edf5ee;color:#245f38;font-size:12px;font-weight:800}
    .repro-stage.wait{background:#fff7df;color:#7b5b00}.repro-stage.pregnant{background:#e8f4ec;color:#23633a}.repro-stage.dry{background:#fff0df;color:#8a4e00}.repro-stage.calving{background:#eaf2ff;color:#285b9a}.repro-stage.open{background:#f6ecec;color:#8b3333}
    .pregnancy-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px;width:100%}.pregnancy-actions button{margin:0;padding:12px 10px;border-radius:14px;font-size:15px;font-weight:800}.pregnancy-actions .pregnant-btn{background:#2f7d46;color:#fff;border:0}.pregnancy-actions .open-btn{background:#fff1f1;color:#8b3333;border:1px solid #e7baba}.pregnancy-actions button:disabled{opacity:.55}
  `
  document.head.appendChild(style)
}

function norm(v){return String(v||'').trim().toLowerCase()}
function isPregnant(v){const n=norm(v);return n==='prenhe'||n.includes('positiv')}
function isOpen(v){const n=norm(v);return n==='vazia'||n.includes('negativ')||n.includes('não prenhe')||n.includes('nao prenhe')}
function cowNumber(card){return card.innerText.match(/🐄\s*([^\s]+)/)?.[1]?.trim()||''}
function findSection(main,fragment){return [...main.querySelectorAll('.card')].find(section=>norm(section.querySelector('h2')?.innerText).includes(fragment))}
function updateStat(main,label,value){const stat=[...main.querySelectorAll('.stat-card')].find(card=>norm(card.innerText).includes(label));const number=stat?.querySelector('.stat-number');if(number)number.textContent=String(value)}

function stageFor(card,title){
  const text=norm(card.innerText)
  if(title.includes('diagnóst')||title.includes('confirma'))return['🩺 Prenhez por confirmar','wait']
  if(title.includes('secagens'))return['🟠 Prenhe · secagem prevista','dry']
  if(title.includes('partos'))return['🔵 Prenhe · parto previsto','calving']
  if(title.includes('últimas ia')){
    if(text.includes('resultado:')&&text.includes('prenhe'))return['✅ Prenhe confirmada','pregnant']
    if(text.includes('vazia')||text.includes('negativ'))return['↻ Vazia · nova IA necessária','open']
    return['🧬 Inseminada · aguarda confirmação','wait']
  }
  return null
}

function enhanceStages(main){
  main.querySelectorAll('.card').forEach(section=>{
    const title=norm(section.querySelector('h2')?.innerText)
    if(!title)return
    section.querySelectorAll('.cow-card').forEach(card=>{
      if(card.querySelector('.repro-stage'))return
      const stage=stageFor(card,title);if(!stage)return
      const badge=document.createElement('div');badge.className=`repro-stage ${stage[1]}`;badge.textContent=stage[0];(card.firstElementChild||card).appendChild(badge)
    })
  })
}

async function saveDiagnosis(number,result,buttons){
  const sb=window.lavouraSupabase
  if(!sb||!number)return
  if(!window.confirm(`Confirmar vaca ${number} como ${result.toUpperCase()}?`))return
  buttons.forEach(b=>b.disabled=true)
  try{
    const animal=await sb.from('animals').select('id,number').eq('farm_id',FARM_ID).eq('number',number).limit(1).maybeSingle()
    if(animal.error||!animal.data)throw animal.error||new Error('Vaca não encontrada.')
    const ia=await sb.from('reproduction').select('id,event_date,expected_calving,expected_dry_off').eq('farm_id',FARM_ID).eq('animal_id',animal.data.id).eq('event_type','IA').order('event_date',{ascending:false}).limit(1).maybeSingle()
    if(ia.error||!ia.data)throw ia.error||new Error('IA não encontrada.')
    const payload=result==='Vazia'?{result,expected_calving:null,expected_dry_off:null}:{result}
    const update=await sb.from('reproduction').update(payload).eq('farm_id',FARM_ID).eq('id',ia.data.id)
    if(update.error)throw update.error
    window.alert(`✅ Diagnóstico guardado: ${result}`)
    window.location.reload()
  }catch(error){console.error('Diagnóstico direto:',error);window.alert('Não foi possível guardar o diagnóstico. Tente novamente.');buttons.forEach(b=>b.disabled=false)}
}

function addDiagnosisButtons(main){
  const section=findSection(main,'confirmações de prenhez')||findSection(main,'diagnósticos pendentes')
  if(!section)return
  section.querySelectorAll('.cow-card').forEach(card=>{
    if(card.querySelector('.pregnancy-actions'))return
    const number=cowNumber(card);if(!number)return
    const actions=document.createElement('div');actions.className='pregnancy-actions';actions.innerHTML='<button type="button" class="pregnant-btn">✅ Prenhe</button><button type="button" class="open-btn">❌ Vazia</button>'
    const buttons=[...actions.querySelectorAll('button')]
    actions.addEventListener('click',e=>{e.preventDefault();e.stopPropagation()})
    actions.querySelector('.pregnant-btn').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();saveDiagnosis(number,'Prenhe',buttons)})
    actions.querySelector('.open-btn').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();saveDiagnosis(number,'Vazia',buttons)})
    ;(card.firstElementChild||card).appendChild(actions)
  })
}

async function syncConfirmed(main){
  if(main.dataset.pregnancyFiltered)return
  const sb=window.lavouraSupabase;if(!sb)return
  main.dataset.pregnancyFiltered='loading'
  try{
    const [animals,repro]=await Promise.all([
      sb.from('animals').select('id,number').eq('farm_id',FARM_ID),
      sb.from('reproduction').select('id,animal_id,event_type,event_date,result,expected_calving,expected_dry_off').eq('farm_id',FARM_ID).eq('event_type','IA').order('event_date',{ascending:false})
    ])
    if(animals.error||repro.error)throw animals.error||repro.error
    const numberById=new Map((animals.data||[]).map(a=>[String(a.id),String(a.number)]))
    const latest=new Map();for(const r of repro.data||[]){const key=String(r.animal_id);if(!latest.has(key))latest.set(key,r)}
    const confirmed=new Set();let dry=0,calving=0
    const stale=[]
    for(const [id,r] of latest){const number=numberById.get(id);if(!number)continue;if(isPregnant(r.result)){confirmed.add(number);if(r.expected_dry_off)dry++;if(r.expected_calving)calving++}else if(isOpen(r.result)&&(r.expected_dry_off||r.expected_calving))stale.push(r.id)}
    if(stale.length)await Promise.all(stale.map(id=>sb.from('reproduction').update({expected_dry_off:null,expected_calving:null}).eq('farm_id',FARM_ID).eq('id',id)))
    const drySection=findSection(main,'secagens'),calvingSection=findSection(main,'partos')
    for(const section of [drySection,calvingSection]){if(!section)continue;section.querySelectorAll('.cow-card').forEach(card=>{const number=cowNumber(card);if(number&&!confirmed.has(number))card.remove()})}
    updateStat(main,'secagens',dry);updateStat(main,'partos',calving);main.dataset.pregnancyFiltered='done'
  }catch(error){console.error('Filtro de prenhez:',error);main.dataset.pregnancyFiltered='error'}
}

async function addOpenPriorities(main){
  if(main.dataset.openCowPriorities)return
  const heading=[...main.querySelectorAll('h2')].find(h=>norm(h.innerText)==='prioridades');if(!heading)return
  const sb=window.lavouraSupabase;if(!sb)return
  main.dataset.openCowPriorities='loading'
  try{
    const [animals,repro]=await Promise.all([
      sb.from('animals').select('id,number,breed').eq('farm_id',FARM_ID),
      sb.from('reproduction').select('id,animal_id,event_type,event_date,result').eq('farm_id',FARM_ID).eq('event_type','IA').order('event_date',{ascending:false})
    ])
    if(animals.error||repro.error)throw animals.error||repro.error
    const animalById=new Map((animals.data||[]).map(a=>[String(a.id),a]));const latest=new Map();for(const r of repro.data||[]){const key=String(r.animal_id);if(!latest.has(key))latest.set(key,r)}
    const open=[];for(const [id,r] of latest){if(!isOpen(r.result))continue;const animal=animalById.get(id);if(animal)open.push({animal,r})}
    open.sort((a,b)=>String(a.animal.number).localeCompare(String(b.animal.number),undefined,{numeric:true}))
    for(const item of [...open].reverse()){
      const number=String(item.animal.number);if(main.querySelector(`[data-open-cow="${CSS.escape(number)}"]`))continue
      const card=document.createElement('section');card.className='cow-card alerta open-cow-priority';card.dataset.action='detalhe';card.dataset.id=number;card.dataset.voltar='inicio';card.dataset.openCow=number
      const date=String(item.r.event_date||'').slice(0,10).split('-').reverse().join('/')||'—'
      card.innerHTML=`<div><strong>🔴 Nova IA necessária</strong><div>🐄 ${number}</div><div class="muted">${item.animal.breed||'—'}</div></div><div class="right"><strong>${date}</strong><div class="open-priority-label">VAZIA</div><div class="muted">REINSEMINAR</div></div>`
      heading.insertAdjacentElement('afterend',card)
    }
    main.dataset.openCowPriorities='done'
  }catch(error){console.error('Prioridades de vacas vazias:',error);main.dataset.openCowPriorities='error'}
}

async function enhance(){
  ensureStyle();const main=document.querySelector('#app main');if(!main)return
  if(main.innerText.includes('Reprodução')){enhanceStages(main);addDiagnosisButtons(main);await syncConfirmed(main)}
  await addOpenPriorities(main)
}
function schedule(){if(queued)return;queued=true;queueMicrotask(async()=>{queued=false;await enhance()})}
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});schedule()
