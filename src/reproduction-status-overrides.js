// Estados atuais confirmados pelo produtor. Prevalecem sobre IA históricas.
const CURRENT_REPRO_STATUS=Object.freeze({
  '4284':'VAZIA',
  '5803':'SECA',
  '3204':'SECA',
})

const COLORS={VAZIA:'#e31b23',SECA:'#39a94b'}

function polar(cx,cy,r,deg){const a=(deg-90)*Math.PI/180;return{x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)}}

function moveToZone(g,status,index){
  const circle=g.querySelector('circle');if(!circle)return
  const oldX=Number(circle.getAttribute('cx')),oldY=Number(circle.getAttribute('cy'))
  if(!Number.isFinite(oldX)||!Number.isFinite(oldY))return
  // Vitória vazia fica na zona vermelha; vacas secas ficam na zona verde.
  const day=status==='VAZIA'?(42+index*8):(248+index*10)
  const deg=180+(day/283)*360
  const p=polar(300,305,190-index*18,deg)
  g.setAttribute('transform',`translate(${p.x-oldX} ${p.y-oldY})`)
}

function applyCurrentReproStatus(){
  const wheel=document.querySelector('[data-reproduction-wheel]');if(!wheel)return
  let redIndex=0,dryIndex=0
  wheel.querySelectorAll('g[aria-label]').forEach(g=>{
    const label=g.getAttribute('aria-label')||''
    const number=Object.keys(CURRENT_REPRO_STATUS).find(n=>new RegExp(`(?:^|\\D)${n}(?:$|\\D)`).test(label))
    if(!number)return
    const status=CURRENT_REPRO_STATUS[number]
    g.dataset.currentReproStatus=status
    if(!label.includes(`— ${status}`))g.setAttribute('aria-label',`${label} — ${status}`)
    const circle=g.querySelector('circle'),text=g.querySelector('text')
    if(circle){circle.setAttribute('fill',COLORS[status]);circle.setAttribute('stroke','#111');circle.setAttribute('stroke-width','1')}
    if(text)text.setAttribute('fill','#fff')
    moveToZone(g,status,status==='VAZIA'?redIndex++:dryIndex++)
  })
}

applyCurrentReproStatus()
new MutationObserver(applyCurrentReproStatus).observe(document.body,{childList:true,subtree:true})
