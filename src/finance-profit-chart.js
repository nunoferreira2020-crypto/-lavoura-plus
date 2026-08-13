const FARM_ID='72bb5d54-f614-4394-8da9-7113a8e48a29'
const STYLE_ID='finance-profit-chart-style'
let busy=false

function euro(value){
  const n=Number(value)||0
  return n.toLocaleString('pt-PT',{style:'currency',currency:'EUR'})
}

function currentMonth(){
  const now=new Date()
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
}

function monthKey(value){return String(value||'').slice(0,7)}

function ensureStyle(){
  if(document.getElementById(STYLE_ID))return
  const style=document.createElement('style')
  style.id=STYLE_ID
  style.textContent=`
    .finance-profit-card{margin-top:14px}
    .finance-profit-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:14px 0 18px}
    .finance-profit-stat{padding:13px;border-radius:16px;background:#f6f8f6;border:1px solid #e0e7e1}
    .finance-profit-stat span{display:block;font-size:12px;color:#68756d;font-weight:700}
    .finance-profit-stat strong{display:block;margin-top:4px;font-size:18px;letter-spacing:-.02em}
    .finance-profit-stat.result.positive{background:#eef7f0;border-color:#cfe5d4}
    .finance-profit-stat.result.negative{background:#fff3f3;border-color:#efcccc}
    .finance-chart{display:grid;gap:12px;margin:8px 0 14px}
    .finance-chart-row{display:grid;grid-template-columns:88px 1fr auto;gap:10px;align-items:center}
    .finance-chart-label{font-size:12px;font-weight:800;color:#506057}
    .finance-chart-track{height:18px;border-radius:999px;background:#edf1ee;overflow:hidden}
    .finance-chart-bar{height:100%;min-width:2px;border-radius:999px}
    .finance-chart-bar.income{background:#3f8b58}
    .finance-chart-bar.expense{background:#c96a5c}
    .finance-chart-bar.result-positive{background:#2f6f44}
    .finance-chart-bar.result-negative{background:#a94a4a}
    .finance-chart-value{font-size:12px;font-weight:900;white-space:nowrap}
    .finance-result-message{margin:10px 0 0;font-weight:800}
    @media(max-width:560px){
      .finance-profit-summary{grid-template-columns:1fr}
      .finance-chart-row{grid-template-columns:74px 1fr;gap:8px}
      .finance-chart-value{grid-column:2;text-align:right;margin-top:-6px}
    }
  `
  document.head.appendChild(style)
}

async function loadMonthTotals(){
  const sb=window.lavouraSupabase
  if(!sb)return null
  const month=currentMonth()
  const [financeRes,milkRes]=await Promise.all([
    sb.from('finance_records')
      .select('record_date,kind,amount')
      .eq('farm_id',FARM_ID),
    sb.from('milk_records')
      .select('record_date,liters,price_per_liter')
      .eq('farm_id',FARM_ID)
  ])
  if(financeRes.error||milkRes.error)throw financeRes.error||milkRes.error

  const finance=(financeRes.data||[]).filter(item=>monthKey(item.record_date)===month)
  const milk=(milkRes.data||[]).filter(item=>monthKey(item.record_date)===month)
  const otherIncome=finance.filter(item=>item.kind==='income').reduce((s,item)=>s+Number(item.amount||0),0)
  const expenses=finance.filter(item=>item.kind==='expense').reduce((s,item)=>s+Number(item.amount||0),0)
  const milkIncome=milk.reduce((s,item)=>s+Number(item.liters||0)*Number(item.price_per_liter||0),0)
  const income=milkIncome+otherIncome
  return {income,expenses,result:income-expenses,milkIncome,otherIncome}
}

function barWidth(value,max){
  if(max<=0)return 0
  return Math.max(2,Math.round(Math.abs(value)/max*100))
}

function render(totals){
  const max=Math.max(Math.abs(totals.income),Math.abs(totals.expenses),Math.abs(totals.result),1)
  const positive=totals.result>=0
  return `
    <section class="card finance-profit-card">
      <h2>📈 Lucro ou prejuízo</h2>
      <p class="muted">Comparação do que entrou e saiu neste mês.</p>
      <div class="finance-profit-summary">
        <div class="finance-profit-stat"><span>Receitas totais</span><strong>${euro(totals.income)}</strong></div>
        <div class="finance-profit-stat"><span>Despesas</span><strong>${euro(totals.expenses)}</strong></div>
        <div class="finance-profit-stat result ${positive?'positive':'negative'}"><span>Resultado</span><strong>${positive?'✅':'⚠️'} ${euro(totals.result)}</strong></div>
      </div>
      <div class="finance-chart" aria-label="Gráfico de receitas, despesas e resultado">
        <div class="finance-chart-row"><span class="finance-chart-label">Receitas</span><div class="finance-chart-track"><div class="finance-chart-bar income" style="width:${barWidth(totals.income,max)}%"></div></div><strong class="finance-chart-value">${euro(totals.income)}</strong></div>
        <div class="finance-chart-row"><span class="finance-chart-label">Despesas</span><div class="finance-chart-track"><div class="finance-chart-bar expense" style="width:${barWidth(totals.expenses,max)}%"></div></div><strong class="finance-chart-value">${euro(totals.expenses)}</strong></div>
        <div class="finance-chart-row"><span class="finance-chart-label">Resultado</span><div class="finance-chart-track"><div class="finance-chart-bar ${positive?'result-positive':'result-negative'}" style="width:${barWidth(totals.result,max)}%"></div></div><strong class="finance-chart-value">${euro(totals.result)}</strong></div>
      </div>
      <p class="finance-result-message">${positive?`✅ Neste mês está a lucrar ${euro(totals.result)}.`:`⚠️ Neste mês está a perder ${euro(Math.abs(totals.result))}.`}</p>
      <p class="muted">Resultado = receitas do leite + outras receitas − despesas registadas.</p>
    </section>
  `
}

async function enhance(){
  if(busy)return
  const main=document.querySelector('main.app')
  if(!main||!main.textContent.includes('Finanças')||main.querySelector('.finance-profit-card'))return
  busy=true
  try{
    ensureStyle()
    const totals=await loadMonthTotals()
    if(!totals)return
    const wrapper=document.createElement('div')
    wrapper.innerHTML=render(totals)
    const insight=main.querySelector('.finance-insight-block')
    if(insight)insight.insertAdjacentElement('afterend',wrapper.firstElementChild)
    else main.appendChild(wrapper.firstElementChild)
  }catch(error){console.error('Finance profit chart',error)}finally{busy=false}
}

new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true})
enhance()

export { barWidth }
