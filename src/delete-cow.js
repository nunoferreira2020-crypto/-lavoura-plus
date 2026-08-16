const FARM_ID='72bb5d54-f614-4394-8da9-7113a8e48a29'
const STYLE_ID='delete-cow-style'
let deleting=false

function ensureStyle(){
  if(document.getElementById(STYLE_ID))return
  const style=document.createElement('style')
  style.id=STYLE_ID
  style.textContent=`
    .delete-cow-card{border:1px solid #f0caca!important;background:#fffafa!important}
    .delete-cow-card h2{color:#8f3030}
    .delete-cow-button{width:100%;min-height:48px;background:#a63434!important;color:#fff!important;border:0!important;font-weight:800!important}
    .delete-cow-note{font-size:12px;line-height:1.45;color:#7a5555;margin-top:10px}
  `
  document.head.appendChild(style)
}

function currentCowNumber(){
  const main=document.querySelector('#app main')
  if(!main)return null
  const title=main.querySelector('h1')?.textContent||''
  const match=title.match(/🐄\s*([^\s—]+)/)
  if(!match)return null
  const number=String(match[1]||'').trim()
  if(!number)return null
  const hasCowActions=main.querySelector('[data-action="inseminacao"], [data-action="parto"], [data-action="diagnostico"]')
  return hasCowActions?number:null
}

function addDeleteButton(){
  ensureStyle()
  const main=document.querySelector('#app main')
  const number=currentCowNumber()
  if(!main||!number||main.querySelector('[data-delete-cow-card]'))return

  const card=document.createElement('section')
  card.className='card delete-cow-card'
  card.dataset.deleteCowCard='1'
  card.innerHTML=`
    <h2>🗑️ Eliminar vaca</h2>
    <p>Remove esta vaca da exploração.</p>
    <button type="button" class="delete-cow-button" data-delete-cow="${number}">Eliminar vaca ${number}</button>
    <p class="delete-cow-note">Esta ação é permanente. O histórico de reprodução e saúde desta vaca também será eliminado. Registos financeiros existentes são mantidos, mas deixam de ficar associados à vaca.</p>
  `
  main.appendChild(card)
}

async function deleteCow(number){
  if(deleting)return
  const sb=window.lavouraSupabase
  if(!sb){alert('Supabase indisponível.');return}

  const first=confirm(`Eliminar definitivamente a vaca ${number}?`)
  if(!first)return

  const typed=prompt(`Para confirmar, escreva o número da vaca: ${number}`,'')
  if(String(typed||'').trim()!==String(number)){
    alert('Eliminação cancelada. O número introduzido não corresponde.')
    return
  }

  deleting=true
  try{
    const {data:animal,error:findError}=await sb
      .from('animals')
      .select('id,number')
      .eq('farm_id',FARM_ID)
      .eq('number',number)
      .maybeSingle()

    if(findError)throw findError
    if(!animal){alert('A vaca já não existe na exploração.');return}

    const {error:deleteError}=await sb
      .from('animals')
      .delete()
      .eq('id',animal.id)
      .eq('farm_id',FARM_ID)

    if(deleteError)throw deleteError

    alert(`✅ Vaca ${number} eliminada.`)
    const animalsButton=document.querySelector('.bottom-nav-item[data-action="animais"]')
    if(animalsButton){animalsButton.click();return}
    document.querySelector('[data-action="animais"]')?.click()||location.reload()
  }catch(error){
    console.error('Eliminar vaca:',error)
    alert('Não foi possível eliminar a vaca: '+(error?.message||'erro desconhecido'))
  }finally{
    deleting=false
  }
}

document.addEventListener('click',event=>{
  const button=event.target.closest('[data-delete-cow]')
  if(!button)return
  event.preventDefault()
  void deleteCow(button.dataset.deleteCow)
})

let queued=false
function schedule(){
  if(queued)return
  queued=true
  queueMicrotask(()=>{queued=false;addDeleteButton()})
}
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true})
addDeleteButton()

export{currentCowNumber}
