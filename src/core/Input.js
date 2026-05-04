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
    this._onKeyDown = (e) => {
      this.keys.add(e.code);
    };
    this._onKeyUp = (e) => {
      this.keys.delete(e.code);
    };
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);

    // Mouse - request pointer lock on click
    this._onCanvasClick = () => {
      if (!this.pointerLocked) {
        this.canvas.requestPointerLock?.();
      }
    };
    this.canvas.addEventListener('click', this._onCanvasClick);

    this._onPointerLockChange = () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
    };
    document.addEventListener('pointerlockchange', this._onPointerLockChange);

    this._onMouseMove = (e) => {
      if (this.pointerLocked) {
        this.mouseDeltaX += e.movementX;
        this.mouseDeltaY += e.movementY;
      }
    };
    document.addEventListener('mousemove', this._onMouseMove);

    this._onMouseDown = (e) => {
      if (e.button === 0) {
        this.firePressed = true;
        this.fireHeld = true;
      }
    };
    document.addEventListener('mousedown', this._onMouseDown);

    this._onMouseUp = (e) => {
      if (e.button === 0) {
        this.fireHeld = false;
      }
    };
    document.addEventListener('mouseup', this._onMouseUp);
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

  dispose() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mousedown', this._onMouseDown);
    document.removeEventListener('mouseup', this._onMouseUp);
    this.canvas.removeEventListener('click', this._onCanvasClick);
    this.keys.clear();
    this.firePressed = false;
    this.fireHeld = false;
  }
}
