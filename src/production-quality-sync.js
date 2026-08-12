const FARM_ID = '72bb5d54-f614-4394-8da9-7113a8e48a29'

let lastAnalysisKey = ''
let requestInFlight = false

function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined || value === '') return '—'
  const number = Number(value)
  if (!Number.isFinite(number)) return '—'

  return number.toLocaleString('pt-PT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

function productionQualityCard() {
  const title = Array.from(document.querySelectorAll('h1'))
    .find(element => element.textContent?.includes('Produção'))

  if (!title) return null

  return Array.from(document.querySelectorAll('.card'))
    .find(card => card.querySelector('h2')?.textContent?.includes('Qualidade')) || null
}

function updateRow(card, label, value) {
  const rows = Array.from(card.querySelectorAll('.detail-row'))
  const row = rows.find(item => item.querySelector('span')?.textContent?.trim() === label)
  const strong = row?.querySelector('strong')
  if (strong) strong.textContent = value
}

async function syncLatestAnalysis() {
  const card = productionQualityCard()
  const supabase = window.lavouraSupabase

  if (!card || !supabase || requestInFlight) return

  requestInFlight = true

  try {
    const { data, error } = await supabase
      .from('milk_analyses')
      .select('id, analysis_date, fat, protein, somatic_cells, ufc')
      .eq('farm_id', FARM_ID)
      .order('analysis_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) return

    const analysisKey = `${data.id || ''}:${data.analysis_date || ''}`
    if (analysisKey === lastAnalysisKey && card.dataset.qualitySynced === analysisKey) return

    updateRow(card, 'Gordura', `${formatNumber(data.fat, 2)}%`)
    updateRow(card, 'Proteína', `${formatNumber(data.protein, 2)}%`)
    updateRow(card, 'Células somáticas', formatNumber(data.somatic_cells, 0))
    updateRow(card, 'UFC', formatNumber(data.ufc, 0))

    card.dataset.qualitySynced = analysisKey
    lastAnalysisKey = analysisKey

    let source = card.querySelector('[data-quality-source]')
    if (!source) {
      source = document.createElement('p')
      source.className = 'muted'
      source.dataset.qualitySource = 'latest-analysis'
      source.style.marginBottom = '0'
      card.appendChild(source)
    }

    source.textContent = data.analysis_date
      ? `Última análise: ${data.analysis_date.split('-').reverse().join('/')}`
      : 'Valores da última análise do leite'
  } finally {
    requestInFlight = false
  }
}

const observer = new MutationObserver(() => {
  void syncLatestAnalysis()
})

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
})

window.addEventListener('load', () => {
  void syncLatestAnalysis()
})

void syncLatestAnalysis()
