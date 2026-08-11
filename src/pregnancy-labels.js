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

function replacePregnancyLabels(root = document.body) {
  if (!root) return

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT
  )

  const textNodes = []
  let node

  while ((node = walker.nextNode())) {
    textNodes.push(node)
  }

  for (const textNode of textNodes) {
    let text = textNode.nodeValue
    let updated = text

    for (const [from, to] of LABEL_REPLACEMENTS) {
      updated = updated.replaceAll(from, to)
    }

    if (updated !== text) {
      textNode.nodeValue = updated
    }
  }
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

observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true
})

replacePregnancyLabels()
