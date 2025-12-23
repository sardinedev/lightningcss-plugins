# Copilot instructions (repo-wide)

This repo is an Nx monorepo of TypeScript packages under `packages/*`.

## Tooling
- **Package manager:** npm (see `packageManager` in root `package.json`). Use `npm install` and keep `package-lock.json` in sync.
- **Monorepo runner:** Nx. Prefer running tasks via Nx (or the root npm scripts that call Nx).
- **Formatting/linting:** Biome. Do not introduce Prettier/ESLint configs.
- **Testing:** Vitest.

## Commands you should use
- Lint (affected): `npm run lint`
- Tests (affected): `npm test`
- Build (affected): `npm run build`
- Types check (affected): `npm run types:check`

When working on a single package, prefer the narrowest Nx target (e.g. `npx nx test <project>`), but don’t add new scripts.

## MCP servers
- **GitHub:** Use for issue/PR lookups when relevant. Don't create PRs without explicit approval.
- **Nx:** Use `nx_available_plugins` to discover generators before suggesting manual file creation.

## Issues & pull requests
- Every PR must reference an existing GitHub issue. Create one first if it doesn't exist, with a clear description of the problem or feature.
- PR titles follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/): `<type>: GH-XXX - <Brief description>`
  - Examples: `fix: GH-42 - Handle empty CSS files`, `feat: GH-113 - Add copilot instructions`

## Code & change scope
- Keep changes **small and package-scoped**. Avoid sweeping refactors across multiple packages unless explicitly requested.
- Preserve existing public APIs unless the task explicitly requires a breaking change.
- Match existing code style and patterns in the touched package.
- Prefer straightforward, readable TypeScript over clever abstractions.
- Document new public APIs with TSDoc comments.
- Add comments for non-obvious code.
- Make sure the README.md of a package reflects any user-facing changes.

## Tests
- If you change behavior, update or add tests in the same package (typically `packages/<name>/src/*.test.ts`).
- Keep fixtures in the existing `mocks/` folders rather than adding new ad-hoc locations.
- Performance regressions are considered a bug; add benchmarks if relevant.

## Releases & changelogs
- The packages follow semantic versioning.
- This repo uses Changesets (`.changeset/`). If you make a user-facing change, add an appropriate changeset unless the task says not to.
- If you touch package-facing behavior or docs, update that package’s README/CHANGELOG when appropriate.

## Safety rails
- Don’t commit secrets.
- Don’t add new dependencies unless necessary; prefer using what’s already in the repo.
- Don’t change formatting settings (Biome config, editor config) unless explicitly asked.
