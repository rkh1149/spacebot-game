# Space Bot Game — Project Context for Claude Code

This document brings you up to speed on the Space Bot game project. Read this first, then the codebase, before making changes.

## Project Identity

**What it is:** A 3D third-person browser game for a 12-year-old. The player controls "Space Bot," travels to 3 themed worlds, fights enemies, collects batteries (10+ per world), and defeats a unique boss in each world's 4th level.

**Who it's for:** Richard's 12-year-old son. The tone is playful sci-fi, not horror or grimdark.

**Where the code lives:** `/Users/richardhoyne/AI Project 1/GitHub/spacebot-game` (this directory)

**GitHub repo:** Connected, pushes to `main` trigger Vercel auto-deploy
**Production URL:** https://spacebot-game.vercel.app

## Tech Stack (decided, don't change without discussion)

- **Three.js** for 3D rendering (loaded via npm, not CDN)
- **Vite** as dev server / build tool
- **Vanilla JS (ES modules)** — no React, no TypeScript
- **Howler.js** for audio (queued for Phase 1, not yet integrated)
- **Vercel** for hosting + serverless functions in `/api`
- **Neon Postgres** (via Vercel-managed integration) for save state
- **`@neondatabase/serverless`** is the DB driver (already in package.json)

## Current Status: v0.2 — Tech Demo with Save/Load

**What works end-to-end:**
- Loading screen → sign-in screen (first launch) → main menu
- Username creates a `players` record via `POST /api/player`
- Playing the game in a "test arena" environment
- Space Bot moves (WASD), looks (mouse with pointer lock), jumps (space), fires laser (left-click)
- Shiny enemies drop a battery on defeat; normal enemies damage on contact
- Battery pickups auto-save to Neon via `POST /api/save` (throttled to once per 3s)
- Pause menu (Esc), quit-to-menu, Continue button loads from `GET /api/load`
- Settings screen: mouse sensitivity, master volume placeholder, graphics quality (low/med/high — actually changes pixel ratio + shadows + bloom strength), invert Y axis
- Sign-out clears local storage; offline mode falls back to localStorage if API unreachable

**What does NOT work yet:**
- No audio (Howler is in package.json but not wired up)
- No real World 1 levels — only a "Test Arena" placeholder
- No bosses — only generic enemies
- No GLB models — Space Bot and enemies are built from Three.js primitives
- No level transitions, no key-pickup logic, no win condition

## Architecture

```
spacebot-game/
├── index.html              All UI screens (loading, signin, menu, settings, pause, HUD)
├── src/
│   ├── main.js             Entry point — orchestrates screens, settings, game lifecycle
│   ├── styles.css          All CSS — sci-fi aesthetic, Orbitron + Rajdhani fonts
│   ├── core/
│   │   ├── Game.js         Three.js scene, render loop, save/load, settings application
│   │   ├── Input.js        Pointer lock, keys, mouse delta, sensitivity
│   │   └── Api.js          Wrapper around /api endpoints with localStorage fallback
│   ├── entities/
│   │   ├── SpaceBot.js     Player character (built from primitives, see character spec below)
│   │   ├── Enemy.js        Shiny + normal enemy variants, simple chase AI
│   │   └── Battery.js      Collectible with float animation
│   ├── worlds/
│   │   └── TestArena.js    Placeholder environment (40x40 grid, pillars, gradient sky)
│   └── ui/
│       └── HUD.js          DOM-based HUD updater
├── api/
│   ├── player.js           POST — create or look up player by username
│   ├── save.js             POST — upsert save state (uses ON CONFLICT player_id)
│   └── load.js             GET — fetch save by playerId query param
├── db/
│   └── schema.sql          Two tables: players, save_games (already created in Neon)
├── public/
│   ├── models/             EMPTY — drop GLB files here as they're generated
│   ├── textures/           EMPTY
│   └── audio/              EMPTY
├── docs/
│   ├── SETUP.md            Original install/deploy guide
│   ├── MESHY_GUIDE.md      Prompts for AI-generating each character via Meshy.ai
│   └── ROADMAP.md          Full development plan
├── vite.config.js          Standard Vite config, three.js manual chunk
├── vercel.json             Standard Vercel + Vite framework
└── package.json
```

## Character Spec (Space Bot — exact, don't deviate)

The user gave a precise visual spec that the primitive build matches. If you replace with a GLB later, preserve these features:

- **Horizontal oval head** (wider than tall)
- **Vertical oval body** (taller than wide)
- **Cylindrical arms** with **three oval fingers** on each hand
- **Cylindrical legs** with **three vertical green stripes** on each leg
- **Single antenna** centered on head with a **glowing green sphere** on top
- **Glowing green circle** in the center of the chest
- **Two horizontal green line eyes**
- **Curved smile** mouth (built from a torus arc)
- **Body color:** brushed metal gray (`0xb8bfd0`)
- **Green parts:** emissive `0x4fff4f` with `emissiveIntensity: 1.5` so they bloom

## World Designs (planned — only Test Arena exists)

**World 1 — The Infected Garden** (Boss: Virus)
- Bioluminescent alien jungle
- Glowing mushrooms, twisted plants, purple-pink sky, two moons
- Bubbling green hazard pools
- Boss: giant lumpy translucent green virus with two big white-and-black eyes
- Color palette: deep greens, purples, magenta accents

**World 2 — The Digital Realm** (Boss: Grid)
- Tron-inspired cyber world
- Glowing grid floor, neon platforms, data streams, wireframe mountains
- Boss: 12x12 wireframe cube with two oval eyes
- Color palette: black, cyan, magenta, electric blue

