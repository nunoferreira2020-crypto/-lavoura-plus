import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source=fs.readFileSync('src/health-dashboard.js','utf8')

test('alertas de saúde carregam número e nome da vaca por exploração',()=>{
  assert.match(source,/select\('id,number,name'\)/)
  assert.match(source,/\.eq\('farm_id',FARM_ID\)/)
  assert.match(source,/animalLabel/)
})

test('painel mostra carências de leite e carne com identificação da vaca',()=>{
  assert.match(source,/milk_withdrawal_until/)
  assert.match(source,/meat_withdrawal_until/)
  assert.match(source,/animalLabel\(byId\.get/)
  assert.match(source,/🥛/)
  assert.match(source,/🥩/)
})
