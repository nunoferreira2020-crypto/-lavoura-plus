const STYLE_ID = 'lavoura-herd-tools-style'
const CACHE_TTL = 30000

let cache = { at: 0, animals: [], reproduction: [] }
let queued = false

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .herd-tools{margin:12px 0 16px;padding:12px;border-radius:16px;background:#f6f8f6;border:1px solid #dfe8df}
    .herd-tools-title{font-size:13px;font-weight:900;margin-bottom:9px;color:#315c3d}
    .herd-filter-row{display:flex;gap:8px;overflow-x:auto;padding-bottom:2px;-webkit-overflow-scrolling:touch}
    .herd-filter{flex:0 0 auto;margin:0!important;padding:9px 12px!important;border-radius:999px!important;font-size:13px!important;background:#fff!important;color:#315c3d!important;border:1px solid #cbd9cd!important}
    .herd-filter.active{background:#2f6f44!important;color:#fff!important;border-color:#2f6f44!important}
    .herd-result-count{margin-top:9px;font-size:12px;color:#66756a;font-weight:700}
    .herd-badge{display:inline-flex;align-items:center;margin-top:7px;padding:4px 8px;border-radius:999px;font-size:11px;font-weight:900}
    .herd-badge.wait{background:#fff4d4;color:#765800}
    .herd-badge.pregnant{background:#e5f4e9;color:#22633a}
    .herd-badge.open{background:#fdeaea;color:#8d3333}
    .herd-badge.dry{background:#fff0df;color:#8a4e00}
    .herd-badge.calving{background:#e8f1ff;color:#245b9a}
    .repro-smart-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0 16px}
    .repro-smart-card{padding:12px;border-radius:16px;background:#fff;border:1px solid #e1e7e2}
    .repro-smart-number{font-size:22px;font-weight:900;line-height:1.1}
    .repro-smart-label{margin-top:4px;font-size:12px;color:#6c766f;font-weight:700}
    .repro-smart-card.urgent{border-color:#e6b8b8;background:#fff7f7}
    .repro-smart-card.soon{border-color:#ead6a1;background:#fffaf0}
    .animal-repro-summary{margin-top:12px}
    .animal-repro-summary .summary-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .animal-repro-summary .summary-item{padding:11px;border-radius:14px;background:#f7f9f7}
    .animal-repro-summary .summary-item strong{display:block;font-size:18px;margin-top:3px}
  `
  document.head.appendChild(style)
}

function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

function isPregnant(value) {
  const v = normalize(value)
  return v === 'prenhe' || v.includes('positiv')
}

function isOpen(value) {
  const v = normalize(value)
  return v === 'vazia' || v.includes('negativ') || v.includes('não prenhe') || v.includes('nao prenhe')
}

function parseDate(value) {
  if (!value) return null
  const d = new Date(`${String(value).slice(0, 10)}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function daysFromToday(value) {
  const target = parseDate(value)
  if (!target) return 99999
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function formatDate(value) {
  if (!value) return '—'
  const parts = String(value).slice(0, 10).split('-')
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(value)
}

function cowNumberFromCard(card) {
  const fromDataset = card.dataset.id
  if (fromDataset) return String(fromDataset).trim()
  const match = card.innerText.match(/🐄\s*([^\s]+)/)
  return match ? String(match[1]).trim() : ''
}

async function loadData() {
  if (Date.now() - cache.at < CACHE_TTL && cache.animals.length) return cache
  const supabase = window.lavouraSupabase
  if (!supabase) return cache

  const [animalsResponse, reproductionResponse] = await Promise.all([
    supabase.from('animals').select('id, number, name, breed, status, last_calving_date'),
    supabase
      .from('reproduction')
      .select('id, animal_id, event_type, event_date, bull, semen_type, result, expected_calving, expected_dry_off')
      .order('event_date', { ascending: false })
  ])

  if (animalsResponse.error || reproductionResponse.error) {
    console.error('Herd tools data:', animalsResponse.error || reproductionResponse.error)
    return cache
  }

  cache = {
    at: Date.now(),
    animals: animalsResponse.data || [],
    reproduction: reproductionResponse.data || []
  }
  return cache
}

function buildIndexes(data) {
  const animalByNumber = new Map()
  const numberById = new Map()
  for (const animal of data.animals) {
    const number = String(animal.number)
    animalByNumber.set(number, animal)
    numberById.set(String(animal.id), number)
  }

  const eventsByAnimal = new Map()
  for (const event of data.reproduction) {
    const key = String(event.animal_id)
    if (!eventsByAnimal.has(key)) eventsByAnimal.set(key, [])
    eventsByAnimal.get(key).push(event)
  }

  const stateByNumber = new Map()
  for (const animal of data.animals) {
    const events = eventsByAnimal.get(String(animal.id)) || []
    const ias = events.filter(e => e.event_type === 'IA')
    const latestIA = ias[0] || null
    const state = {
      animal,
      events,
      ias,
      latestIA,
      pregnant: Boolean(latestIA && isPregnant(latestIA.result)),
      open: Boolean(latestIA && isOpen(latestIA.result)),
      waiting: Boolean(latestIA && !latestIA.result && daysFromToday(latestIA.event_date) <= -28),
      drySoon: Boolean(latestIA && isPregnant(latestIA.result) && latestIA.expected_dry_off && daysFromToday(latestIA.expected_dry_off) >= 0 && daysFromToday(latestIA.expected_dry_off) <= 30),
      calvingSoon: Boolean(latestIA && isPregnant(latestIA.result) && latestIA.expected_calving && daysFromToday(latestIA.expected_calving) >= 0 && daysFromToday(latestIA.expected_calving) <= 30)
    }
    stateByNumber.set(String(animal.number), state)
  }

  return { animalByNumber, numberById, eventsByAnimal, stateByNumber }
}

function badgeFor(state) {
  if (!state || !state.latestIA) return null
  if (state.open) return ['❌ Vazia', 'open']
  if (state.pregnant && state.calvingSoon) return ['🔵 Parto ≤30d', 'calving']
  if (state.pregnant && state.drySoon) return ['🟠 Secagem ≤30d', 'dry']
  if (state.pregnant) return ['✅ Prenhe', 'pregnant']
  if (state.waiting) return ['🩺 Confirmar prenhez', 'wait']
  return ['🧬 IA recente', 'wait']
}

async function enhanceAnimalList(main) {
  const list = main.querySelector('#animalList')
  const search = main.querySelector('#animalSearch')
  if (!list || !search || main.dataset.herdToolsReady === '1') return

  const data = await loadData()
  const { stateByNumber } = buildIndexes(data)

  const parentCard = search.closest('.card')
  if (!parentCard) return

  const tools = document.createElement('div')
  tools.className = 'herd-tools'
  tools.innerHTML = `
    <div class="herd-tools-title">Filtrar vacas</div>
    <div class="herd-filter-row">
      <button class="herd-filter active" data-filter="all" type="button">Todas</button>
      <button class="herd-filter" data-filter="waiting" type="button">🩺 Confirmar</button>
      <button class="herd-filter" data-filter="pregnant" type="button">✅ Prenhes</button>
      <button class="herd-filter" data-filter="open" type="button">❌ Vazias</button>
      <button class="herd-filter" data-filter="drySoon" type="button">🟠 Secar ≤30d</button>
      <button class="herd-filter" data-filter="calvingSoon" type="button">🔵 Parir ≤30d</button>
    </div>
    <div class="herd-result-count"></div>
  `
  search.insertAdjacentElement('afterend', tools)

  let activeFilter = 'all'

  const apply = () => {
    const term = normalize(search.value)
    const cards = [...list.querySelectorAll('.cow-card')]
    let visible = 0

    for (const card of cards) {
      const number = cowNumberFromCard(card)
      const state = stateByNumber.get(number)
      const textMatches = !term || normalize(card.innerText).includes(term)
      const stateMatches = activeFilter === 'all' || Boolean(state?.[activeFilter])
      const show = textMatches && stateMatches
      card.style.display = show ? '' : 'none'
      if (show) visible += 1

      if (!card.querySelector('.herd-badge')) {
        const badge = badgeFor(state)
        if (badge) {
          const el = document.createElement('div')
          el.className = `herd-badge ${badge[1]}`
          el.textContent = badge[0]
          ;(card.firstElementChild || card).appendChild(el)
        }
      }
    }

    const counter = tools.querySelector('.herd-result-count')
    if (counter) counter.textContent = `${visible} animal${visible === 1 ? '' : 'ais'} visível${visible === 1 ? '' : 'eis'}`
  }

  tools.addEventListener('click', event => {
    const button = event.target.closest('[data-filter]')
    if (!button) return
    event.preventDefault()
    activeFilter = button.dataset.filter
    tools.querySelectorAll('.herd-filter').forEach(btn => btn.classList.toggle('active', btn === button))
    apply()
  })

  search.addEventListener('input', () => queueMicrotask(apply))
  main.dataset.herdToolsReady = '1'
  apply()
}

async function enhanceReproduction(main) {
  if (!main.innerText.includes('Reprodução') || main.dataset.smartReproReady === '1') return

  const data = await loadData()
  const { stateByNumber } = buildIndexes(data)
  const states = [...stateByNumber.values()]

  const urgent = states.filter(state =>
    state.waiting ||
    (state.pregnant && state.latestIA?.expected_dry_off && daysFromToday(state.latestIA.expected_dry_off) < 0) ||
    (state.pregnant && state.latestIA?.expected_calving && daysFromToday(state.latestIA.expected_calving) < 0)
  ).length

  const next7 = states.filter(state =>
    state.pregnant && (
      (state.latestIA?.expected_dry_off && daysFromToday(state.latestIA.expected_dry_off) >= 0 && daysFromToday(state.latestIA.expected_dry_off) <= 7) ||
      (state.latestIA?.expected_calving && daysFromToday(state.latestIA.expected_calving) >= 0 && daysFromToday(state.latestIA.expected_calving) <= 7)
    )
  ).length

  const pregnant = states.filter(state => state.pregnant).length
  const open = states.filter(state => state.open).length

  const stats = main.querySelector('.stats-grid')
  if (stats) {
    const summary = document.createElement('section')
    summary.className = 'repro-smart-summary'
    summary.innerHTML = `
      <div class="repro-smart-card urgent"><div class="repro-smart-number">${urgent}</div><div class="repro-smart-label">🔴 Prioridades</div></div>
      <div class="repro-smart-card soon"><div class="repro-smart-number">${next7}</div><div class="repro-smart-label">⏱ Próximos 7 dias</div></div>
      <div class="repro-smart-card"><div class="repro-smart-number">${pregnant}</div><div class="repro-smart-label">✅ Prenhes confirmadas</div></div>
      <div class="repro-smart-card"><div class="repro-smart-number">${open}</div><div class="repro-smart-label">❌ Vazias / reinseminar</div></div>
    `
    stats.insertAdjacentElement('afterend', summary)
  }

  main.dataset.smartReproReady = '1'
}

async function enhanceAnimalDetail(main) {
  const title = main.querySelector('h1')
  if (!title || !title.innerText.includes('🐄') || main.querySelector('#animalList') || main.dataset.animalSummaryReady === '1') return

  const match = title.innerText.match(/🐄\s*([^\s]+)/)
  const number = match ? String(match[1]).trim() : ''
  if (!number) return

  const data = await loadData()
  const { stateByNumber } = buildIndexes(data)
  const state = stateByNumber.get(number)
  if (!state) return

  const infoCards = [...main.querySelectorAll('.card')]
  const reproductionCard = infoCards.find(card => normalize(card.querySelector('h2')?.innerText).includes('reprodução'))
  if (!reproductionCard) return

  const latest = state.latestIA
  const diasIA = latest ? Math.max(0, -daysFromToday(latest.event_date)) : null
  const lastDiagnosis = latest?.result || 'Por confirmar'

  const summary = document.createElement('section')
  summary.className = 'card animal-repro-summary'
  summary.innerHTML = `
    <h2>📊 Resumo reprodutivo</h2>
    <div class="summary-grid">
      <div class="summary-item"><span class="muted">IA registadas</span><strong>${state.ias.length}</strong></div>
      <div class="summary-item"><span class="muted">Estado</span><strong>${state.pregnant ? '✅ Prenhe' : state.open ? '❌ Vazia' : latest ? '🩺 A confirmar' : '—'}</strong></div>
      <div class="summary-item"><span class="muted">Dias desde IA</span><strong>${diasIA ?? '—'}</strong></div>
      <div class="summary-item"><span class="muted">Último resultado</span><strong>${lastDiagnosis}</strong></div>
    </div>
    ${latest?.expected_dry_off ? `<p class="muted" style="margin-bottom:4px">Secagem prevista: <strong>${formatDate(latest.expected_dry_off)}</strong></p>` : ''}
    ${latest?.expected_calving ? `<p class="muted" style="margin-top:0">Parto previsto: <strong>${formatDate(latest.expected_calving)}</strong></p>` : ''}
  `
  reproductionCard.insertAdjacentElement('afterend', summary)
  main.dataset.animalSummaryReady = '1'
}

async function enhance() {
  ensureStyle()
  const main = document.querySelector('#app main')
  if (!main) return

  await Promise.all([
    enhanceAnimalList(main),
    enhanceReproduction(main),
    enhanceAnimalDetail(main)
  ])
}

function schedule() {
  if (queued) return
  queued = true
  queueMicrotask(async () => {
    queued = false
    try {
      await enhance()
    } catch (error) {
      console.error('Herd tools:', error)
    }
  })
}

new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true })
schedule()
