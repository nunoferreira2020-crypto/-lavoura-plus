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
    .repro-timeline .cow-card{display:block!important;margin-top:10px}
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
  if (days >= 0 && days <= 7) return 'week'
  if (days >= 8 && days <= 30) return 'month'
  if (days > 30) return 'later'
  return null
}

function organizeTimelineSection(section) {
  if (!section) return

  const oldTimeline = section.querySelector('[data-repro-timeline]')
  if (oldTimeline) oldTimeline.remove()

  const cards = [...section.querySelectorAll(':scope > .cow-card')]
  const originalEmpty = [...section.querySelectorAll(':scope > p.muted')]

  if (!cards.length) return

  const groups = { week: [], month: [], later: [] }

  for (const card of cards) {
    const date = parsePtDate(card.innerText)
    if (!date) continue
    const group = groupForDays(daysUntilDate(date))
    if (!group) {
      card.remove()
      continue
    }
    groups[group].push({ card, date })
  }

  const visibleCount = Object.values(groups).reduce((sum, items) => sum + items.length, 0)
  const timeline = document.createElement('div')
  timeline.className = 'repro-timeline'
  timeline.dataset.reproTimeline = '1'

  if (!visibleCount) {
    originalEmpty.forEach(p => { p.style.display = '' })
    return
  }

  originalEmpty.forEach(p => { p.style.display = 'none' })

  const definitions = [
    ['week', '🔥 Esta semana'],
    ['month', '📅 Próximos 30 dias'],
    ['later', '🗓️ Mais tarde']
  ]

  for (const [key, label] of definitions) {
    const items = groups[key]
    if (!items.length) continue
    items.sort((a, b) => a.date - b.date)

    const heading = document.createElement('div')
    heading.className = `repro-time-group ${key}`
    heading.textContent = `${label} · ${items.length}`
    timeline.appendChild(heading)

    for (const item of items) timeline.appendChild(item.card)
  }

  section.appendChild(timeline)
}

function organizeReproductiveTimeline() {
  ensureTimelineStyle()
  const main = document.querySelector('#app main')
  if (!isTimelineReproductionScreen(main)) return
  organizeTimelineSection(timelineSection(main, 'próximas secagens'))
  organizeTimelineSection(timelineSection(main, 'próximos partos'))
}

let timelineQueued = false
function scheduleReproductiveTimeline() {
  if (timelineQueued) return
  timelineQueued = true
  setTimeout(() => {
    timelineQueued = false
    organizeReproductiveTimeline()
  }, 120)
}

new MutationObserver(scheduleReproductiveTimeline).observe(document.body, { childList: true, subtree: true })
scheduleReproductiveTimeline()
