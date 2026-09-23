# Project Pulse

Project Pulse turns GitHub repository activity into a concise update that
maintainers can share with their community or team.

This first release is a dependency free CLI for public or private GitHub
repositories. It produces deterministic Markdown or JSON and never sends a
report anywhere without an explicit command.

## Requirements

Node.js 20 or newer.

## Try it

```bash
node src/cli.js owner/repository --since 7d
```

Use a token to increase the GitHub API rate limit or access a private
repository:

```bash
export GH_TOKEN="your-token"
node src/cli.js owner/repository --since 14d --format markdown
```

Save the report to a file:

```bash
node src/cli.js owner/repository --since 30d --output pulse.md
```

Generate structured data for another tool:

```bash
node src/cli.js owner/repository --format json
```

Project Pulse reads `GH_TOKEN` first and falls back to `GITHUB_TOKEN`. Tokens
are never included in generated reports.

## CLI

```text
project-pulse <owner/repository|GitHub URL> [options]

Options:
  --since <duration>    Reporting window such as 7d, 24h, or 2w
  --format <format>     markdown or json
  --output <path>       Write the report to a file
  --api-url <url>       GitHub API base URL
  --help                Show help
  --version             Show the installed version
```

## What the report includes

* Published releases
* Merged pull requests
* Closed issues
* Contributors participating in merged work
* Open pull requests waiting at least seven days for review

Pull request labels determine whether a change appears under `Shipped`,
`Fixed`, or `Changed`. Project Pulse preserves links to the underlying GitHub
evidence so readers can verify every item.

## Development

```bash
npm run check
npm test
npm run test:coverage
npm run pack:check
```

## Roadmap

The implementation is intentionally divided into usable slices:

1. CLI report generation
2. GitHub Action and repository configuration
3. Discord, Slack, and GitHub delivery adapters
4. Audience templates and optional assisted summaries
5. Web configuration and report history

See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

MIT
