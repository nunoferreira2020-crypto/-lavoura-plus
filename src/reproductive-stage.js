const STYLE_ID = 'reproductive-stage-style'

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .repro-stage{display:inline-flex;align-items:center;margin-top:8px;padding:5px 9px;border-radius:999px;background:#edf5ee;color:#245f38;font-size:12px;font-weight:800;letter-spacing:.01em}
    .repro-stage.wait{background:#fff7df;color:#7b5b00}
    .repro-stage.pregnant{background:#e8f4ec;color:#23633a}
    .repro-stage.dry{background:#fff0df;color:#8a4e00}
    .repro-stage.calving{background:#eaf2ff;color:#285b9a}
    .repro-stage.open{background:#f6ecec;color:#8b3333}
  `
  document.head.appendChild(style)
}

function normalizedResult(value) {
  return String(value || '').trim().toLowerCase()
}

function isPregnant(value) {
  const result = normalizedResult(value)
  return result === 'prenhe' || result.includes('positiv')
}

function isOpen(value) {
  const result = normalizedResult(value)
  return result === 'vazia' || result.includes('negativ') || result.includes('não prenhe') || result.includes('nao prenhe')
}

function stageFor(card, sectionTitle) {
  const text = card.innerText.toLowerCase()

  if (sectionTitle.includes('diagnóst') || sectionTitle.includes('confirma')) {
    return { label: '🩺 Prenhez por confirmar', cls: 'wait' }
  }

  if (sectionTitle.includes('secagens')) {
    return { label: '🟠 Prenhe · secagem prevista', cls: 'dry' }
  }

  if (sectionTitle.includes('partos')) {
    return { label: '🔵 Prenhe · parto previsto', cls: 'calving' }
  }

  if (sectionTitle.includes('últimas ia')) {
    if (text.includes('resultado:') && text.includes('prenhe')) {
      return { label: '✅ Prenhe confirmada', cls: 'pregnant' }
    }

    if (text.includes('vazia') || text.includes('negativ')) {
      return { label: '↻ Vazia · nova IA necessária', cls: 'open' }
    }

    return { label: '🧬 Inseminada · aguarda confirmação', cls: 'wait' }
  }

  return null
}

function enhanceStages() {
  ensureStyle()

  const main = document.querySelector('#app main')
  if (!main || !main.innerText.includes('Reprodução')) return

  main.querySelectorAll('.card').forEach(section => {
    const heading = section.querySelector('h2')
    if (!heading) return

    const title = heading.innerText.toLowerCase()

    section.querySelectorAll('.cow-card').forEach(card => {
      if (card.querySelector('.repro-stage')) return

      const stage = stageFor(card, title)
      if (!stage) return

      const left = card.firstElementChild || card
      const badge = document.createElement('div')
      badge.className = `repro-stage ${stage.cls}`
      badge.textContent = stage.label
      left.appendChild(badge)
    })
  })
}

function cowNumberFromCard(card) {
  const match = card.innerText.match(/🐄\s*([^\s]+)/)
  return match ? String(match[1]).trim() : ''
}

function findSection(main, fragment) {
  return [...main.querySelectorAll('.card')].find(section => {
    const heading = section.querySelector('h2')
    return heading && heading.innerText.toLowerCase().includes(fragment)
  })
}

function updateStat(main, label, value) {
  const stat = [...main.querySelectorAll('.stat-card')].find(card =>
    card.innerText.toLowerCase().includes(label)
  )

  const number = stat?.querySelector('.stat-number')
  if (number) number.textContent = String(value)
}

async function syncConfirmedPregnancies(main) {
  if (!main || main.dataset.pregnancyFiltered === 'loading') return

  const supabase = window.lavouraSupabase
  if (!supabase) return

  main.dataset.pregnancyFiltered = 'loading'

  try {
    const [animalsResponse, reproductionResponse] = await Promise.all([
      supabase
        .from('animals')
        .select('id, number'),
      supabase
        .from('reproduction')
        .select('id, animal_id, event_type, event_date, result, expected_calving, expected_dry_off')
        .eq('event_type', 'IA')
        .order('event_date', { ascending: false })
    ])

    if (animalsResponse.error || reproductionResponse.error) {
      main.dataset.pregnancyFiltered = 'error'
      return
    }

    const numberByAnimalId = new Map(
      (animalsResponse.data || []).map(animal => [String(animal.id), String(animal.number)])
    )

    const latestByAnimal = new Map()

    for (const record of reproductionResponse.data || []) {
      const key = String(record.animal_id)
      if (!latestByAnimal.has(key)) latestByAnimal.set(key, record)
    }

    const confirmedNumbers = new Set()
    let dryOffCount = 0
    let calvingCount = 0
    const staleOpenForecasts = []

    for (const [animalId, record] of latestByAnimal) {
      const number = numberByAnimalId.get(animalId)
      if (!number) continue

      if (isPregnant(record.result)) {
        confirmedNumbers.add(number)
        if (record.expected_dry_off) dryOffCount += 1
        if (record.expected_calving) calvingCount += 1
      } else if (isOpen(record.result) && (record.expected_dry_off || record.expected_calving)) {
        staleOpenForecasts.push(record.id)
      }
    }

    if (staleOpenForecasts.length) {
      await Promise.all(
        staleOpenForecasts.map(id =>
          supabase
            .from('reproduction')
            .update({ expected_dry_off: null, expected_calving: null })
            .eq('id', id)
        )
      )
    }

    const drySection = findSection(main, 'secagens')
    const calvingSection = findSection(main, 'partos')

    for (const section of [drySection, calvingSection]) {
      if (!section) continue

      section.querySelectorAll('.cow-card').forEach(card => {
        const number = cowNumberFromCard(card)
        if (number && !confirmedNumbers.has(number)) card.remove()
      })

      if (!section.querySelector('.cow-card') && !section.querySelector('[data-empty-confirmed]')) {
        const empty = document.createElement('p')
        empty.className = 'muted'
        empty.dataset.emptyConfirmed = '1'
        empty.textContent = section === drySection
          ? 'Sem secagens previstas de vacas com prenhez confirmada.'
          : 'Sem partos previstos de vacas com prenhez confirmada.'
        section.appendChild(empty)
      }
    }

    updateStat(main, 'secagens', dryOffCount)
    updateStat(main, 'partos', calvingCount)

    main.dataset.pregnancyFiltered = 'done'
    enhanceStages()
  } catch (error) {
    console.error('Filtro de prenhez:', error)
    main.dataset.pregnancyFiltered = 'error'
  }
}

function enhance() {
  enhanceStages()

  const main = document.querySelector('#app main')
  if (!main || !main.innerText.includes('Reprodução')) return

  if (!main.dataset.pregnancyFiltered) {
    syncConfirmedPregnancies(main)
  }
}

let queued = false

function schedule() {
  if (queued) return
  queued = true

  queueMicrotask(() => {
    queued = false
    enhance()
  })
}

new MutationObserver(schedule).observe(document.body, {
  childList: true,
  subtree: true
})

enhance()
