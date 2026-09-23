import { appendFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { GitHubClient, buildPulse, parseRepository, renderPulse, reportingWindow } from './index.js'
import { booleanValue, readConfig } from './config.js'

function input(name, env) {
  return env[`INPUT_${name.toUpperCase().replaceAll('-', '_')}`]?.trim()
}

async function setOutput(name, value, { env, append }) {
  if (!env.GITHUB_OUTPUT) return
  let delimiter = `project_pulse_${randomUUID()}`
  while (value.includes(delimiter)) delimiter = `project_pulse_${randomUUID()}`
  await append(env.GITHUB_OUTPUT, `${name}<<${delimiter}\n${value}\n${delimiter}\n`, 'utf8')
}

export async function runAction(dependencies = {}) {
  const env = dependencies.env ?? process.env
  const append = dependencies.appendFile ?? appendFile
  const write = dependencies.writeFile ?? writeFile
  const configPath = input('config', env) || 'project-pulse.config.json'
  const config = await readConfig(configPath, { read: dependencies.readFile })
  const repository = parseRepository(input('repository', env) || env.GITHUB_REPOSITORY)
  const sinceValue = input('since', env) || config.since || '7d'
  const format = input('format', env) || config.format || 'markdown'
  const outputPath = input('output', env) || config.output || (format === 'json' ? 'project-pulse.json' : 'project-pulse.md')
  const addSummary = booleanValue(input('summary', env), config.summary ?? true)
  const window = reportingWindow(sinceValue, dependencies.now ?? new Date())
  const client = dependencies.client ?? new GitHubClient({
    token: input('token', env) || env.GITHUB_TOKEN,
    apiUrl: env.GITHUB_API_URL,
  })

  const activity = await client.collect({ ...repository, since: window.since })
  const pulse = buildPulse(activity, window)
  const report = renderPulse(pulse, format)
  await write(outputPath, report, 'utf8')

  if (addSummary && env.GITHUB_STEP_SUMMARY) {
    const summary = format === 'markdown' ? report : `# Project Pulse\n\nReport written to \`${outputPath}\`.\n`
    await append(env.GITHUB_STEP_SUMMARY, summary, 'utf8')
  }

  await setOutput('report-path', outputPath, { env, append })
  await setOutput('report', report.trimEnd(), { env, append })
  return { pulse, report, outputPath }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAction().catch((error) => {
    process.stderr.write(`::error::Project Pulse: ${error.message}\n`)
    process.exitCode = 1
  })
}
