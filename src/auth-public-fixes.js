const RECOVERY_ACTION='forgot-password'

function recoveryRedirectUrl(){
  return new URL('./', document.baseURI).href
}

async function handleForgotPassword(event){
  const button=event.target.closest(`[data-action="${RECOVERY_ACTION}"]`)
  if(!button)return

  const sb=window.lavouraSupabase
  const emailInput=document.querySelector('#email')
  const msg=document.querySelector('#loginMsg')
  if(!sb||!emailInput||!msg)return

  event.preventDefault()
  event.stopPropagation()
  if(typeof event.stopImmediatePropagation==='function')event.stopImmediatePropagation()

  const email=emailInput.value.trim()
  if(!email){
    msg.textContent='Introduza primeiro o seu email.'
    return
  }

  button.disabled=true
  msg.textContent='A enviar email…'

  try{
    const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:recoveryRedirectUrl()})
    if(error)throw error
    msg.textContent='✅ Email de recuperação enviado.'
  }catch(error){
    msg.textContent='Erro: '+(error?.message||'não foi possível enviar o email de recuperação.')
  }finally{
    button.disabled=false
  }
}

document.addEventListener('click',handleForgotPassword,true)

export { recoveryRedirectUrl }
