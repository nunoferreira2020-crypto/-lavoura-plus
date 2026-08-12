import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const feed=fs.readFileSync('src/feed-tools.js','utf8')
const dash=fs.readFileSync('src/feed-dashboard.js','utf8')
const index=fs.readFileSync('index.html','utf8')
const security=fs.readFileSync('src/settings-security.js','utf8')

test('módulo de alimentação usa a tabela feed_records e filtra pela exploração',()=>{
  assert.match(feed,/from\('feed_records'\)/)
  assert.match(feed,/\.eq\('farm_id',FARM_ID\)/)
  assert.match(feed,/kg_per_cow/)
  assert.match(feed,/price_per_kg/)
})

test('custos alimentares calculam custo por vaca e por litro',()=>{
  assert.match(feed,/costPerCow/)
  assert.match(feed,/costPerLiter/)
  assert.match(feed,/totalCost\/cows/)
  assert.match(feed,/totalCost\/liters/)
})

test('dashboard recebe resumo de alimentação',()=>{
  assert.match(index,/feed-tools\.js/)
  assert.match(index,/feed-dashboard\.js/)
  assert.match(dash,/Custo alimentar\/L/)
})

test('backup inclui feed_records',()=>{
  assert.match(security,/feed_records/)
})
