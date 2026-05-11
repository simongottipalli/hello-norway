# Documentation Maintenance

Before opening a PR, follow this workflow to keep project documentation accurate and up to date.

## Workflow

1. List changed files: `git diff main --name-only`
2. Use the mapping table below to identify which docs are affected.
3. Read the relevant doc(s) to understand existing content and structure.
4. Make targeted, accurate updates — avoid wholesale rewrites.
5. Commit doc updates on the same branch as the code change.

## Change-to-Doc Mapping


| Change area                                          | Docs to update                                                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Project structure (new dirs, files, routes, scripts) | `[README.md](../README.md)` — Project Structure section                                                      |
| New/removed dependencies or stack changes            | `[README.md](../README.md)` — Stack section                                                                  |
| Unit/integration test strategy, patterns, or setup   | `[TESTING.md](../TESTING.md)`, `[src/__tests__/README.md](../src/__tests__/README.md)`                       |
| E2E / Playwright tests or configuration              | `[TESTING.md](../TESTING.md)`, `[e2e/README.md](../e2e/README.md)`                                           |
| UI components added or theming/design token changes  | `[README.md](../README.md)` — UI Components section; `[AGENTS.md](../AGENTS.md)` — UI Development Guidelines |
| Agent workflow, coding conventions, or project rules | `[AGENTS.md](../AGENTS.md)`, `[CLAUDE.md](../CLAUDE.md)`, `[.github/copilot-instructions.md](../.github/copilot-instructions.md)` |
| Dependency upgrade or migration                      | `docs/<TOPIC>_V<MAJOR>_UPGRADE.md` (create if it doesn't exist)                                              |


## Per-Doc Notes

### README.md

- **Stack section**: list any new or removed package with a link and one-line description.
- **UI Components section**: update the component table when adding new shadcn/ui primitives.
- **Project Structure section** (if present): reflect new top-level dirs or significant file moves.

### TESTING.md

- Update the testing levels overview when a new test framework or layer is introduced.
- Add or update example commands if test scripts change in `package.json`.

### `src/__tests__/README.md`

- Note new test files and what they cover.
- Update the running-tests commands if they change.

### e2e/README.md

- Add an entry under **Test Files** for each new `.spec.ts` file with a brief summary of what it tests.
- Update prerequisite or environment setup instructions if they change.

### AGENTS.md

- Update the UI Development Guidelines table when shadcn/ui components are added to `src/components/ui/`.
- Update design token docs if new semantic tokens are added to `globals.css`.
- Update agent workflow instructions when the development process changes.

### CLAUDE.md

- Mirrors key information from `AGENTS.md` for Claude Code / Claude CLI agents.
- Update when stack, project structure, commands, API endpoints, database models, or agent workflow rules change.
- Keep concise — this file is injected into the agent context and counts against the token budget.

### .github/copilot-instructions.md

- Mirrors key information from `AGENTS.md` for GitHub Copilot agents.
- Update when stack, project structure, commands, API endpoints, database models, or agent workflow rules change.
- Keep concise — this file is auto-injected into every Copilot agent session.

### docs/*_UPGRADE.md

- Create when performing a significant library or tooling upgrade.
- Include: motivation, breaking changes, migration steps, and any commands run.
- Follow the naming pattern of existing files: e.g. `ESLINT_V10_UPGRADE.md`.

## When to Skip Doc Updates

Skip documentation updates only when:

- Making trivial changes (typos, comments, minor style fixes)
- The change is fully internal with no impact on setup, usage, structure, or testing
