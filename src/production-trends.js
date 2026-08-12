const FARM_ID='72bb5d54-f614-4394-8da9-7113a8e48a29'
let busy=false

function num(v,d=1){const n=Number(v);return Number.isFinite(n)?n.toLocaleString('pt-PT',{minimumFractionDigits:d,maximumFractionDigits:d}):'—'}
function avg(rows,key){const vals=rows.map(x=>Number(x[key])).filter(Number.isFinite);return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null}
function pct(current,previous){if(!Number.isFinite(current)||!Number.isFinite(previous)||previous===0)return null;return (current-previous)/previous*100}
function deltaLabel(v){if(v==null)return 'Sem comparação';const arrow=v>0?'↑':v<0?'↓':'→';return `${arrow} ${Math.abs(v).toLocaleString('pt-PT',{maximumFractionDigits:1})}%`}

async function load(){const s=window.lavouraSupabase;if(!s)return[];const {data,error}=await s.from('milk_records').select('record_date,liters,milking_cows').eq('farm_id',FARM_ID).order('record_date',{ascending:false}).limit(60);if(error)throw error;return data||[]}

function calc(rows){
  const recent7=rows.slice(0,7),prev7=rows.slice(7,14),recent30=rows.slice(0,30),prev30=rows.slice(30,60)
  const avg7=avg(recent7,'liters'),avgPrev7=avg(prev7,'liters'),avg30=avg(recent30,'liters'),avgPrev30=avg(prev30,'liters')
  const perCow=recent7.map(r=>({v:Number(r.milking_cows)>0?Number(r.liters)/Number(r.milking_cows):NaN})).filter(x=>Number.isFinite(x.v))
  const avgCow=perCow.length?perCow.reduce((a,x)=>a+x.v,0)/perCow.length:null
  return{days:rows.length,avg7,avgPrev7,avg30,avgPrev30,weekChange:pct(avg7,avgPrev7),monthChange:pct(avg30,avgPrev30),avgCow}
}

function make(c){return `<section class="card production-trends-block">
  <h2>📈 Evolução da produção</h2>
  <div class="detail-row"><span>Média últimos 7 registos</span><strong>${num(c.avg7,0)} L/dia</strong></div>
  <div class="detail-row"><span>Variação vs 7 anteriores</span><strong>${deltaLabel(c.weekChange)}</strong></div>
  <div class="detail-row"><span>Média últimos 30 registos</span><strong>${num(c.avg30,0)} L/dia</strong></div>
  <div class="detail-row"><span>Variação vs 30 anteriores</span><strong>${deltaLabel(c.monthChange)}</strong></div>
  <div class="detail-row"><span>Média L/vaca (últimos 7)</span><strong>${num(c.avgCow,1)} L</strong></div>
  <p class="muted">As comparações usam apenas dias de produção realmente registados.</p>
</section>`}

async function enhance(){
  if(busy)return
  const main=document.querySelector('main.app');if(!main||!main.querySelector('h1')?.textContent.includes('Produção'))return
  if(main.querySelector('.production-trends-block'))return
  busy=true
  try{const rows=await load();if(!rows.length)return;const wrap=document.createElement('div');wrap.innerHTML=make(calc(rows));main.querySelector('h1')?.insertAdjacentElement('afterend',wrap.firstElementChild)}catch(e){console.error('Production trends',e)}finally{busy=false}
}

new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true})
enhance()
