const DURATIONS = new Map([
  ['h', 60 * 60 * 1000],
  ['d', 24 * 60 * 60 * 1000],
  ['w', 7 * 24 * 60 * 60 * 1000],
])

export function parseDuration(value) {
  const match = /^(\d+)([hdw])$/.exec(value)

  if (!match || Number(match[1]) < 1) {
    throw new Error(`Invalid duration "${value}". Use a value such as 24h, 7d, or 2w.`)
  }

  return Number(match[1]) * DURATIONS.get(match[2])
}

export function reportingWindow(value, now = new Date()) {
  const until = new Date(now)
  const since = new Date(until.getTime() - parseDuration(value))

  return { since, until }
}
