# Space Bot — Cosmic Adventure

A 3D third-person browser game for ages 12+. Built with Three.js, Vite, Vercel, and Neon Postgres.

## Status: Tech Demo (v0.1.0)

The tech demo includes:
- Space Bot character built from primitives (matching the full design spec)
- Third-person camera with mouse-look
- WASD movement + space to jump
- Laser firing (left-click) with hit detection
- Two enemy types: shiny (drops a battery when defeated) and normal (damages you on contact)
- Battery collectibles
- Polished main menu, HUD, pause menu
- Post-processing pipeline (bloom, tone mapping)
- Backend scaffolding for Neon save/load (not yet wired into gameplay)

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:5173
```

## Controls

| Action | Key |
|--------|-----|
| Move | W A S D |
| Look | Mouse (click canvas to lock pointer) |
| Jump | Space |
| Fire laser | Left-click |
| Pause | Esc |

## Project Structure

```
spacebot-game/
├── public/             Static assets served as-is
│   ├── models/         GLB 3D models (drop Meshy exports here)
│   ├── textures/       PBR texture sets per world
│   └── audio/          Sound effects and music
├── src/
│   ├── main.js         Entry point, menu/loading flow
│   ├── styles.css      Global CSS (sci-fi aesthetic)
│   ├── core/           Game loop, input, physics
│   ├── entities/       Space Bot, enemies, batteries, bosses
│   ├── worlds/         World/level definitions
│   ├── ui/             HUD, menus
│   └── utils/          Shared helpers
├── api/                Vercel serverless functions
│   ├── player.js       POST - create or look up player
│   ├── save.js         POST - upsert save game
│   └── load.js         GET  - retrieve save game
├── db/
│   └── schema.sql      Neon database setup
├── docs/
│   ├── SETUP.md        Step-by-step setup guide
│   ├── MESHY_GUIDE.md  Meshy.ai prompts for each character
│   └── ROADMAP.md      Development roadmap to World 3
├── vite.config.js
├── vercel.json
└── package.json
```

## Setup Guides

- **Initial setup**: see [docs/SETUP.md](docs/SETUP.md)
- **Generating 3D models**: see [docs/MESHY_GUIDE.md](docs/MESHY_GUIDE.md)
- **Roadmap**: see [docs/ROADMAP.md](docs/ROADMAP.md)

## Tech Stack

- **Three.js** — WebGL 3D rendering
- **Vite** — dev server and build tool
- **Howler.js** — audio (queued for next phase)
- **Vercel** — hosting + serverless functions
- **Neon Postgres** — save game persistence
- **Vanilla JS** (ES modules) — game logic

## License

Private project. All rights reserved.
