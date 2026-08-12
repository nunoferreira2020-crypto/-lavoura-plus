const SUMMARY_STYLE_ID = 'reproductive-summary-style'
const FARM_ID = '72bb5d54-f614-4394-8da9-7113a8e48a29'

function ensureSummaryStyle() {
  if (document.getElementById(SUMMARY_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = SUMMARY_STYLE_ID
  style.textContent = `
    .repro-summary-card{margin-top:18px;padding:0!important;overflow:hidden}
    .repro-summary-head{background:linear-gradient(135deg,#245c3b,#34754e);color:#fff;padding:18px}
    .repro-summary-head h2{color:#fff;margin:0 0 4px;font-size:20px}.repro-summary-head p{margin:0;color:rgba(255,255,255,.78);font-size:13px}
    .repro-summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;padding:14px 14px 0}
    .repro-summary-item{padding:14px 9px;border-radius:15px;text-align:center;border:1px solid #e3e9e4;background:#fff}
    .repro-summary-value{display:block;font-size:27px;font-weight:900;line-height:1;color:#17231c}
    .repro-summary-label{display:block;margin-top:7px;font-size:11px;font-weight:800;color:#6d786f;line-height:1.25}
    .repro-summary-item.pregnant{background:#edf6f0;border-color:#d9e9de}.repro-summary-item.open{background:#fceeee;border-color:#f2dada}.repro-summary-item.waiting{background:#fff5da;border-color:#f0e3ba}
    .repro-performance{margin:14px;padding:2px 0 0;border-top:1px solid #edf0ed}.repro-performance .detail-row{padding:12px 2px;border-bottom:1px solid #edf0ed}.repro-performance .detail-row:last-child{border-bottom:0}
    .repro-confirmed-list{margin-top:14px}.repro-confirmed-list h2{margin-bottom:5px}.repro-confirmed-row{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px 0;border-top:1px solid #edf0ed}.repro-confirmed-row:first-of-type{border-top:0}.repro-confirmed-main{min-width:0}.repro-confirmed-title{font-weight:850;color:#17231c}.repro-confirmed-meta{font-size:12px;color:#6d786f;margin-top:3px}.repro-badge{display:inline-flex;align-items:center;gap:5px;padding:6px 9px;border-radius:999px;background:#edf6f0;color:#245c3b;font-size:12px;font-weight:850;white-space:nowrap}
    @media (max-width:420px){.repro-summary-grid{gap:7px;padding:12px 12px 0}.repro-summary-item{padding:12px 6px}.repro-summary-value{font-size:24px}.repro-summary-label{font-size:10px}.repro-performance{margin:12px}.repro-confirmed-row{align-items:flex-start}.repro-badge{font-size:11px}}
  `
  document.head.appendChild(style)
}

function normalizeSummaryResult(value) { return String(value || '').trim().toLowerCase() }
function summaryIsPregnant(value) { const result=normalizeSummaryResult(value); return result==='prenhe'||result.includes('positiv') }
function summaryIsOpen(value) { const result=normalizeSummaryResult(value); return result==='vazia'||result.includes('negativ')||result.includes('não prenhe')||result.includes('nao prenhe') }
function isReproductionScreen(main) { const heading=main?.querySelector('h1'); return Boolean(heading&&heading.innerText.includes('Reprodução')) }
function pendingConfirmationCount(main) {
  const section=[...main.querySelectorAll('.card')].find(card=>card.querySelector('h2')?.innerText.toLowerCase().includes('diagnósticos pendentes')||card.querySelector('h2')?.innerText.toLowerCase().includes('confirmações de prenhez pendentes'))
  return section?section.querySelectorAll('.cow-card').length:0
}
function ptDate(value){if(!value)return '—';const [y,m,d]=String(value).slice(0,10).split('-');return y&&m&&d?`${d}/${m}/${y}`:'—'}
function escapeHtml(value){return String(value??'').replace(/[&<>'\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[ch]))}

async function loadReproductiveData(supabase){
  const [iaResponse,animalResponse]=await Promise.all([
    supabase.from('reproduction').select('animal_id,event_type,event_date,result,bull,notes').eq('farm_id',FARM_ID).eq('event_type','IA').order('event_date',{ascending:false}),
    supabase.from('animals').select('id,number').eq('farm_id',FARM_ID)
  ])
  if(iaResponse.error)throw iaResponse.error
  if(animalResponse.error)throw animalResponse.error
  return {all:iaResponse.data||[],animals:animalResponse.data||[]}
}

async function renderReproductiveSummary(main) {
  if (!isReproductionScreen(main)) return
  if (main.dataset.reproductiveSummary === 'loading' || main.dataset.reproductiveSummary === 'done') return
  const supabase=window.lavouraSupabase
  if(!supabase)return
  main.dataset.reproductiveSummary='loading'
  try {
    const {all,animals}=await loadReproductiveData(supabase)
    const animalNumber=new Map(animals.map(a=>[String(a.id),a.number||a.id]))
    const latestByAnimal=new Map()
    for(const record of all){const key=String(record.animal_id);if(!latestByAnimal.has(key))latestByAnimal.set(key,record)}
    const latest=[...latestByAnimal.values()]
    const confirmed=latest.filter(r=>summaryIsPregnant(r.result)).sort((a,b)=>String(b.event_date).localeCompare(String(a.event_date)))
    const openRecords=latest.filter(r=>summaryIsOpen(r.result))
    const pregnant=confirmed.length
    const open=openRecords.length
    const waiting=pendingConfirmationCount(main)
    const diagnosedAll=all.filter(r=>summaryIsPregnant(r.result)||summaryIsOpen(r.result))
    const pregnantAll=diagnosedAll.filter(r=>summaryIsPregnant(r.result)).length
    const conceptionRate=diagnosedAll.length?pregnantAll/diagnosedAll.length*100:null
    const iaPerPregnancy=pregnantAll?all.length/pregnantAll:null
    main.querySelector('[data-reproductive-summary]')?.remove()
    main.querySelector('[data-reproductive-confirmed]')?.remove()
    const summary=document.createElement('section')
    summary.className='card repro-summary-card';summary.dataset.reproductiveSummary='1'
    summary.innerHTML=`
      <div class="repro-summary-head"><h2>Resumo reprodutivo</h2><p>Estado atual do rebanho e desempenho das inseminações.</p></div>
      <div class="repro-summary-grid">
        <div class="repro-summary-item pregnant"><span class="repro-summary-value">${pregnant}</span><span class="repro-summary-label">✅ Prenhes confirmadas</span></div>
        <div class="repro-summary-item waiting"><span class="repro-summary-value">${waiting}</span><span class="repro-summary-label">🩺 A confirmar</span></div>
        <div class="repro-summary-item open"><span class="repro-summary-value">${open}</span><span class="repro-summary-label">❌ Vazias</span></div>
      </div>
      <div class="repro-performance">
        <div class="detail-row"><span>IA registadas</span><strong>${all.length}</strong></div>
        <div class="detail-row"><span>Diagnósticos registados</span><strong>${diagnosedAll.length}</strong></div>
        <div class="detail-row"><span>Taxa de prenhez nos diagnósticos</span><strong>${conceptionRate==null?'—':conceptionRate.toLocaleString('pt-PT',{maximumFractionDigits:1})+'%'}</strong></div>
        <div class="detail-row"><span>IA por prenhez confirmada</span><strong>${iaPerPregnancy==null?'—':iaPerPregnancy.toLocaleString('pt-PT',{maximumFractionDigits:2})}</strong></div>
      </div>
    `
    const stats=main.querySelector('.stats-grid')
    if(stats)stats.insertAdjacentElement('afterend',summary);else main.querySelector('h1')?.insertAdjacentElement('afterend',summary)

    if(confirmed.length){
      const list=document.createElement('section')
      list.className='card repro-confirmed-list';list.dataset.reproductiveConfirmed='1'
      list.innerHTML=`<h2>✅ Prenhes confirmadas</h2><p class="muted">Resultado positivo na IA mais recente.</p>${confirmed.map(r=>`<div class="repro-confirmed-row"><div class="repro-confirmed-main"><div class="repro-confirmed-title">🐄 ${escapeHtml(animalNumber.get(String(r.animal_id))||r.animal_id)}</div><div class="repro-confirmed-meta">IA ${ptDate(r.event_date)}${r.bull?` · Touro: ${escapeHtml(r.bull)}`:''}</div></div><span class="repro-badge">Prenhe</span></div>`).join('')}`
      summary.insertAdjacentElement('afterend',list)
    }
    main.dataset.reproductiveSummary='done'
  } catch(error){console.error('Resumo reprodutivo:',error);main.dataset.reproductiveSummary='error'}
}

function enhanceReproductiveSummary(){ensureSummaryStyle();const main=document.querySelector('#app main');if(main)renderReproductiveSummary(main)}
let summaryQueued=false
function scheduleReproductiveSummary(){if(summaryQueued)return;summaryQueued=true;queueMicrotask(()=>{summaryQueued=false;enhanceReproductiveSummary()})}
new MutationObserver(scheduleReproductiveSummary).observe(document.body,{childList:true,subtree:true})
enhanceReproductiveSummary()
