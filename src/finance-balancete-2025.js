const BALANCETE_2025 = Object.freeze({
  year: 2025,
  expenses: 79548.10,
  revenue: 127794.84,
  sales: 109099.08,
  subsidies: 18191.43,
  otherIncome: 504.33,
  accountingResult: 48246.74,
  bankBalance: 309028.64,
  suppliersPayable: 4782.78,
  salesBreakdown: [
    ['Leite', 103083.34],
    ['Vacas leiteiras', 5871.51],
    ['Rolos de erva', 144.23]
  ],
  expenseBreakdown: [
    ['Rações', 39832.09],
    ['Fertilizantes para solos / adubos', 10944.69],
    ['Renda das terras', 5530.00],
    ['Trabalhos especializados', 4999.69],
    ['Outros serviços especializados', 3906.32],
    ['Gasóleo', 3857.37],
    ['Segurança Social / pessoal', 2773.76],
    ['Conservação e reparação', 1987.19],
    ['Medicamentos', 1532.77],
    ['Serviço de inseminação', 1252.50],
    ['Sementes', 1204.58],
    ['Quotizações', 564.41],
    ['Fitofarmacêuticos', 481.81],
    ['Depreciações e amortizações', 243.87],
    ['Materiais', 184.49],
    ['Limpeza, higiene e conforto', 172.94],
    ['Outros serviços', 42.31],
    ['Impostos indiretos', 37.31]
  ]
})

function euro(value) {
  return Number(value).toLocaleString('pt-PT', {
    style: 'currency',
    currency: 'EUR'
  })
}

function percent(value) {
  return `${Number(value).toLocaleString('pt-PT', { maximumFractionDigits: 1 })}%`
}

function pageIsFinance(main) {
  const title = main?.querySelector('h1')?.textContent || ''
  return title.includes('Finanças')
}

function lineRows(items, total = null) {
  return items.map(([label, value]) => {
    const share = total && total > 0 ? ` <small class="muted">(${percent(value / total * 100)})</small>` : ''
    return `<div class="detail-row"><span>${label}${share}</span><strong>${euro(value)}</strong></div>`
  }).join('')
}

function cardHtml() {
  const marginPct = BALANCETE_2025.revenue > 0
    ? BALANCETE_2025.accountingResult / BALANCETE_2025.revenue * 100
    : 0

  const monthlyRevenue = BALANCETE_2025.revenue / 12
  const monthlyExpenses = BALANCETE_2025.expenses / 12
  const monthlyResult = BALANCETE_2025.accountingResult / 12

  return `
    <section class="card finance-balancete-2025" data-finance-balancete="2025">
      <h2>📒 Real 2025 — Balancete</h2>
      <p class="muted">Valores reais contabilizados no balancete acumulado de final de 2025. Esta secção é separada do orçamento/estimativas atuais para evitar contar custos duas vezes.</p>

      <div class="detail-row"><span>Rendimentos reais 2025</span><strong>${euro(BALANCETE_2025.revenue)}</strong></div>
      <div class="detail-row"><span>Gastos reais 2025</span><strong>${euro(BALANCETE_2025.expenses)}</strong></div>
      <div class="detail-row"><span>Resultado contabilístico 2025</span><strong>${euro(BALANCETE_2025.accountingResult)}</strong></div>
      <div class="detail-row"><span>Margem sobre rendimentos</span><strong>${percent(marginPct)}</strong></div>

      <details>
        <summary><strong>Média mensal de 2025</strong></summary>
        <div class="detail-row"><span>Rendimentos/mês</span><strong>${euro(monthlyRevenue)}</strong></div>
        <div class="detail-row"><span>Gastos/mês</span><strong>${euro(monthlyExpenses)}</strong></div>
        <div class="detail-row"><span>Resultado/mês</span><strong>${euro(monthlyResult)}</strong></div>
      </details>

      <details open>
        <summary><strong>Todos os gastos reais de 2025</strong></summary>
        ${lineRows(BALANCETE_2025.expenseBreakdown, BALANCETE_2025.expenses)}
        <div class="detail-row"><span><strong>Total de gastos</strong></span><strong>${euro(BALANCETE_2025.expenses)}</strong></div>
        <p class="muted">As rubricas acima foram organizadas pelas contas de gasto do balancete sem somar subcontas duplicadas. O total fecha nos ${euro(BALANCETE_2025.expenses)}.</p>
      </details>

      <details>
        <summary><strong>Receitas reais de 2025</strong></summary>
        <div class="detail-row"><span>Vendas</span><strong>${euro(BALANCETE_2025.sales)}</strong></div>
        ${lineRows(BALANCETE_2025.salesBreakdown, BALANCETE_2025.sales)}
        <div class="detail-row"><span>Subsídios à exploração</span><strong>${euro(BALANCETE_2025.subsidies)}</strong></div>
        <div class="detail-row"><span>Outros rendimentos e ganhos</span><strong>${euro(BALANCETE_2025.otherIncome)}</strong></div>
        <div class="detail-row"><span><strong>Total de rendimentos</strong></span><strong>${euro(BALANCETE_2025.revenue)}</strong></div>
      </details>

      <details>
        <summary><strong>Posição financeira no balancete</strong></summary>
        <div class="detail-row"><span>Caixa Geral de Depósitos — saldo devedor</span><strong>${euro(BALANCETE_2025.bankBalance)}</strong></div>
        <div class="detail-row"><span>Fornecedores — saldo credor</span><strong>${euro(BALANCETE_2025.suppliersPayable)}</strong></div>
      </details>

      <p class="muted">Resultado contabilístico = rendimentos − gastos. Não representa necessariamente dinheiro disponível na conta nem substitui o apuramento fiscal do contabilista.</p>
    </section>`
}

function enhance() {
  const main = document.querySelector('main.app')
  if (!pageIsFinance(main) || main.querySelector('[data-finance-balancete="2025"]')) return

  const wrapper = document.createElement('div')
  wrapper.innerHTML = cardHtml().trim()
  const card = wrapper.firstElementChild

  const insight = main.querySelector('.finance-insight-block')
  if (insight) insight.insertAdjacentElement('afterend', card)
  else main.querySelector('h1')?.insertAdjacentElement('afterend', card)
}

new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true })
enhance()

export { BALANCETE_2025 }
