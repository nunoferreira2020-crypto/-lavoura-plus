import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const production = fs.readFileSync('src/production-quality-sync.js', 'utf8')
const finance = fs.readFileSync('src/finance-insights.js', 'utf8')
const health = fs.readFileSync('src/health-tools.js', 'utf8')
const iphone = fs.readFileSync('src/iphone-public-fixes.js', 'utf8')

test('produção limita consultas repetidas e reutiliza a última análise', () => {
  assert.match(production, /REFRESH_INTERVAL_MS = 30000/)
  assert.match(production, /lastAnalysis && now - lastFetchAt < REFRESH_INTERVAL_MS/)
  assert.match(production, /applyAnalysis\(card, lastAnalysis\)/)
  assert.match(production, /scheduled = true/)
})

test('finanças só elimina receita de leite quando data e valor coincidem', () => {
  assert.match(finance, /milkDate===date/)
  assert.match(finance, /Math\.abs\(milkAmount-amount\)<0\.01/)
  assert.doesNotMatch(finance, /category\.includes\('leite'\).*return true/)
})

test('saúde mantém dados e carências isolados pela exploração', () => {
  assert.match(health, /from\('health_records'\)/)
  assert.match(health, /\.eq\('farm_id',FARM_ID\)/)
  assert.match(health, /milk_withdrawal_until/)
  assert.match(health, /meat_withdrawal_until/)
})

test('navegação inferior fica escondida nos ecrãs de autenticação', () => {
  assert.match(iphone, /body\.auth-flow-screen \.bottom-nav/)
  assert.match(iphone, /#newPassword/)
  assert.match(iphone, /#codigo2fa/)
  assert.match(iphone, /classList\.toggle\(\s*'auth-flow-screen'/)
})
