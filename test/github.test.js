import assert from 'node:assert/strict'
import test from 'node:test'
import { GitHubClient } from '../src/github.js'

function response(body, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(body), { status, headers })
}

test('paginates GitHub results using the Link header', async () => {
  const urls = []
  const client = new GitHubClient({
    fetchImpl: async (url) => {
      urls.push(url)
      if (urls.length === 1) {
        return response([{ id: 1 }], {
          headers: { link: '<https://api.github.com/example?page=2>; rel="next"' },
        })
      }
      return response([{ id: 2 }])
    },
  })

  assert.deepEqual(await client.paginate('/example'), [{ id: 1 }, { id: 2 }])
  assert.equal(urls.length, 2)
})

test('adds authentication without exposing the token in errors', async () => {
  let authorization
  const client = new GitHubClient({
    token: 'secret-value',
    fetchImpl: async (_url, options) => {
      authorization = options.headers.Authorization
      return response({ message: 'no' }, { status: 404 })
    },
  })

  await assert.rejects(client.request('/missing'), (error) => {
    assert.doesNotMatch(error.message, /secret-value/)
    return true
  })
  assert.equal(authorization, 'Bearer secret-value')
})

test('explains anonymous rate limit failures', async () => {
  const client = new GitHubClient({
    fetchImpl: async () => response({}, {
      status: 403,
      headers: { 'x-ratelimit-remaining': '0' },
    }),
  })

  await assert.rejects(client.request('/limited'), /Set GH_TOKEN/)
})
