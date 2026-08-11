const SUMMARY_STYLE_ID = 'reproductive-summary-style'

function ensureSummaryStyle() {
  if (document.getElementById(SUMMARY_STYLE_ID)) return

  const style = document.createElement('style')
  style.id = SUMMARY_STYLE_ID
  style.textContent = `
    .repro-summary-card{margin-top:18px}
    .repro-summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px}
    .repro-summary-item{padding:14px 10px;border-radius:16px;background:#f7faf7;text-align:center;border:1px solid #dfe9df}
    .repro-summary-value{display:block;font-size:26px;font-weight:900;line-height:1;color:#193326}
    .repro-summary-label{display:block;margin-top:7px;font-size:12px;font-weight:800;color:#6d7f72;line-height:1.2}
    .repro-summary-item.pregnant{background:#eef8f0}
    .repro-summary-item.open{background:#fff1f1}
    .repro-summary-item.waiting{background:#fff8e6}
    @media (max-width:420px){.repro-summary-grid{gap:7px}.repro-summary-item{padding:12px 6px}.repro-summary-value{font-size:23px}.repro-summary-label{font-size:11px}}
  `
  document.head.appendChild(style)
}

function normalizeSummaryResult(value) {
  return String(value || '').trim().toLowerCase()
}

function summaryIsPregnant(value) {
  const result = normalizeSummaryResult(value)
  return result === 'prenhe' || result.includes('positiv')
}

function summaryIsOpen(value) {
  const result = normalizeSummaryResult(value)
  return result === 'vazia' || result.includes('negativ') || result.includes('não prenhe') || result.includes('nao prenhe')
}

function isReproductionScreen(main) {
  if (!main) return false
  const heading = main.querySelector('h1')
  return Boolean(heading && heading.innerText.includes('Reprodução'))
}

async function renderReproductiveSummary(main) {
  if (!isReproductionScreen(main)) return
  if (main.dataset.reproductiveSummary === 'loading' || main.dataset.reproductiveSummary === 'done') return

  const supabase = window.lavouraSupabase
  if (!supabase) return

  main.dataset.reproductiveSummary = 'loading'

  try {
    const response = await supabase
      .from('reproduction')
      .select('animal_id, event_type, event_date, result')
      .eq('event_type', 'IA')
      .order('event_date', { ascending: false })

    if (response.error) throw response.error

    const latestByAnimal = new Map()
    for (const record of response.data || []) {
      const key = String(record.animal_id)
      if (!latestByAnimal.has(key)) latestByAnimal.set(key, record)
    }

    let pregnant = 0
    let open = 0
    let waiting = 0

    for (const record of latestByAnimal.values()) {
      if (summaryIsPregnant(record.result)) pregnant += 1
      else if (summaryIsOpen(record.result)) open += 1
      else waiting += 1
    }

    main.querySelector('[data-reproductive-summary]')?.remove()

    const summary = document.createElement('section')
    summary.className = 'card repro-summary-card'
    summary.dataset.reproductiveSummary = '1'
    summary.innerHTML = `
      <h2>📊 Resumo reprodutivo</h2>
      <div class="repro-summary-grid">
        <div class="repro-summary-item pregnant">
          <span class="repro-summary-value">${pregnant}</span>
          <span class="repro-summary-label">✅ Prenhes confirmadas</span>
        </div>
        <div class="repro-summary-item open">
          <span class="repro-summary-value">${open}</span>
          <span class="repro-summary-label">❌ Vazias</span>
        </div>
        <div class="repro-summary-item waiting">
          <span class="repro-summary-value">${waiting}</span>
          <span class="repro-summary-label">🩺 A aguardar</span>
        </div>
      </div>
    `

    const stats = main.querySelector('.stats-grid')
    if (stats) stats.insertAdjacentElement('afterend', summary)
    else main.querySelector('h1')?.insertAdjacentElement('afterend', summary)

    main.dataset.reproductiveSummary = 'done'
  } catch (error) {
    console.error('Resumo reprodutivo:', error)
    main.dataset.reproductiveSummary = 'error'
  }
}

function enhanceReproductiveSummary() {
  ensureSummaryStyle()
  const main = document.querySelector('#app main')
  if (!main) return
  renderReproductiveSummary(main)
}

let summaryQueued = false
function scheduleReproductiveSummary() {
  if (summaryQueued) return
  summaryQueued = true
  queueMicrotask(() => {
    summaryQueued = false
    enhanceReproductiveSummary()
  })
}

new MutationObserver(scheduleReproductiveSummary).observe(document.body, {
  childList: true,
  subtree: true
})

enhanceReproductiveSummary()
