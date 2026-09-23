const FIX_LABELS = new Set(['bug', 'bugfix', 'fix', 'regression'])
const FEATURE_LABELS = new Set(['enhancement', 'feature', 'feat'])

function labelsFor(item) {
  return (item.labels ?? []).map((label) => String(label.name ?? label).toLowerCase())
}

function changeType(pullRequest) {
  const labels = labelsFor(pullRequest)
  if (labels.some((label) => FIX_LABELS.has(label))) return 'fixed'
  if (labels.some((label) => FEATURE_LABELS.has(label))) return 'shipped'
  return 'changed'
}

function within(date, since, until) {
  if (!date) return false
  const timestamp = new Date(date).getTime()
  return timestamp >= since.getTime() && timestamp <= until.getTime()
}

function reference(item) {
  return {
    number: item.number,
    title: item.title,
    url: item.html_url,
    author: item.user?.login ?? null,
    labels: labelsFor(item),
  }
}

export function buildPulse(activity, { since, until, staleDays = 7 }) {
  const mergedPulls = activity.closedPulls
    .filter((item) => within(item.merged_at, since, until))
    .map((item) => ({ ...reference(item), mergedAt: item.merged_at, type: changeType(item) }))

  const closedIssues = activity.closedIssues
    .filter((item) => !item.pull_request && within(item.closed_at, since, until))
    .map(reference)

  const releases = activity.releases
    .filter((item) => !item.draft && within(item.published_at, since, until))
    .map((item) => ({
      name: item.name || item.tag_name,
      tag: item.tag_name,
      url: item.html_url,
      publishedAt: item.published_at,
      prerelease: Boolean(item.prerelease),
    }))

  const staleBefore = until.getTime() - staleDays * 24 * 60 * 60 * 1000
  const awaitingReview = activity.openPulls
    .filter((item) => new Date(item.created_at).getTime() <= staleBefore)
    .map((item) => ({ ...reference(item), createdAt: item.created_at }))

  const contributors = [...new Set(mergedPulls.map((item) => item.author).filter(Boolean))].sort()

  return {
    schemaVersion: 1,
    repository: {
      name: activity.repository.full_name,
      description: activity.repository.description ?? null,
      url: activity.repository.html_url,
    },
    period: { since: since.toISOString(), until: until.toISOString() },
    releases,
    changes: {
      shipped: mergedPulls.filter((item) => item.type === 'shipped'),
      fixed: mergedPulls.filter((item) => item.type === 'fixed'),
      changed: mergedPulls.filter((item) => item.type === 'changed'),
    },
    closedIssues,
    contributors,
    needsAttention: { awaitingReview },
    metrics: {
      releases: releases.length,
      pullRequestsMerged: mergedPulls.length,
      issuesClosed: closedIssues.length,
      contributors: contributors.length,
    },
  }
}
