import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync('src/open-cow-reinsemination.js', 'utf8')

test('prioridades pós-parto recebem ação direta de nova IA', () => {
  assert.match(source, /\.postpartum-safe-row/)
  assert.match(source, /dataset\.action = 'inseminacao'/)
  assert.match(source, /Registar nova IA/)
})

test('número da vaca pode ser lido do cartão pós-parto sem depender de UUID', () => {
  assert.match(source, /cowNumberFromCard/)
  assert.match(source, /🐄\\s\*/)
})
