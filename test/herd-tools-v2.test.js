import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source=fs.readFileSync('src/herd-tools-v2.js','utf8')
const index=fs.readFileSync('index.html','utf8')

test('gestão do rebanho filtra animais e reprodução pela exploração atual',()=>{
  assert.match(source,/const FARM_ID=/)
  assert.match(source,/from\('animals'\)[\s\S]*?\.eq\('farm_id',FARM_ID\)/)
  assert.match(source,/from\('reproduction'\)[\s\S]*?\.eq\('farm_id',FARM_ID\)/)
})

test('herd tools v2 mantém estados reprodutivos essenciais',()=>{
  for(const text of ['Prenhe','Vazia','Confirmar prenhez','Secagem ≤30d','Parto ≤30d'])assert.match(source,new RegExp(text))
  assert.match(source,/event_type==='IA'/)
  assert.match(source,/expected_dry_off/)
  assert.match(source,/expected_calving/)
})

test('index usa apenas a versão segura do módulo de rebanho',()=>{
  assert.match(index,/\/src\/herd-tools-v2\.js/)
  assert.doesNotMatch(index,/\/src\/herd-tools\.js/)
})
