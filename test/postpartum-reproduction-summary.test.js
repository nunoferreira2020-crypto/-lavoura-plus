import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source=fs.readFileSync('src/postpartum-reproduction-summary.js','utf8')
const index=fs.readFileSync('index.html','utf8')

test('resumo pós-parto fica restrito à página Reprodução',()=>{
  assert.match(source,/title==='reprodução'/)
  assert.match(source,/!main\.querySelector\('#animalList'\)/)
  assert.doesNotMatch(source,/animalSummaryReady|cowProfileReady|insertAdjacentElement\('afterend',card\)/)
})

test('usa os limites 45 e 80 dias e só considera IA depois do último parto',()=>{
  assert.match(source,/WINDOW_START=45/)
  assert.match(source,/PRIORITY_START=80/)
  assert.match(source,/event_date\)>dateKey\(animal\.last_calving_date\)/)
})

test('queries ficam limitadas ao farm_id e módulo está carregado',()=>{
  assert.match(source,/from\('animals'\)[\s\S]*?\.eq\('farm_id',FARM_ID\)/)
  assert.match(source,/from\('reproduction'\)[\s\S]*?\.eq\('farm_id',FARM_ID\)/)
  assert.match(index,/postpartum-reproduction-summary\.js/)
  assert.doesNotMatch(index,/postpartum-breeding-window\.js/)
})
