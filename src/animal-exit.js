const FARM_ID='72bb5d54-f614-4394-8da9-7113a8e48a29'
const REASONS=['Morte','Venda','Abate','Outro']

function currentAnimal(){
  const main=document.querySelector('#app main')
  if(!main)return null
  const title=main.querySelector('h1')?.textContent||''
  const match=title.match(/🐄\s*([^\s—]+)/)
  if(!match)return null
  const number=String(match[1]||'').trim()
  const hasActions=main.querySelector('[data-action="inseminacao"], [data-action="parto"], [data-action="diagnostico"]')
  return number&&hasActions?{number,title:title.trim()}:null
}

async function registerExit(animal){
  const sb=window.lavouraSupabase
  if(!sb){alert('Supabase indisponível.');return}
  const choice=prompt(`Motivo da baixa de ${animal.title}:\n\n1 - Morte\n2 - Venda\n3 - Abate\n4 - Outro\n\nEscreva 1, 2, 3 ou 4.`)
  if(choice===null)return
  const reason=REASONS[Number(choice)-1]
  if(!reason){alert('Motivo inválido.');return}
  const date=prompt('Data da baixa (AAAA-MM-DD):',new Date().toISOString().slice(0,10))
  if(date===null)return
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){alert('Data inválida. Use AAAA-MM-DD.');return}
  const notes=prompt('Observações (opcional):','')
  if(notes===null)return
  if(!confirm(`Registar ${animal.title} como baixa por ${reason} em ${date}?\n\nO histórico será mantido.`))return
  const {data,error}=await sb.from('animals')
    .update({exit_date:date,exit_reason:reason,exit_notes:notes.trim()||null,status:'Baixa'})
    .eq('farm_id',FARM_ID).eq('number',animal.number).select('id').maybeSingle()
  if(error||!data){alert('Não foi possível registar a baixa.');return}
  alert(`Baixa registada — ${reason}. O histórico foi mantido.`)
  location.reload()
}

function mountExitButton(){
  const animal=currentAnimal()
  const main=document.querySelector('#app main')
  if(!animal||!main||main.querySelector('[data-animal-exit]'))return
  const deleteCard=main.querySelector('[data-delete-cow-card]')
  const card=document.createElement('section')
  card.className='card'
  card.dataset.animalExit='1'
  card.innerHTML='<h2>📋 Baixa do animal</h2><p>Para morte, venda ou abate. A vaca sai do rebanho ativo, mas o histórico é mantido.</p><button type="button" data-register-exit style="width:100%;min-height:48px;font-weight:800">Registar baixa</button>'
  card.querySelector('[data-register-exit]').addEventListener('click',()=>registerExit(animal))
  if(deleteCard)main.insertBefore(card,deleteCard);else main.appendChild(card)
}

mountExitButton()
let queued=false
new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;mountExitButton()})}).observe(document.body,{childList:true,subtree:true})
