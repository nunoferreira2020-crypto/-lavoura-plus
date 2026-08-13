import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source=fs.readFileSync('src/cow-names.js','utf8')
const index=fs.readFileSync('index.html','utf8')

test('nomes das vacas fornecidas estão associados aos brincos corretos',()=>{
  for(const [number,name] of [['1314','Borboleta'],['5803','Carlota'],['8662','Marlene'],['9700','Margarida'],['9980','Baixinha']]){
    assert.match(source,new RegExp(`'${number}':'${name}'`))
  }
  const entries=[...source.matchAll(/'\d{4}':'[^']+'/g)]
  assert.equal(entries.length,35)
})

test('sincronização dos nomes fica limitada à exploração atual',()=>{
  assert.match(source,/const FARM_ID=/)
  assert.match(source,/from\('animals'\)[\s\S]*?\.eq\('farm_id',FARM_ID\)/)
  assert.match(source,/update\(\{name\}\)[\s\S]*?\.eq\('farm_id',FARM_ID\)/)
})

test('módulo de nomes está carregado na aplicação',()=>{
  assert.match(index,/\/src\/cow-names\.js/)
})
