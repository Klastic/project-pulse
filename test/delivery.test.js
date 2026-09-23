import assert from 'node:assert/strict'
import test from 'node:test'
import { deliverReport, prepareDeliveries } from '../src/delivery.js'

test('prepares Discord payloads without allowing mentions', () => {
  const deliveries = prepareDeliveries('Hello @everyone', {
    discordWebhook: 'https://discord.example/webhook',
  })
  assert.equal(deliveries.length, 1)
  assert.deepEqual(deliveries[0].requests[0].body.allowed_mentions, { parse: [] })
})

test('splits long Discord reports at safe boundaries', () => {
  const report = Array.from({ length: 500 }, (_, index) => `Line ${index}`).join('\n')
  const [delivery] = prepareDeliveries(report, {
    discordWebhook: 'https://discord.example/webhook',
  })
  assert.ok(delivery.requests.length > 1)
  assert.ok(delivery.requests.every((request) => request.body.content.length <= 1900))
  assert.equal(delivery.requests.map((request) => request.body.content).join('\n').replaceAll('\n', ''), report.replaceAll('\n', ''))
})

test('sends Slack and GitHub issue payloads', async () => {
  const requests = []
  const results = await deliverReport('# Pulse', {
    slackWebhook: 'https://slack.example/webhook',
    githubIssue: true,
    repository: 'Klastic/project-pulse',
    apiUrl: 'https://api.github.com',
    token: 'secret-token',
    issueTitle: 'Project Pulse',
    dryRun: false,
  }, {
    fetchImpl: async (url, options) => {
      requests.push({ url, options })
      return new Response(null, { status: 204 })
    },
  })

  assert.deepEqual(results.map((result) => result.destination), ['slack', 'github-issue'])
  assert.equal(requests.length, 2)
  assert.match(requests[1].url, /Klastic\/project-pulse\/issues$/)
  assert.equal(requests[1].options.headers.authorization, 'Bearer secret-token')
  assert.doesNotMatch(JSON.stringify(results), /secret-token/)
})

test('dry run prepares deliveries without sending requests', async () => {
  let calls = 0
  const results = await deliverReport('Preview', {
    discordWebhook: 'https://discord.example/webhook',
    dryRun: true,
  }, {
    fetchImpl: async () => {
      calls += 1
      return new Response(null, { status: 204 })
    },
  })
  assert.equal(calls, 0)
  assert.equal(results[0].status, 'dry-run')
})

test('fails clearly when a destination rejects delivery', async () => {
  await assert.rejects(deliverReport('Pulse', {
    slackWebhook: 'https://slack.example/webhook',
  }, {
    fetchImpl: async () => new Response('', { status: 429 }),
  }), /HTTP 429/)
})
