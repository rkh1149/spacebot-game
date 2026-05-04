/**
 * HUD - manages all on-screen UI elements during gameplay.
 */

export class HUD {
  constructor() {
    this.laserBar      = document.getElementById('laser-bar');
    this.batteryCount  = document.getElementById('battery-count');
    this.message       = document.getElementById('hud-message');
    this.enemyCount    = document.getElementById('enemy-count');
    this.enemyCounter  = document.getElementById('enemy-counter');
    this.controlsHint  = document.getElementById('controls-hint');
    this.vignette      = document.getElementById('damage-vignette');
    this.objectiveFill = document.getElementById('objective-fill');
    this.scoreEl       = document.getElementById('score-count');
    this.bossStrip     = document.getElementById('boss-strip');
    this.bossHealthFill = document.getElementById('boss-health-fill');
    this.bossNameEl    = document.getElementById('boss-name-display');
    this.bossHpText    = document.getElementById('boss-hp-text');
    this.crosshair     = document.querySelector('.hud-crosshair');

    this._messageTimer  = null;
    this._vignetteTimer = null;
    this._controlsTimer = null;
    this._scoreFlashTimer = null;
    this._crosshairTimer = null;
  }

  // ─── Laser bar ─────────────────────────────────────────────────────────────

  updateLaserPower(percent) {
    if (!this.laserBar) return;
    this.laserBar.style.width = `${percent * 100}%`;
    this.laserBar.classList.toggle('low', percent < 0.3);
  }

  // ─── Battery counter + objective strip ─────────────────────────────────────

  updateBatteries(count, target = 10) {
    if (this.batteryCount) this.batteryCount.textContent = count;
    this.updateObjective(count, target);
  }

  updateObjective(count, target = 10) {
    if (!this.objectiveFill) return;
    const pct = Math.min(count / target, 1) * 100;
    this.objectiveFill.style.width = `${pct}%`;
  }

  // ─── Enemy counter ──────────────────────────────────────────────────────────

  updateEnemyCount(alive) {
    if (!this.enemyCount) return;
    this.enemyCount.textContent = alive;
    const clear = alive === 0;
    this.enemyCount.classList.toggle('clear', clear);
    if (this.enemyCounter) this.enemyCounter.classList.toggle('clear', clear);
  }

  // ─── Score ──────────────────────────────────────────────────────────────────

  updateScore(score, delta = 0) {
    if (!this.scoreEl) return;
    this.scoreEl.textContent = score.toString().padStart(6, '0');

    if (delta !== 0) {
      this.scoreEl.classList.remove('gain', 'loss');
      void this.scoreEl.offsetWidth; // reflow for re-trigger
      this.scoreEl.classList.add(delta > 0 ? 'gain' : 'loss');
      if (this._scoreFlashTimer) clearTimeout(this._scoreFlashTimer);
      this._scoreFlashTimer = setTimeout(() => {
        this.scoreEl.classList.remove('gain', 'loss');
      }, 400);
    }
  }

  // ─── Boss health ─────────────────────────────────────────────────────────────

  showBossHealth(pct, name) {
    if (!this.bossStrip) return;
    if (this.bossNameEl) this.bossNameEl.textContent = `⚠ ${name}`;
    this.bossStrip.classList.remove('hidden');
    this.updateBossHealth(pct);
  }

  updateBossHealth(pct) {
    if (!this.bossHealthFill) return;
    this.bossHealthFill.style.width = `${pct * 100}%`;
    this.bossHealthFill.classList.toggle('critical', pct < 0.3);
    if (this.bossHpText) this.bossHpText.textContent = `${Math.round(pct * 100)}%`;
  }

  hideBossHealth() {
    if (this.bossStrip) this.bossStrip.classList.add('hidden');
  }

  // ─── Flash message ─────────────────────────────────────────────────────────

  flashMessage(text, duration = 1800, wave = false) {
    if (!this.message) return;
    this.message.textContent = text;
    this.message.classList.add('show');
    this.message.classList.toggle('wave', wave);
    if (this._messageTimer) clearTimeout(this._messageTimer);
    this._messageTimer = setTimeout(() => {
      this.message.classList.remove('show', 'wave');
    }, duration);
  }

  // ─── Damage vignette ───────────────────────────────────────────────────────

  showDamageVignette() {
    if (!this.vignette) return;
    this.vignette.classList.add('flash');
    if (this._vignetteTimer) clearTimeout(this._vignetteTimer);
    this._vignetteTimer = setTimeout(() => {
      this.vignette.classList.remove('flash');
    }, 120);
  }

  // ─── Controls hint ─────────────────────────────────────────────────────────

  showControlsHint(duration = 9000) {
    if (!this.controlsHint) return;
    this.controlsHint.classList.add('show');
    if (this._controlsTimer) clearTimeout(this._controlsTimer);
    this._controlsTimer = setTimeout(() => {
      this.controlsHint.classList.remove('show');
    }, duration);
  }

  pulseCrosshair() {
    if (!this.crosshair) return;
    this.crosshair.classList.add('fire');
    if (this._crosshairTimer) clearTimeout(this._crosshairTimer);
    this._crosshairTimer = setTimeout(() => {
      this.crosshair.classList.remove('fire');
    }, 110);
  }
}
