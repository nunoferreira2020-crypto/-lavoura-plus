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
    .pregnancy-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px;width:100%}
    .pregnancy-actions button{margin:0;padding:12px 10px;border-radius:14px;font-size:15px;font-weight:800;line-height:1.1}
    .pregnancy-actions .pregnant-btn{background:#2f7d46;color:#fff;border:0}
    .pregnancy-actions .open-btn{background:#fff1f1;color:#8b3333;border:1px solid #e7baba}
    .pregnancy-actions button:disabled{opacity:.55}
    .open-cow-priority{border-left-color:#c94b4b!important}
    .open-cow-priority .open-priority-label{color:#8b3333;font-weight:800}
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

async function saveDiagnosis(cowNumber, result, buttons) {
  const supabase = window.lavouraSupabase
  if (!supabase || !cowNumber) return

  const confirmed = window.confirm(
    `Confirmar vaca ${cowNumber} como ${result.toUpperCase()}?`
  )

  if (!confirmed) return

  buttons.forEach(button => { button.disabled = true })

  try {
    const animalResponse = await supabase
      .from('animals')
      .select('id, number')
      .eq('number', cowNumber)
      .limit(1)
      .maybeSingle()

    if (animalResponse.error || !animalResponse.data) {
      throw animalResponse.error || new Error('Vaca não encontrada.')
    }

    const iaResponse = await supabase
      .from('reproduction')
      .select('id, event_date, expected_calving, expected_dry_off')
      .eq('animal_id', animalResponse.data.id)
      .eq('event_type', 'IA')
      .order('event_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (iaResponse.error || !iaResponse.data) {
      throw iaResponse.error || new Error('IA não encontrada.')
    }

    const payload = result === 'Vazia'
      ? { result, expected_calving: null, expected_dry_off: null }
      : { result }

    const updateResponse = await supabase
      .from('reproduction')
      .update(payload)
      .eq('id', iaResponse.data.id)

    if (updateResponse.error) throw updateResponse.error

    window.alert(`✅ Diagnóstico guardado: ${result}`)
    window.location.reload()
  } catch (error) {
    console.error('Diagnóstico direto:', error)
    window.alert('Não foi possível guardar o diagnóstico. Tente novamente.')
    buttons.forEach(button => { button.disabled = false })
  }
}

function addDiagnosisButtons(main) {
  const section = findSection(main, 'confirmações de prenhez') || findSection(main, 'diagnósticos pendentes')
  if (!section) return

  section.querySelectorAll('.cow-card').forEach(card => {
    if (card.querySelector('.pregnancy-actions')) return

    const cowNumber = cowNumberFromCard(card)
    if (!cowNumber) return

    const actions = document.createElement('div')
    actions.className = 'pregnancy-actions'
    actions.innerHTML = `
      <button type="button" class="pregnant-btn">✅ Prenhe</button>
      <button type="button" class="open-btn">❌ Vazia</button>
    `

    const buttons = [...actions.querySelectorAll('button')]

    actions.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
    })

    actions.querySelector('.pregnant-btn').addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      saveDiagnosis(cowNumber, 'Prenhe', buttons)
    })

    actions.querySelector('.open-btn').addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      saveDiagnosis(cowNumber, 'Vazia', buttons)
    })

    const left = card.firstElementChild || card
    left.appendChild(actions)
  })
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
    addDiagnosisButtons(main)
  } catch (error) {
    console.error('Filtro de prenhez:', error)
    main.dataset.pregnancyFiltered = 'error'
  }
}

function formatDatePt(value) {
  if (!value) return '—'
  const parts = String(value).split('-')
  if (parts.length !== 3) return String(value)
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

function priorityHeading(main) {
  return [...main.querySelectorAll('h2')].find(heading =>
    heading.innerText.trim().toLowerCase() === 'prioridades'
  )
}

async function addOpenCowPriorities(main) {
  if (!main || main.dataset.openCowPriorities === 'loading' || main.dataset.openCowPriorities === 'done') return

  const heading = priorityHeading(main)
  if (!heading) return

  const supabase = window.lavouraSupabase
  if (!supabase) return

  main.dataset.openCowPriorities = 'loading'

  try {
    const [animalsResponse, reproductionResponse] = await Promise.all([
      supabase.from('animals').select('id, number, breed'),
      supabase
        .from('reproduction')
        .select('id, animal_id, event_type, event_date, result')
        .eq('event_type', 'IA')
        .order('event_date', { ascending: false })
    ])

    if (animalsResponse.error || reproductionResponse.error) {
      main.dataset.openCowPriorities = 'error'
      return
    }

    const animalById = new Map(
      (animalsResponse.data || []).map(animal => [String(animal.id), animal])
    )

    const latestByAnimal = new Map()
    for (const record of reproductionResponse.data || []) {
      const key = String(record.animal_id)
      if (!latestByAnimal.has(key)) latestByAnimal.set(key, record)
    }

    const openCows = []
    for (const [animalId, record] of latestByAnimal) {
      if (!isOpen(record.result)) continue
      const animal = animalById.get(animalId)
      if (!animal) continue
      openCows.push({ animal, record })
    }

    openCows.sort((a, b) => String(a.animal.number).localeCompare(String(b.animal.number), undefined, { numeric: true }))

    for (const item of [...openCows].reverse()) {
      const number = String(item.animal.number)
      if (main.querySelector(`[data-open-cow="${CSS.escape(number)}"]`)) continue

      const card = document.createElement('section')
      card.className = 'cow-card alerta open-cow-priority'
      card.dataset.action = 'detalhe'
      card.dataset.id = number
      card.dataset.voltar = 'inicio'
      card.dataset.openCow = number

      card.innerHTML = `
        <div>
          <strong>🔴 Nova IA necessária</strong>
          <div>🐄 ${number}</div>
          <div class="muted">${item.animal.breed || '—'}</div>
        </div>
        <div class="right">
          <strong>${formatDatePt(item.record.event_date)}</strong>
          <div class="open-priority-label">VAZIA</div>
          <div class="muted">REINSEMINAR</div>
        </div>
      `

      heading.insertAdjacentElement('afterend', card)
    }

    main.dataset.openCowPriorities = 'done'
  } catch (error) {
    console.error('Prioridades de vacas vazias:', error)
    main.dataset.openCowPriorities = 'error'
  }
}

function enhance() {
  ensureStyle()

  const main = document.querySelector('#app main')
  if (!main) return

  if (main.innerText.includes('Reprodução')) {
    enhanceStages()
    addDiagnosisButtons(main)

    if (!main.dataset.pregnancyFiltered) {
      syncConfirmedPregnancies(main)
    }
  }

  if (priorityHeading(main)) {
    addOpenCowPriorities(main)
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
