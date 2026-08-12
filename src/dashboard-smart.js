const STYLE_ID='dashboard-smart-style'
const FARM_ID='72bb5d54-f614-4394-8da9-7113a8e48a29'
let busy=false

function ensureStyle(){
  if(document.getElementById(STYLE_ID))return
  const s=document.createElement('style')
  s.id=STYLE_ID
  s.textContent=`
  .smart-dashboard{margin:14px 0 18px}
  .smart-dashboard h2{margin:0 0 10px}
  .smart-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .smart-kpi{background:#fff;border:1px solid rgba(47,111,68,.14);border-radius:16px;padding:13px;box-shadow:0 2px 10px rgba(0,0,0,.035)}
  .smart-kpi span{display:block;font-size:12px;color:#68756d;margin-bottom:3px}
  .smart-kpi strong{font-size:20px;line-height:1.1}
  .smart-alerts{margin-top:12px;background:#fff;border:1px solid rgba(47,111,68,.14);border-radius:16px;padding:13px}
  .smart-alerts-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:8px}
  .smart-alert{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid rgba(0,0,0,.07)}
  .smart-alert:first-of-type{border-top:0}
  .smart-alert-icon{font-size:19px;line-height:1.1}.smart-alert-title{font-weight:800}.smart-alert-text{font-size:13px;color:#68756d;margin-top:2px}.smart-ok{padding:9px 0;color:#356b46;font-weight:700}.smart-mobile-note{font-size:12px;color:#68756d;margin:10px 2px 0}
  @media(max-width:520px){html,body{max-width:100%;overflow-x:hidden}.app{padding-left:max(14px,env(safe-area-inset-left));padding-right:max(14px,env(safe-area-inset-right));padding-bottom:calc(94px + env(safe-area-inset-bottom))}button,input,select,textarea{font-size:16px!important}button{min-height:44px}.card,.cow-card,.hero{border-radius:16px}.cow-card{gap:10px;align-items:flex-start}.cow-card .right{min-width:92px}.bottom-nav{padding-bottom:max(7px,env(safe-area-inset-bottom))}.smart-kpi strong{font-size:19px}}
  `
  document.head.appendChild(s)
}

function isHome(){const main=document.querySelector('#app main.app');if(!main)return false;const text=(main.textContent||'').toLowerCase();return text.includes('lavoura+')&&!text.includes('reprodução')&&!text.includes('finanças')&&!text.includes('análises do leite')&&!text.includes('relatórios')&&!text.includes('definições')}
function dateOnly(v){return v?String(v).slice(0,10):''}
function daysFromToday(v){if(!v)return 99999;const[y,m,d]=dateOnly(v).split('-').map(Number);const now=new Date();const a=new Date(now.getFullYear(),now.getMonth(),now.getDate());const b=new Date(y,m-1,d);return Math.round((b-a)/86400000)}
function ptDate(v){const p=dateOnly(v).split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:'—'}
function n(v,d=0){const x=Number(v);return Number.isFinite(x)?x.toLocaleString('pt-PT',{minimumFractionDigits:d,maximumFractionDigits:d}):'—'}
function resultNorm(v){return String(v||'').trim().toLowerCase()}
function pregnant(v){const x=resultNorm(v);return x==='prenhe'||x.includes('positiv')}
function open(v){const x=resultNorm(v);return x==='vazia'||x.includes('negativ')||x.includes('não prenhe')||x.includes('nao prenhe')}

async function loadData(){
  const sb=window.lavouraSupabase;if(!sb)throw new Error('Supabase indisponível')
  const [animalsR,reproR,milkR,analysisR]=await Promise.all([
    sb.from('animals').select('id,number,status').eq('farm_id',FARM_ID),
    sb.from('reproduction').select('id,animal_id,event_type,event_date,result,expected_dry_off,expected_calving').eq('farm_id',FARM_ID).order('event_date',{ascending:false}),
    sb.from('milk_records').select('record_date,liters,milking_cows,price_per_liter').eq('farm_id',FARM_ID).order('record_date',{ascending:false}).limit(2),
    sb.from('milk_analyses').select('analysis_date,somatic_cells,ufc').eq('farm_id',FARM_ID).order('analysis_date',{ascending:false}).limit(1)
  ])
  if(animalsR.error)throw animalsR.error;if(reproR.error)throw reproR.error
  return{animals:animalsR.data||[],repro:reproR.data||[],milk:milkR.error?[]:(milkR.data||[]),analysis:analysisR.error?null:(analysisR.data||[])[0]||null}
}

