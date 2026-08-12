const STYLE_ID='dashboard-smart-style'
const FARM_ID='72bb5d54-f614-4394-8da9-7113a8e48a29'
let busy=false

function ensureStyle(){
  if(document.getElementById(STYLE_ID))return
  const s=document.createElement('style')
  s.id=STYLE_ID
  s.textContent=`
  .smart-dashboard{margin:16px 0 22px;display:grid;gap:14px}
  .smart-overview{background:linear-gradient(145deg,#245c3b,#32724d);color:#fff;border-radius:22px;padding:18px;box-shadow:0 10px 28px rgba(36,92,59,.18)}
  .smart-overview-top{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:16px}
  .smart-eyebrow{font-size:12px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;opacity:.78}
  .smart-overview h2{margin:3px 0 0;color:#fff;font-size:24px}
  .smart-date{font-size:12px;font-weight:750;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.15);padding:7px 9px;border-radius:999px;white-space:nowrap}
  .smart-primary-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .smart-primary{background:rgba(255,255,255,.11);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:13px}
  .smart-primary span{display:block;font-size:12px;opacity:.8;margin-bottom:4px}
  .smart-primary strong{display:block;font-size:24px;line-height:1.05;color:#fff;letter-spacing:-.03em}
  .smart-card{background:#fff;border:1px solid #e1e7e2;border-radius:18px;padding:15px;box-shadow:0 3px 14px rgba(24,53,35,.06)}
  .smart-section-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:8px}
  .smart-section-title{font-size:16px;font-weight:850;color:#17231c}.smart-count{font-size:12px;font-weight:800;color:#6d786f;background:#f1f4f2;padding:5px 8px;border-radius:999px}
  .smart-alert{display:flex;gap:11px;align-items:flex-start;padding:11px 0;border-top:1px solid #edf0ed}
  .smart-alert:first-of-type{border-top:0}.smart-alert-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:11px;background:#f3f6f4;font-size:18px;flex:0 0 auto}.smart-alert-title{font-weight:800;color:#17231c}.smart-alert-text{font-size:13px;color:#6d786f;margin-top:2px;line-height:1.35}.smart-ok{padding:8px 0;color:#245c3b;font-weight:750}
  .smart-secondary-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.smart-metric{background:#fff;border:1px solid #e1e7e2;border-radius:16px;padding:13px}.smart-metric span{display:block;font-size:12px;color:#6d786f;margin-bottom:4px}.smart-metric strong{font-size:20px;letter-spacing:-.025em}.smart-metric small{display:block;margin-top:4px;color:#8a948d;font-size:11px}
  .smart-repro{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.smart-repro-item{padding:11px 9px;border-radius:14px;background:#f7f9f7;text-align:center}.smart-repro-item strong{display:block;font-size:21px}.smart-repro-item span{display:block;font-size:11px;color:#6d786f;margin-top:3px;font-weight:700}
  .smart-mobile-note{font-size:11px;color:#7a857d;margin:0 2px;line-height:1.4}
  @media(max-width:520px){html,body{max-width:100%;overflow-x:hidden}.app{padding-left:max(14px,env(safe-area-inset-left));padding-right:max(14px,env(safe-area-inset-right));padding-bottom:calc(94px + env(safe-area-inset-bottom))}.smart-overview{border-radius:20px;padding:16px}.smart-overview h2{font-size:22px}.smart-primary strong{font-size:22px}.smart-secondary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.smart-repro{grid-template-columns:repeat(3,minmax(0,1fr))}.smart-repro-item{padding:10px 5px}.smart-repro-item strong{font-size:19px}.smart-repro-item span{font-size:10px}button,input,select,textarea{font-size:16px!important}button{min-height:44px}.card,.cow-card,.hero{border-radius:16px}.cow-card{gap:10px;align-items:flex-start}.cow-card .right{min-width:92px}.bottom-nav{padding-bottom:max(7px,env(safe-area-inset-bottom))}}
  `
  document.head.appendChild(s)
}

