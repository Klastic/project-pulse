#!/usr/bin/env node

import { writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import packageJson from '../package.json' with { type: 'json' }
import { GitHubClient, buildPulse, parseRepository, renderPulse, reportingWindow } from './index.js'

const help = `Project Pulse ${packageJson.version}

Usage:
  project-pulse <owner/repository|GitHub URL> [options]

Options:
  --since <duration>    Reporting window such as 7d, 24h, or 2w (default: 7d)
  --format <format>     markdown or json (default: markdown)
  --audience <name>     community, maintainer, executive, or changelog
  --output <path>       Write the report to a file instead of stdout
  --api-url <url>       GitHub API base URL (default: https://api.github.com)
  --help                Show this help
  --version             Show the installed version
`

export async function main(argv = process.argv.slice(2), dependencies = {}) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      since: { type: 'string', default: '7d' },
      format: { type: 'string', default: 'markdown' },
      audience: { type: 'string', default: 'community' },
      output: { type: 'string', short: 'o' },
      'api-url': { type: 'string', default: 'https://api.github.com' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  })

  if (values.help) return { output: help, destination: 'stdout' }
  if (values.version) return { output: `${packageJson.version}\n`, destination: 'stdout' }

  const repository = parseRepository(positionals[0])
  const window = reportingWindow(values.since, dependencies.now ?? new Date())
  const client = dependencies.client ?? new GitHubClient({
    token: process.env.GH_TOKEN || process.env.GITHUB_TOKEN,
    apiUrl: values['api-url'],
  })
  const activity = await client.collect({ ...repository, since: window.since })
  const pulse = buildPulse(activity, window)
  const output = renderPulse(pulse, values.format, { audience: values.audience })

  if (values.output) {
    await (dependencies.writeFile ?? writeFile)(values.output, output, 'utf8')
    return { output: `Project Pulse written to ${values.output}\n`, destination: 'stdout' }
  }

  return { output, destination: 'stdout' }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(({ output }) => process.stdout.write(output))
    .catch((error) => {
      process.stderr.write(`Project Pulse: ${error.message}\n`)
      process.exitCode = 1
    })
}
