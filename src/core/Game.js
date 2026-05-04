/**
 * Game — main controller.
 * Worlds, continuous enemy spawning, scoring, boss fights, world transitions.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass }     from 'three/addons/postprocessing/OutputPass.js';

import { InputManager } from './Input.js';
import { SpaceBot }     from '../entities/SpaceBot.js';
import { Enemy }        from '../entities/Enemy.js';
import { Battery }      from '../entities/Battery.js';
import { Boss }         from '../entities/Boss.js';
import { GardenEdge }     from '../worlds/GardenEdge.js';
import { CrystalCavern }  from '../worlds/CrystalCavern.js';
import { CorruptCitadel } from '../worlds/CorruptCitadel.js';
import { HUD }          from '../ui/HUD.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTOSAVE_MS      = 3000;
const BATTERY_TARGET   = 10;   // per world
const SCORE_TARGET     = 1000; // per world — triggers boss
const MAX_LIVE_ENEMIES = 4;    // maintained at all times when boss is not active
const SPAWN_INTERVAL   = 2.5;  // seconds between auto-spawns
const KILL_POINTS      = 100;
const HIT_PENALTY      = 10;
const BOSS_BONUS       = 500;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Coloured console helpers ─────────────────────────────────────────────────

const log = {
  info:  m => console.log(`%c[SpaceBot] ${m}`, 'color:#7fff7f;font-weight:bold'),
  event: m => console.log(`%c[SpaceBot] ${m}`, 'color:#ffaa44;font-weight:bold'),
  warn:  m => console.log(`%c[SpaceBot] ${m}`, 'color:#ff6b6b;font-weight:bold'),
  debug: m => console.log(`%c[SpaceBot] ${m}`, 'color:#8a92b8'),
};

// ─── World configurations ─────────────────────────────────────────────────────

const WORLD_CONFIGS = {
  1: {
    worldName:   'GARDEN EDGE',
    WorldClass:  GardenEdge,
    bossName:    'VIRUS',
    fog:         new THREE.FogExp2(0x1a0d2e, 0.018),
    ambientColor: 0x2a1040, ambientIntensity: 0.8,
    moonColor:   0xaabbff,  moonIntensity:    0.5,
    moonPos:     new THREE.Vector3(-15, 30, -20),
    hemiSky:     0x440066,  hemiGround: 0x001a00, hemiIntensity: 0.5,
    enemyOptions: {},
    movement: { speedMultiplier: 1.02, traction: 1.05, damping: 10.5, stepInterval: 0.34 },
    initialEnemies: [
      { x:  12, z:  15, shiny: false },
      { x: -14, z:  12, shiny: true  },
      { x:  18, z:  -8, shiny: false },
      { x: -16, z: -14, shiny: true  },
    ],
    initialBatteries: [
      { x:  6, z:  8 }, { x: -7, z: 10 }, { x: 10, z: -5 },
      { x: -5, z: -8 }, { x: 14, z:  2 }, { x: -18, z:  6 },
      { x:  3, z: 19 }, { x: 19, z: -15 }, { x: -12, z: -19 },
      { x: 22, z: 12 },
    ],
    introMessages: [
      { text: 'ENTERING GARDEN EDGE — WORLD 1',          delay:  400, dur: 2800 },
      { text: 'SHOOT ENEMIES FOR +100 POINTS',            delay: 3500, dur: 2800 },
      { text: '1000 PTS OR 10 BATTERIES → BOSS APPEARS',  delay: 6600, dur: 3200 },
    ],
  },

  2: {
    worldName:   'CRYSTAL CAVERN',
    WorldClass:  CrystalCavern,
    bossName:    'GRID',
    fog:         new THREE.FogExp2(0x001a18, 0.022),
    ambientColor: 0x001520, ambientIntensity: 0.65,
    moonColor:   0x00aacc,  moonIntensity:    0.35,
    moonPos:     new THREE.Vector3(0, 30, 0),
    hemiSky:     0x002244,  hemiGround: 0x001100, hemiIntensity: 0.45,
    enemyOptions: { bodyColor: 0x0a3535, emissiveColor: 0x00ffcc, lightColor: 0x00ffcc },
    movement: { speedMultiplier: 0.92, traction: 0.82, damping: 7.5, stepInterval: 0.40 },
    initialEnemies: [
      { x:  12, z:  14, shiny: false },
      { x: -14, z:  10, shiny: true  },
      { x:  20, z:  -6, shiny: false },
      { x: -18, z: -12, shiny: true  },
    ],
    initialBatteries: [
      { x:  7, z:  9 }, { x: -8, z: 11 }, { x: 12, z: -4 },
      { x: -6, z: -9 }, { x: 15, z:  3 }, { x: -17, z:  5 },
      { x:  4, z: 17 }, { x: 17, z: -13 }, { x: -11, z: -17 },
      { x: 20, z: 10 },
    ],
    introMessages: [
      { text: 'CRYSTAL CAVERN — WORLD 2',                 delay:  400, dur: 2800 },
      { text: 'TOUGHER ENEMIES, MORE ACID POOLS',          delay: 3400, dur: 2800 },
      { text: '1000 PTS OR 10 BATTERIES → GRID AWAKENS',   delay: 6400, dur: 3200 },
    ],
  },

  3: {
    worldName:   "CORRUPT'S CITADEL",
    WorldClass:  CorruptCitadel,
    bossName:    'CORRUPT',
    fog:         new THREE.FogExp2(0x0e0404, 0.022),
    ambientColor: 0x200808, ambientIntensity: 0.65,
    moonColor:   0xff3300,  moonIntensity:    0.40,
    moonPos:     new THREE.Vector3(10, 28, -18),
    hemiSky:     0x330808,  hemiGround: 0x0a0000, hemiIntensity: 0.40,
    enemyOptions: { bodyColor: 0x3a1a0a, emissiveColor: 0xff2200, lightColor: 0xff1100 },
    movement: { speedMultiplier: 1.08, traction: 1.16, damping: 12, stepInterval: 0.30 },
    initialEnemies: [
      { x:  14, z:  16, shiny: false },
      { x: -15, z:  12, shiny: true  },
      { x:  20, z:  -8, shiny: false },
      { x: -18, z: -14, shiny: true  },
    ],
    initialBatteries: [
      { x:  5, z:  7 }, { x:  -6, z:  9 }, { x:   9, z:  -4 },
      { x: -4, z: -7 }, { x:  13, z:  2 }, { x: -16, z:   4 },
      { x:  3, z: 16 }, { x:  16, z: -12 }, { x: -10, z: -16 },
      { x: 19, z:  9 },
    ],
    introMessages: [
      { text: "CORRUPT'S CITADEL — FINAL WORLD",           delay:  400, dur: 2800 },
      { text: 'THE CITADEL WILL FALL',                      delay: 3400, dur: 2800 },
      { text: '1000 PTS OR 10 BATTERIES → CORRUPT AWAKES', delay: 6400, dur: 3200 },
    ],
  },
};

// ─── Game class ───────────────────────────────────────────────────────────────

export class Game {
  constructor({ canvas, isNewGame, initialState, settings, api, audio, onSaveSuccess, onLeaderboardUpdate }) {
    this.canvas        = canvas;
    this.isNewGame     = isNewGame;
    this.api           = api;
    this.audio         = audio || null;
    this.settings      = settings || {};
    this.onSaveSuccess = onSaveSuccess || (() => {});
    this.onLeaderboardUpdate = onLeaderboardUpdate || (() => {});
    this.running       = false;
    this.paused        = false;
    this._transitioning = false;

    this.clock      = new THREE.Clock();
    this.entities   = [];
    this.enemies    = [];
    this.batteries  = [];
    this.projectiles = [];

    this.state = {
      laserPower:    initialState?.laserPower    ?? 100,
      maxLaserPower: 100,
      batteries:     0,                              // resets each world
      totalScore:    initialState?.totalScore    ?? 0,
      currentWorld:  initialState?.currentWorld  ?? 1,
      currentLevel:  1,
      keys:          initialState?.keys          ?? [],
      playtime:      initialState?.playtime       ?? 0,
    };

    this._worldScore    = 0;   // score earned this world (boss trigger)
    this._worldBatteries = 0;  // batteries this world (boss trigger, same as state.batteries)
    this._bossActive    = false;
    this._boss          = null;
    this._bossTriggered = false;
    this._levelComplete = false;
    this._lastSaveAt    = 0;
    this._resumeWorld      = !isNewGame ? initialState?.currentWorld : null;
    this._resumeBatteries  = !isNewGame ? (initialState?.batteries ?? 0) : 0;
    this._resumeStateUsed  = false;

    // Spawn / contact
    this._spawnTimer      = SPAWN_INTERVAL;
    this._contactCooldown = 0;
    this._stepSfxCooldown = 0;
    this._hitSfxCooldown  = 0;
    this._timers          = new Set();

    // Visual FX
    this._deathParticles = [];
    this._shake          = 0;

    // Hazard
    this._hazardMsgCooldown = 0;

    this._setupRenderer();
    this._setupScene();
    this._setupCamera();
    this._setupLighting();
    this._setupPostProcessing();

    this.input = new InputManager(canvas);
    this.hud   = new HUD();

    this._setupResize();
    this._setupPauseHandler();
    this.applySettings(this.settings);
  }

  // ─── Settings ──────────────────────────────────────────────────────────────

  applySettings(s) {
    this.settings = s;
    if (this.input) {
      this.input.sensitivity = s.mouseSensitivity ?? 6;
      this.input.invertY     = !!s.invertY;
    }
    if (this.composer && this.bloomPass) {
      switch (s.quality) {
        case 'low':
          this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
          this.bloomPass.strength = 0.3;
          this.renderer.shadowMap.enabled = false;
          break;
        case 'high':
          this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          this.bloomPass.strength = 0.7;
          this.renderer.shadowMap.enabled = true;
          break;
        default:
          this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
          this.bloomPass.strength = 0.6;
          this.renderer.shadowMap.enabled = true;
      }
    }
    if (this.audio) this.audio.setVolume((s.masterVolume ?? 70) / 100);
  }

  // ─── Setup ─────────────────────────────────────────────────────────────────

  _setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace  = THREE.SRGBColorSpace;
  }

  _setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d0020);
    this.scene.fog = new THREE.FogExp2(0x1a0d2e, 0.018);
  }

  _setupCamera() {
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 5, 10);
    this.camera.lookAt(0, 1, 0);
  }

  _setupLighting() {
    this._ambientLight = new THREE.AmbientLight(0x2a1040, 0.8);
    this.scene.add(this._ambientLight);

    const moon = new THREE.DirectionalLight(0xaabbff, 0.5);
    moon.position.set(-15, 30, -20);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    moon.shadow.camera.near = 0.5; moon.shadow.camera.far  = 100;
    moon.shadow.camera.left = -35; moon.shadow.camera.right = 35;
    moon.shadow.camera.top  =  35; moon.shadow.camera.bottom = -35;
    moon.shadow.bias = -0.0005;
    this.scene.add(moon);
    this.sun = moon;

    this._hemiLight = new THREE.HemisphereLight(0x440066, 0x001a00, 0.5);
    this.scene.add(this._hemiLight);
  }

  _applyLightingForWorld(cfg) {
    this._ambientLight.color.setHex(cfg.ambientColor);
    this._ambientLight.intensity = cfg.ambientIntensity;
    this.sun.color.setHex(cfg.moonColor);
    this.sun.intensity = cfg.moonIntensity;
    this.sun.position.copy(cfg.moonPos);
    this._hemiLight.color.setHex(cfg.hemiSky);
    this._hemiLight.groundColor.setHex(cfg.hemiGround);
    this._hemiLight.intensity = cfg.hemiIntensity;
    this.scene.fog = cfg.fog;
  }

  _setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.8, 0.85);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());
  }

  _setupResize() {
    this._onResize = () => {
      const w = window.innerWidth, h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.composer.setSize(w, h);
    };
    window.addEventListener('resize', this._onResize);
  }

  _setupPauseHandler() {
    this._onKeyDown = e => {
      if (e.key === 'Escape' && this.running && !this._transitioning) {
        if (this.paused) this.resume(); else this.pause();
      }
    };
    document.addEventListener('keydown', this._onKeyDown);
  }

  // ─── World build / teardown ────────────────────────────────────────────────

  _buildWorld(worldNum) {
    const cfg = WORLD_CONFIGS[worldNum];
    if (!cfg) return;
    const restoredBatteries = this._getRestoredBatteryCount(worldNum, cfg);

    this.state.currentWorld = worldNum;
    this._worldScore        = 0;
    this._worldBatteries    = restoredBatteries;
    this.state.batteries    = restoredBatteries;
    this._bossActive        = false;
    this._bossTriggered     = false;
    this._levelComplete     = false;
    this._boss              = null;
    this._spawnTimer        = SPAWN_INTERVAL;
    this._worldEnemyOptions = cfg.enemyOptions;

    this._applyLightingForWorld(cfg);

    this.world = new cfg.WorldClass(this.scene);
    this.world.build();

    if (this.spaceBot) this.spaceBot.position.set(0, 0, 0);

    // Initial enemies
    for (const e of cfg.initialEnemies) this._spawnEnemy(e.x, 0, e.z, e.shiny);

    // Initial batteries
    for (const b of cfg.initialBatteries.slice(restoredBatteries)) this._spawnBattery(b.x, 1, b.z);

    // HUD
    this.hud.updateBatteries(this.state.batteries, BATTERY_TARGET);
    this.hud.updateScore(this.state.totalScore);
    this.hud.updateEnemyCount(cfg.initialEnemies.length);
    this.hud.hideBossHealth();

    document.getElementById('world-num').textContent  = worldNum;
    document.getElementById('world-name').textContent = cfg.worldName;

    // Update objective label
    const objLabel = document.querySelector('.objective-label');
    if (objLabel) objLabel.textContent = `OBJECTIVE — COLLECT ${BATTERY_TARGET} BATTERIES OR REACH ${SCORE_TARGET} PTS`;

    log.info(`World ${worldNum} built — ${cfg.worldName}`);
    log.debug(`Boss triggers at: ${SCORE_TARGET} world pts OR ${BATTERY_TARGET} batteries`);
    this.audio?.startWorldMusic(worldNum);
  }

  _getRestoredBatteryCount(worldNum, cfg) {
    if (this._resumeStateUsed || this._resumeWorld !== worldNum) return 0;
    this._resumeStateUsed = true;
    return Math.max(0, Math.min(BATTERY_TARGET, cfg.initialBatteries.length, this._resumeBatteries || 0));
  }

  _teardownWorld() {
    for (const e of this.enemies) { e.alive = false; this.scene.remove(e.group); }
    this.enemies = [];
    for (const b of this.batteries) this.scene.remove(b.mesh);
    this.batteries = [];
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    this.projectiles = [];
    for (const p of this._deathParticles) this.scene.remove(p.mesh);
    this._deathParticles = [];
    if (this._boss) { this.scene.remove(this._boss.group); this._boss = null; }
    this.world?.dispose();
    this.world = null;
    this.entities = this.spaceBot ? [this.spaceBot] : [];
    this.hud.hideBossHealth();
  }

  // ─── Game start ────────────────────────────────────────────────────────────

  start() {
    log.info(`Starting at World ${this.state.currentWorld}`);

    this.spaceBot = new SpaceBot(this.scene);
    this.spaceBot.position.set(0, 0, 0);
    this.entities.push(this.spaceBot);

    this.audio?.resume();
    this._buildWorld(this.state.currentWorld);

    this.hud.updateLaserPower(this.state.laserPower / this.state.maxLaserPower);

    this.running = true;

    const cfg = WORLD_CONFIGS[this.state.currentWorld];
    if (this.isNewGame) {
      for (const m of cfg.introMessages) {
        this._setTimer(() => this.hud.flashMessage(m.text, m.dur), m.delay);
      }
      this._setTimer(() => this.hud.showControlsHint(9000), 400);
    } else {
      this.hud.flashMessage(`WELCOME BACK — WORLD ${this.state.currentWorld}: ${cfg.worldName}`, 3000);
      this.hud.showControlsHint(6000);
    }

    this.clock.start();
    this._loop();
  }

  // ─── World transition ─────────────────────────────────────────────────────

  async _doWorldTransition(nextWorld) {
    log.info(`Transitioning to World ${nextWorld}…`);
    await this.saveProgress({ syncLeaderboard: true });

    await sleep(1200);
    const overlay = document.getElementById('level-transition');
    overlay.classList.add('active');
    await sleep(700);

    this._teardownWorld();
    this._buildWorld(nextWorld);
    this.saveProgress({ syncLeaderboard: true });

    await sleep(400);
    overlay.classList.remove('active');
    await sleep(750);

    this._transitioning = false;

    const cfg = WORLD_CONFIGS[nextWorld];
    for (const m of cfg.introMessages) {
      this._setTimer(() => this.hud.flashMessage(m.text, m.dur), m.delay);
    }
    this.hud.showControlsHint(6000);
    log.info(`Welcome to ${cfg.worldName}!`);
  }

  // ─── Spawn helpers ─────────────────────────────────────────────────────────

  _spawnEnemy(x, y, z, shiny) {
    const opts  = this._worldEnemyOptions || {};
    const enemy = new Enemy(this.scene, { shiny, ...opts });
    enemy.position.set(x, y, z);
    this.entities.push(enemy);
    this.enemies.push(enemy);
  }

  _spawnBattery(x, y, z) {
    const bat = new Battery(this.scene);
    bat.position.set(x, y, z);
    this.entities.push(bat);
    this.batteries.push(bat);
  }

  _spawnRandomEnemy() {
    const half = (this.world?.size ?? 50) / 2 - 4;
    const side = Math.floor(Math.random() * 4);
    let x = 0, z = 0;
    if      (side === 0) { x = (Math.random() - 0.5) * half * 2; z =  half; }
    else if (side === 1) { x = (Math.random() - 0.5) * half * 2; z = -half; }
    else if (side === 2) { x =  half; z = (Math.random() - 0.5) * half * 2; }
    else                 { x = -half; z = (Math.random() - 0.5) * half * 2; }
    this._spawnEnemy(x, 0, z, Math.random() < 0.4);
  }

  // ─── Game loop ─────────────────────────────────────────────────────────────

  _loop = () => {
    if (!this.running) return;
    requestAnimationFrame(this._loop);
    if (this.paused) return;
    if (this._transitioning) { this._render(); return; }

    const dt      = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.elapsedTime;

    this._update(dt, elapsed);
    this._render();
  };

  _update(dt, elapsed) {
    if (this.world?.update) this.world.update(elapsed);

    // ── Space Bot ──────────────────────────────────────────────────────────
    if (this.spaceBot) {
      this.spaceBot.update(dt, this.input, this._getMovementProfile());
      this._resolveCollisions();

      if (this.spaceBot.justJumped) this.audio?.playJump();
      this._updateMovementAudio(dt);

      const singleFire = this.input.consumeFirePressed();
      const wantsFire = singleFire || this.input.fireHeld;
      if (wantsFire && this.spaceBot.canFire(elapsed)) {
        const proj = this.spaceBot.fire(elapsed, this._getAimDirection());
        this.projectiles.push(proj);
        this.scene.add(proj.mesh);
        this._spawnMuzzleFlash(proj.mesh.position, proj.velocity.clone().normalize());
        this.hud.pulseCrosshair();
        this.audio?.playLaser();
      }
    }

    // ── Enemies ────────────────────────────────────────────────────────────
    let aliveCount = 0;
    if (this._contactCooldown > 0) this._contactCooldown -= dt;

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      aliveCount++;
      enemy.update(dt, elapsed, this.spaceBot);

      if (this.spaceBot) {
        const dist = enemy.position.distanceTo(this.spaceBot.position);
        if (dist < 1.5) {
          if (!enemy.shiny) this._damagePlayer(20 * dt);
          // Score penalty — once per contact event (0.8 s cooldown)
          if (this._contactCooldown <= 0) {
            this._contactCooldown = 0.8;
            this.state.totalScore = Math.max(0, this.state.totalScore - HIT_PENALTY);
            this.hud.updateScore(this.state.totalScore, -HIT_PENALTY);
            this.hud.flashMessage(`-${HIT_PENALTY} POINTS!`, 700);
            log.debug(`Enemy contact — -${HIT_PENALTY} pts. Total: ${this.state.totalScore}`);
          }
        }
      }
    }
    this.hud.updateEnemyCount(aliveCount);

    // ── Projectiles vs enemies ─────────────────────────────────────────────
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.update(dt);

      if (!proj.alive || proj.age > 2) {
        this.scene.remove(proj.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      let hit = false;
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        const enemyHitCenter = enemy.position.clone();
        enemyHitCenter.y += 0.7;
        if (enemyHitCenter.distanceTo(proj.mesh.position) < 1.35) {
          enemy.takeDamage(25);
          this.scene.remove(proj.mesh);
          proj.alive = false;
          this.projectiles.splice(i, 1);
          hit = true;
          this._spawnImpactSpark(proj.mesh.position.x, proj.mesh.position.y, proj.mesh.position.z, enemy.shiny ? 0xffaa44 : 0xff4444);
          this.audio?.playImpact();

          if (!enemy.alive) {
            this._spawnDeathParticles(
              enemy.position.x, enemy.position.y, enemy.position.z,
              enemy.shiny ? 0xffaa44 : 0xff4444
            );
            this.audio?.playEnemyExplode();
            if (enemy.shiny) {
              this._spawnBattery(enemy.position.x, 1, enemy.position.z);
              this.hud.flashMessage('⚡ BATTERY DROPPED!', 1600);
            }
            // Score
            this.state.totalScore += KILL_POINTS;
            this._worldScore      += KILL_POINTS;
            this.hud.updateScore(this.state.totalScore, KILL_POINTS);
            this.hud.flashMessage(`+${KILL_POINTS} POINTS!`, 900);
            log.event(`Enemy killed! +${KILL_POINTS} pts. World score: ${this._worldScore}/${SCORE_TARGET}`);
          }
          break;
        }
      }
      if (hit) continue;

      // Projectile vs boss
      if (this._boss?.alive) {
        if (this._boss.position.distanceTo(proj.mesh.position) < this._boss.hitRadius) {
          this._boss.takeDamage(25);
          this.scene.remove(proj.mesh);
          proj.alive = false;
          this.projectiles.splice(i, 1);
          this._spawnImpactSpark(proj.mesh.position.x, proj.mesh.position.y, proj.mesh.position.z, 0xffff66);
          this.audio?.playImpact();
          this.hud.updateBossHealth(this._boss.getHealthPercent());
          if (!this._boss.alive) this._bossDefeated();
        }
      }
    }

    // ── Batteries ─────────────────────────────────────────────────────────
    for (let i = this.batteries.length - 1; i >= 0; i--) {
      const bat = this.batteries[i];
      bat.update(dt, elapsed);
      if (this.spaceBot && bat.position.distanceTo(this.spaceBot.position) < 1.5 && !bat.collected) {
        bat.collect();
        this.state.batteries++;
        this._worldBatteries++;
        this.hud.updateBatteries(this.state.batteries, BATTERY_TARGET);
        this.scene.remove(bat.mesh);
        this.batteries.splice(i, 1);
        this._spawnBatterySparkle(bat.position.x, bat.position.z);
        this.audio?.playBatteryPickup();
        this._maybeAutoSave();

        const rem = BATTERY_TARGET - this.state.batteries;
        if (rem > 0) this.hud.flashMessage(rem === 1 ? 'ONE MORE BATTERY!' : `BATTERY ${this.state.batteries}/${BATTERY_TARGET}`, 1400);
        log.event(`Battery ${this.state.batteries}/${BATTERY_TARGET} collected.`);
      }
    }

    // ── Hazard pools ──────────────────────────────────────────────────────
    if (this.world?.hazardPools && this.spaceBot) {
      for (const p of this.world.hazardPools) {
        const dx = this.spaceBot.position.x - p.x;
        const dz = this.spaceBot.position.z - p.z;
        if (dx * dx + dz * dz < p.radius * p.radius) {
          this._damagePlayer(12 * dt);
          if (this._hazardMsgCooldown <= 0) {
            this.hud.flashMessage('TOXIC POOL — GET OUT!', 1200);
            this._hazardMsgCooldown = 2.5;
            log.warn('Player in toxic pool!');
          }
          break;
        }
      }
      if (this._hazardMsgCooldown > 0) this._hazardMsgCooldown -= dt;
    }

    // ── Boss contact damage ────────────────────────────────────────────────
    if (this._boss?.alive && this.spaceBot) {
      const dist = this._boss.position.distanceTo(this.spaceBot.position);
      if (dist < 3.2) this._damagePlayer(35 * dt);
      this._boss.update(dt, elapsed, this.spaceBot);
      this.hud.updateBossHealth(this._boss.getHealthPercent());
    }

    // ── Laser regen ────────────────────────────────────────────────────────
    if (this.state.laserPower < this.state.maxLaserPower) {
      this.state.laserPower = Math.min(this.state.maxLaserPower, this.state.laserPower + 5 * dt);
      this.hud.updateLaserPower(this.state.laserPower / this.state.maxLaserPower);
    }

    // ── Playtime ──────────────────────────────────────────────────────────
    this.state.playtime += dt;

    // ── Continuous enemy spawn ─────────────────────────────────────────────
    if (!this._bossActive && !this._levelComplete) {
      const liveCount = this.enemies.filter(e => e.alive).length;
      if (liveCount < MAX_LIVE_ENEMIES) {
        this._spawnTimer -= dt;
        if (this._spawnTimer <= 0) {
          this._spawnTimer = SPAWN_INTERVAL + Math.random() * 1.5;
          this._spawnRandomEnemy();
          // Prune dead enemies from array
          this.enemies  = this.enemies.filter(e => e.alive);
          this.entities = this.entities.filter(
            e => this.enemies.includes(e) || this.batteries.includes(e) || e === this.spaceBot
          );
        }
      }
    }

    // ── Boss trigger ──────────────────────────────────────────────────────
    if (!this._bossActive && !this._levelComplete &&
        (this._worldScore >= SCORE_TARGET || this.state.batteries >= BATTERY_TARGET)) {
      this._triggerBoss();
    }

    // ── Death particles ───────────────────────────────────────────────────
    for (let i = this._deathParticles.length - 1; i >= 0; i--) {
      const p = this._deathParticles[i];
      p.life -= dt * 1.6;
      p.vy   -= 9 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.material.opacity = Math.max(0, p.life);
      if (p.life <= 0) { this.scene.remove(p.mesh); this._deathParticles.splice(i, 1); }
    }

    // ── Camera ────────────────────────────────────────────────────────────
    this._updateCamera(dt);
  }

  // ─── Boss system ──────────────────────────────────────────────────────────

  _triggerBoss() {
    this._bossActive  = true;
    this._bossTriggered = true;
    log.warn(`BOSS TRIGGER! World ${this.state.currentWorld} — ${WORLD_CONFIGS[this.state.currentWorld].bossName} awakens!`);

    // Clear remaining enemies
    for (const e of this.enemies) { e.alive = false; this.scene.remove(e.group); }
    this.enemies  = [];
    this.entities = this.entities.filter(e => this.batteries.includes(e) || e === this.spaceBot);

    const cfg = WORLD_CONFIGS[this.state.currentWorld];
    this.hud.flashMessage('⚠ BOSS INCOMING!', 2200, true);

    this.audio?.playBossAwaken();

    this._setTimer(() => {
      this.hud.flashMessage(`${cfg.bossName} AWAKENS!`, 2500, true);
    }, 2600);

    this._setTimer(() => {
      this._boss = new Boss(this.scene, this.state.currentWorld);
      this._boss.position.set(0, 0, -20);
      this.hud.showBossHealth(1.0, cfg.bossName);
      this.hud.flashMessage(`DEFEAT ${cfg.bossName} TO ADVANCE!`, 3000, true);
      log.event(`${cfg.bossName} spawned!`);
    }, 5000);
  }

  _bossDefeated() {
    const cfg = WORLD_CONFIGS[this.state.currentWorld];
    this._levelComplete = true;
    this._boss = null;

    this.state.totalScore += BOSS_BONUS;
    this.hud.updateScore(this.state.totalScore, BOSS_BONUS);
    this.hud.hideBossHealth();

    this._spawnDeathParticles(0, 3, -20, 0xffff44);
    this._spawnDeathParticles(-1, 2, -19, 0xff8800);
    this._spawnDeathParticles(1, 2, -21, 0xffffff);
    this.audio?.playBossDefeat();

    log.event(`${cfg.bossName} defeated! +${BOSS_BONUS} bonus. Total score: ${this.state.totalScore}`);

    const nextWorld = this.state.currentWorld + 1;
    if (WORLD_CONFIGS[nextWorld]) {
      this.hud.flashMessage(`${cfg.bossName} DESTROYED! +${BOSS_BONUS} BONUS!`, 2200, true);
      this._setTimer(() => this.hud.flashMessage(`ENTERING WORLD ${nextWorld}…`, 2000), 2800);
      this._transitioning = true;
      this._setTimer(() => this._doWorldTransition(nextWorld), 5200);
    } else {
      // Final boss defeated — save immediately then guide player back to menu
      this.saveProgress({ syncLeaderboard: true });
      this.hud.flashMessage('CORRUPT DESTROYED! YOU WIN!', 3000, true);
      this._setTimer(() => this.hud.flashMessage(`FINAL SCORE: ${this.state.totalScore.toLocaleString()} PTS`, 3500, true), 3500);
      this._setTimer(() => this.hud.flashMessage('PRESS ESC → QUIT TO SEE YOUR RANK', 5000, true), 7500);
      log.info(`GAME COMPLETE! Final score: ${this.state.totalScore}`);
    }
  }

  // ─── Visual FX ────────────────────────────────────────────────────────────

  _spawnDeathParticles(x, y, z, color) {
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2;
      const speed = 3 + Math.random() * 4;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.05 + Math.random() * 0.07, 5, 5),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.5, transparent: true, opacity: 1 })
      );
      mesh.position.set(x, y + 0.7, z);
      this.scene.add(mesh);
      this._deathParticles.push({
        mesh,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 2,
        vy: 2.5 + Math.random() * 3.5,
        vz: Math.sin(angle) * speed + (Math.random() - 0.5) * 2,
        life: 1.0,
      });
    }
  }

  _spawnBatterySparkle(x, z) {
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 5, 5),
        new THREE.MeshStandardMaterial({ color: 0x7fff7f, emissive: 0x7fff7f, emissiveIntensity: 3, transparent: true, opacity: 1 })
      );
      mesh.position.set(x, 1.0, z);
      this.scene.add(mesh);
      this._deathParticles.push({
        mesh,
        vx: Math.cos(angle) * (2 + Math.random() * 2),
        vy: 2 + Math.random() * 3,
        vz: Math.sin(angle) * (2 + Math.random() * 2),
        life: 0.7,
      });
    }
  }

  _spawnMuzzleFlash(position, direction) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xbaffba, transparent: true, opacity: 0.9 })
    );
    mesh.position.copy(position).add(direction.multiplyScalar(0.2));
    this.scene.add(mesh);
    this._deathParticles.push({
      mesh,
      vx: direction.x * 2,
      vy: 0,
      vz: direction.z * 2,
      life: 0.28,
    });
  }

  _spawnImpactSpark(x, y, z, color) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.035 + Math.random() * 0.035, 5, 5),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 3, transparent: true, opacity: 1 })
      );
      mesh.position.set(x, y, z);
      this.scene.add(mesh);
      this._deathParticles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: 0.8 + Math.random() * 2.2,
        vz: Math.sin(angle) * speed,
        life: 0.5,
      });
    }
  }

  // ─── Player damage ────────────────────────────────────────────────────────

  _damagePlayer(amount) {
    this.state.laserPower = Math.max(0, this.state.laserPower - amount);
    this.hud.updateLaserPower(this.state.laserPower / this.state.maxLaserPower);
    this.hud.showDamageVignette();
    if (this._hitSfxCooldown <= 0) {
      this.audio?.playPlayerHit();
      this._hitSfxCooldown = 0.5;
    }

    if (this.state.laserPower <= 0) {
      this._shake = 0.45;
      this.hud.flashMessage('SYSTEM CRITICAL — REBOOTING', 2500);
      this.state.laserPower = this.state.maxLaserPower;
      this.spaceBot.position.set(0, 0, 0);
      this.spaceBot.velocity.set(0, 0, 0);
      log.warn('Player critical — respawned at origin.');
    }
  }

  // ─── Collision ────────────────────────────────────────────────────────────

  _resolveCollisions() {
    if (!this.world?.colliders) return;
    const half = this.world.size / 2 - 1;
    this.spaceBot.position.x = Math.max(-half, Math.min(half, this.spaceBot.position.x));
    this.spaceBot.position.z = Math.max(-half, Math.min(half, this.spaceBot.position.z));
    if (Math.abs(this.spaceBot.position.x) >= half) this.spaceBot.velocity.x *= 0.15;
    if (Math.abs(this.spaceBot.position.z) >= half) this.spaceBot.velocity.z *= 0.15;

    for (const c of this.world.colliders) {
      const dx = this.spaceBot.position.x - c.x;
      const dz = this.spaceBot.position.z - c.z;
      const distSq  = dx * dx + dz * dz;
      const minDist = 0.4 + c.radius;
      if (distSq < minDist * minDist && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const push = (minDist - dist) / dist;
        const nx = dx / dist;
        const nz = dz / dist;
        this.spaceBot.position.x += nx * (minDist - dist);
        this.spaceBot.position.z += nz * (minDist - dist);
        const intoWall = this.spaceBot.velocity.x * nx + this.spaceBot.velocity.z * nz;
        if (intoWall < 0) {
          this.spaceBot.velocity.x -= nx * intoWall;
          this.spaceBot.velocity.z -= nz * intoWall;
        }
      }
    }
  }

  // ─── Aim direction ────────────────────────────────────────────────────────

  _getAimDirection() {
    return new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, this.spaceBot.facingY, 0)).normalize();
  }

  _getMovementProfile() {
    return WORLD_CONFIGS[this.state.currentWorld]?.movement || {};
  }

  _updateMovementAudio(dt) {
    if (this._hitSfxCooldown > 0) this._hitSfxCooldown -= dt;
    if (this._stepSfxCooldown > 0) this._stepSfxCooldown -= dt;
    if (!this.spaceBot?.isMoving || !this.spaceBot.onGround || this._stepSfxCooldown > 0) return;
    const profile = this._getMovementProfile();
    this._stepSfxCooldown = profile.stepInterval ?? 0.34;
    this.audio?.playStep(this.state.currentWorld);
  }

  // ─── Camera ───────────────────────────────────────────────────────────────

  _updateCamera(dt) {
    if (!this.spaceBot) return;
    const yaw = this.spaceBot.rotationY;
    const pitch = this.spaceBot.cameraPitch ?? -0.08;
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const distance = this.state.currentWorld === 2 ? 6.4 : 7.2;
    const height = 3.4 - Math.sin(pitch) * 1.8;
    const shoulder = 0.55;
    const desiredPos = this.spaceBot.position.clone()
      .add(forward.clone().multiplyScalar(-distance))
      .add(right.multiplyScalar(shoulder));
    desiredPos.y += height;
    this.camera.position.lerp(desiredPos, Math.min(1, 7 * dt));

    if (this._shake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this._shake;
      this.camera.position.y += (Math.random() - 0.5) * this._shake * 0.4;
      this._shake -= dt * 2.5;
      if (this._shake < 0) this._shake = 0;
    }

    const lookTarget = this.spaceBot.position.clone()
      .add(forward.multiplyScalar(5.5));
    lookTarget.y += 1.25 + Math.sin(pitch) * 5.0;
    this.camera.lookAt(lookTarget);
  }

  _setTimer(fn, delay) {
    const id = setTimeout(() => {
      this._timers.delete(id);
      if (this.running) fn();
    }, delay);
    this._timers.add(id);
    return id;
  }

  _clearTimers() {
    for (const id of this._timers) clearTimeout(id);
    this._timers.clear();
  }

  // ─── Save / load ──────────────────────────────────────────────────────────

  _maybeAutoSave() {
    const now = Date.now();
    if (now - this._lastSaveAt < AUTOSAVE_MS) return;
    this._lastSaveAt = now;
    this.saveProgress();
  }

  async saveProgress({ syncLeaderboard = false } = {}) {
    if (!this.api) return;
    try {
      const result = await this.api.save({
        currentWorld: this.state.currentWorld,
        currentLevel: 1,
        batteries:    this.state.batteries,
        laserPower:   this.state.laserPower,
        keys:         this.state.keys,
        playtime:     this.state.playtime,
        totalScore:   this.state.totalScore,
      });
      this.onSaveSuccess(!!result.offline);
      if (syncLeaderboard) await this._refreshLeaderboard();
      log.debug(`Saved. World ${this.state.currentWorld}, score ${this.state.totalScore}, playtime ${Math.floor(this.state.playtime)}s`);
    } catch (err) {
      console.warn('[SpaceBot] Save failed:', err);
    }
  }

  async _refreshLeaderboard() {
    if (!this.api?.leaderboard) return;
    try {
      const rows = await this.api.leaderboard();
      this.onLeaderboardUpdate(rows);
      if (rows?.some(row => row.username?.toLowerCase() === this.api.getStoredUsername()?.toLowerCase())) {
        log.event('Leaderboard refreshed with current score.');
      }
    } catch (err) {
      console.warn('[SpaceBot] Leaderboard refresh failed:', err);
    }
  }

  // ─── Pause / resume / stop ────────────────────────────────────────────────

  pause() {
    this.paused = true;
    document.getElementById('pause-menu').classList.remove('hidden');
    document.exitPointerLock?.();
    this.saveProgress({ syncLeaderboard: true });
  }

  resume() {
    this.paused = false;
    document.getElementById('pause-menu').classList.add('hidden');
    this.canvas.requestPointerLock?.();
  }

  stop() {
    this.running = false;
    this._clearTimers();
    this.audio?.stopMusic();
    this.input?.dispose();
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('keydown', this._onKeyDown);
    document.getElementById('level-transition')?.classList.remove('active');
    while (this.scene.children.length > 0) this.scene.remove(this.scene.children[0]);
    this.renderer.dispose();
  }

  _render() { this.composer.render(); }
}
