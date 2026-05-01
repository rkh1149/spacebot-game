/**
 * Space Bot - Main Entry Point
 * Boots the game, handles loading, sign-in, menu, settings.
 */

import { Game } from './core/Game.js';
import { api } from './core/Api.js';

// DOM references
const loadingScreen = document.getElementById('loading-screen');
const loadingBar = document.getElementById('loading-bar');
const loadingText = document.getElementById('loading-text');
const signinScreen = document.getElementById('signin-screen');
const mainMenu = document.getElementById('main-menu');
const settingsScreen = document.getElementById('settings-screen');
const hud = document.getElementById('hud');
const pauseMenu = document.getElementById('pause-menu');

// Settings state (persisted to localStorage)
const SETTINGS_KEY = 'spacebot.settings';
let settings = loadSettings();

let game = null;

// ============================================================
// Boot sequence
// ============================================================

const loadingMessages = [
  'Initializing systems...',
  'Calibrating laser arrays...',
  'Charging batteries...',
  'Scanning hostile lifeforms...',
  'Engaging propulsion...',
  'Ready for launch.'
];

async function init() {
  for (let i = 0; i < loadingMessages.length; i++) {
    loadingText.textContent = loadingMessages[i];
    loadingBar.style.width = `${((i + 1) / loadingMessages.length) * 100}%`;
    await sleep(350);
  }

  await sleep(200);
  loadingScreen.classList.add('hidden');

  // If a player is already stored, go straight to menu.
  // Otherwise show the sign-in screen.
  if (api.hasStoredPlayer()) {
    await showMainMenu();
  } else {
    showSignIn();
  }

  setupAllHandlers();
}

// ============================================================
// Sign-in
// ============================================================

function showSignIn() {
  signinScreen.classList.remove('hidden');
  setTimeout(() => document.getElementById('username-input').focus(), 100);
}

function setupSignInHandlers() {
  const input = document.getElementById('username-input');
  const btn = document.getElementById('btn-signin-confirm');
  const status = document.getElementById('signin-status');

  async function submit() {
    const name = input.value.trim();

    if (name.length < 2) {
      status.textContent = 'Name must be at least 2 characters.';
      status.className = 'signin-status error';
      return;
    }
    if (name.length > 50) {
      status.textContent = 'Name too long (max 50).';
      status.className = 'signin-status error';
      return;
    }

    btn.disabled = true;
    status.textContent = 'Connecting...';
    status.className = 'signin-status';

    try {
      const result = await api.createOrGetPlayer(name);

      if (result.offline) {
        status.textContent = 'Working offline. Progress saves locally.';
        status.className = 'signin-status';
      } else if (result.existing) {
        status.textContent = `Welcome back, ${name}.`;
        status.className = 'signin-status success';
      } else {
        status.textContent = 'Pilot registered.';
        status.className = 'signin-status success';
      }

      await sleep(700);
      signinScreen.classList.add('hidden');
      await showMainMenu();
    } catch (err) {
      status.textContent = 'Failed: ' + err.message;
      status.className = 'signin-status error';
      btn.disabled = false;
    }
  }

  btn.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });
}

// ============================================================
// Main Menu
// ============================================================

async function showMainMenu() {
  mainMenu.classList.remove('hidden');
  document.getElementById('badge-name').textContent = api.getStoredUsername() || 'PILOT';

  // Check if a save exists -> enable Continue button
  const continueBtn = document.getElementById('btn-continue');
  const continueStatus = document.getElementById('continue-status');

  try {
    const save = await api.load();
    if (save && (save.batteries > 0 || save.currentLevel > 1 || save.currentWorld > 1)) {
      continueBtn.disabled = false;
      continueStatus.textContent =
        `WORLD ${save.currentWorld} • LVL ${save.currentLevel} • ${save.batteries} BATTERIES`;
    } else {
      continueBtn.disabled = true;
      continueStatus.textContent = 'NO SAVE FOUND';
    }
  } catch {
    continueBtn.disabled = true;
    continueStatus.textContent = 'NO SAVE FOUND';
  }
}