function calculate({animals,repro,milk,analysis}){
  const latestIA=new Map();for(const r of repro){if(String(r.event_type).toUpperCase()!=='IA')continue;const k=String(r.animal_id);if(!latestIA.has(k))latestIA.set(k,r)}
  const animalById=new Map(animals.map(a=>[String(a.id),a]));let preg=0,empty=0,pending=0;const alerts=[]
  for(const[animalId,r]of latestIA){const animal=animalById.get(animalId);const number=animal?.number||animalId;if(pregnant(r.result)){preg++;const dry=daysFromToday(r.expected_dry_off),calv=daysFromToday(r.expected_calving);if(dry>=0&&dry<=7)alerts.push({icon:'🟠',title:`Secagem: vaca ${number}`,text:`Prevista para ${ptDate(r.expected_dry_off)} · em ${dry===0?'hoje':dry+' dia(s)'}`});if(calv>=0&&calv<=7)alerts.push({icon:'🔵',title:`Parto: vaca ${number}`,text:`Previsto para ${ptDate(r.expected_calving)} · em ${calv===0?'hoje':calv+' dia(s)'}`})}else if(open(r.result)){empty++;alerts.push({icon:'🔴',title:`Nova IA: vaca ${number}`,text:'Último diagnóstico: VAZIA'})}else{const since=-daysFromToday(r.event_date);if(since>=28){pending++;alerts.push({icon:'🩺',title:`Confirmar prenhez: vaca ${number}`,text:`IA há ${since} dias`})}}}
  const latest=milk[0]||null,prev=milk[1]||null
  if(latest&&prev&&Number(prev.liters)>0){const pct=(Number(latest.liters)-Number(prev.liters))/Number(prev.liters)*100;if(pct<=-8)alerts.push({icon:'🥛',title:'Produção caiu',text:`${Math.abs(pct).toFixed(1).replace('.',',')}% face ao registo anterior`})}
  if(analysis&&Number(analysis.somatic_cells)>=300000)alerts.push({icon:'🧪',title:'Células somáticas elevadas',text:`Última análise: ${n(analysis.somatic_cells,0)}`})
  if(analysis&&Number(analysis.ufc)>=50000)alerts.push({icon:'🧫',title:'UFC elevada',text:`Última análise: ${n(analysis.ufc,0)}`})
  const liters=latest?Number(latest.liters):null,cows=latest?Number(latest.milking_cows):null
  return{total:animals.length,preg,empty,pending,liters,cows,lpc:liters&&cows?liters/cows:null,alerts:alerts.slice(0,8)}
}

function render(data){const main=document.querySelector('#app main.app');if(!main||main.querySelector('.smart-dashboard'))return;const hero=main.querySelector('.hero')||main.querySelector('h1');if(!hero)return;const section=document.createElement('section');section.className='smart-dashboard';const alertHtml=data.alerts.length?data.alerts.map(a=>`<div class="smart-alert"><div class="smart-alert-icon">${a.icon}</div><div><div class="smart-alert-title">${a.title}</div><div class="smart-alert-text">${a.text}</div></div></div>`).join(''):'<div class="smart-ok">✅ Sem prioridades urgentes neste momento.</div>';section.innerHTML=`<h2>Resumo de hoje</h2><div class="smart-kpis"><div class="smart-kpi"><span>Animais</span><strong>${data.total}</strong></div><div class="smart-kpi"><span>Prenhes confirmadas</span><strong>${data.preg}</strong></div><div class="smart-kpi"><span>Por confirmar</span><strong>${data.pending}</strong></div><div class="smart-kpi"><span>Vazias</span><strong>${data.empty}</strong></div><div class="smart-kpi"><span>Última produção</span><strong>${data.liters==null?'—':n(data.liters,0)+' L'}</strong></div><div class="smart-kpi"><span>Litros/vaca</span><strong>${data.lpc==null?'—':n(data.lpc,1)+' L'}</strong></div></div><div class="smart-alerts"><div class="smart-alerts-head"><strong>⚡ Prioridades</strong><span>${data.alerts.length}</span></div>${alertHtml}</div><div class="smart-mobile-note">Os avisos usam apenas os registos desta exploração e a última análise do leite disponível.</div>`;hero.insertAdjacentElement('afterend',section)}

async function enhance(){ensureStyle();if(busy||!isHome()||document.querySelector('.smart-dashboard'))return;busy=true;try{render(calculate(await loadData()))}catch(e){console.error('Dashboard inteligente:',e)}finally{busy=false}}
let queued=false;function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;enhance()})}
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});enhance()
