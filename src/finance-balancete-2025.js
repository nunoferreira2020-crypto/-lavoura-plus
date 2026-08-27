const BALANCETE_2025 = Object.freeze({
  year: 2025, expenses: 79548.10, revenue: 127794.84, sales: 109099.08,
  subsidies: 18191.43, otherIncome: 504.33, accountingResult: 48246.74,
  bankBalance: 309028.64, suppliersPayable: 4782.78,
  salesBreakdown: [['Leite',103083.34],['Vacas leiteiras',5871.51],['Rolos de erva',144.23]],
  expenseGroups: [
    ['🐄 Alimentação', [
      {label:'Rações',value:39832.09,note:'Valor líquido da conta de rações no balancete.'}
    ]],
    ['🌱 Terras e culturas', [
      {label:'Fertilizantes / adubos',value:10944.69},
      {label:'Renda das terras',value:5530.00,note:'Rendas isentas registadas no balancete.'},
      {label:'Sementes',value:1204.58},
      {label:'Fitofarmacêuticos',value:481.81}
    ]],
    ['🚜 Máquinas e exploração', [
      {label:'Trabalhos especializados',value:4999.69},
      {label:'Outros serviços especializados',value:3906.32},
      {label:'Gasóleo',value:3857.37,children:[['Custo líquido de IVA',3691.27],['IVA não dedutível',166.10]]},
      {label:'Conservação e reparação',value:1987.19},
      {label:'Materiais',value:184.49,children:[['Ferramentas e utensílios de desgaste',20.99],['Outros materiais — líquido',163.50]]},
      {label:'Limpeza, higiene e conforto',value:172.94},
      {label:'Outros serviços',value:42.31}
    ]],
    ['🐮 Saúde e reprodução', [
      {label:'Medicamentos',value:1532.77},
      {label:'Serviço de inseminação',value:1252.50}
    ]],
    ['📋 Pessoal e administração', [
      {label:'Segurança Social / pessoal',value:2773.76,note:'Encargos sobre remunerações — Segurança Social.'},
      {label:'Quotizações',value:564.41},
      {label:'Depreciações e amortizações',value:243.87,note:'Equipamento básico.'},
      {label:'Impostos e taxas',value:37.31,children:[['Impostos indiretos',36.31],['Taxas',1.00]]}
    ]]
  ]
})
const euro=v=>Number(v).toLocaleString('pt-PT',{style:'currency',currency:'EUR'})
const percent=v=>`${Number(v).toLocaleString('pt-PT',{maximumFractionDigits:1})}%`
const pageIsFinance=main=>(main?.querySelector('h1')?.textContent||'').includes('Finanças')
const groupTotal=items=>items.reduce((s,item)=>s+item.value,0)
function childRows(children){return (children||[]).map(([l,v])=>`<div class="detail-row" style="padding-left:18px"><span class="muted">↳ ${l}</span><strong>${euro(v)}</strong></div>`).join('')}
function expenseRows(items,total){return items.map(item=>{
  const detail=item.children?.length?`<details class="finance-subexpense"><summary><span>${item.label}<small class="muted"> · ${percent(item.value/total*100)}</small></span><strong>${euro(item.value)}</strong></summary>${childRows(item.children)}${item.note?`<p class="muted" style="padding-left:18px">${item.note}</p>`:''}</details>`:`<div class="detail-row"><span>${item.label}<small class="muted"> · ${percent(item.value/total*100)}</small>${item.note?`<div class="muted" style="font-size:.85em">${item.note}</div>`:''}</span><strong>${euro(item.value)}</strong></div>`
  return detail
}).join('')}
function expenseGroupsHtml(){return BALANCETE_2025.expenseGroups.map(([title,items])=>`<details class="finance-expense-group"><summary><strong>${title}</strong><span>${euro(groupTotal(items))}</span></summary>${expenseRows(items,BALANCETE_2025.expenses)}</details>`).join('')}
function cardHtml(){const margin=BALANCETE_2025.accountingResult/BALANCETE_2025.revenue*100;return `<section class="card finance-balancete-2025" data-finance-balancete="2025"><h2>📒 Finanças reais — 2025</h2><p class="muted">Valores confirmados pelo Balancete 2025. O detalhe abaixo vai apenas até às subcontas que o documento permite confirmar.</p><div class="finance-summary-grid"><div class="detail-row"><span>💰 Rendimentos</span><strong>${euro(BALANCETE_2025.revenue)}</strong></div><div class="detail-row"><span>💸 Gastos</span><strong>${euro(BALANCETE_2025.expenses)}</strong></div><div class="detail-row"><span>📈 Resultado contabilístico</span><strong>${euro(BALANCETE_2025.accountingResult)}</strong></div><div class="detail-row"><span>Margem</span><strong>${percent(margin)}</strong></div></div><h3 style="margin-top:18px">💸 Despesas por categoria</h3><p class="muted">Toque numa categoria e, quando existir, toque novamente na despesa para ver a subconta.</p>${expenseGroupsHtml()}<div class="detail-row"><span><strong>Total de gastos 2025</strong></span><strong>${euro(BALANCETE_2025.expenses)}</strong></div><details><summary><strong>💰 Receitas de 2025</strong></summary><div class="detail-row"><span>Vendas</span><strong>${euro(BALANCETE_2025.sales)}</strong></div>${BALANCETE_2025.salesBreakdown.map(([l,v])=>`<div class="detail-row"><span>${l}</span><strong>${euro(v)}</strong></div>`).join('')}<div class="detail-row"><span>Subsídios à exploração</span><strong>${euro(BALANCETE_2025.subsidies)}</strong></div><div class="detail-row"><span>Outros rendimentos</span><strong>${euro(BALANCETE_2025.otherIncome)}</strong></div></details><details><summary><strong>🏦 Posição financeira</strong></summary><div class="detail-row"><span>CGD — saldo devedor</span><strong>${euro(BALANCETE_2025.bankBalance)}</strong></div><div class="detail-row"><span>Fornecedores — saldo credor</span><strong>${euro(BALANCETE_2025.suppliersPayable)}</strong></div></details><p class="muted">Resultado contabilístico = rendimentos − gastos. Não representa necessariamente dinheiro disponível na conta.</p></section>`}
function removeLegacyFinance(main){
  [...main.querySelectorAll('section.card')].forEach(card=>{
    const t=card.textContent||''
    if(t.includes('Receitas registadas')&&t.includes('Saldo registado')) card.remove()
    if(t.includes('Custos previstos')&&t.includes('Adicionar custo previsto')) card.remove()
  })
  ;[...main.querySelectorAll('h2')].forEach(h=>{if((h.textContent||'').includes('Custos previstos')){const next=h.nextElementSibling;if(next?.classList.contains('card')&&(next.textContent||'').includes('Sem custos previstos'))next.remove();h.remove()}})
}
function enhance(){const main=document.querySelector('main.app');if(!pageIsFinance(main))return;removeLegacyFinance(main);if(main.querySelector('[data-finance-balancete="2025"]'))return;const w=document.createElement('div');w.innerHTML=cardHtml().trim();const insight=main.querySelector('.finance-insight-block');if(insight)insight.insertAdjacentElement('afterend',w.firstElementChild);else main.querySelector('h1')?.insertAdjacentElement('afterend',w.firstElementChild)}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});enhance()
export { BALANCETE_2025 }
