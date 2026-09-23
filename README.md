# Project Pulse

Project Pulse turns GitHub repository activity into a concise update that
maintainers can share with their community or team.

Project Pulse includes a dependency free CLI and GitHub Action for public or
private GitHub repositories. It produces deterministic Markdown or JSON and
never sends a report anywhere without an explicit command.

## GitHub Action

Add a scheduled workflow to any repository:

```yaml
name: Weekly Project Pulse

on:
  workflow_dispatch:
  schedule:
    - cron: '0 15 * * 5'

permissions:
  contents: read
  pull-requests: read
  issues: read

jobs:
  pulse:
    runs-on: ubuntu-latest
    steps:
      - uses: Klastic/project-pulse@v0.2.0
        id: pulse
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          since: 7d
```

The Action writes the report to the workflow summary and `project-pulse.md`.
It also exposes `report` and `report-path` outputs for later delivery steps.

See [`examples/weekly-pulse.yml`](examples/weekly-pulse.yml) for artifact
upload and [`project-pulse.config.example.json`](project-pulse.config.example.json)
for repository configuration.

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

1. CLI report generation, complete in 0.1.0
2. GitHub Action and repository configuration, complete in 0.2.0
3. Discord, Slack, and GitHub delivery adapters
4. Audience templates and optional assisted summaries
5. Web configuration and report history

See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

MIT
