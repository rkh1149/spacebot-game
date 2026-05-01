/**
 * Space Bot - Main Entry Point
 * Boots the game and handles loading/menu transitions
 */

import { Game } from './core/Game.js';

const loadingScreen = document.getElementById('loading-screen');
const loadingBar = document.getElementById('loading-bar');
const loadingText = document.getElementById('loading-text');
const mainMenu = document.getElementById('main-menu');
const hud = document.getElementById('hud');

// Loading messages cycle
const loadingMessages = [
  'Initializing systems...',
  'Calibrating laser arrays...',
  'Charging batteries...',
  'Scanning hostile lifeforms...',
  'Engaging propulsion...',
  'Ready for launch.'
];

let game = null;

async function init() {
  // Simulated loading sequence (will be replaced with real asset loading)
  for (let i = 0; i < loadingMessages.length; i++) {
    loadingText.textContent = loadingMessages[i];
    loadingBar.style.width = `${((i + 1) / loadingMessages.length) * 100}%`;
    await sleep(400);
  }

  await sleep(300);
  loadingScreen.classList.add('hidden');
  mainMenu.classList.remove('hidden');

  setupMenuHandlers();
}

function setupMenuHandlers() {
  document.getElementById('btn-new-game').addEventListener('click', () => startGame(true));
  document.getElementById('btn-continue').addEventListener('click', () => startGame(false));
  document.getElementById('btn-settings').addEventListener('click', () => {
    showMessage('Settings coming soon!');
  });
  document.getElementById('btn-resume').addEventListener('click', () => {
    if (game) game.resume();
  });
  document.getElementById('btn-quit').addEventListener('click', () => {
    if (game) {
      game.stop();
      game = null;
    }
    document.getElementById('pause-menu').classList.add('hidden');
    hud.classList.add('hidden');
    mainMenu.classList.remove('hidden');
  });
}

function startGame(isNewGame) {
  mainMenu.classList.add('hidden');
  hud.classList.remove('hidden');

  game = new Game({
    canvas: document.getElementById('game-canvas'),
    isNewGame
  });
  game.start();
}

function showMessage(text, duration = 2000) {
  const msg = document.getElementById('hud-message');
  msg.textContent = text;
  msg.classList.add('show');
  setTimeout(() => msg.classList.remove('show'), duration);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Boot
init().catch(err => {
  console.error('Failed to initialize:', err);
  loadingText.textContent = 'Failed to start. Check console.';
  loadingText.style.color = '#ff6b6b';
});

// Expose for debugging
window.__game = () => game;
