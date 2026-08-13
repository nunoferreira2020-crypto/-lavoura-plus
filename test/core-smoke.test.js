import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const index=fs.readFileSync('index.html','utf8')
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'))

const coreModules=[
  'main.js','auth-public-fixes.js','iphone-public-fixes.js','production-quality-sync.js','production-trends.js','milk-ocr.js','milk-insights.js','pregnancy-labels.js','reproductive-stage-v2.js','open-cow-reinsemination.js','reproductive-summary.js','reproductive-timeline.js','herd-tools-v2.js','health-tools.js','health-dashboard.js','farm-agenda.js','feed-tools.js','feed-dashboard.js','cow-profile.js','finance-insights.js','finance-profit-chart.js','finance-monthly-history.js','rentability-sync.js','reports-final.js','dashboard-smart.js','settings-security.js'
]

test('index carrega todos os módulos essenciais da Lavoura+',()=>{
  for(const moduleName of coreModules){
    assert.match(index,new RegExp(`/src/${moduleName.replace('.', '\\.')}`),`módulo em falta: ${moduleName}`)
  }
  assert.doesNotMatch(index,/\/src\/herd-tools\.js/)
  assert.doesNotMatch(index,/\/src\/reproductive-stage\.js(?:[?"'])/)
})

test('PWA mantém manifest, ícone, service worker e configuração mobile',()=>{
  assert.match(index,/manifest\.webmanifest/)
  assert.match(index,/lavoura-icon\.svg/)
  assert.match(index,/serviceWorker\.register/)
  assert.match(index,/apple-mobile-web-app-capable/)
  assert.match(index,/viewport-fit=cover/)
})

test('scripts de qualidade executam testes e build de produção',()=>{
  assert.equal(pkg.scripts.test,'node --test')
  assert.equal(pkg.scripts.build,'vite build')
})

test('folha de estilo profissional permanece carregada',()=>{
  assert.match(index,/professional-ui\.css/)
})
