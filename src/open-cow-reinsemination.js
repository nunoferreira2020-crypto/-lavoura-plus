const STYLE_ID = 'open-cow-reinsemination-style'

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .open-cow-reinsemination{
      margin-top:12px;
      padding:11px 14px;
      border:0;
      border-radius:14px;
      background:#2f7d46;
      color:#fff;
      font-size:15px;
      font-weight:800;
      width:100%;
    }
  `
  document.head.appendChild(style)
}

function enhanceOpenCowCards() {
  ensureStyle()

  document.querySelectorAll('[data-open-cow]').forEach(card => {
    if (card.querySelector('.open-cow-reinsemination')) return

    const cowNumber = String(card.dataset.openCow || card.dataset.id || '').trim()
    if (!cowNumber) return

    const left = card.firstElementChild || card
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'open-cow-reinsemination'
    button.dataset.action = 'inseminacao'
    button.dataset.id = cowNumber
    button.textContent = '🧬 Registar nova IA'

    left.appendChild(button)
  })
}

let queued = false

function schedule() {
  if (queued) return
  queued = true

  queueMicrotask(() => {
    queued = false
    enhanceOpenCowCards()
  })
}

new MutationObserver(schedule).observe(document.body, {
  childList: true,
  subtree: true
})

enhanceOpenCowCards()
