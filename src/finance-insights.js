const FARM_ID = '72bb5d54-f614-4394-8da9-7113a8e48a29'
const DAYS_IN_PROJECTION = 30
let busy = false

function euro(value) {
  const n = Number(value)
  return Number.isFinite(n)
    ? n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
    : '—'
}

function num(value, decimals = 0) {
  const n = Number(value)
  return Number.isFinite(n)
    ? n.toLocaleString('pt-PT', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      })
    : '—'
}

function monthlyCost(item) {
  const amount = Number(item.amount) || 0

  switch (item.frequency) {
    case 'monthly':
      return amount
    case 'weekly':
      return amount * 52 / 12
    case 'yearly':
      return amount / 12
    default:
      return 0
  }
}

function monthKey(date) {
  return String(date || '').slice(0, 7)
}

function currentMonth() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

async function load() {
  const supabase = window.lavouraSupabase
  if (!supabase) return null

  const [finance, budget, milk] = await Promise.all([
    supabase
      .from('finance_records')
      .select('record_date,kind,category,amount')
      .eq('farm_id', FARM_ID)
      .order('record_date', { ascending: false }),
    supabase
      .from('budget_items')
      .select('category,amount,frequency,active')
      .eq('farm_id', FARM_ID),
    supabase
      .from('milk_records')
      .select('record_date,liters,price_per_liter,milking_cows')
      .eq('farm_id', FARM_ID)
      .order('record_date', { ascending: false })
  ])

  if (finance.error || budget.error || milk.error) {
    throw finance.error || budget.error || milk.error
  }

  return {
    finance: finance.data || [],
    budget: (budget.data || []).filter(item => item.active !== false),
    milk: milk.data || []
  }
}

function calc(data) {
  const month = currentMonth()
  const financeMonth = data.finance.filter(item => monthKey(item.record_date) === month)
  const milkMonth = data.milk.filter(item => monthKey(item.record_date) === month)

  const incomeRecorded = financeMonth
    .filter(item => item.kind === 'income')
    .reduce((total, item) => total + Number(item.amount || 0), 0)

  const expenseRecorded = financeMonth
    .filter(item => item.kind === 'expense')
    .reduce((total, item) => total + Number(item.amount || 0), 0)

  const monthlyBudget = data.budget.reduce(
    (total, item) => total + monthlyCost(item),
    0
  )

  const recordedLiters = milkMonth.reduce(
    (total, item) => total + Number(item.liters || 0),
    0
  )

  const recordedMilkRevenue = milkMonth.reduce(
    (total, item) =>
      total + Number(item.liters || 0) * Number(item.price_per_liter || 0),
    0
  )

  const productionDays = new Set(
    milkMonth
      .filter(item => Number(item.liters) > 0)
      .map(item => item.record_date)
  ).size

  const averageDailyLiters = productionDays > 0
    ? recordedLiters / productionDays
    : 0

  const averageDailyMilkRevenue = productionDays > 0
    ? recordedMilkRevenue / productionDays
    : 0

  const projectedMonthlyLiters = averageDailyLiters * DAYS_IN_PROJECTION
  const projectedMonthlyMilkRevenue = averageDailyMilkRevenue * DAYS_IN_PROJECTION
  const dailyBudget = monthlyBudget / DAYS_IN_PROJECTION
  const projectedCostPerLiter = projectedMonthlyLiters > 0
    ? monthlyBudget / projectedMonthlyLiters
    : null
  const projectedMargin = projectedMonthlyMilkRevenue - monthlyBudget
  const projectedMarginPerLiter = projectedMonthlyLiters > 0
    ? projectedMargin / projectedMonthlyLiters
    : null

  const categories = {}
  data.budget.forEach(item => {
    categories[item.category] =
      (categories[item.category] || 0) + monthlyCost(item)
  })

  return {
    incomeRecorded,
    expenseRecorded,
    monthlyBudget,
    dailyBudget,
    recordedLiters,
    recordedMilkRevenue,
    productionDays,
    averageDailyLiters,
    averageDailyMilkRevenue,
    projectedMonthlyLiters,
    projectedMonthlyMilkRevenue,
    projectedCostPerLiter,
    projectedMargin,
    projectedMarginPerLiter,
    categories
  }
}

