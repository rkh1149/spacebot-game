/**
 * API Client
 * Wraps fetch calls to our /api/* endpoints with error handling and retries.
 * In dev mode (vite), these go to /api/... which Vercel handles.
 * Locally without Vercel, the API endpoints won't be reachable - we fall back
 * to localStorage for save state so the game still works offline.
 */

const API_BASE = ''; // same origin
const LS_KEY_PLAYER = 'spacebot.playerId';
const LS_KEY_USERNAME = 'spacebot.username';
const LS_KEY_SAVE = 'spacebot.localSave';

export class ApiClient {
  constructor() {
    this.playerId = localStorage.getItem(LS_KEY_PLAYER);
    this.username = localStorage.getItem(LS_KEY_USERNAME);
    this._apiAvailable = null; // unknown until first call
  }

  hasStoredPlayer() {
    return !!this.playerId;
  }

  getStoredUsername() {
    return this.username;
  }

  /**
   * Create or fetch a player by username.
   * Returns: { player, existing }
   */
  async createOrGetPlayer(username) {
    try {
      const res = await fetch(`${API_BASE}/api/player`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      this.playerId = data.player.id;
      this.username = data.player.username;
      localStorage.setItem(LS_KEY_PLAYER, this.playerId);
      localStorage.setItem(LS_KEY_USERNAME, this.username);
      this._apiAvailable = true;
      return data;
    } catch (err) {
      console.warn('[API] Player creation failed, working offline:', err.message);
      this._apiAvailable = false;
      // Fallback: generate a local-only player ID
      this.playerId = `local-${Date.now()}`;
      this.username = username;
      localStorage.setItem(LS_KEY_PLAYER, this.playerId);
      localStorage.setItem(LS_KEY_USERNAME, this.username);
      return {
        player: { id: this.playerId, username, created_at: new Date().toISOString() },
        existing: false,
        offline: true
      };
    }
  }

  /**
   * Save game state. Always writes to localStorage, optionally to API.
   */
  async save(state) {
    const payload = {
      playerId: this.playerId,
      currentWorld: state.currentWorld || 1,
      currentLevel: state.currentLevel || 1,
      batteries: state.batteries || 0,
      laserPower: Math.round(state.laserPower || 100),
      keys: state.keys || [],
      playtime: Math.round(state.playtime || 0)
    };

    // Always backup to localStorage first
    localStorage.setItem(LS_KEY_SAVE, JSON.stringify({
      ...payload,
      savedAt: new Date().toISOString()
    }));

    // If we know API is unavailable, skip the network call
    if (this._apiAvailable === false || this.playerId.startsWith('local-')) {
      return { success: true, offline: true };
    }

    try {
      const res = await fetch(`${API_BASE}/api/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this._apiAvailable = true;
      return data;
    } catch (err) {
      console.warn('[API] Save failed, kept local backup:', err.message);
      this._apiAvailable = false;
      return { success: true, offline: true };
    }
  }

  /**
   * Load saved state. Tries API, falls back to localStorage.
   */
  async load() {
    if (!this.playerId) return null;

    // Try API first if available
    if (this._apiAvailable !== false && !this.playerId.startsWith('local-')) {
      try {
        const res = await fetch(`${API_BASE}/api/load?playerId=${this.playerId}`);
        if (res.ok) {
          const data = await res.json();
          this._apiAvailable = true;
          return this._normalizeFromApi(data.save);
        }
        if (res.status === 404) {
          // No save exists yet
          return null;
        }
        throw new Error(`HTTP ${res.status}`);
      } catch (err) {
        console.warn('[API] Load failed, using local backup:', err.message);
        this._apiAvailable = false;
      }
    }

    // Fallback: localStorage
    const local = localStorage.getItem(LS_KEY_SAVE);
    if (!local) return null;
    try {
      return JSON.parse(local);
    } catch {
      return null;
    }
  }

  _normalizeFromApi(apiSave) {
    // Convert snake_case from DB to camelCase for game state
    return {
      playerId: apiSave.player_id,
      currentWorld: apiSave.current_world,
      currentLevel: apiSave.current_level,
      batteries: apiSave.batteries_collected,
      laserPower: apiSave.laser_power,
      keys: apiSave.keys_obtained || [],
      playtime: apiSave.total_playtime_seconds,
      savedAt: apiSave.last_saved
    };
  }

  /**
   * Forget current player (logout). Clears localStorage.
   */
  signOut() {
    localStorage.removeItem(LS_KEY_PLAYER);
    localStorage.removeItem(LS_KEY_USERNAME);
    localStorage.removeItem(LS_KEY_SAVE);
    this.playerId = null;
    this.username = null;
    this._apiAvailable = null;
  }
}

// Singleton
export const api = new ApiClient();