**World 3 — Corrupt's Citadel** (Boss: Corrupt — final)
- Dark industrial planet, broken machinery, exposed circuits
- Stormy red sky, sparking wires
- Boss: giant evil twin of Space Bot — same shape, dark gray, red where Space Bot is green, frowning instead of smiling, glitch effect
- Color palette: rust, dark gray, red emissive

## Game Mechanics (per the user's original spec)

- Each world has **4 levels**
- Levels 1-3: combat + exploration. Must collect **10+ batteries total per world** to unlock Level 4
- Level 4: boss fight. Win = key to next world.
- **Shiny enemy** + win → drops a battery
- **Non-shiny enemy** + contact → damages laser power
- Player damages non-shiny enemies with laser (left-click)
- Laser power regenerates slowly when not in combat
- Final boss "Corrupt" closes the trilogy

## Database Schema (already deployed in Neon)

```sql
players (
  id UUID PRIMARY KEY,
  username VARCHAR(50) UNIQUE,
  created_at TIMESTAMP
)

save_games (
  id UUID PRIMARY KEY,
  player_id UUID REFERENCES players(id),
  current_world INT,
  current_level INT,
  batteries_collected INT,
  laser_power INT,
  keys_obtained TEXT[],
  total_playtime_seconds INT,
  last_saved TIMESTAMP,
  UNIQUE(player_id)
)
```

`DATABASE_URL` is auto-injected by the Vercel-Neon integration. No `.env` setup needed for production. For local dev with API access, run `vercel link && vercel env pull` to get `.env.local`.

## Decisions Already Made (don't relitigate)

- **AI-generated GLB models via Meshy.ai** is the model pipeline (Richard has a free account). Primitives are placeholders. See `docs/MESHY_GUIDE.md` for prompts.
- **No leaderboard** — saves are per-player only. Don't suggest adding a leaderboard.
- **No multiplayer** — single-player only.
- **First playable milestone is Full World 1** with all 4 levels and the Virus boss (not just one level).
- **Aesthetic:** sci-fi, polished, dark backgrounds with glowing green accents. Fonts are Orbitron (display) + Rajdhani (body) from Google Fonts. Don't switch to Inter/Space Grotesk/etc.

## Phase 1 Roadmap (next priorities)

In order of likely-best-first:

1. **Audio integration with Howler.js**
   - Background ambient music per world
   - Laser fire SFX, hit SFX, battery pickup chime, footstep loop
   - Damage/critical SFX
   - Wire to existing master volume slider in settings

2. **World 1: Garden Edge (Level 1)**
   - Replace TestArena with a proper jungle environment
   - Add bioluminescent mushroom decorations, fog, purple sky
   - Spawn a tutorial-friendly enemy mix (3-5 enemies, 4-5 batteries)
   - Level-end trigger when 10+ total batteries collected → load Level 2

3. **GLB model loader** (when Richard sends his first Meshy export)
   - Add `GLTFLoader` import in SpaceBot.js
   - Async loading with loading screen integration
   - Material override pass for emissive green parts
   - Fallback to primitive build if model fails to load

4. **Levels 2-3 + Virus boss** (rest of World 1)

5. **Worlds 2 + 3** (largely reusing systems)

## How Richard Likes to Work

- Wants detailed plans **before** code is written for big features. Gives clear go-aheads.
- Prefers options presented as numbered/lettered choices.
- Has limited terminal experience but is comfortable with `git`, `npm`, `cd`, `curl`.
- Tests on Mac in Chrome.
- Wants the kid (12-year-old son) to playtest and give feedback eventually.
- Already has a Vercel deployment and verified the Neon API end-to-end (player created, save/load round-trip works).

## Known Quirks / Pitfalls

- **Initial Vercel deploy needed a redeploy after Neon was connected** because env vars only apply to new builds. If you change env vars, always tell Richard to redeploy.
- **Multi-statement SQL fails in Vercel's built-in editor** — it uses prepared statements. Use the Neon console for multi-statement scripts.
- **Pointer lock requires user gesture** — first click on canvas after starting a game.
- **`npm install`** is required after pulling new code; new deps may have been added.
- **Don't use localStorage/sessionStorage in artifacts** — but in this app, localStorage IS used (for settings + offline save backup) and that's fine because it's a real web app, not a Claude artifact.

## Things to Verify Before Big Changes

1. Run `npm run dev` and confirm the game loads
2. Test the round-trip: sign in → play → collect a battery → see "SAVED" indicator → quit → Continue button shows save → click Continue → verify state restored
3. Run `node --check src/**/*.js` style verification (or `npm run build` which catches more)
4. Before pushing: `git status` to confirm only intended files changed

## Useful Commands

```bash
# Start dev server
npm run dev

# Build production bundle
npm run build

# Pull Vercel env vars locally
vercel link
vercel env pull   # creates .env.local

# Sync to deployed env
git push  # auto-deploys via Vercel

# Test the API directly
curl -X POST https://spacebot-game.vercel.app/api/player \
  -H "Content-Type: application/json" \
  -d '{"username": "richard"}'
```

## What to Do Right Now

When Richard tells you what he wants to work on next, suggest a plan first, then implement. The most likely next requests are:

- "Let's add audio" → Howler.js wiring
- "Let's build World 1 Level 1" → replace TestArena with Garden Edge
- "I have a Meshy model ready" → add GLTFLoader pipeline
- "Something's broken" → diagnose using browser DevTools + Vercel function logs

Be ready to run the dev server (`npm run dev`) and test changes as you go — that's the main advantage of Claude Code over the chat workflow Richard was using.
