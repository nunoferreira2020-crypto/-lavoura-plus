import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync('src/production-quality-sync.js', 'utf8')

test('Produção lê UFC do campo cfu das análises do leite', () => {
  assert.match(source, /somatic_cells, cfu/)
  assert.match(source, /data\.cfu/)
  assert.doesNotMatch(source, /milk_analyses'[\s\S]*somatic_cells, ufc/)
})
