import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const dashboard = fs.readFileSync('src/dashboard-smart.js', 'utf8')

test('dashboard inclui secagens e partos até 7 dias atrasados', () => {
  assert.match(dashboard, /dry>=-7&&dry<=7/)
  assert.match(dashboard, /calv>=-7&&calv<=7/)
  assert.match(dashboard, /dia\(s\) atrasado/)
  assert.match(dashboard, /timingText/)
})
