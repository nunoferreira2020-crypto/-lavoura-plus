import './milk-ocr.css'

const FIELD_MAP = {
  analysis_date: 'analysisDate',
  fat: 'analysisFat',
  protein: 'analysisProtein',
  somatic_cells: 'analysisSomaticCells',
  cfu: 'analysisCfu'
}

let tesseractPromise

function getMessage() {
  return document.querySelector('#fotografiaAnaliseMensagem')
}

function setMessage(text, type = '') {
  const message = getMessage()
  if (!message) return
  message.textContent = text
  message.classList.remove('loading', 'error')
  message.classList.add('milk-ocr-message')
  if (type) message.classList.add(type)
}

function clearRecognizedState() {
  document.querySelectorAll('.ocr-recognized').forEach(field => field.classList.remove('ocr-recognized'))
}

function ensureRecognitionButton() {
  const fileInput = document.querySelector('#fotografiaAnaliseLeite')
  if (!fileInput || fileInput.dataset.ocrReady === 'true') return

  fileInput.dataset.ocrReady = 'true'
  fileInput.setAttribute('accept', 'image/*')
  fileInput.removeAttribute('capture')

  const photoButton = document.querySelector('[data-action="fotografia-analise-leite"]')
  if (!photoButton) return
  photoButton.textContent = '🖼️ Escolher fotografia ou captura de ecrã'

  let recognizeButton = document.querySelector('#processarFotografiaAnalise')
  if (!recognizeButton) {
    recognizeButton = document.createElement('button')
    recognizeButton.id = 'processarFotografiaAnalise'
    recognizeButton.type = 'button'
    recognizeButton.hidden = true
    recognizeButton.className = 'milk-ocr-button'
    recognizeButton.textContent = '✨ Ler novamente'
    photoButton.insertAdjacentElement('afterend', recognizeButton)
  }

  setMessage('Leitura gratuita no próprio telemóvel. Escolha uma captura do GIL Açores e confirme os valores antes de guardar.')
}

function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract)
  if (tesseractPromise) return tesseractPromise

  tesseractPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
    script.async = true
    script.onload = () => resolve(window.Tesseract)
    script.onerror = () => reject(new Error('Não foi possível carregar o leitor gratuito. Verifique a internet e tente novamente.'))
    document.head.appendChild(script)
  })
  return tesseractPromise
}

function normalizeNumber(value) {
  if (!value) return null
  const number = Number(String(value).replace(',', '.'))
  return Number.isFinite(number) ? number : null
}

function parseMilkText(text) {
  const clean = text.replace(/\r/g, '').replace(/[|]/g, ' ')
  const lines = clean.split('\n').map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const fields = {}

  const labeledNumber = (labels, integer = false) => {
    const labelPattern = labels.join('|')
    const regex = new RegExp(`(?:${labelPattern})[^0-9]{0,20}([0-9]+(?:[.,][0-9]+)?)`, 'i')
    const match = clean.match(regex)
    if (!match) return null
    const value = normalizeNumber(match[1])
    return integer && value !== null ? Math.round(value) : value
  }

  fields.fat = labeledNumber(['MG', 'gordura', 'mat[eé]ria\\s+gorda'])
  fields.protein = labeledNumber(['MP', 'prote[ií]na'])
  fields.somatic_cells = labeledNumber(['c[eé]lulas\\s+som[aá]ticas', 'som[aá]ticas', 'CCS'], true)
  fields.cfu = labeledNumber(['UFC', 'germes', 'contagem\\s+total'], true)

  const dateMatch = clean.match(/\b(20\d{2})[-\/]([01]?\d)[-\/]([0-3]?\d)\b/) || clean.match(/\b([0-3]?\d)[-\/]([01]?\d)[-\/](20\d{2})\b/)
  if (dateMatch) {
    if (dateMatch[1].length === 4) fields.analysis_date = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
    else fields.analysis_date = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`
  }

  // GIL Açores: screenshots de tabela usam cabeçalhos MG e MP. Quando o OCR
  // preserva a linha, aproveitamos o último par plausível visível.
  if ((fields.fat == null || fields.protein == null) && /\bMG\b/i.test(clean) && /\bMP\b/i.test(clean)) {
    const candidates = []
    for (const line of lines) {
      const nums = [...line.matchAll(/\b([2-6][.,]\d{1,2})\b/g)].map(m => normalizeNumber(m[1]))
      if (nums.length >= 2) candidates.push(nums)
    }
    const pair = candidates.at(-1)
    if (pair) {
      if (fields.fat == null) fields.fat = pair[0]
      if (fields.protein == null) fields.protein = pair[1]
    }
  }

  return fields
}

function fillField(fieldName, value, recognized) {
  if (value == null) return
  const input = document.querySelector(`#${FIELD_MAP[fieldName]}`)
  if (!input) return
  input.value = String(value)
  input.classList.add('ocr-recognized')
  recognized.push(fieldName)
}

async function recognizeMilkReport() {
  const input = document.querySelector('#fotografiaAnaliseLeite')
  const button = document.querySelector('#processarFotografiaAnalise')
  const file = input?.files?.[0]
  if (!file) {
    setMessage('Escolha primeiro uma fotografia ou captura de ecrã.', 'error')
    return
  }

  if (button) button.disabled = true
  clearRecognizedState()
  setMessage('🔎 A fazer leitura gratuita da captura…', 'loading')

  try {
    const Tesseract = await loadTesseract()
    const result = await Tesseract.recognize(file, 'eng', {
      logger: progress => {
        if (progress.status === 'recognizing text' && typeof progress.progress === 'number') {
          setMessage(`🔎 A ler a captura… ${Math.round(progress.progress * 100)}%`, 'loading')
        }
      }
    })

    const fields = parseMilkText(result?.data?.text || '')
    const recognized = []
    Object.keys(FIELD_MAP).forEach(name => fillField(name, fields[name], recognized))

    if (!recognized.length) {
      setMessage('Não consegui identificar valores nesta captura. Experimente uma captura mais aproximada das colunas MG/MP, células somáticas ou UFC.', 'error')
      return
    }

    setMessage(`✅ Leitura gratuita concluída: ${recognized.length} campo(s) preenchido(s). Confirme os valores antes de guardar.`)
  } catch (error) {
    console.error('OCR gratuito análises do leite:', error)
    setMessage(error?.message || 'Não foi possível ler esta captura.', 'error')
  } finally {
    if (button) button.disabled = false
  }
}

const observer = new MutationObserver(() => ensureRecognitionButton())
observer.observe(document.body, { childList: true, subtree: true })
ensureRecognitionButton()

document.addEventListener('change', event => {
  if (event.target?.id !== 'fotografiaAnaliseLeite') return
  const button = document.querySelector('#processarFotografiaAnalise')
  const file = event.target.files?.[0]
  if (!button) return
  if (!file) {
    button.hidden = true
    setMessage('Nenhuma imagem selecionada.')
    return
  }
  button.hidden = false
  recognizeMilkReport()
})

document.addEventListener('click', event => {
  const button = event.target.closest('#processarFotografiaAnalise')
  if (!button) return
  event.preventDefault()
  recognizeMilkReport()
})
