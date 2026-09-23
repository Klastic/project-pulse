function nextLink(header) {
  if (!header) return null

  for (const entry of header.split(',')) {
    const match = entry.match(/<([^>]+)>;\s*rel="([^"]+)"/)
    if (match?.[2] === 'next') return match[1]
  }

  return null
}

export class GitHubClient {
  constructor({ token, apiUrl = 'https://api.github.com', fetchImpl = fetch } = {}) {
    this.token = token
    this.apiUrl = apiUrl.replace(/\/$/, '')
    this.fetchImpl = fetchImpl
  }

  async request(path) {
    const url = path.startsWith('http') ? path : `${this.apiUrl}${path}`
    const headers = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'project-pulse',
      'X-GitHub-Api-Version': '2022-11-28',
    }

    if (this.token) headers.Authorization = `Bearer ${this.token}`

    const response = await this.fetchImpl(url, { headers })
    if (!response.ok) {
      const remaining = response.headers.get('x-ratelimit-remaining')
      const rateHint = response.status === 403 && remaining === '0'
        ? ' GitHub API rate limit reached. Set GH_TOKEN and try again.'
        : ''
      throw new Error(`GitHub API returned ${response.status} for ${url}.${rateHint}`)
    }

    return response
  }

  async paginate(path, { maxPages = 10, stop } = {}) {
    const items = []
    let url = path

    for (let page = 0; url && page < maxPages; page += 1) {
      const response = await this.request(url)
      const batch = await response.json()
      if (!Array.isArray(batch)) throw new Error('GitHub returned an unexpected paginated response.')
      items.push(...batch)
      if (stop?.(batch)) break
      url = nextLink(response.headers.get('link'))
    }

    return items
  }

  async collect({ owner, repo, since }) {
    const encodedRepo = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
    const sinceIso = since.toISOString()

    const [repository, releases, closedPulls, closedIssues, openPulls] = await Promise.all([
      this.request(encodedRepo).then((response) => response.json()),
      this.paginate(`${encodedRepo}/releases?per_page=100`),
      this.paginate(`${encodedRepo}/pulls?state=closed&sort=updated&direction=desc&per_page=100`, {
        stop: (batch) => batch.length > 0 && batch.every((item) => item.updated_at < sinceIso),
      }),
      this.paginate(`${encodedRepo}/issues?state=closed&sort=updated&direction=desc&since=${encodeURIComponent(sinceIso)}&per_page=100`),
      this.paginate(`${encodedRepo}/pulls?state=open&sort=created&direction=asc&per_page=100`, { maxPages: 3 }),
    ])

    return { repository, releases, closedPulls, closedIssues, openPulls }
  }
}
