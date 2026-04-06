# Contributing to Dominion

Thanks for your interest in contributing! Dominion is a spare-time project and all help is appreciated — bug fixes, UI improvements, docs, or new Enhanced App plugins.

## Dev Setup

**Prerequisites:** Node.js 22+, npm

```bash
git clone https://github.com/Virus250188/Dominion_Public.git
cd Dominion_Public
npm install
cp .env.example .env          # adjust AUTH_SECRET
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Open http://localhost:3000 — default login: `admin` / `admin123` (local dev only).

## Building a Plugin

The **best way to contribute** is by writing an Enhanced App plugin for a service you use. Each plugin is a single TypeScript file.

See the [Plugin Development Guide](docs/plugin-development.md) for the full walkthrough.

## Pull Request Process

1. **Fork** the repo and create a feature branch (`feat/my-plugin` or `fix/description`)
2. Make your changes with descriptive commits
3. Make sure `npm run build` passes without errors
4. Open a PR against `main` with a short description of what changed and why
5. If it's a UI change, include a screenshot

## Code Style

- TypeScript with strict mode
- Tailwind CSS for styling, shadcn/ui for components
- Keep plugins self-contained — one folder, one index.ts, one optional widget

## Reporting Bugs

[Open an issue](https://github.com/Virus250188/Dominion_Public/issues) with:

- Dominion version (check Settings page)
- Deployment method (Docker or dev server)
- Steps to reproduce
- Expected vs. actual behavior
- Screenshots if applicable

## Questions?

Open an issue or check existing discussions. There are no dumb questions.
