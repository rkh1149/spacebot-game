/**
 * HUD - manages updates to the on-screen UI elements
 */

export class HUD {
  constructor() {
    this.laserBar = document.getElementById('laser-bar');
    this.batteryCount = document.getElementById('battery-count');
    this.message = document.getElementById('hud-message');
    this._messageTimer = null;
  }

  updateLaserPower(percent) {
    if (!this.laserBar) return;
    this.laserBar.style.width = `${percent * 100}%`;
    if (percent < 0.3) {
      this.laserBar.classList.add('low');
    } else {
      this.laserBar.classList.remove('low');
    }
  }

  updateBatteries(count) {
    if (!this.batteryCount) return;
    this.batteryCount.textContent = count;
  }

  flashMessage(text, duration = 1500) {
    if (!this.message) return;
    this.message.textContent = text;
    this.message.classList.add('show');
    if (this._messageTimer) clearTimeout(this._messageTimer);
    this._messageTimer = setTimeout(() => {
      this.message.classList.remove('show');
    }, duration);
  }
}
