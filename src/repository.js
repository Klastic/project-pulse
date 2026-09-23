export function parseRepository(value) {
  if (!value) {
    throw new Error('A GitHub repository is required.')
  }

  let candidate = value.trim().replace(/\.git$/, '').replace(/\/$/, '')

  if (/^https?:\/\//i.test(candidate)) {
    const url = new URL(candidate)
    const parts = url.pathname.split('/').filter(Boolean)
    candidate = parts.slice(0, 2).join('/')
  }

  const parts = candidate.split('/')
  if (parts.length !== 2 || parts.some((part) => !/^[A-Za-z0-9_.-]+$/.test(part))) {
    throw new Error(`Invalid repository "${value}". Use owner/repository or a GitHub URL.`)
  }

  return { owner: parts[0], repo: parts[1], fullName: `${parts[0]}/${parts[1]}` }
}
