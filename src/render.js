const AUDIENCES = new Set(['community', 'maintainer', 'executive', 'changelog'])

function day(value) {
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
}

function linkedItem(item) {
  const number = item.number ? ` #${item.number}` : ''
  return `* [${item.title ?? item.name}](${item.url})${number}`
}

function section(title, items) {
  if (items.length === 0) return []
  return ['', `## ${title}`, '', ...items.map(linkedItem)]
}

function reportHeader(pulse, title = `Project Pulse: ${pulse.repository.name}`) {
  return [`# ${title}`, '', `${day(pulse.period.since)} through ${day(pulse.period.until)}`]
}

function releaseSection(pulse) {
  if (pulse.releases.length === 0) return []
  return [
    '', '## Releases', '',
    ...pulse.releases.map((release) => (
      `* [${release.name}](${release.url})${release.prerelease ? ' (prerelease)' : ''}`
    )),
  ]
}

function metricsSection(pulse) {
  return [
    '', '## By the Numbers', '',
    `* ${pulse.metrics.releases} releases`,
    `* ${pulse.metrics.pullRequestsMerged} pull requests merged`,
    `* ${pulse.metrics.issuesClosed} issues closed`,
    `* ${pulse.metrics.contributors} contributors to merged work`,
  ]
}

function communityReport(pulse) {
  const lines = [
    ...reportHeader(pulse),
    ...releaseSection(pulse),
    ...section('Shipped', pulse.changes.shipped),
    ...section('Fixed', pulse.changes.fixed),
    ...section('Changed', pulse.changes.changed),
    ...metricsSection(pulse),
  ]
  if (pulse.contributors.length > 0) {
    lines.push('', `Contributors: ${pulse.contributors.map((name) => `@${name}`).join(', ')}`)
  }
  return lines
}

function maintainerReport(pulse) {
  return [
    ...communityReport(pulse),
    ...section('Closed Issues', pulse.closedIssues),
    ...section('Needs Attention', pulse.needsAttention.awaitingReview),
  ]
}

function executiveReport(pulse) {
  const highlights = [
    ...pulse.releases.map((release) => ({ title: `Released ${release.name}`, url: release.url })),
    ...pulse.changes.shipped,
    ...pulse.changes.fixed,
    ...pulse.changes.changed,
  ].slice(0, 5)
  const lines = [
    ...reportHeader(pulse, `Project Update: ${pulse.repository.name}`),
    ...section('Highlights', highlights),
    ...metricsSection(pulse),
  ]
  if (pulse.needsAttention.awaitingReview.length > 0) {
    lines.push('', '## Follow Up', '', `* ${pulse.needsAttention.awaitingReview.length} pull requests have waited at least seven days for review.`)
  }
  return lines
}

function changelogReport(pulse) {
  return [
    ...reportHeader(pulse, `Changelog: ${pulse.repository.name}`),
    ...section('Added', pulse.changes.shipped),
    ...section('Fixed', pulse.changes.fixed),
    ...section('Changed', pulse.changes.changed),
  ]
}

export function renderMarkdown(pulse, { audience = 'community' } = {}) {
  if (!AUDIENCES.has(audience)) {
    throw new Error(`Unsupported audience "${audience}". Use community, maintainer, executive, or changelog.`)
  }

  const renderers = {
    community: communityReport,
    maintainer: maintainerReport,
    executive: executiveReport,
    changelog: changelogReport,
  }
  const lines = renderers[audience](pulse)
  return lines.filter((line, index, all) => !(line === '' && all[index - 1] === '')).join('\n').trim() + '\n'
}

export function renderPulse(pulse, format, options = {}) {
  if (format === 'json') return `${JSON.stringify({ ...pulse, audience: options.audience ?? 'community' }, null, 2)}\n`
  if (format === 'markdown') return renderMarkdown(pulse, options)
  throw new Error(`Unsupported format "${format}". Use markdown or json.`)
}
