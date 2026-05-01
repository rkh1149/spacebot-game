/**
 * Game - Main game controller
 * Manages Three.js scene, render loop, save/load, settings.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { InputManager } from './Input.js';
import { SpaceBot } from '../entities/SpaceBot.js';
import { Enemy } from '../entities/Enemy.js';
import { Battery } from '../entities/Battery.js';
import { TestArena } from '../worlds/TestArena.js';
import { HUD } from '../ui/HUD.js';

// Auto-save throttle: don't save more than every 3 seconds
const AUTOSAVE_THROTTLE_MS = 3000;

export class Game {
  constructor({ canvas, isNewGame, initialState, settings, api, onSaveSuccess }) {
    this.canvas = canvas;
    this.isNewGame = isNewGame;
    this.api = api;
    this.settings = settings || {};
    this.onSaveSuccess = onSaveSuccess || (() => {});
    this.running = false;
    this.paused = false;

    this.clock = new THREE.Clock();
    this.entities = [];
    this.enemies = [];
    this.batteries = [];
    this.projectiles = [];

    // Initial state — either from save or fresh
    this.state = {
      laserPower: initialState?.laserPower ?? 100,
      maxLaserPower: 100,
      batteries: initialState?.batteries ?? 0,
      currentWorld: initialState?.currentWorld ?? 1,
      currentLevel: initialState?.currentLevel ?? 1,
      keys: initialState?.keys ?? [],
      playtime: initialState?.playtime ?? 0
    };

    this._lastSaveAt = 0;
    this._sessionStart = Date.now();

    this._setupRenderer();
    this._setupScene();
    this._setupCamera();
    this._setupLighting();
    this._setupPostProcessing();

    this.input = new InputManager(canvas);
    this.hud = new HUD();

    this._setupResize();
    this._setupPauseHandler();

    // Apply initial settings
    this.applySettings(this.settings);
  }

  applySettings(settings) {
    this.settings = settings;
    if (this.input) {
      this.input.sensitivity = settings.mouseSensitivity ?? 6;
      this.input.invertY = !!settings.invertY;
    }
    // Apply quality changes
    if (this.composer && this.bloomPass) {
      switch (settings.quality) {
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
        case 'medium':
        default:
          this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
          this.bloomPass.strength = 0.6;
          this.renderer.shadowMap.enabled = true;
          break;
      }
    }
  }

  _setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  _setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e27);
    this.scene.fog = new THREE.FogExp2(0x0a0e27, 0.015);
  }

  _setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 10);
    this.camera.lookAt(0, 1, 0);
  }

  _setupLighting() {
    const ambient = new THREE.AmbientLight(0x404060, 0.4);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffeecc, 1.2);
    sun.position.set(20, 30, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 100;
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
    this.sun = sun;

    const hemi = new THREE.HemisphereLight(0x88aaff, 0x442200, 0.3);
    this.scene.add(hemi);
  }

  _setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.6,  // strength
      0.8,  // radius
      0.85  // threshold
    );
    this.composer.addPass(this.bloomPass);

    this.composer.addPass(new OutputPass());
  }

  _setupResize() {
    this._onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.composer.setSize(w, h);
    };
    window.addEventListener('resize', this._onResize);
  }

  _setupPauseHandler() {
    this._onKeyDown = (e) => {
      if (e.key === 'Escape' && this.running) {
        if (this.paused) this.resume();
        else this.pause();
      }
    };
    document.addEventListener('keydown', this._onKeyDown);
  }

  start() {
    // Build the test arena (will be swapped for real worlds in Phase 1)
    this.world = new TestArena(this.scene);
    this.world.build();

    // Create Space Bot
    this.spaceBot = new SpaceBot(this.scene);
    this.spaceBot.position.set(0, 0, 0);
    this.entities.push(this.spaceBot);

    // Spawn test enemies
    this._spawnEnemy(8, 0, 8, false);
    this._spawnEnemy(-8, 0, 8, true);
    this._spawnEnemy(0, 0, -10, false);

    // Spawn test batteries
    this._spawnBattery(5, 1, 0);
    this._spawnBattery(-5, 1, 0);
    this._spawnBattery(0, 1, 5);

    // Sync HUD with state
    this.hud.updateLaserPower(this.state.laserPower / this.state.maxLaserPower);
    this.hud.updateBatteries(this.state.batteries);

    if (!this.isNewGame) {
      this.hud.flashMessage(`WELCOME BACK • ${this.state.batteries} BATTERIES`, 2500);
    } else {
      this.hud.flashMessage('CLICK TO BEGIN', 2500);
    }

    this.running = true;
    this.clock.start();
    this._loop();
  }

  _spawnEnemy(x, y, z, shiny) {
    const enemy = new Enemy(this.scene, { shiny });
    enemy.position.set(x, y, z);
    this.entities.push(enemy);
    this.enemies.push(enemy);
  }

  _spawnBattery(x, y, z) {
    const battery = new Battery(this.scene);
    battery.position.set(x, y, z);
    this.entities.push(battery);
    this.batteries.push(battery);
  }

  _loop = () => {
    if (!this.running) return;
    requestAnimationFrame(this._loop);

    if (this.paused) return;

    const dt = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.elapsedTime;

    this._update(dt, elapsed);
    this._render();
  };

  _update(dt, elapsed) {
    // Update Space Bot
    if (this.spaceBot) {
      this.spaceBot.update(dt, this.input, this.camera);

      if (this.input.firePressed && this.spaceBot.canFire(elapsed)) {
        const projectile = this.spaceBot.fire(elapsed);
        this.projectiles.push(projectile);
        this.scene.add(projectile.mesh);
      }
    }

    // Update enemies
    for (const enemy of this.enemies) {
      enemy.update(dt, elapsed, this.spaceBot);

      if (this.spaceBot && enemy.alive) {
        const dist = enemy.position.distanceTo(this.spaceBot.position);
        if (dist < 1.5) {
          if (!enemy.shiny) {
            this._damagePlayer(20 * dt);
          }
        }
      }
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.update(dt);

      if (proj.alive === false || proj.age > 2) {
        this.scene.remove(proj.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        const dist = enemy.position.distanceTo(proj.mesh.position);
        if (dist < 1.2) {
          enemy.takeDamage(25);
          this.scene.remove(proj.mesh);
          proj.alive = false;
          this.projectiles.splice(i, 1);

          if (!enemy.alive && enemy.shiny) {
            this._spawnBattery(enemy.position.x, 1, enemy.position.z);
            this.hud.flashMessage('BATTERY DROPPED!');
          }
          break;
        }
      }
    }

    // Update batteries
    for (let i = this.batteries.length - 1; i >= 0; i--) {
      const battery = this.batteries[i];
      battery.update(dt, elapsed);

      if (this.spaceBot) {
        const dist = battery.position.distanceTo(this.spaceBot.position);
        if (dist < 1.5 && !battery.collected) {
          battery.collect();
          this.state.batteries++;
          this.hud.updateBatteries(this.state.batteries);
          this.hud.flashMessage('+1 BATTERY');
          this.scene.remove(battery.mesh);
          this.batteries.splice(i, 1);

          // Trigger autosave on battery pickup (throttled)
          this._maybeAutoSave();
        }
      }
    }

    // Regenerate laser power
    if (this.state.laserPower < this.state.maxLaserPower) {
      this.state.laserPower = Math.min(
        this.state.maxLaserPower,
        this.state.laserPower + 5 * dt
      );
      this.hud.updateLaserPower(this.state.laserPower / this.state.maxLaserPower);
    }

    // Track playtime
    this.state.playtime += dt;

    // Camera follow
    this._updateCamera(dt);
  }

  _damagePlayer(amount) {
    this.state.laserPower = Math.max(0, this.state.laserPower - amount);
    this.hud.updateLaserPower(this.state.laserPower / this.state.maxLaserPower);
    if (this.state.laserPower <= 0) {
      this.hud.flashMessage('SYSTEM CRITICAL', 3000);
      this.state.laserPower = this.state.maxLaserPower;
      this.spaceBot.position.set(0, 0, 0);
    }
  }

  _updateCamera(dt) {
    if (!this.spaceBot) return;

    const targetPos = new THREE.Vector3();
    const offset = new THREE.Vector3(0, 4, 7);
    offset.applyEuler(new THREE.Euler(0, this.spaceBot.rotationY, 0));
    targetPos.copy(this.spaceBot.position).add(offset);

    this.camera.position.lerp(targetPos, 5 * dt);

    const lookTarget = this.spaceBot.position.clone();
    lookTarget.y += 1.5;
    this.camera.lookAt(lookTarget);
  }

  _render() {
    this.composer.render();
  }

  _maybeAutoSave() {
    const now = Date.now();
    if (now - this._lastSaveAt < AUTOSAVE_THROTTLE_MS) return;
    this._lastSaveAt = now;
    this.saveProgress();
  }

  async saveProgress() {
    if (!this.api) return;
    try {
      const result = await this.api.save({
        currentWorld: this.state.currentWorld,
        currentLevel: this.state.currentLevel,
        batteries: this.state.batteries,
        laserPower: this.state.laserPower,
        keys: this.state.keys,
        playtime: this.state.playtime
      });
      this.onSaveSuccess(!!result.offline);
    } catch (err) {
      console.warn('Save failed:', err);
    }
  }

  pause() {
    this.paused = true;
    document.getElementById('pause-menu').classList.remove('hidden');
    document.exitPointerLock?.();
  }

  resume() {
    this.paused = false;
    document.getElementById('pause-menu').classList.add('hidden');
    this.canvas.requestPointerLock?.();
  }

  stop() {
    this.running = false;

    // Cleanup events
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('keydown', this._onKeyDown);

    // Cleanup scene
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
    this.renderer.dispose();
  }
}
