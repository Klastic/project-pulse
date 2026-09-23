import assert from 'node:assert/strict'
import test from 'node:test'
import { runAction } from '../src/action.js'
import { booleanValue, readConfig } from '../src/config.js'

const emptyActivity = {
  repository: {
    full_name: 'Klastic/project-pulse',
    description: 'Readable updates',
    html_url: 'https://github.com/Klastic/project-pulse',
  },
  releases: [],
  closedPulls: [],
  closedIssues: [],
  openPulls: [],
}

test('reads and validates repository configuration', async () => {
  const config = await readConfig('config.json', {
    read: async () => JSON.stringify({ since: '2w', summary: false }),
  })
  assert.deepEqual(config, { since: '2w', summary: false })

  await assert.rejects(readConfig('bad.json', { read: async () => '{' }), /not valid JSON/)
  await assert.rejects(readConfig('bad.json', { read: async () => '{"webhook":"secret"}' }), /Unknown configuration key/)
})

test('parses strict boolean configuration', () => {
  assert.equal(booleanValue('true', false), true)
  assert.equal(booleanValue(false, true), false)
  assert.equal(booleanValue('', true), true)
  assert.throws(() => booleanValue('yes', false), /Invalid boolean/)
})

test('runs the Action and writes report, summary, and outputs', async () => {
  const writes = []
  const appends = []
  const env = {
    GITHUB_REPOSITORY: 'Klastic/project-pulse',
    GITHUB_STEP_SUMMARY: '/tmp/summary',
    GITHUB_OUTPUT: '/tmp/output',
    INPUT_SINCE: '7d',
    INPUT_OUTPUT: 'pulse.md',
    INPUT_SUMMARY: 'true',
  }
  const client = { collect: async () => emptyActivity }

  const result = await runAction({
    env,
    client,
    now: new Date('2026-09-23T12:00:00Z'),
    readFile: async () => {
      const error = new Error('missing')
      error.code = 'ENOENT'
      throw error
    },
    writeFile: async (...args) => writes.push(args),
    appendFile: async (...args) => appends.push(args),
  })

  assert.equal(result.outputPath, 'pulse.md')
  assert.equal(writes[0][0], 'pulse.md')
  assert.match(writes[0][1], /Project Pulse: Klastic\/project-pulse/)
  assert.equal(appends[0][0], '/tmp/summary')
  assert.equal(appends.filter(([path]) => path === '/tmp/output').length, 2)
  assert.match(appends.find(([, value]) => value.startsWith('report-path'))[1], /pulse\.md/)
})

test('does not write a summary when disabled', async () => {
  const appends = []
  await runAction({
    env: {
      GITHUB_REPOSITORY: 'Klastic/project-pulse',
      GITHUB_STEP_SUMMARY: '/tmp/summary',
      GITHUB_OUTPUT: '/tmp/output',
      INPUT_SUMMARY: 'false',
      INPUT_FORMAT: 'json',
    },
    client: { collect: async () => emptyActivity },
    now: new Date('2026-09-23T12:00:00Z'),
    readFile: async () => {
      const error = new Error('missing')
      error.code = 'ENOENT'
      throw error
    },
    writeFile: async () => {},
    appendFile: async (...args) => appends.push(args),
  })

  assert.equal(appends.some(([path]) => path === '/tmp/summary'), false)
})
