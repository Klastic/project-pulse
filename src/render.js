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
  if (items.length === 0) return ''
  return `\n## ${title}\n\n${items.map(linkedItem).join('\n')}\n`
}

export function renderMarkdown(pulse) {
  const lines = [
    `# Project Pulse: ${pulse.repository.name}`,
    '',
    `${day(pulse.period.since)} through ${day(pulse.period.until)}`,
  ]

  if (pulse.releases.length > 0) {
    lines.push('', '## Releases', '', ...pulse.releases.map((release) => (
      `* [${release.name}](${release.url})${release.prerelease ? ' (prerelease)' : ''}`
    )))
  }

  lines.push(section('Shipped', pulse.changes.shipped))
  lines.push(section('Fixed', pulse.changes.fixed))
  lines.push(section('Changed', pulse.changes.changed))
  lines.push(section('Closed Issues', pulse.closedIssues))

  if (pulse.needsAttention.awaitingReview.length > 0) {
    lines.push(section('Needs Attention', pulse.needsAttention.awaitingReview))
  }

  lines.push('', '## By the Numbers', '')
  lines.push(`* ${pulse.metrics.releases} releases`)
  lines.push(`* ${pulse.metrics.pullRequestsMerged} pull requests merged`)
  lines.push(`* ${pulse.metrics.issuesClosed} issues closed`)
  lines.push(`* ${pulse.metrics.contributors} contributors to merged work`)

  if (pulse.contributors.length > 0) {
    lines.push('', `Contributors: ${pulse.contributors.map((name) => `@${name}`).join(', ')}`)
  }

  return lines.filter((line, index, all) => !(line === '' && all[index - 1] === '')).join('\n').trim() + '\n'
}

export function renderPulse(pulse, format) {
  if (format === 'json') return `${JSON.stringify(pulse, null, 2)}\n`
  if (format === 'markdown') return renderMarkdown(pulse)
  throw new Error(`Unsupported format "${format}". Use markdown or json.`)
}