function setupMenuHandlers() {
  document.getElementById('btn-new-game').addEventListener('click', () => {
    startGame({ isNewGame: true });
  });

  document.getElementById('btn-continue').addEventListener('click', async () => {
    const save = await api.load();
    if (save) startGame({ isNewGame: false, save });
  });

  document.getElementById('btn-settings').addEventListener('click', () => {
    mainMenu.classList.add('hidden');
    settingsScreen.classList.remove('hidden');
  });

  document.getElementById('btn-signout').addEventListener('click', () => {
    if (confirm('Sign out? This will clear your local save backup.')) {
      api.signOut();
      mainMenu.classList.add('hidden');
      showSignIn();
    }
  });

  // Pause menu
  document.getElementById('btn-resume').addEventListener('click', () => {
    if (game) game.resume();
  });
  document.getElementById('btn-quit').addEventListener('click', async () => {
    if (game) {
      // Final save before quitting
      try { await game.saveProgress(); } catch {}
      game.stop();
      game = null;
    }
    pauseMenu.classList.add('hidden');
    hud.classList.add('hidden');
    await showMainMenu();
  });
}

// ============================================================
// Settings
// ============================================================

function loadSettings() {
  const defaults = {
    mouseSensitivity: 6,
    masterVolume: 70,
    quality: 'medium',
    invertY: false
  };
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
  } catch {
    return defaults;
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function setupSettingsHandlers() {
  // Mouse sensitivity
  const sens = document.getElementById('mouse-sens');
  const sensVal = document.getElementById('mouse-sens-value');
  sens.value = settings.mouseSensitivity;
  sensVal.textContent = settings.mouseSensitivity;
  sens.addEventListener('input', () => {
    settings.mouseSensitivity = parseInt(sens.value);
    sensVal.textContent = settings.mouseSensitivity;
    saveSettings();
    if (game) game.applySettings(settings);
  });

  // Master volume
  const vol = document.getElementById('master-vol');
  const volVal = document.getElementById('master-vol-value');
  vol.value = settings.masterVolume;
  volVal.textContent = settings.masterVolume;
  vol.addEventListener('input', () => {
    settings.masterVolume = parseInt(vol.value);
    volVal.textContent = settings.masterVolume;
    saveSettings();
  });

  // Graphics quality
  const qBtns = document.querySelectorAll('.quality-btn');
  qBtns.forEach(btn => {
    if (btn.dataset.quality === settings.quality) btn.classList.add('active');
    else btn.classList.remove('active');
    btn.addEventListener('click', () => {
      qBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      settings.quality = btn.dataset.quality;
      saveSettings();
      if (game) game.applySettings(settings);
    });
  });

  // Invert Y
  const invertBtn = document.getElementById('invert-y');
  const invertLabel = invertBtn.querySelector('.checkbox-label');
  function refreshInvert() {
    if (settings.invertY) {
      invertBtn.classList.add('on');
      invertLabel.textContent = 'On';
    } else {
      invertBtn.classList.remove('on');
      invertLabel.textContent = 'Off';
    }
  }
  refreshInvert();
  invertBtn.addEventListener('click', () => {
    settings.invertY = !settings.invertY;
    refreshInvert();
    saveSettings();
    if (game) game.applySettings(settings);
  });

  // Back button
  document.getElementById('btn-settings-back').addEventListener('click', () => {
    settingsScreen.classList.add('hidden');
    mainMenu.classList.remove('hidden');
  });
}

// ============================================================
// Game lifecycle
// ============================================================

function startGame({ isNewGame, save }) {
  mainMenu.classList.add('hidden');
  hud.classList.remove('hidden');

  // Update HUD world/level label
  const w = save?.currentWorld || 1;
  const l = save?.currentLevel || 1;
  document.getElementById('world-num').textContent = w;
  document.getElementById('level-num').textContent = l;
  document.getElementById('world-name').textContent = isNewGame ? 'TEST ARENA' : 'TEST ARENA';

  game = new Game({
    canvas: document.getElementById('game-canvas'),
    isNewGame,
    initialState: save || null,
    settings,
    api,
    onSaveSuccess: showSaveIndicator
  });
  game.start();
}

function showSaveIndicator(offline) {
  const ind = document.getElementById('save-indicator');
  ind.classList.toggle('offline', !!offline);
  ind.querySelector('span').textContent = offline ? 'SAVED LOCALLY' : 'SAVED';
  ind.classList.add('show');
  setTimeout(() => ind.classList.remove('show'), 1800);
}

// ============================================================
// Setup
// ============================================================

function setupAllHandlers() {
  setupSignInHandlers();
  setupMenuHandlers();
  setupSettingsHandlers();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Expose for debugging
window.__game = () => game;
window.__api = api;
window.__settings = () => settings;

// Boot
init().catch(err => {
  console.error('Failed to initialize:', err);
  loadingText.textContent = 'Failed to start. Check console.';
  loadingText.style.color = '#ff6b6b';
});
