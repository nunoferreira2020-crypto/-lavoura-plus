const STYLE_ID = 'iphone-public-fixes-style'

function ensureIphoneSafeArea() {
  if (document.getElementById(STYLE_ID)) return

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .app {
      padding-top: calc(24px + env(safe-area-inset-top));
    }
  `
  document.head.appendChild(style)
}

function publicAppUrl() {
  const url = new URL(window.location.href)
  url.hash = ''
  url.search = ''

  if (!url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, url.pathname.lastIndexOf('/') + 1)
  }

  return url.href
}

async function handlePasswordRecovery(event) {
  const button = event.target.closest?.('[data-action="forgot-password"]')
  if (!button) return

  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()

  const email = document.querySelector('#email')?.value?.trim()
  const msg = document.querySelector('#loginMsg')
  const supabase = window.lavouraSupabase

  if (!msg) return

  if (!email) {
    msg.textContent = 'Introduza primeiro o seu email.'
    return
  }

  if (!supabase) {
    msg.textContent = 'Não foi possível iniciar a recuperação da palavra-passe.'
    return
  }

  msg.textContent = 'A enviar email…'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: publicAppUrl()
  })

  msg.textContent = error
    ? `Erro: ${error.message}`
    : '✅ Email de recuperação enviado.'
}

ensureIphoneSafeArea()
document.addEventListener('click', handlePasswordRecovery, true)