function isHome(){const main=document.querySelector('#app main.app');if(!main)return false;const text=(main.textContent||'').toLowerCase();return text.includes('lavoura+')&&!text.includes('reprodução')&&!text.includes('finanças')&&!text.includes('análises do leite')&&!text.includes('relatórios')&&!text.includes('definições')}
function dateOnly(v){return v?String(v).slice(0,10):''}
function daysFromToday(v){if(!v)return 99999;const[y,m,d]=dateOnly(v).split('-').map(Number);const now=new Date();const a=new Date(now.getFullYear(),now.getMonth(),now.getDate());const b=new Date(y,m-1,d);return Math.round((b-a)/86400000)}
function ptDate(v){const p=dateOnly(v).split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:'—'}
function todayPt(){return new Date().toLocaleDateString('pt-PT',{day:'2-digit',month:'short'})}
function n(v,d=0){const x=Number(v);return Number.isFinite(x)?x.toLocaleString('pt-PT',{minimumFractionDigits:d,maximumFractionDigits:d}):'—'}
function resultNorm(v){return String(v||'').trim().toLowerCase()}
function pregnant(v){const x=resultNorm(v);return x==='prenhe'||x.includes('positiv')}
function open(v){const x=resultNorm(v);return x==='vazia'||x.includes('negativ')||x.includes('não prenhe')||x.includes('nao prenhe')}
function timingText(days){if(days===0)return 'hoje';if(days>0)return `em ${days} dia(s)`;return `${Math.abs(days)} dia(s) atrasado`}

async function loadData(){
  const sb=window.lavouraSupabase;if(!sb)throw new Error('Supabase indisponível')
  const [animalsR,reproR,milkR,analysisR]=await Promise.all([
    sb.from('animals').select('id,number,status').eq('farm_id',FARM_ID),
    sb.from('reproduction').select('id,animal_id,event_type,event_date,result,expected_dry_off,expected_calving').eq('farm_id',FARM_ID).order('event_date',{ascending:false}),
    sb.from('milk_records').select('record_date,liters,milking_cows,price_per_liter').eq('farm_id',FARM_ID).order('record_date',{ascending:false}).limit(2),
    sb.from('milk_analyses').select('analysis_date,somatic_cells,cfu').eq('farm_id',FARM_ID).order('analysis_date',{ascending:false}).limit(1)
  ])
  if(animalsR.error)throw animalsR.error;if(reproR.error)throw reproR.error
  return{animals:animalsR.data||[],repro:reproR.data||[],milk:milkR.error?[]:(milkR.data||[]),analysis:analysisR.error?null:(analysisR.data||[])[0]||null}
}

function calculate({animals,repro,milk,analysis}){
  const latestIA=new Map();for(const r of repro){if(String(r.event_type).toUpperCase()!=='IA')continue;const k=String(r.animal_id);if(!latestIA.has(k))latestIA.set(k,r)}
  const animalById=new Map(animals.map(a=>[String(a.id),a]));let preg=0,empty=0,pending=0;const alerts=[]
  for(const[animalId,r]of latestIA){
    const animal=animalById.get(animalId);const number=animal?.number||animalId
    if(pregnant(r.result)){
      preg++
      const dry=daysFromToday(r.expected_dry_off),calv=daysFromToday(r.expected_calving)
      if(dry>=-7&&dry<=7)alerts.push({icon:'🟠',title:`Secagem · vaca ${number}`,text:`${ptDate(r.expected_dry_off)} · ${timingText(dry)}`})
      if(calv>=-7&&calv<=7)alerts.push({icon:'🔵',title:`Parto · vaca ${number}`,text:`${ptDate(r.expected_calving)} · ${timingText(calv)}`})
    }else if(open(r.result)){
      empty++;alerts.push({icon:'🔴',title:`Nova IA · vaca ${number}`,text:'Último diagnóstico: VAZIA'})
    }else{
      const since=-daysFromToday(r.event_date);if(since>=28){pending++;alerts.push({icon:'🩺',title:`Confirmar prenhez · vaca ${number}`,text:`IA há ${since} dias`})}
    }
  }
  const latest=milk[0]||null,prev=milk[1]||null
  if(latest&&prev&&Number(prev.liters)>0){const pct=(Number(latest.liters)-Number(prev.liters))/Number(prev.liters)*100;if(pct<=-8)alerts.push({icon:'🥛',title:'Produção caiu',text:`${Math.abs(pct).toFixed(1).replace('.',',')}% face ao registo anterior`})}
  if(analysis&&Number(analysis.somatic_cells)>=300)alerts.push({icon:'🧪',title:'Células somáticas elevadas',text:`Última análise: ${n(analysis.somatic_cells,0)} ×1000`})
  if(analysis&&Number(analysis.cfu)>=50)alerts.push({icon:'🧫',title:'UFC elevada',text:`Última análise: ${n(analysis.cfu,0)} ×1000`})
  const liters=latest?Number(latest.liters):null,cows=latest?Number(latest.milking_cows):null,price=latest?Number(latest.price_per_liter):null
  alerts.sort((a,b)=>Number(b.text.includes('atrasado'))-Number(a.text.includes('atrasado')))
  return{total:animals.length,preg,empty,pending,liters,cows,price,lpc:liters&&cows?liters/cows:null,revenue:liters&&price?liters*price:null,alerts:alerts.slice(0,6)}
}

