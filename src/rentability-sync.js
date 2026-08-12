const FARM_ID = '72bb5d54-f614-4394-8da9-7113a8e48a29'
let updating = false

function euro(value) {
  const n = Number(value)
  return Number.isFinite(n)
    ? n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
    : '—'
}

function numero(value, digits = 0) {
  const n = Number(value)
  return Number.isFinite(n)
    ? n.toLocaleString('pt-PT', { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : '—'
}

function monthlyCost(item) {
  const amount = Number(item.amount) || 0
  if (item.frequency === 'monthly') return amount
  if (item.frequency === 'weekly') return amount * 52 / 12
  if (item.frequency === 'yearly') return amount / 12
  return 0
}

function monthKey(value) {
  return String(value || '').slice(0, 7)
}

function currentMonth() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

async function loadData() {
  const supabase = window.lavouraSupabase
  if (!supabase) return null

  const [budgetResult, milkResult] = await Promise.all([
    supabase
      .from('budget_items')
      .select('amount,frequency,active')
      .eq('farm_id', FARM_ID),
    supabase
      .from('milk_records')
      .select('record_date,liters,price_per_liter')
      .eq('farm_id', FARM_ID)
      .order('record_date', { ascending: false })
  ])

  if (budgetResult.error || milkResult.error) {
    throw budgetResult.error || milkResult.error
  }

  return {
    budget: (budgetResult.data || []).filter(item => item.active !== false),
    milk: milkResult.data || []
  }
}

function calculate(data) {
  const monthlyCosts = data.budget.reduce(
    (total, item) => total + monthlyCost(item),
    0
  )

  const month = currentMonth()
  const currentMilk = data.milk.filter(item => monthKey(item.record_date) === month)
  const sample = currentMilk.length ? currentMilk : data.milk.slice(0, 7)
  const validDays = sample.filter(item => Number(item.liters) > 0)

  const averageDailyLiters = validDays.length
    ? validDays.reduce((total, item) => total + Number(item.liters || 0), 0) / validDays.length
    : 0

  const weightedRevenue = validDays.reduce(
    (total, item) => total + Number(item.liters || 0) * Number(item.price_per_liter || 0),
    0
  )
  const totalSampleLiters = validDays.reduce(
    (total, item) => total + Number(item.liters || 0),
    0
  )

  const pricePerLiter = totalSampleLiters > 0
    ? weightedRevenue / totalSampleLiters
    : Number(data.milk[0]?.price_per_liter || 0)

  const monthlyLiters = averageDailyLiters * 30
  const dailyCosts = monthlyCosts / 30
  const monthlyRevenue = monthlyLiters * pricePerLiter
  const monthlyMargin = monthlyRevenue - monthlyCosts
  const costPerLiter = monthlyLiters > 0 ? monthlyCosts / monthlyLiters : null
  const marginPerLiter = costPerLiter == null ? null : pricePerLiter - costPerLiter
  const breakEvenMonthlyLiters = pricePerLiter > 0 ? monthlyCosts / pricePerLiter : null
  const breakEvenDailyLiters = breakEvenMonthlyLiters == null ? null : breakEvenMonthlyLiters / 30

  return {
    monthlyCosts,
    dailyCosts,
    averageDailyLiters,
    pricePerLiter,
    monthlyLiters,
    monthlyRevenue,
    monthlyMargin,
    costPerLiter,
    marginPerLiter,
    breakEvenMonthlyLiters,
    breakEvenDailyLiters,
    sampleDays: validDays.length
  }
}

function replaceRentabilityScreen(main, c) {
  if (!main.textContent?.includes('Rentabilidade')) return false
  if (!main.querySelector('h1')?.textContent?.includes('Rentabilidade')) return false

  main.innerHTML = `
    <button class="secondary" data-action="inicio">← Voltar</button>
    <h1>📊 Rentabilidade</h1>
    <p class="subtitle">Projeção de 30 dias com custos e produção no mesmo período</p>

    <section class="card">
      <div class="detail-row"><span>Preço médio do leite</span><strong>${euro(c.pricePerLiter)}/L</strong></div>
      <div class="detail-row"><span>Produção média diária</span><strong>${numero(c.averageDailyLiters, 0)} L/dia</strong></div>
      <div class="detail-row"><span>Leite projetado/mês</span><strong>${numero(c.monthlyLiters, 0)} L</strong></div>
      <div class="detail-row"><span>Custos previstos/dia</span><strong>${euro(c.dailyCosts)}</strong></div>
      <div class="detail-row"><span>Custos previstos/mês</span><strong>${euro(c.monthlyCosts)}</strong></div>
      <div class="detail-row"><span>Custo previsto/L</span><strong>${c.costPerLiter == null ? '—' : `${euro(c.costPerLiter)}/L`}</strong></div>
      <div class="detail-row"><span>Margem prevista/L</span><strong>${c.marginPerLiter == null ? '—' : `${euro(c.marginPerLiter)}/L`}</strong></div>
      <div class="detail-row"><span>Receita leite/mês</span><strong>${euro(c.monthlyRevenue)}</strong></div>
      <div class="detail-row"><span>Margem prevista/mês</span><strong>${euro(c.monthlyMargin)}</strong></div>
    </section>

    <section class="card">
      <h2>⚖️ Ponto de equilíbrio</h2>
      <p>Para cobrir os custos previstos ao preço médio atual:</p>
      <p><strong>${numero(c.breakEvenMonthlyLiters, 0)} L/mês</strong></p>
      <p>Cerca de <strong>${numero(c.breakEvenDailyLiters, 0)} L/dia</strong>.</p>
    </section>

    <section class="card">
      <p class="muted">Baseado em ${c.sampleDays || 0} dia(s) de produção disponível(eis). A projeção usa a média diária registada e converte todos os custos recorrentes para o mesmo período de 30 dias.</p>
    </section>
  `

  return true
}

function updateHomeCard(main, c) {
  if (!main.textContent?.includes('Lavoura+')) return false
  const heading = [...main.querySelectorAll('h2')]
    .find(node => node.textContent?.includes('Rentabilidade'))
  if (!heading) return false

  const card = heading.closest('.card')
  if (!card) return false

  const button = card.querySelector('[data-action="rentabilidade"]')
  card.innerHTML = `
    <h2>📊 Rentabilidade</h2>
    <p>Custo previsto: <strong>${c.costPerLiter == null ? '—' : `${euro(c.costPerLiter)}/L`}</strong></p>
    <p>Margem prevista: <strong>${c.marginPerLiter == null ? '—' : `${euro(c.marginPerLiter)}/L`}</strong></p>
    <p class="muted">Projeção com produção média × 30 dias</p>
  `
  if (button) card.appendChild(button)
  else {
    const b = document.createElement('button')
    b.dataset.action = 'rentabilidade'
    b.textContent = 'Ver rentabilidade'
    card.appendChild(b)
  }
  return true
}

async function enhance() {
  if (updating) return
  const main = document.querySelector('main.app')
  if (!main) return

  const isRentability = main.querySelector('h1')?.textContent?.includes('Rentabilidade')
  const isHome = main.querySelector('h1')?.textContent?.includes('Lavoura+')
  if (!isRentability && !isHome) return

  updating = true
  try {
    const data = await loadData()
    if (!data) return
    const c = calculate(data)
    if (isRentability) replaceRentabilityScreen(main, c)
    if (isHome) updateHomeCard(main, c)
  } catch (error) {
    console.error('Rentability sync', error)
  } finally {
    updating = false
  }
}

new MutationObserver(() => enhance()).observe(document.body, { childList: true, subtree: true })
enhance()
