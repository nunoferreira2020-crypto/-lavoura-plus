const FARM_ID='72bb5d54-f614-4394-8da9-7113a8e48a29'
const STYLE_ID='finance-monthly-history-style'
let busy=false

function euro(value){
  const n=Number(value)||0
  return n.toLocaleString('pt-PT',{style:'currency',currency:'EUR'})
}
function monthKey(value){return String(value||'').slice(0,7)}
function monthLabel(key){
  const [y,m]=String(key).split('-').map(Number)
  if(!y||!m)return key
  return new Intl.DateTimeFormat('pt-PT',{month:'short',year:'2-digit'}).format(new Date(y,m-1,1)).replace('.','')
}
function lastMonths(count=12){
  const now=new Date();const out=[]
  for(let i=count-1;i>=0;i--){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1)
    out.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)
  }
  return out
}
function ensureStyle(){
  if(document.getElementById(STYLE_ID))return
  const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
  .finance-history-card{margin-top:14px;overflow:hidden}
  .finance-history-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:6px}
  .finance-history-chart{display:flex;align-items:flex-end;gap:10px;min-width:760px;height:250px;padding:18px 4px 28px;border-bottom:1px solid #e7ece8}
  .finance-month{flex:1;min-width:48px;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:7px;position:relative}
  .finance-month-bars{height:190px;width:100%;display:flex;align-items:flex-end;justify-content:center;gap:4px}
  .finance-month-bar{width:12px;min-height:2px;border-radius:5px 5px 2px 2px}
  .finance-month-bar.income{background:#3f8b58}.finance-month-bar.expense{background:#c96a5c}
  .finance-month-result{font-size:10px;font-weight:900;white-space:nowrap}.finance-month-result.positive{color:#2f6f44}.finance-month-result.negative{color:#a94a4a}
  .finance-month-label{font-size:10px;font-weight:800;color:#65736a;white-space:nowrap}
  .finance-history-legend{display:flex;gap:14px;flex-wrap:wrap;margin:12px 0 4px;font-size:12px;font-weight:750;color:#59665e}
  .finance-history-dot{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:5px}.finance-history-dot.income{background:#3f8b58}.finance-history-dot.expense{background:#c96a5c}
  .finance-history-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:14px}
  .finance-history-kpi{padding:11px;border-radius:14px;background:#f6f8f6;border:1px solid #e0e7e1}.finance-history-kpi span{display:block;font-size:11px;color:#68756d;font-weight:700}.finance-history-kpi strong{display:block;margin-top:4px;font-size:15px}
  @media(max-width:560px){.finance-history-kpis{grid-template-columns:1fr}.finance-history-chart{height:230px}}
  `;document.head.appendChild(s)
}
async function loadHistory(){
  const sb=window.lavouraSupabase;if(!sb)return null
  const [financeRes,milkRes]=await Promise.all([
    sb.from('finance_records').select('record_date,kind,amount').eq('farm_id',FARM_ID),
    sb.from('milk_records').select('record_date,liters,price_per_liter').eq('farm_id',FARM_ID)
  ])
  if(financeRes.error||milkRes.error)throw financeRes.error||milkRes.error
  const months=lastMonths(12)
  return months.map(month=>{
    const finance=(financeRes.data||[]).filter(x=>monthKey(x.record_date)===month)
    const milk=(milkRes.data||[]).filter(x=>monthKey(x.record_date)===month)
    const otherIncome=finance.filter(x=>x.kind==='income').reduce((s,x)=>s+Number(x.amount||0),0)
    const expenses=finance.filter(x=>x.kind==='expense').reduce((s,x)=>s+Number(x.amount||0),0)
    const milkIncome=milk.reduce((s,x)=>s+Number(x.liters||0)*Number(x.price_per_liter||0),0)
    const income=milkIncome+otherIncome
    return {month,income,expenses,result:income-expenses}
  })
}
function render(rows){
  const max=Math.max(1,...rows.flatMap(r=>[r.income,r.expenses]))
  const bar=v=>Math.max(v>0?2:0,Math.round(Number(v||0)/max*100))
  const withData=rows.filter(r=>r.income||r.expenses)
  const totalIncome=withData.reduce((s,r)=>s+r.income,0)
  const totalExpenses=withData.reduce((s,r)=>s+r.expenses,0)
  const totalResult=totalIncome-totalExpenses
  const best=withData.length?[...withData].sort((a,b)=>b.result-a.result)[0]:null
  const worst=withData.length?[...withData].sort((a,b)=>a.result-b.result)[0]:null
  return `<section class="card finance-history-card"><h2>📊 Evolução financeira — 12 meses</h2><p class="muted">Receitas e despesas por mês. O valor abaixo de cada mês é o lucro ou prejuízo.</p>
  <div class="finance-history-legend"><span><i class="finance-history-dot income"></i>Receitas</span><span><i class="finance-history-dot expense"></i>Despesas</span></div>
  <div class="finance-history-scroll"><div class="finance-history-chart">${rows.map(r=>`<div class="finance-month" title="${monthLabel(r.month)} — Receitas ${euro(r.income)} · Despesas ${euro(r.expenses)} · Resultado ${euro(r.result)}"><div class="finance-month-bars"><div class="finance-month-bar income" style="height:${bar(r.income)}%"></div><div class="finance-month-bar expense" style="height:${bar(r.expenses)}%"></div></div><div class="finance-month-result ${r.result>=0?'positive':'negative'}">${r.result>=0?'+':''}${euro(r.result)}</div><div class="finance-month-label">${monthLabel(r.month)}</div></div>`).join('')}</div></div>
  <div class="finance-history-kpis"><div class="finance-history-kpi"><span>Resultado acumulado</span><strong>${totalResult>=0?'✅':'⚠️'} ${euro(totalResult)}</strong></div><div class="finance-history-kpi"><span>Melhor mês</span><strong>${best?`${monthLabel(best.month)} · ${euro(best.result)}`:'—'}</strong></div><div class="finance-history-kpi"><span>Pior mês</span><strong>${worst?`${monthLabel(worst.month)} · ${euro(worst.result)}`:'—'}</strong></div></div>
  <p class="muted">Os meses sem registos aparecem a zero. O resultado usa receitas do leite + outras receitas − despesas registadas.</p></section>`
}
async function enhance(){
  if(busy)return
  const main=document.querySelector('main.app')
  if(!main||!main.textContent.includes('Finanças')||main.querySelector('.finance-history-card'))return
  busy=true
  try{ensureStyle();const rows=await loadHistory();if(!rows)return;const w=document.createElement('div');w.innerHTML=render(rows);const current=main.querySelector('.finance-profit-card');if(current)current.insertAdjacentElement('afterend',w.firstElementChild);else main.appendChild(w.firstElementChild)}catch(e){console.error('Finance monthly history',e)}finally{busy=false}
}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});enhance()

export { lastMonths, monthLabel }
