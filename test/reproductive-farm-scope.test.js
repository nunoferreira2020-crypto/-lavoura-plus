import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source=fs.readFileSync('src/reproductive-stage-v2.js','utf8')

test('reprodução usa farm_id nas leituras e atualizações críticas',()=>{
  assert.match(source,/const FARM_ID=/)
  const farmFilters=source.match(/\.eq\('farm_id',FARM_ID\)/g)||[]
  assert.ok(farmFilters.length>=7,`esperados vários filtros por farm_id, encontrados ${farmFilters.length}`)
  assert.match(source,/from\('animals'\)[\s\S]*?\.eq\('farm_id',FARM_ID\)[\s\S]*?\.eq\('number',number\)/)
  assert.match(source,/from\('reproduction'\)[\s\S]*?\.eq\('farm_id',FARM_ID\)[\s\S]*?\.eq\('animal_id',animal\.data\.id\)/)
  assert.match(source,/update\(payload\)\.eq\('farm_id',FARM_ID\)\.eq\('id',ia\.data\.id\)/)
})

test('diagnóstico de vaca vazia limpa previsões de secagem e parto',()=>{
  assert.match(source,/result==='Vazia'\?\{result,expected_calving:null,expected_dry_off:null\}/)
})
