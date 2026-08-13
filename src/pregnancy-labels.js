const LABEL_REPLACEMENTS = [
  ['DIAGNÓSTICO PENDENTE', 'PRENHEZ POR CONFIRMAR'],
  ['PRONTO PARA DIAGNÓSTICO', 'PRENHEZ POR CONFIRMAR'],
  ['Diagnósticos pendentes', 'Confirmações de prenhez pendentes'],
  ['diagnósticos pendentes', 'confirmações de prenhez pendentes'],
  ['Nenhum diagnóstico pendente', 'Nenhuma confirmação de prenhez pendente'],
  ['Diagnóstico pendente', 'Prenhez por confirmar'],
  ['Registar diagnóstico', 'Confirmar prenhez'],
  ['a aguardar diagnóstico', 'a aguardar confirmação de prenhez'],
  ['Diagnósticos', 'Confirmações de prenhez'],
  ['Diagnóstico', 'Confirmação de prenhez']
]

function cleanupCompletedCalvingBadges(root=document.body){
  if(!root)return
  root.querySelectorAll('.card').forEach(section=>{
    const title=(section.querySelector('h2')?.textContent||'').toLowerCase()
    if(!title.includes('últimas ia'))return
    section.querySelectorAll('.cow-card').forEach(card=>{
      const text=(card.textContent||'').toLowerCase()
      if(text.includes('parto concluído'))card.querySelectorAll('.repro-stage.wait').forEach(badge=>badge.remove())
    })
  })
}

function replacePregnancyLabels(root = document.body) {
  if (!root) return
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const textNodes = []
  let node
  while ((node = walker.nextNode())) textNodes.push(node)
  for (const textNode of textNodes) {
    const text = textNode.nodeValue
    let updated = text
    for (const [from, to] of LABEL_REPLACEMENTS) updated = updated.replaceAll(from, to)
    if (updated !== text) textNode.nodeValue = updated
  }
  cleanupCompletedCalvingBadges(root)
}

let scheduled = false
function scheduleReplacement() {
  if (scheduled) return
  scheduled = true
  queueMicrotask(() => {
    scheduled = false
    replacePregnancyLabels()
  })
}

const observer = new MutationObserver(scheduleReplacement)
observer.observe(document.body, { childList: true, subtree: true, characterData: true })
replacePregnancyLabels()
