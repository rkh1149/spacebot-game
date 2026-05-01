# Development Roadmap

## Phase 0: Tech Demo ✅ (CURRENT)

What works:
- Space Bot moves and jumps
- Mouse-look third-person camera
- Laser firing with raycast hit detection
- Shiny vs normal enemies (visual distinction, drop-on-defeat logic)
- Battery pickups
- HUD: laser power bar, battery counter, message flash
- Main menu, pause menu, loading screen
- Post-processing pipeline: bloom, ACES tone mapping, soft shadows

What's NOT in yet:
- Real GLB models (using primitives placeholder)
- Audio
- Save/load wired to Neon (API exists but unused)
- Multiple levels
- Bosses

## Phase 1: World 1 — The Infected Garden

### Week 1: Foundation upgrades
- [ ] GLB model loader for Space Bot
- [ ] Howler.js audio: ambient music, laser SFX, hit SFX, pickup chime, footsteps
- [ ] Settings menu: graphics quality (low/medium/high), audio volume, sensitivity
- [ ] Touch controls fallback for mobile/tablet

### Week 2: Levels 1-3 of World 1
- [ ] Garden Edge level (tutorial, gentle introduction)
- [ ] Spore Caverns level (underground, tighter spaces)
- [ ] Twisted Canopy level (vertical with mushroom platforming)
- [ ] Level transition system (battery threshold check, level-end UI)
- [ ] 2-3 enemy types: spore minion, vine whip, infected drone
- [ ] Environmental hazards (toxic pools)

### Week 3: Virus Boss & World 1 polish
- [ ] Boss arena (Level 4)
- [ ] Three-phase Virus boss AI
- [ ] Boss-specific attacks: spore spit, slam, minion summon
- [ ] Victory sequence with key reward
- [ ] Save game wired to Neon
- [ ] Cutscene framework (simple skippable text intros)

## Phase 2: World 2 — The Digital Realm

The systems are reusable, so World 2 is largely about new assets and tuning.

- [ ] Cyber/Tron environment art (glowing grid floors, neon platforms)
- [ ] 3 levels with World 2 theme
- [ ] Grid Boss: rotates, fires laser walls, spawns pixel drones
- [ ] New enemy types: pixel drone, glitch-block, firewall guardian

## Phase 3: World 3 — Corrupt's Citadel

- [ ] Industrial-corrupted environment
- [ ] 3 levels building toward the citadel
- [ ] Final boss: Corrupt (mirror of Space Bot, scaled up)
- [ ] Multi-phase final boss with attack patterns referencing Space Bot's own moves
- [ ] Ending sequence

## Phase 4: Polish & Launch

- [ ] Performance pass (LOD, instancing, texture atlasing)
- [ ] Cross-browser/device testing
- [ ] Achievements (optional)
- [ ] Speedrun timer
- [ ] Custom domain on Vercel
- [ ] Share link for friends

## Future Ideas (Post-Launch)

- World 4 unlockable
- Boss rush mode
- Cosmetic skins for Space Bot
- Optional global leaderboard (requires the database extension we skipped)
