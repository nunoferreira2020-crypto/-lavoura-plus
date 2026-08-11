const TIMELINE_STYLE_ID = 'reproductive-timeline-style'

function ensureTimelineStyle() {
  if (document.getElementById(TIMELINE_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = TIMELINE_STYLE_ID
  style.textContent = `
    .repro-timeline{margin-top:12px}
    .repro-time-group{margin:18px 0 10px;padding:8px 11px;border-radius:10px;font-size:12px;font-weight:900;letter-spacing:.04em;text-transform:uppercase}
    .repro-time-group.week{background:#fff3df;color:#8a5600}
    .repro-time-group.month{background:#eef5ff;color:#3d618d}
    .repro-time-group.later{background:#f2f4f2;color:#637067}
    .repro-event-card{margin-top:10px}
    .repro-event-card .event-kind{font-weight:900}
    .repro-event-card .event-date{font-weight:900;font-size:18px}
    .repro-event-card .event-days{margin-top:3px}
    .repro-timeline-empty{margin-top:14px;color:#748477}
  `
  document.head.appendChild(style)
}

function isTimelineReproductionScreen(main) {
  return (main?.querySelector('h1')?.innerText || '').includes('Reprodução')
}

function timelineSection(main, text) {
  return [...main.querySelectorAll('.card')].find(section =>
    (section.querySelector('h2')?.innerText.toLowerCase() || '').includes(text)
  )
}

function normalizeTimelineResult(value) {
  return String(value || '').trim().toLowerCase()
}

function timelineIsPregnant(value) {
  const result = normalizeTimelineResult(value)
  return result === 'prenhe' || result.includes('positiv')
}

function dateFromIso(value) {
  if (!value) return null
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatTimelineDate(value) {
  const date = dateFromIso(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(date)
}

function daysUntilIso(value) {
  const date = dateFromIso(value)
  if (!date) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((date.getTime() - today.getTime()) / 86400000)
}

function groupForDays(days) {
  if (days === null || days < 0) return null
  if (days <= 7) return 'week'
  if (days <= 30) return 'month'
  return 'later'
}

function daysLabel(days) {
  if (days === 0) return 'hoje'
  if (days === 1) return 'amanhã'
  return `em ${days} dias`
}

function clearTimelineSection(section) {
  if (!section) return
  const heading = section.querySelector('h2')
  for (const child of [...section.children]) {
    if (child !== heading) child.remove()
  }
}

function buildEventCard(item, kind) {
  const card = document.createElement('section')
  card.className = 'cow-card alerta repro-event-card'
  card.dataset.action = 'detalhe'
  card.dataset.id = String(item.animal.number)
  card.dataset.voltar = 'reproducao'

  const icon = kind === 'dry' ? '🟠' : '🔵'
  const label = kind === 'dry' ? 'Secagem' : 'Parto'
  const dateValue = kind === 'dry' ? item.record.expected_dry_off : item.record.expected_calving
  const days = daysUntilIso(dateValue)

  card.innerHTML = `
    <div>
      <strong class="event-kind">${icon} ${label}</strong>
      <div>🐄 ${item.animal.number}</div>
      <div class="muted">${item.animal.breed || '—'}</div>
    </div>
    <div class="right">
      <strong class="event-date">${formatTimelineDate(dateValue)}</strong>
      <div class="muted event-days">${daysLabel(days)}</div>
      <div class="muted">PRENHE CONFIRMADA</div>
    </div>
  `

  return card
}

function renderTimelineSection(section, items, kind) {
  if (!section) return
  clearTimelineSection(section)

  const dateField = kind === 'dry' ? 'expected_dry_off' : 'expected_calving'
  const future = items
    .map(item => ({ ...item, days: daysUntilIso(item.record[dateField]) }))
    .filter(item => item.days !== null && item.days >= 0)
    .sort((a, b) => a.days - b.days)

  if (!future.length) {
    const empty = document.createElement('p')
    empty.className = 'muted repro-timeline-empty'
    empty.textContent = kind === 'dry'
      ? 'Sem secagens futuras de vacas com prenhez confirmada.'
      : 'Sem partos futuros de vacas com prenhez confirmada.'
    section.appendChild(empty)
    return
  }

  const timeline = document.createElement('div')
  timeline.className = 'repro-timeline'

  const groups = { week: [], month: [], later: [] }
  for (const item of future) groups[groupForDays(item.days)].push(item)

  for (const [key, label] of [
    ['week', '🔥 Esta semana'],
    ['month', '📅 Próximos 30 dias'],
    ['later', '🗓️ Mais tarde']
  ]) {
    const groupItems = groups[key]
    if (!groupItems.length) continue

    const groupHeading = document.createElement('div')
    groupHeading.className = `repro-time-group ${key}`
    groupHeading.textContent = `${label} · ${groupItems.length}`
    timeline.appendChild(groupHeading)

    for (const item of groupItems) {
      timeline.appendChild(buildEventCard(item, kind))
    }
  }

  section.appendChild(timeline)
}

async function renderConfirmedTimeline(main) {
  if (!isTimelineReproductionScreen(main)) return
  if (main.dataset.confirmedTimeline === 'loading' || main.dataset.confirmedTimeline === 'done') return

  const supabase = window.lavouraSupabase
  if (!supabase) return
  main.dataset.confirmedTimeline = 'loading'

  try {
    const [animalsResponse, reproductionResponse] = await Promise.all([
      supabase.from('animals').select('id, number, breed'),
      supabase
        .from('reproduction')
        .select('id, animal_id, event_type, event_date, result, expected_dry_off, expected_calving')
        .eq('event_type', 'IA')
        .order('event_date', { ascending: false })
    ])

    if (animalsResponse.error) throw animalsResponse.error
    if (reproductionResponse.error) throw reproductionResponse.error

    const animalById = new Map(
      (animalsResponse.data || []).map(animal => [String(animal.id), animal])
    )

    const latestByAnimal = new Map()
    for (const record of reproductionResponse.data || []) {
      const key = String(record.animal_id)
      if (!latestByAnimal.has(key)) latestByAnimal.set(key, record)
    }

    const confirmed = []
    for (const [animalId, record] of latestByAnimal) {
      if (!timelineIsPregnant(record.result)) continue
      const animal = animalById.get(animalId)
      if (!animal) continue
      confirmed.push({ animal, record })
    }

    renderTimelineSection(timelineSection(main, 'próximas secagens'), confirmed, 'dry')
    renderTimelineSection(timelineSection(main, 'próximos partos'), confirmed, 'calving')

    main.dataset.confirmedTimeline = 'done'
  } catch (error) {
    console.error('Timeline reprodutiva confirmada:', error)
    main.dataset.confirmedTimeline = 'error'
  }
}

function scheduleConfirmedTimeline() {
  setTimeout(() => {
    const main = document.querySelector('#app main')
    renderConfirmedTimeline(main)
  }, 180)
}

ensureTimelineStyle()
new MutationObserver(scheduleConfirmedTimeline).observe(document.body, { childList: true, subtree: true })
scheduleConfirmedTimeline()
