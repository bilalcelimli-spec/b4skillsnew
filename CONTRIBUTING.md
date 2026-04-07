# Contributing to LinguAdapt

Thank you for your interest in contributing! Please follow these guidelines.

## Getting Started

1. Fork the repository and clone your fork.
2. Install dependencies: `npm install`
3. Copy environment template: `cp .env.production.example .env.local` and fill in values.
4. Push database schema: `npx prisma db push`
5. Start dev server: `npm run dev`

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production-ready code; triggers auto-deploy |
| `develop` | Integration branch for ongoing work |
| `feat/*` | New features |
| `fix/*` | Bug fixes |
| `chore/*` | Tooling, dependency updates |

## Submitting a Pull Request

1. Create a branch from `develop`: `git checkout -b feat/your-feature`.
2. Make your changes. Run `npm run type-check` to ensure no TypeScript errors.
3. Commit using [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` new feature
   - `fix:` bug fix
   - `chore:` tooling / dependency update
   - `docs:` documentation only
4. Push and open a PR against `develop`.
5. Fill in the PR template; link any related issue.

## Code Style

- TypeScript-first; avoid `any` where possible.
- Components live in `src/components/`, services in `src/lib/`.
- Use Tailwind CSS utility classes for styling.
- Prefer named exports over default exports for components.

## Reporting Issues

Use GitHub Issues. Include:
- Steps to reproduce
- Expected vs. actual behaviour
- Node.js / OS version

For **security vulnerabilities**, see [SECURITY.md](SECURITY.md).
