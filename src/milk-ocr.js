import './milk-ocr.css'

const FIELD_MAP = {
  analysis_date: 'analysisDate',
  fat: 'analysisFat',
  protein: 'analysisProtein',
  somatic_cells: 'analysisSomaticCells',
  cfu: 'analysisCfu'
}

function getSupabase() {
  return window.lavouraSupabase
}

function getMessage() {
  return document.querySelector('#fotografiaAnaliseMensagem')
}

function setMessage(text, type = '') {
  const message = getMessage()
  if (!message) return

  message.textContent = text
  message.classList.remove('loading', 'error')
  message.classList.add('milk-ocr-message')

  if (type) {
    message.classList.add(type)
  }
}

function clearRecognizedState() {
  document
    .querySelectorAll('.ocr-recognized')
    .forEach(field => field.classList.remove('ocr-recognized'))
}

function ensureRecognitionButton() {
  const fileInput = document.querySelector('#fotografiaAnaliseLeite')
  if (!fileInput || fileInput.dataset.ocrReady === 'true') {
    return
  }

  fileInput.dataset.ocrReady = 'true'

  const photoButton = document.querySelector(
    '[data-action="fotografia-analise-leite"]'
  )

  if (!photoButton) return

  let recognizeButton = document.querySelector('#processarFotografiaAnalise')

  if (!recognizeButton) {
    recognizeButton = document.createElement('button')
    recognizeButton.id = 'processarFotografiaAnalise'
    recognizeButton.type = 'button'
    recognizeButton.hidden = true
    recognizeButton.className = 'milk-ocr-button'
    recognizeButton.textContent = '✨ Reconhecer valores'
    photoButton.insertAdjacentElement('afterend', recognizeButton)
  }

  setMessage(
    'Tire uma fotografia ou escolha uma imagem. Depois toque em “Reconhecer valores”. Confirme sempre os resultados antes de guardar.'
  )
}

function imageAsJpeg(file) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)

    image.onload = () => {
      try {
        const maxDimension = 2048
        const scale = Math.min(
          1,
          maxDimension / Math.max(image.naturalWidth, image.naturalHeight)
        )

        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))

        const context = canvas.getContext('2d')

        if (!context) {
          throw new Error('Não foi possível preparar a imagem.')
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        const jpeg = canvas.toDataURL('image/jpeg', 0.85)
        URL.revokeObjectURL(url)
        resolve(jpeg)
      } catch (error) {
        URL.revokeObjectURL(url)
        reject(error)
      }
    }

    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível abrir esta imagem.'))
    }

    image.src = url
  })
}

function fillRecognizedField(fieldName, result, recognized) {
  const id = FIELD_MAP[fieldName]
  const input = document.querySelector(`#${id}`)

  if (!input) return

  input.value = ''

  if (result?.value === null || result?.value === undefined) {
    return
  }

  input.value = String(result.value)
  input.classList.add('ocr-recognized')
  recognized.push(fieldName)
}

async function recognizeMilkReport() {
  const input = document.querySelector('#fotografiaAnaliseLeite')
  const button = document.querySelector('#processarFotografiaAnalise')
  const file = input?.files?.[0]

  if (!file) {
    setMessage('Escolha primeiro uma fotografia ou imagem.', 'error')
    return
  }

  const supabase = getSupabase()

  if (!supabase?.functions?.invoke) {
    setMessage('A ligação ao serviço de leitura ainda não está disponível.', 'error')
    return
  }

  if (button) button.disabled = true
  clearRecognizedState()
  setMessage('A analisar a fotografia…', 'loading')

  try {
    const image = await imageAsJpeg(file)
    const { data, error } = await supabase.functions.invoke(
      'analyze-milk-report',
      { body: { image } }
    )

    if (error) {
      throw new Error(data?.error || error.message || 'Falha no reconhecimento.')
    }

    const fields = data?.fields || {}
    const recognized = []

    for (const fieldName of Object.keys(FIELD_MAP)) {
      fillRecognizedField(fieldName, fields[fieldName], recognized)
    }

    if (!recognized.length) {
      setMessage(
        data?.warning ||
          'Não foi possível reconhecer valores com confiança suficiente. Preencha os campos manualmente.',
        'error'
      )
      return
    }

    const warning = data?.warning ? ` ${data.warning}` : ''

    setMessage(
      `Valores reconhecidos em ${recognized.length} campo(s). Reveja e corrija antes de guardar.${warning}`
    )
  } catch (error) {
    console.error('OCR análises do leite:', error)
    setMessage(
      error?.message || 'Não foi possível analisar a fotografia.',
      'error'
    )
  } finally {
    if (button) button.disabled = false
  }
}

const observer = new MutationObserver(() => {
  ensureRecognitionButton()
})

observer.observe(document.body, {
  childList: true,
  subtree: true
})

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
  setMessage(`Imagem selecionada: ${file.name}. Toque em “Reconhecer valores”.`)
})

document.addEventListener('click', event => {
  const button = event.target.closest('#processarFotografiaAnalise')
  if (!button) return

  event.preventDefault()
  recognizeMilkReport()
})
