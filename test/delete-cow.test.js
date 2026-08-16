import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source=fs.readFileSync('src/delete-cow.js','utf8')
const iphone=fs.readFileSync('src/iphone-public-fixes.js','utf8')

test('eliminação de vaca exige confirmação pelo número e respeita a exploração',()=>{
  assert.match(source,/prompt\(`Para confirmar, escreva o número da vaca:/)
  assert.match(source,/\.from\('animals'\)[\s\S]*\.delete\(\)[\s\S]*\.eq\('id',animal\.id\)[\s\S]*\.eq\('farm_id',FARM_ID\)/)
})

test('opção de eliminar é carregada com os fixes públicos',()=>{
  assert.match(iphone,/import '\.\/delete-cow\.js'/)
  assert.match(source,/data-delete-cow/)
  assert.match(source,/Esta ação é permanente/)
})
