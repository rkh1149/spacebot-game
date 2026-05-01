/**
 * InputManager - centralized keyboard/mouse input
 * Captures pointer lock, tracks pressed keys, mouse delta for camera control
 */

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.firePressed = false;
    this.fireHeld = false;
    this.pointerLocked = false;

    // Settings (overridden by Game.applySettings)
    this.sensitivity = 6;
    this.invertY = false;

    this._bindEvents();
  }

  // Returns mouse multiplier scaled from sensitivity (1-20 -> 0.0008-0.005)
  getMouseMultiplier() {
    return 0.0005 + (this.sensitivity / 20) * 0.005;
  }

  _bindEvents() {
    // Keyboard
    document.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
    });
    document.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    // Mouse - request pointer lock on click
    this.canvas.addEventListener('click', () => {
      if (!this.pointerLocked) {
        this.canvas.requestPointerLock?.();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
    });

    document.addEventListener('mousemove', (e) => {
      if (this.pointerLocked) {
        this.mouseDeltaX += e.movementX;
        this.mouseDeltaY += e.movementY;
      }
    });

    document.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.firePressed = true;
        this.fireHeld = true;
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.fireHeld = false;
      }
    });
  }

  isPressed(code) {
    return this.keys.has(code);
  }

  // Get and clear mouse delta for this frame
  consumeMouseDelta() {
    const dx = this.mouseDeltaX;
    const dy = this.mouseDeltaY;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    return { dx, dy };
  }

  // Get and clear single-press state
  consumeFirePressed() {
    const pressed = this.firePressed;
    this.firePressed = false;
    return pressed;
  }
}
