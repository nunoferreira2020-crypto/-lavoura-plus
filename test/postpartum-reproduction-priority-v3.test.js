import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const index=fs.readFileSync('index.html','utf8')
test('index carrega apenas o resumo pós-parto v2',()=>{assert.match(index,/postpartum-reproduction-summary-v2\.js/);assert.doesNotMatch(index,/postpartum-reproduction-summary\.js\?v=1/)})
