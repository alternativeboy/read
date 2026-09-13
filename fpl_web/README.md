# Touchline

A local-first FPL workbench. The first module, **Rotation Lab**, helps compare any number of Premier League clubs over the next eight gameweeks.

## What works

- Create and delete rotation plans
- Add or remove clubs after creating a rotation
- Compare fixture difficulty and see the recommended club per gameweek
- Score each rotation with a fixture-only heuristic based on difficulty and coverage
- Mark a rotation as in use or paused
- Keep notes with each rotation
- Persist plans in browser storage
- Load current fixtures from the official FPL API, with demo data as a fallback

## Run locally

```bash
bun install
bun run dev
```

Then open the local URL printed by Vite.

## Quality checks

```bash
bun test
bun run typecheck
bun run build
```

## Product direction

The sidebar leaves room for future modules such as a squad planner, watchlist, decision journal, and weekly reports. The rotation calculations live in a separate domain module so they can later be reused by those tools or a backend.
