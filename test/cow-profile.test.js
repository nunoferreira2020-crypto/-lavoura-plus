import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source=fs.readFileSync('src/cow-profile.js','utf8')
const index=fs.readFileSync('index.html','utf8')

test('ficha completa usa apenas dados da exploração atual',()=>{
  assert.match(source,/\.eq\('farm_id',FARM_ID\)/)
  assert.match(source,/from\('reproduction'\)/)
  assert.match(source,/from\('health_records'\)/)
})

test('ficha mostra reprodução saúde carência e histórico cronológico',()=>{
  for(const text of ['Ficha completa','Estado reprodutivo','Registos de saúde','Leite em carência','Histórico completo'])assert.match(source,new RegExp(text))
  assert.match(source,/event_type==='IA'/)
  assert.match(source,/milk_withdrawal_until/)
})

test('index carrega o módulo da ficha da vaca',()=>{
  assert.match(index,/cow-profile\.js/)
})
