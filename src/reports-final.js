const FARM_ID='72bb5d54-f614-4394-8da9-7113a8e48a29'
let busy=false

function euro(v){const n=Number(v);return Number.isFinite(n)?n.toLocaleString('pt-PT',{style:'currency',currency:'EUR'}):'—'}
function num(v,d=0){const n=Number(v);return Number.isFinite(n)?n.toLocaleString('pt-PT',{minimumFractionDigits:d,maximumFractionDigits:d}):'—'}
function monthKey(d){return String(d||'').slice(0,7)}
function currentMonth(){return new Date().toISOString().slice(0,7)}
function monthlyCost(item){const a=Number(item.amount)||0;switch(item.frequency){case'monthly':return a;case'weekly':return a*52/12;case'yearly':return a/12;default:return 0}}

async function load(){
  const s=window.lavouraSupabase
  if(!s)return null
  const [animals,repro,milk,analyses,finance,budget]=await Promise.all([
    s.from('animals').select('id,number,status').eq('farm_id',FARM_ID),
    s.from('reproduction').select('animal_id,event_type,event_date,result,expected_calving,expected_dry_off').eq('farm_id',FARM_ID).order('event_date',{ascending:false}),
    s.from('milk_records').select('record_date,liters,milking_cows,price_per_liter').eq('farm_id',FARM_ID).order('record_date',{ascending:false}),
    s.from('milk_analyses').select('analysis_date,fat,protein,somatic_cells,ufc').eq('farm_id',FARM_ID).order('analysis_date',{ascending:false}),
    s.from('finance_records').select('record_date,kind,amount').eq('farm_id',FARM_ID).order('record_date',{ascending:false}),
    s.from('budget_items').select('amount,frequency,active').eq('farm_id',FARM_ID)
  ])
  const err=animals.error||repro.error||milk.error||analyses.error||finance.error||budget.error
  if(err)throw err
  return{animals:animals.data||[],repro:repro.data||[],milk:milk.data||[],analyses:analyses.data||[],finance:finance.data||[],budget:(budget.data||[]).filter(x=>x.active!==false)}
}

function calc(data){
  const mk=currentMonth()
  const milkMonth=data.milk.filter(x=>monthKey(x.record_date)===mk)
  const days=new Set(milkMonth.map(x=>x.record_date)).size
  const litersRegistered=milkMonth.reduce((a,x)=>a+Number(x.liters||0),0)
  const avgDaily=days?litersRegistered/days:0
  const projectedLiters=avgDaily*30
  const latestMilk=data.milk[0]||null
  const latestAnalysis=data.analyses[0]||null
  const price=Number(latestMilk?.price_per_liter||0)
  const budgetMonthly=data.budget.reduce((a,x)=>a+monthlyCost(x),0)
  const projectedRevenue=projectedLiters*price
  const costPerLiter=projectedLiters>0?budgetMonthly/projectedLiters:null
  const marginPerLiter=costPerLiter==null?null:price-costPerLiter
  const financeMonth=data.finance.filter(x=>monthKey(x.record_date)===mk)
  const income=financeMonth.filter(x=>x.kind==='income').reduce((a,x)=>a+Number(x.amount||0),0)
  const expense=financeMonth.filter(x=>x.kind==='expense').reduce((a,x)=>a+Number(x.amount||0),0)
  const ia=data.repro.filter(x=>x.event_type==='IA')
  const pregnant=ia.filter(x=>String(x.result||'').toLowerCase().includes('prenhe')).length
  const empty=ia.filter(x=>String(x.result||'').toLowerCase().includes('vazia')).length
  const diagnosed=pregnant+empty
  const conceptionRate=diagnosed?pregnant/diagnosed*100:null
  return{animals:data.animals.length,days,litersRegistered,avgDaily,projectedLiters,latestMilk,latestAnalysis,price,budgetMonthly,projectedRevenue,costPerLiter,marginPerLiter,income,expense,pregnant,empty,conceptionRate}
}

function make(c){
  const analysis=c.latestAnalysis
  return `<section class="card reports-final-block">
    <h2>✅ Resumo validado</h2>
    <p class="muted">Os indicadores abaixo usam a mesma base de dados de Produção, Análises, Reprodução e Finanças.</p>
    <div class="detail-row"><span>Animais registados</span><strong>${num(c.animals,0)}</strong></div>
    <div class="detail-row"><span>Produção média diária</span><strong>${num(c.avgDaily,0)} L/dia</strong></div>
    <div class="detail-row"><span>Dias de produção usados</span><strong>${num(c.days,0)}</strong></div>
    <div class="detail-row"><span>Leite projetado/30 dias</span><strong>${num(c.projectedLiters,0)} L</strong></div>
    <div class="detail-row"><span>Preço atual do leite</span><strong>${euro(c.price)}/L</strong></div>
    <div class="detail-row"><span>Custos previstos/mês</span><strong>${euro(c.budgetMonthly)}</strong></div>
    <div class="detail-row"><span>Receita de leite projetada</span><strong>${euro(c.projectedRevenue)}</strong></div>
    <div class="detail-row"><span>Custo previsto/L</span><strong>${c.costPerLiter==null?'—':euro(c.costPerLiter)+'/L'}</strong></div>
    <div class="detail-row"><span>Margem prevista/L</span><strong>${c.marginPerLiter==null?'—':euro(c.marginPerLiter)+'/L'}</strong></div>
    <div class="detail-row"><span>Receitas registadas este mês</span><strong>${euro(c.income)}</strong></div>
    <div class="detail-row"><span>Despesas registadas este mês</span><strong>${euro(c.expense)}</strong></div>
    <div class="detail-row"><span>Taxa de prenhez (diagnósticos registados)</span><strong>${c.conceptionRate==null?'—':num(c.conceptionRate,1)+'%'}</strong></div>
    ${analysis?`<h3>🥛 Última análise do leite</h3>
      <div class="detail-row"><span>Gordura</span><strong>${num(analysis.fat,2)}%</strong></div>
      <div class="detail-row"><span>Proteína</span><strong>${num(analysis.protein,2)}%</strong></div>
      <div class="detail-row"><span>Células somáticas</span><strong>${num(analysis.somatic_cells,0)}</strong></div>
      <div class="detail-row"><span>UFC</span><strong>${num(analysis.ufc,0)}</strong></div>`:''}
  </section>`
}

async function enhance(){
  if(busy)return
  const main=document.querySelector('main.app')
  if(!main||!main.textContent.includes('Relatórios'))return
  if(main.querySelector('.reports-final-block'))return
  busy=true
  try{
    const data=await load();if(!data)return
    const c=calc(data)
    const wrap=document.createElement('div');wrap.innerHTML=make(c)
    const h=[...main.querySelectorAll('h1')].find(x=>x.textContent.includes('Relatórios'))
    h?.insertAdjacentElement('afterend',wrap.firstElementChild)
  }catch(e){console.error('Reports final',e)}finally{busy=false}
}

new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true})
enhance()
