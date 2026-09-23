import { readFile } from 'node:fs/promises'

const ALLOWED_KEYS = new Set(['since', 'format', 'audience', 'output', 'summary', 'delivery'])
const DELIVERY_KEYS = new Set(['githubIssue', 'dryRun'])

export async function readConfig(path, { read = readFile } = {}) {
  if (!path) return {}

  let source
  try {
    source = await read(path, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return {}
    throw error
  }

  let config
  try {
    config = JSON.parse(source)
  } catch {
    throw new Error(`Configuration file "${path}" is not valid JSON.`)
  }

  if (!config || Array.isArray(config) || typeof config !== 'object') {
    throw new Error(`Configuration file "${path}" must contain a JSON object.`)
  }

  const unknown = Object.keys(config).filter((key) => !ALLOWED_KEYS.has(key))
  if (unknown.length > 0) {
    throw new Error(`Unknown configuration ${unknown.length === 1 ? 'key' : 'keys'}: ${unknown.join(', ')}`)
  }

  if (config.delivery !== undefined) {
    if (!config.delivery || Array.isArray(config.delivery) || typeof config.delivery !== 'object') {
      throw new Error('Configuration key "delivery" must contain a JSON object.')
    }
    const unknownDelivery = Object.keys(config.delivery).filter((key) => !DELIVERY_KEYS.has(key))
    if (unknownDelivery.length > 0) {
      throw new Error(`Unknown delivery configuration ${unknownDelivery.length === 1 ? 'key' : 'keys'}: ${unknownDelivery.join(', ')}`)
    }
  }

  return config
}

export function booleanValue(value, fallback) {
  if (value === undefined || value === '') return fallback
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false
  throw new Error(`Invalid boolean value "${value}". Use true or false.`)
}
