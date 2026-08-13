import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source=fs.readFileSync('src/reproductive-summary.js','utf8')

test('resumo reprodutivo escapa aspas duplas corretamente',()=>{
  assert.match(source,/['\"]\\?\"['\"]\s*:\s*['\"]&quot;['\"]/)
  assert.doesNotMatch(source,/['\"]\\\\\"['\"]\s*:\s*['\"]&quot;['\"]/)
})

test('resumo reprodutivo mantém os três estados principais',()=>{
  for(const text of ['Prenhes confirmadas','A confirmar','Vazias']) assert.match(source,new RegExp(text))
})

test('resumo reprodutivo usa apenas dados da exploração atual',()=>{
  assert.match(source,/from\('reproduction'\)/)
  assert.match(source,/from\('animals'\)/)
  assert.match(source,/\.eq\('farm_id',FARM_ID\)/)
})
