function splitAtLines(text, limit) {
  if (text.length <= limit) return [text]

  const chunks = []
  let remaining = text
  while (remaining.length > limit) {
    let boundary = remaining.lastIndexOf('\n', limit)
    if (boundary < Math.floor(limit * 0.5)) boundary = limit
    chunks.push(remaining.slice(0, boundary).trim())
    remaining = remaining.slice(boundary).trim()
  }
  if (remaining) chunks.push(remaining)
  return chunks
}

async function postJson(url, body, { fetchImpl, headers = {} }) {
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Delivery returned HTTP ${response.status}.`)
  }

  return response
}

export function prepareDeliveries(report, options) {
  const deliveries = []

  if (options.discordWebhook) {
    deliveries.push({
      destination: 'discord',
      requests: splitAtLines(report, 1900).map((content) => ({
        url: options.discordWebhook,
        body: { content, allowed_mentions: { parse: [] } },
      })),
    })
  }

  if (options.slackWebhook) {
    deliveries.push({
      destination: 'slack',
      requests: splitAtLines(report, 35000).map((text) => ({
        url: options.slackWebhook,
        body: { text },
      })),
    })
  }

  if (options.githubIssue) {
    const encoded = options.repository.split('/').map(encodeURIComponent).join('/')
    deliveries.push({
      destination: 'github-issue',
      requests: [{
        url: `${options.apiUrl.replace(/\/$/, '')}/repos/${encoded}/issues`,
        headers: {
          accept: 'application/vnd.github+json',
          authorization: `Bearer ${options.token}`,
          'x-github-api-version': '2022-11-28',
        },
        body: { title: options.issueTitle, body: report },
      }],
    })
  }

  return deliveries
}

export async function deliverReport(report, options, { fetchImpl = fetch } = {}) {
  const deliveries = prepareDeliveries(report, options)
  const results = []

  for (const delivery of deliveries) {
    if (!options.dryRun) {
      for (const request of delivery.requests) {
        await postJson(request.url, request.body, {
          fetchImpl,
          headers: request.headers,
        })
      }
    }
    results.push({
      destination: delivery.destination,
      requests: delivery.requests.length,
      status: options.dryRun ? 'dry-run' : 'sent',
    })
  }

  return results
}
