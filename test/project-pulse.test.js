import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPulse, parseDuration, parseRepository, renderMarkdown, renderPulse, reportingWindow } from '../src/index.js'

const until = new Date('2026-09-23T12:00:00.000Z')
const { since } = reportingWindow('7d', until)

const activity = {
  repository: {
    full_name: 'Klastic/project-pulse',
    description: 'Readable repository updates',
    html_url: 'https://github.com/Klastic/project-pulse',
  },
  releases: [
    {
      name: 'First pulse', tag_name: 'v0.1.0', draft: false, prerelease: false,
      published_at: '2026-09-22T12:00:00Z', html_url: 'https://example.test/releases/1',
    },
    {
      name: 'Draft', tag_name: 'v0.2.0', draft: true, prerelease: false,
      published_at: '2026-09-22T12:00:00Z', html_url: 'https://example.test/releases/2',
    },
  ],
  closedPulls: [
    {
      number: 12, title: 'Add Markdown reports', merged_at: '2026-09-21T12:00:00Z',
      html_url: 'https://example.test/pull/12', user: { login: 'daniel' },
      labels: [{ name: 'feature' }],
    },
    {
      number: 13, title: 'Fix empty reports', merged_at: '2026-09-22T12:00:00Z',
      html_url: 'https://example.test/pull/13', user: { login: 'helper' },
      labels: [{ name: 'bug' }],
    },
    {
      number: 9, title: 'Old change', merged_at: '2026-08-01T12:00:00Z',
      html_url: 'https://example.test/pull/9', user: { login: 'daniel' }, labels: [],
    },
  ],
  closedIssues: [
    {
      number: 4, title: 'Support JSON', closed_at: '2026-09-20T12:00:00Z',
      html_url: 'https://example.test/issues/4', user: { login: 'reporter' }, labels: [],
    },
    {
      number: 13, title: 'Pull request masquerading as issue', closed_at: '2026-09-20T12:00:00Z',
      html_url: 'https://example.test/pull/13', user: { login: 'helper' }, pull_request: {}, labels: [],
    },
  ],
  openPulls: [
    {
      number: 2, title: 'Waiting for review', created_at: '2026-09-01T12:00:00Z',
      html_url: 'https://example.test/pull/2', user: { login: 'contributor' }, labels: [],
    },
    {
      number: 20, title: 'Recently opened', created_at: '2026-09-22T12:00:00Z',
      html_url: 'https://example.test/pull/20', user: { login: 'contributor' }, labels: [],
    },
  ],
}

test('parses GitHub repository names and URLs', () => {
  assert.deepEqual(parseRepository('Klastic/project-pulse'), {
    owner: 'Klastic', repo: 'project-pulse', fullName: 'Klastic/project-pulse',
  })
  assert.equal(parseRepository('https://github.com/Klastic/project-pulse.git').fullName, 'Klastic/project-pulse')
  assert.throws(() => parseRepository('project-pulse'), /Invalid repository/)
})

test('parses supported reporting durations', () => {
  assert.equal(parseDuration('24h'), 86_400_000)
  assert.equal(parseDuration('2w'), 1_209_600_000)
  assert.throws(() => parseDuration('0d'), /Invalid duration/)
  assert.throws(() => parseDuration('one week'), /Invalid duration/)
})

test('builds a pulse using only activity inside the reporting window', () => {
  const pulse = buildPulse(activity, { since, until })
  assert.equal(pulse.metrics.releases, 1)
  assert.equal(pulse.metrics.pullRequestsMerged, 2)
  assert.equal(pulse.metrics.issuesClosed, 1)
  assert.deepEqual(pulse.contributors, ['daniel', 'helper'])
  assert.equal(pulse.changes.shipped[0].number, 12)
  assert.equal(pulse.changes.fixed[0].number, 13)
  assert.equal(pulse.needsAttention.awaitingReview[0].number, 2)
})

test('renders evidence links and summary metrics as Markdown', () => {
  const markdown = renderMarkdown(buildPulse(activity, { since, until }))
  assert.match(markdown, /^# Project Pulse: Klastic\/project-pulse/)
  assert.match(markdown, /\[Add Markdown reports\]\(https:\/\/example\.test\/pull\/12\) #12/)
  assert.match(markdown, /2 pull requests merged/)
  assert.doesNotMatch(markdown, /Draft/)
  assert.doesNotMatch(markdown, /Old change/)
})

test('renders machine readable JSON', () => {
  const output = renderPulse(buildPulse(activity, { since, until }), 'json')
  assert.equal(JSON.parse(output).schemaVersion, 1)
  assert.throws(() => renderPulse({}, 'xml'), /Unsupported format/)
})
