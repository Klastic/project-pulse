# Contributing

Project Pulse uses Conventional Commits and Semantic Versioning.

Examples:

```text
feat: add Discord delivery
fix: stop including draft releases
docs: explain GitHub token permissions
```

Use `feat!:` or a `BREAKING CHANGE:` footer only for an incompatible public API
or configuration change.

Before committing:

```bash
npm run check
npm test
npm run pack:check
```

Keep pull requests focused on one behavior. Include tests for behavior changes
and avoid placing access tokens or webhook URLs in fixtures.
