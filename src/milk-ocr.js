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
  fileInput.setAttribute('accept', 'image/*')
  fileInput.removeAttribute('capture')

  const photoButton = document.querySelector(
    '[data-action="fotografia-analise-leite"]'
  )

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

  setMessage(
    'Escolha uma fotografia ou uma captura de ecrã da Fototeca. A Lavoura+ tenta reconhecer os valores automaticamente; confirme-os antes de guardar.'
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

async function extractFunctionError(error, data) {
  if (data?.error) {
    return data.error
  }

  const response = error?.context

  if (response && typeof response.clone === 'function') {
    try {
      const payload = await response.clone().json()
      if (payload?.error) return payload.error
      if (payload?.message) return payload.message
    } catch (_) {
      try {
        const text = await response.clone().text()
        if (text) return text
      } catch (_) {
        // Ignorar e usar a mensagem genérica abaixo.
      }
    }
  }

  return error?.message || 'Falha no reconhecimento.'
}

async function recognizeMilkReport() {
  const input = document.querySelector('#fotografiaAnaliseLeite')
  const button = document.querySelector('#processarFotografiaAnalise')
  const file = input?.files?.[0]

  if (!file) {
    setMessage('Escolha primeiro uma fotografia ou captura de ecrã.', 'error')
    return
  }

  const supabase = getSupabase()

  if (!supabase?.functions?.invoke) {
    setMessage('A ligação ao serviço de leitura ainda não está disponível.', 'error')
    return
  }

  if (button) button.disabled = true
  clearRecognizedState()
  setMessage('🔎 A ler a imagem e a procurar os valores da análise…', 'loading')

  try {
    const image = await imageAsJpeg(file)
    const { data, error } = await supabase.functions.invoke(
      'analyze-milk-report',
      { body: { image } }
    )

    if (error) {
      const realMessage = await extractFunctionError(error, data)
      throw new Error(realMessage)
    }

    const fields = data?.fields || {}
    const recognized = []

    for (const fieldName of Object.keys(FIELD_MAP)) {
      fillRecognizedField(fieldName, fields[fieldName], recognized)
    }

    if (!recognized.length) {
      setMessage(
        data?.warning ||
          'Não foi possível reconhecer valores com confiança suficiente. Pode preencher os campos manualmente ou tentar outra captura.',
        'error'
      )
      return
    }

    const warning = data?.warning ? ` ${data.warning}` : ''

    setMessage(
      `✅ ${recognized.length} valor(es) reconhecido(s) e colocado(s) automaticamente nos campos. Confirme antes de guardar.${warning}`
    )
  } catch (error) {
    console.error('OCR análises do leite:', error)
    setMessage(
      error?.message || 'Não foi possível analisar a imagem.',
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
  setMessage(`Imagem selecionada: ${file.name}. A reconhecer automaticamente…`, 'loading')

  recognizeMilkReport()
})

document.addEventListener('click', event => {
  const button = event.target.closest('#processarFotografiaAnalise')
  if (!button) return

  event.preventDefault()
  recognizeMilkReport()
})
