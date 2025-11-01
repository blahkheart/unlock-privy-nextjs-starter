# Repository Guidelines

## Project Structure & Module Organization
- `pages/`: Next.js routes (Pages Router). Keep page-level logic thin.
- `components/`: Reusable React components (PascalCase filenames).
- `hooks/`: Custom React hooks (files start with `use*`).
- `lib/`: Helpers, API clients, and utilities.
- `abis/`: Contract ABIs used with `ethers`/`viem`.
- `styles/`: Tailwind/global styles. Config in `tailwind.config.js`.
- `docs/`: Project docs and reference material.
- Config: `.env.example` (copy to `.env`), `next.config.js`, `.eslintrc.json`.

## Build, Test, and Development Commands
- `npm run dev`: Start the local dev server.
- `npm run build`: Production build.
- `npm start`: Run the production build locally.
- `npm run lint`: Lint with Next/ESLint rules.

## Coding Style & Naming Conventions
- Language: TypeScript, React 18, Next.js 14 (Pages Router).
- Indentation: 2 spaces; prefer single quotes; trailing commas where allowed.
- Components: PascalCase filenames and exports; colocate styles.
- Hooks: `useThing.ts` in `hooks/`; keep pure and typed.
- Utilities: LowerCamelCase exports in `lib/`.
- Tailwind: Utility-first classes; group logically (layout → spacing → color).
- Linting: Extends `next/core-web-vitals`. Fix issues before pushing.

## Testing Guidelines
- No test runner is configured yet. If adding tests, prefer Jest for units and Playwright for e2e.
- Place unit tests adjacent to sources as `*.test.ts(x)`; e2e under `e2e/`.
- Aim for critical-path coverage (auth, checkout, contract interactions).

## Commit & Pull Request Guidelines
- Commits: Use Conventional Commits when possible (e.g., `feat:`, `fix:`). Keep messages imperative and scoped.
- PRs: Include a clear description, linked issues, screenshots for UI, and test steps. Keep PRs focused and small.
- CI: Ensure `lint` and build pass locally before opening a PR.

## Security & Configuration Tips
- Environment: Copy `.env.example` to `.env`. Only expose client-safe values with `NEXT_PUBLIC_`.
- Secrets: Never commit private keys or API secrets. Use local `.env` or your host’s secret manager.
- Web3: ABIs live in `abis/`. Interact via `ethers`/`viem`. Authenticate users with `@privy-io/react-auth`.
