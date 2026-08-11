const supabase = window.lavouraSupabase

const fieldMap = {
  analysis_date: 'record_date',
  fat: 'fat',
  protein: 'protein',
  somatic_cells: 'somatic_cells',
  cfu: 'ufc'
}

function injectStyles() {
  if (document.querySelector('#milkOcrStyles')) return

  const style = document.createElement('style')
  style.id = 'milkOcrStyles'
  style.textContent = `
    #milkAnalysisRecognize {
      margin-top: 10px;
    }
    .milk-ocr-loading {
      color: #285b37 !important;
      font-weight: 700;
    }
    .milk-ocr-result {
      padding: 12px;
      border-radius: 12px;
      background: #e9f6eb;
      color: #234f30 !important;
      font-weight: 600;
    }
    .milk-ocr-error {
      padding: 12px;
      border-radius: 12px;
      background: #fff0ed;
      color: #a52a1f !important;
      font-weight: 700;
    }
    .milk-ocr-recognized {
      border: 2px solid #2f7d47 !important;
      background: #f0fff3 !important;
      box-shadow: 0 0 0 3px rgba(47, 125, 71, 0.12);
    }
    #milkAnalysisRecognize:disabled {
      opacity: .65;
      cursor: wait;
    }
  `
  document.head.appendChild(style)
}

function imageAsJpeg(file) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)

    image.onload = () => {
      const limit = 2048
      const scale = Math.min(
        1,
        limit / Math.max(image.naturalWidth, image.naturalHeight)
      )
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(image.naturalWidth * scale)
      canvas.height = Math.round(image.naturalHeight * scale)

      const context = canvas.getContext('2d')
      if (!context) {
        URL.revokeObjectURL(url)
        reject(new Error('Não foi possível preparar a fotografia.'))
        return
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }

    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível abrir esta fotografia.'))
    }

    image.src = url
  })
}

function setStatus(message, type = '') {
  const status = document.querySelector('#milkAnalysisPhotoStatus')
  if (!status) return

  status.classList.remove('milk-ocr-loading', 'milk-ocr-result', 'milk-ocr-error')
  if (type) status.classList.add(`milk-ocr-${type}`)
  status.textContent = message
}

function ensureRecognizeButton() {
  const form = document.querySelector('#milkAnalysisForm')
  const status = document.querySelector('#milkAnalysisPhotoStatus')
  if (!form || !status) return null

  let button = document.querySelector('#milkAnalysisRecognize')
  if (button) return button

  button = document.createElement('button')
  button.id = 'milkAnalysisRecognize'
  button.type = 'button'
  button.className = 'back full-width'
  button.textContent = '✨ Reconhecer valores da fotografia'
  status.before(button)
  return button
}

function clearRecognitionState(form) {
  form
    .querySelectorAll('.milk-ocr-recognized')
    .forEach(field => field.classList.remove('milk-ocr-recognized'))
}

function fillRecognizedFields(fields) {
  const form = document.querySelector('#milkAnalysisForm')
  if (!form) return []

  clearRecognitionState(form)

  const recognized = []

  Object.entries(fieldMap).forEach(([responseName, formName]) => {
    const input = form.querySelector(`[name="${formName}"]`)
    if (!input) return

    input.value = ''

    const result = fields?.[responseName]
    if (result?.value === null || result?.value === undefined) return

    input.value = String(result.value)
    input.classList.add('milk-ocr-recognized')
    recognized.push(formName)
  })

  return recognized
}

async function recognizeSelectedPhoto() {
  const input = document.querySelector('#milkAnalysisPhoto')
  const button = document.querySelector('#milkAnalysisRecognize')
  const file = input?.files?.[0]

  if (!file) {
    setStatus('Escolha primeiro uma fotografia.', 'error')
    return
  }

  if (!supabase?.functions?.invoke) {
    setStatus('O serviço de leitura não está disponível nesta sessão.', 'error')
    return
  }

  button.disabled = true
  setStatus('A analisar a fotografia…', 'loading')

  try {
    const image = await imageAsJpeg(file)
    const { data, error } = await supabase.functions.invoke(
      'analyze-milk-report',
      { body: { image } }
    )

    if (error) {
      throw new Error(data?.error || error.message || 'Erro ao analisar a fotografia.')
    }

    const recognized = fillRecognizedFields(data?.fields || {})

    if (!recognized.length) {
      setStatus(
        'Não foi possível reconhecer valores com confiança suficiente. Preencha os campos manualmente.',
        'error'
      )
      return
    }

    const labels = {
      record_date: 'data',
      fat: 'gordura',
      protein: 'proteína',
      somatic_cells: 'células somáticas',
      ufc: 'UFC'
    }

    const names = recognized.map(name => labels[name] || name).join(', ')
    const warning = data?.warning ? ` ${data.warning}` : ''

    setStatus(
      `Reconhecido: ${names}. Reveja e corrija os campos destacados antes de guardar.${warning}`,
      'result'
    )
  } catch (error) {
    setStatus(
      error?.message || 'Não foi possível analisar a fotografia. Tente novamente.',
      'error'
    )
  } finally {
    button.disabled = false
  }
}

injectStyles()

document.addEventListener('change', event => {
  if (event.target?.id !== 'milkAnalysisPhoto') return

  const file = event.target.files?.[0]
  if (!file) return

  const button = ensureRecognizeButton()
  if (!button) return

  button.hidden = false
  setStatus(`Fotografia “${file.name}” selecionada. Toque em “Reconhecer valores da fotografia”.`)
})

document.addEventListener('click', event => {
  const button = event.target.closest('#milkAnalysisRecognize')
  if (!button) return

  event.preventDefault()
  recognizeSelectedPhoto()
})