function render(data){
  const main=document.querySelector('#app main.app');if(!main||main.querySelector('.smart-dashboard'))return
  const hero=main.querySelector('.hero')||main.querySelector('h1');if(!hero)return
  const section=document.createElement('section');section.className='smart-dashboard'
  const alertHtml=data.alerts.length?data.alerts.map(a=>`<div class="smart-alert"><div class="smart-alert-icon">${a.icon}</div><div><div class="smart-alert-title">${a.title}</div><div class="smart-alert-text">${a.text}</div></div></div>`).join(''):'<div class="smart-ok">✅ Sem prioridades urgentes neste momento.</div>'
  section.innerHTML=`
    <section class="smart-overview">
      <div class="smart-overview-top"><div><div class="smart-eyebrow">Exploração</div><h2>Resumo de hoje</h2></div><div class="smart-date">${todayPt()}</div></div>
      <div class="smart-primary-grid">
        <div class="smart-primary"><span>Produção</span><strong>${data.liters==null?'—':n(data.liters,0)+' L'}</strong></div>
        <div class="smart-primary"><span>Litros/vaca</span><strong>${data.lpc==null?'—':n(data.lpc,1)+' L'}</strong></div>
        <div class="smart-primary"><span>Animais</span><strong>${data.total}</strong></div>
        <div class="smart-primary"><span>Receita do leite</span><strong>${data.revenue==null?'—':n(data.revenue,2)+' €'}</strong></div>
      </div>
    </section>

    <section class="smart-card">
      <div class="smart-section-head"><div class="smart-section-title">⚡ Prioridades</div><div class="smart-count">${data.alerts.length}</div></div>
      ${alertHtml}
    </section>

    <section class="smart-card">
      <div class="smart-section-head"><div class="smart-section-title">🧬 Reprodução</div></div>
      <div class="smart-repro">
        <div class="smart-repro-item"><strong>${data.preg}</strong><span>Prenhes</span></div>
        <div class="smart-repro-item"><strong>${data.pending}</strong><span>A confirmar</span></div>
        <div class="smart-repro-item"><strong>${data.empty}</strong><span>Vazias</span></div>
      </div>
    </section>

    <div class="smart-secondary-grid">
      <div class="smart-metric"><span>Vacas em ordenha</span><strong>${data.cows==null?'—':n(data.cows,0)}</strong><small>Último registo</small></div>
      <div class="smart-metric"><span>Preço do leite</span><strong>${data.price==null?'—':n(data.price,3)+' €/L'}</strong><small>Último registo</small></div>
    </div>

    <p class="smart-mobile-note">Os avisos usam apenas os dados desta exploração. Células somáticas e UFC seguem a unidade ×1000 do relatório.</p>`
  hero.insertAdjacentElement('afterend',section)
}

async function enhance(){ensureStyle();if(busy||!isHome()||document.querySelector('.smart-dashboard'))return;busy=true;try{render(calculate(await loadData()))}catch(e){console.error('Dashboard inteligente:',e)}finally{busy=false}}
let queued=false;function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;enhance()})}
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});enhance()
