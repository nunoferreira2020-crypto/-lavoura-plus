import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source=fs.readFileSync('src/finance-monthly-history.js','utf8')
const index=fs.readFileSync('index.html','utf8')

test('histórico financeiro usa apenas dados da exploração atual',()=>{
  assert.match(source,/from\('finance_records'\)[\s\S]*?eq\('farm_id',FARM_ID\)/)
  assert.match(source,/from\('milk_records'\)[\s\S]*?eq\('farm_id',FARM_ID\)/)
})

test('histórico mostra doze meses e calcula lucro ou prejuízo',()=>{
  assert.match(source,/lastMonths\(12\)/)
  assert.match(source,/result:income-expenses/)
  assert.match(source,/Resultado acumulado/)
  assert.match(source,/Melhor mês/)
  assert.match(source,/Pior mês/)
})

test('index carrega o gráfico financeiro mensal',()=>{
  assert.match(index,/finance-monthly-history\.js/)
})
