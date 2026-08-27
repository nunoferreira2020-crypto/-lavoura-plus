const BALANCETE_2025 = Object.freeze({
  year: 2025, expenses: 79548.10, revenue: 127794.84, sales: 109099.08,
  subsidies: 18191.43, otherIncome: 504.33, accountingResult: 48246.74,
  bankBalance: 309028.64, suppliersPayable: 4782.78,
  salesBreakdown: [['Leite',103083.34],['Vacas leiteiras',5871.51],['Rolos de erva',144.23]],
  expenseGroups: [
    ['🐄 Alimentação', [['Rações',39832.09]]],
    ['🌱 Terras e culturas', [['Fertilizantes / adubos',10944.69],['Renda das terras',5530.00],['Sementes',1204.58],['Fitofarmacêuticos',481.81]]],
    ['🚜 Máquinas e exploração', [['Trabalhos especializados',4999.69],['Outros serviços especializados',3906.32],['Gasóleo',3857.37],['Conservação e reparação',1987.19],['Materiais',184.49],['Limpeza, higiene e conforto',172.94],['Outros serviços',42.31]]],
    ['🐮 Saúde e reprodução', [['Medicamentos',1532.77],['Serviço de inseminação',1252.50]]],
    ['📋 Pessoal e administração', [['Segurança Social / pessoal',2773.76],['Quotizações',564.41],['Depreciações e amortizações',243.87],['Impostos indiretos',37.31]]]
  ]
})
const euro=v=>Number(v).toLocaleString('pt-PT',{style:'currency',currency:'EUR'})
const percent=v=>`${Number(v).toLocaleString('pt-PT',{maximumFractionDigits:1})}%`
const pageIsFinance=main=>(main?.querySelector('h1')?.textContent||'').includes('Finanças')
const groupTotal=items=>items.reduce((s,[,v])=>s+v,0)
function rows(items,total){return items.map(([l,v])=>`<div class="detail-row"><span>${l}<small class="muted"> · ${percent(v/total*100)}</small></span><strong>${euro(v)}</strong></div>`).join('')}
function expenseGroupsHtml(){return BALANCETE_2025.expenseGroups.map(([title,items])=>`<details class="finance-expense-group"><summary><strong>${title}</strong><span>${euro(groupTotal(items))}</span></summary>${rows(items,BALANCETE_2025.expenses)}</details>`).join('')}
function cardHtml(){const margin=BALANCETE_2025.accountingResult/BALANCETE_2025.revenue*100;return `<section class="card finance-balancete-2025" data-finance-balancete="2025"><h2>📒 Finanças reais — 2025</h2><p class="muted">Valores confirmados pelo Balancete 2025.</p><div class="finance-summary-grid"><div class="detail-row"><span>💰 Rendimentos</span><strong>${euro(BALANCETE_2025.revenue)}</strong></div><div class="detail-row"><span>💸 Gastos</span><strong>${euro(BALANCETE_2025.expenses)}</strong></div><div class="detail-row"><span>📈 Resultado contabilístico</span><strong>${euro(BALANCETE_2025.accountingResult)}</strong></div><div class="detail-row"><span>Margem</span><strong>${percent(margin)}</strong></div></div><h3 style="margin-top:18px">💸 Despesas por categoria</h3><p class="muted">Toque numa categoria para ver o detalhe.</p>${expenseGroupsHtml()}<div class="detail-row"><span><strong>Total de gastos 2025</strong></span><strong>${euro(BALANCETE_2025.expenses)}</strong></div><details><summary><strong>💰 Receitas de 2025</strong></summary><div class="detail-row"><span>Vendas</span><strong>${euro(BALANCETE_2025.sales)}</strong></div>${BALANCETE_2025.salesBreakdown.map(([l,v])=>`<div class="detail-row"><span>${l}</span><strong>${euro(v)}</strong></div>`).join('')}<div class="detail-row"><span>Subsídios à exploração</span><strong>${euro(BALANCETE_2025.subsidies)}</strong></div><div class="detail-row"><span>Outros rendimentos</span><strong>${euro(BALANCETE_2025.otherIncome)}</strong></div></details><details><summary><strong>🏦 Posição financeira</strong></summary><div class="detail-row"><span>CGD — saldo devedor</span><strong>${euro(BALANCETE_2025.bankBalance)}</strong></div><div class="detail-row"><span>Fornecedores — saldo credor</span><strong>${euro(BALANCETE_2025.suppliersPayable)}</strong></div></details><p class="muted">Resultado contabilístico = rendimentos − gastos. Não representa necessariamente dinheiro disponível na conta.</p></section>`}
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
