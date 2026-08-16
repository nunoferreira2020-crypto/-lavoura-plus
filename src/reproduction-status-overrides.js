// Correções confirmadas pelo produtor que prevalecem sobre IA históricas já encerradas.
const CURRENT_REPRO_STATUS = Object.freeze({
  '4284': 'VAZIA',
})

function applyCurrentReproStatus(){
  const wheel=document.querySelector('[data-reproduction-wheel]')
  if(!wheel)return
  wheel.querySelectorAll('g[aria-label]').forEach(g=>{
    const label=g.getAttribute('aria-label')||''
    const number=Object.keys(CURRENT_REPRO_STATUS).find(n=>new RegExp(`(?:^|\\D)${n}(?:$|\\D)`).test(label))
    if(!number)return
    const status=CURRENT_REPRO_STATUS[number]
    g.dataset.currentReproStatus=status
    g.setAttribute('aria-label',`${label} — ${status}`)
    const circle=g.querySelector('circle')
    const text=g.querySelector('text')
    // Não usar cinzento nem fingir que uma IA histórica representa uma prenhez atual.
    if(circle){circle.setAttribute('fill','#fff');circle.setAttribute('stroke','#e31b23');circle.setAttribute('stroke-width','3')}
    if(text)text.setAttribute('fill','#111')
    g.onclick=()=>{
      let b=wheel.querySelector('.rw-info')
      if(!b){b=document.createElement('div');b.className='rw-info';wheel.appendChild(b)}
      b.innerHTML=`<button class="rw-close">×</button><strong>🐄 Vitória</strong><div>Brinco: 4284</div><div>Estado atual: <b>VAZIA</b></div><div>A IA de 11/05/2025 é histórica e não é usada como prenhez atual.</div>`
      b.querySelector('.rw-close').onclick=()=>b.remove()
    }
  })
}

applyCurrentReproStatus()
new MutationObserver(applyCurrentReproStatus).observe(document.body,{childList:true,subtree:true})