function makeCard(calculation) {
  const topCosts = Object.entries(calculation.categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const projectionAvailable = calculation.productionDays > 0

  return `
    <section class="card finance-insight-block">
      <h2>📊 Resumo financeiro</h2>

      <h3>Projeção mensal</h3>
      ${projectionAvailable ? `
        <div class="detail-row">
          <span>Produção média diária</span>
          <strong>${num(calculation.averageDailyLiters, 0)} L/dia</strong>
        </div>
        <div class="detail-row">
          <span>Leite projetado (30 dias)</span>
          <strong>${num(calculation.projectedMonthlyLiters, 0)} L</strong>
        </div>
        <div class="detail-row">
          <span>Receita de leite projetada</span>
          <strong>${euro(calculation.projectedMonthlyMilkRevenue)}</strong>
        </div>
        <div class="detail-row">
          <span>Custos previstos/mês</span>
          <strong>${euro(calculation.monthlyBudget)}</strong>
        </div>
        <div class="detail-row">
          <span>Custo previsto por dia</span>
          <strong>${euro(calculation.dailyBudget)}</strong>
        </div>
        <div class="detail-row">
          <span>Custo previsto por litro</span>
          <strong>${calculation.projectedCostPerLiter == null ? '—' : `${euro(calculation.projectedCostPerLiter)}/L`}</strong>
        </div>
        <div class="detail-row">
          <span>Margem projetada/mês</span>
          <strong>${euro(calculation.projectedMargin)}</strong>
        </div>
        <div class="detail-row">
          <span>Margem projetada por litro</span>
          <strong>${calculation.projectedMarginPerLiter == null ? '—' : `${euro(calculation.projectedMarginPerLiter)}/L`}</strong>
        </div>
      ` : `
        <p class="muted">
          Registe pelo menos um dia de produção para calcular a projeção mensal e o custo por litro.
        </p>
      `}

      <h3>Registado neste mês</h3>
      <div class="detail-row">
        <span>Dias de produção registados</span>
        <strong>${calculation.productionDays}</strong>
      </div>
      <div class="detail-row">
        <span>Litros registados</span>
        <strong>${num(calculation.recordedLiters, 0)} L</strong>
      </div>
      <div class="detail-row">
        <span>Receita de leite registada</span>
        <strong>${euro(calculation.recordedMilkRevenue)}</strong>
      </div>
      <div class="detail-row">
        <span>Outras receitas registadas</span>
        <strong>${euro(calculation.incomeRecorded)}</strong>
      </div>
      <div class="detail-row">
        <span>Despesas efetivamente registadas</span>
        <strong>${euro(calculation.expenseRecorded)}</strong>
      </div>

      ${topCosts.length ? `
        <h3>Maiores custos previstos/mês</h3>
        ${topCosts.map(([category, value]) => `
          <div class="detail-row">
            <span>${category}</span>
            <strong>${euro(value)}</strong>
          </div>
        `).join('')}
      ` : ''}

      <p class="muted">
        O custo por litro compara períodos equivalentes: custos mensais com leite projetado para 30 dias. Os valores realmente registados aparecem separados para não misturar um único dia de produção com um mês inteiro de despesas.
      </p>
    </section>
  `
}

async function enhance() {
  if (busy) return

  const main = document.querySelector('main.app')
  if (!main) return

  const text = main.textContent || ''
  const isFinance = text.includes('Finanças')
  const isReports = text.includes('Relatórios')

  if (!isFinance && !isReports) return
  if (main.querySelector('.finance-insight-block')) return

  busy = true

  try {
    const data = await load()
    if (!data) return

    const calculation = calc(data)
    const wrapper = document.createElement('div')
    wrapper.innerHTML = makeCard(calculation)
    const card = wrapper.firstElementChild

    if (isFinance) {
      const heading = [...main.querySelectorAll('h1')]
        .find(item => item.textContent.includes('Finanças'))
      heading?.insertAdjacentElement('afterend', card)
    } else {
      const heading = [...main.querySelectorAll('h1')]
        .find(item => item.textContent.includes('Relatórios'))
      heading?.insertAdjacentElement('afterend', card)
    }
  } catch (error) {
    console.error('Finance insights', error)
  } finally {
    busy = false
  }
}

new MutationObserver(enhance).observe(document.body, {
  childList: true,
  subtree: true
})

enhance()
