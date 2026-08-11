const TIMELINE_STYLE_ID = 'reproductive-timeline-style'

function ensureTimelineStyle() {
  if (document.getElementById(TIMELINE_STYLE_ID)) return

  const style = document.createElement('style')
  style.id = TIMELINE_STYLE_ID
  style.textContent = `
    .repro-time-group{margin:18px 0 8px;padding:7px 10px;border-radius:10px;background:#f1f5f1;color:#53685a;font-size:12px;font-weight:900;letter-spacing:.04em;text-transform:uppercase}
    .repro-time-group.week{background:#fff3df;color:#8a5600}
    .repro-time-group.month{background:#eef5ff;color:#3d618d}
    .repro-time-group.later{background:#f2f4f2;color:#637067}
    .repro-hidden-past{display:none!important}
  `

  document.head.appendChild(style)
}

function isTimelineReproductionScreen(main) {
  const title = main?.querySelector('h1')?.innerText || ''
  return title.includes('Reprodução')
}

function timelineSection(main, text) {
  return [...main.querySelectorAll('.card')].find(section => {
    const heading = section.querySelector('h2')?.innerText.toLowerCase() || ''
    return heading.includes(text)
  })
}

function parsePtDate(text) {
  const match = String(text || '').match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (!match) return null

  const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]))
  date.setHours(0, 0, 0, 0)
  return Number.isNaN(date.getTime()) ? null : date
}

function daysUntilDate(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((date.getTime() - today.getTime()) / 86400000)
}

function groupForDays(days) {
  if (days >= 0 && days <= 7) {
    return { key: 'week', label: '🔥 Esta semana' }
  }

  if (days >= 8 && days <= 30) {
    return { key: 'month', label: '📅 Próximos 30 dias' }
  }

  if (days > 30) {
    return { key: 'later', label: '🗓️ Mais tarde' }
  }

  return null
}

function organizeTimelineSection(section) {
  if (!section || section.dataset.timelineOrganized === 'done') return

  section.querySelectorAll('.repro-time-group').forEach(item => item.remove())

  const cards = [...section.querySelectorAll('.cow-card')]
  if (!cards.length) {
    section.dataset.timelineOrganized = 'done'
    return
  }

  const groups = { week: [], month: [], later: [] }

  for (const card of cards) {
    card.classList.remove('repro-hidden-past')

    const dateText = card.querySelector('.right strong')?.innerText || card.innerText
    const date = parsePtDate(dateText)
    if (!date) continue

    const days = daysUntilDate(date)
    const group = groupForDays(days)

    if (!group) {
      card.classList.add('repro-hidden-past')
      continue
    }

    groups[group.key].push({ card, date })
  }

  const visible = Object.values(groups).flat()
  if (!visible.length) {
    const empty = document.createElement('p')
    empty.className = 'muted'
    empty.dataset.timelineEmpty = '1'
    empty.textContent = 'Sem eventos futuros nesta lista.'
    section.appendChild(empty)
    section.dataset.timelineOrganized = 'done'
    return
  }

  section.querySelector('[data-timeline-empty]')?.remove()

  for (const group of [
    { key: 'week', label: '🔥 Esta semana' },
    { key: 'month', label: '📅 Próximos 30 dias' },
    { key: 'later', label: '🗓️ Mais tarde' }
  ]) {
    const items = groups[group.key]
    if (!items.length) continue

    items.sort((a, b) => a.date - b.date)

    const heading = document.createElement('div')
    heading.className = `repro-time-group ${group.key}`
    heading.textContent = `${group.label} · ${items.length}`
    section.appendChild(heading)

    for (const item of items) {
      section.appendChild(item.card)
    }
  }

  section.dataset.timelineOrganized = 'done'
}

function organizeReproductiveTimeline() {
  ensureTimelineStyle()

  const main = document.querySelector('#app main')
  if (!isTimelineReproductionScreen(main)) return

  const dry = timelineSection(main, 'próximas secagens')
  const calving = timelineSection(main, 'próximos partos')

  organizeTimelineSection(dry)
  organizeTimelineSection(calving)
}

let timelineQueued = false
function scheduleReproductiveTimeline() {
  if (timelineQueued) return
  timelineQueued = true

  setTimeout(() => {
    timelineQueued = false
    organizeReproductiveTimeline()
  }, 80)
}

new MutationObserver(scheduleReproductiveTimeline).observe(document.body, {
  childList: true,
  subtree: true
})

scheduleReproductiveTimeline()
