/**
 * TextureFactory — procedural PBR textures generated via Canvas API.
 * No external assets required. All textures are cached after first generation.
 *
 * Usage:
 *   const { map, normalMap, roughnessMap } = TextureFactory.mossyGround();
 */

import * as THREE from 'three';

// Module-level cache — textures are generated once per session, then reused.
const _cache = {};

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function colorTex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function repeatTex(t, rx, ry) {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  return t;
}

// ─── Mossy Ground ─────────────────────────────────────────────────────────────

export class TextureFactory {

  static mossyGround() {
    if (_cache.ground) return _cache.ground;
    const SIZE = 512;

    // Albedo — dark alien soil with green moss variation
    const [ac, ax] = canvas(SIZE, SIZE);
    ax.fillStyle = '#0a1208';
    ax.fillRect(0, 0, SIZE, SIZE);

    // Large dark undulations (soil depth variation)
    for (let i = 0; i < 55; i++) {
      const x = Math.random() * SIZE, y = Math.random() * SIZE;
      const r = 22 + Math.random() * 55;
      const g = ax.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(4,8,3,0.55)');
      g.addColorStop(1, 'rgba(4,8,3,0)');
      ax.fillStyle = g;
      ax.beginPath(); ax.arc(x, y, r, 0, Math.PI * 2); ax.fill();
    }

    // Moss patches — brighter green clumps
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * SIZE, y = Math.random() * SIZE;
      const r = 5 + Math.random() * 22;
      const v = 38 + Math.floor(Math.random() * 14);
      ax.fillStyle = `rgba(14,${v},9,0.75)`;
      ax.beginPath(); ax.arc(x, y, r, 0, Math.PI * 2); ax.fill();
    }

    // Fine moss dots — tiny bright specks
    for (let i = 0; i < 220; i++) {
      const x = Math.random() * SIZE, y = Math.random() * SIZE;
      ax.fillStyle = 'rgba(28,62,16,0.9)';
      ax.beginPath(); ax.arc(x, y, 1 + Math.random() * 2.5, 0, Math.PI * 2); ax.fill();
    }

    // Mud/stone patches — warm neutral breaks in the green
    for (let i = 0; i < 28; i++) {
      const x = Math.random() * SIZE, y = Math.random() * SIZE;
      const r = 4 + Math.random() * 14;
      ax.fillStyle = `rgba(20,16,11,0.45)`;
      ax.beginPath(); ax.arc(x, y, r, 0, Math.PI * 2); ax.fill();
    }

    const map = repeatTex(colorTex(ac), 12, 12);

    // Normal map — gentle terrain undulation
    const [nc, nx] = canvas(SIZE, SIZE);
    nx.fillStyle = '#8080ff';
    nx.fillRect(0, 0, SIZE, SIZE);

    for (let i = 0; i < 45; i++) {
      const x = Math.random() * SIZE, y = Math.random() * SIZE;
      const r = 18 + Math.random() * 45;
      const g = nx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0,   'rgba(148,148,255,0.55)');
      g.addColorStop(0.5, 'rgba(128,128,248,0.18)');
      g.addColorStop(1,   'rgba(128,128,255,0)');
      nx.fillStyle = g;
      nx.beginPath(); nx.arc(x, y, r, 0, Math.PI * 2); nx.fill();
    }

    const normalMap = repeatTex(colorTex(nc, false), 12, 12);

    // Roughness map — mostly rough, wet shiny patches
    const [rc, rx] = canvas(SIZE, SIZE);
    rx.fillStyle = '#cccccc';
    rx.fillRect(0, 0, SIZE, SIZE);

    for (let i = 0; i < 28; i++) {
      const x = Math.random() * SIZE, y = Math.random() * SIZE;
      const r = 8 + Math.random() * 32;
      rx.fillStyle = 'rgba(45,45,45,0.65)'; // shiny wet area
      rx.beginPath(); rx.arc(x, y, r, 0, Math.PI * 2); rx.fill();
    }

    const roughnessMap = repeatTex(colorTex(rc, false), 12, 12);

    _cache.ground = { map, normalMap, roughnessMap };
    return _cache.ground;
  }

  // ─── Mushroom Cap ────────────────────────────────────────────────────────────

  static mushroomCap() {
    if (_cache.cap) return _cache.cap;
    const SIZE = 256;
    const cx = SIZE / 2, cy = SIZE / 2;

    // Albedo — grayscale, multiplied against material color so it tints any cap
    const [ac, ax] = canvas(SIZE, SIZE);
    ax.fillStyle = '#ffffff';
    ax.fillRect(0, 0, SIZE, SIZE);

    // Edge darkening — caps are darkest at rim
    const edgeG = ax.createRadialGradient(cx, cy, SIZE * 0.18, cx, cy, SIZE * 0.58);
    edgeG.addColorStop(0, 'rgba(255,255,255,0)');
    edgeG.addColorStop(1, 'rgba(0,0,0,0.58)');
    ax.fillStyle = edgeG;
    ax.beginPath(); ax.arc(cx, cy, SIZE * 0.58, 0, Math.PI * 2); ax.fill();

    // Bright centre highlight
    const centreG = ax.createRadialGradient(cx, cy, 0, cx, cy, SIZE * 0.28);
    centreG.addColorStop(0, 'rgba(255,255,255,0.42)');
    centreG.addColorStop(1, 'rgba(255,255,255,0)');
    ax.fillStyle = centreG;
    ax.beginPath(); ax.arc(cx, cy, SIZE * 0.28, 0, Math.PI * 2); ax.fill();

    // Bioluminescent bright spots scattered across surface
    for (let i = 0; i < 32; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist  = Math.random() * SIZE * 0.44;
      const px = cx + Math.cos(angle) * dist;
      const py = cy + Math.sin(angle) * dist;
      const r  = 2.5 + Math.random() * 7;
      const sg = ax.createRadialGradient(px, py, 0, px, py, r);
      sg.addColorStop(0, 'rgba(255,255,255,0.92)');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      ax.fillStyle = sg;
      ax.beginPath(); ax.arc(px, py, r, 0, Math.PI * 2); ax.fill();
    }

    // Concentric ring faint striations
    for (let ring = 1; ring <= 4; ring++) {
      ax.strokeStyle = `rgba(0,0,0,${0.06 * ring})`;
      ax.lineWidth = 1.5;
      ax.beginPath(); ax.arc(cx, cy, SIZE * 0.13 * ring, 0, Math.PI * 2); ax.stroke();
    }

    const map = colorTex(ac);

    // Emissive map — spots and centre glow hottest
    const [ec, ex] = canvas(SIZE, SIZE);
    ex.fillStyle = '#555555'; // base glow level
    ex.fillRect(0, 0, SIZE, SIZE);

    const emG = ex.createRadialGradient(cx, cy, 0, cx, cy, SIZE * 0.5);
    emG.addColorStop(0, 'rgba(255,255,255,0.55)');
    emG.addColorStop(1, 'rgba(0,0,0,0.3)');
    ex.fillStyle = emG;
    ex.beginPath(); ex.arc(cx, cy, SIZE * 0.5, 0, Math.PI * 2); ex.fill();

    for (let i = 0; i < 22; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist  = Math.random() * SIZE * 0.4;
      const px = cx + Math.cos(angle) * dist;
      const py = cy + Math.sin(angle) * dist;
      const r  = 4 + Math.random() * 9;
      const eg = ex.createRadialGradient(px, py, 0, px, py, r);
      eg.addColorStop(0, 'rgba(255,255,255,0.85)');
      eg.addColorStop(1, 'rgba(255,255,255,0)');
      ex.fillStyle = eg;
      ex.beginPath(); ex.arc(px, py, r, 0, Math.PI * 2); ex.fill();
    }

    const emissiveMap = colorTex(ec, false);

    // Normal map — bumpy alien surface
    const [nc, nmx] = canvas(SIZE, SIZE);
    nmx.fillStyle = '#8080ff';
    nmx.fillRect(0, 0, SIZE, SIZE);

    for (let i = 0; i < 22; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist  = Math.random() * SIZE * 0.42;
      const px = cx + Math.cos(angle) * dist;
      const py = cy + Math.sin(angle) * dist;
      const r  = 9 + Math.random() * 20;
      const ng = nmx.createRadialGradient(px, py, 0, px, py, r);
      ng.addColorStop(0,   'rgba(152,152,255,0.62)');
      ng.addColorStop(0.5, 'rgba(128,128,255,0.2)');
      ng.addColorStop(1,   'rgba(128,128,255,0)');
      nmx.fillStyle = ng;
      nmx.beginPath(); nmx.arc(px, py, r, 0, Math.PI * 2); nmx.fill();
    }

    const normalMap = colorTex(nc, false);

    _cache.cap = { map, emissiveMap, normalMap };
    return _cache.cap;
  }

  // ─── Mushroom Stem ───────────────────────────────────────────────────────────

  static mushroomStem() {
    if (_cache.stem) return _cache.stem;
    const [ac, ax] = canvas(256, 256);

    ax.fillStyle = '#ddd5be'; // pale organic cream
    ax.fillRect(0, 0, 256, 256);

    // Vertical striations — subtle fibrous texture
    for (let x = 0; x < 256; x += 2 + Math.floor(Math.random() * 4)) {
      const l = 170 + Math.floor(Math.random() * 18);
      ax.strokeStyle = `rgba(${l},${l - 8},${l - 18},0.32)`;
      ax.lineWidth = 1 + Math.random() * 0.8;
      ax.beginPath();
      let cx = x;
      ax.moveTo(cx, 0);
      for (let y = 0; y < 256; y += 16) {
        cx += (Math.random() - 0.5) * 2.5;
        ax.lineTo(cx, y);
      }
      ax.stroke();
    }

    // Edge shadow (cylinder sides appear darker)
    const edgeG = ax.createLinearGradient(0, 0, 256, 0);
    edgeG.addColorStop(0,    'rgba(0,0,0,0.38)');
    edgeG.addColorStop(0.12, 'rgba(0,0,0,0)');
    edgeG.addColorStop(0.88, 'rgba(0,0,0,0)');
    edgeG.addColorStop(1,    'rgba(0,0,0,0.38)');
    ax.fillStyle = edgeG;
    ax.fillRect(0, 0, 256, 256);

    const map = repeatTex(colorTex(ac), 1, 2);

    _cache.stem = { map };
    return _cache.stem;
  }

  // ─── Tree Bark ───────────────────────────────────────────────────────────────

  static treeBark() {
    if (_cache.bark) return _cache.bark;
    const W = 256, H = 512;

    // Albedo — very dark alien bark
    const [ac, ax] = canvas(W, H);
    ax.fillStyle = '#0d0a06';
    ax.fillRect(0, 0, W, H);

    // Vertical fiber lines
    for (let x = 0; x < W; ) {
      const step = 2 + Math.floor(Math.random() * 5);
      const l = 10 + Math.floor(Math.random() * 10);
      ax.strokeStyle = `rgba(${l + 4},${l},${l - 3},0.55)`;
      ax.lineWidth = 0.8 + Math.random() * 1.2;
      ax.beginPath();
      let cx = x;
      ax.moveTo(cx, 0);
      for (let y = 0; y < H; y += 18) {
        cx += (Math.random() - 0.5) * 3.5;
        ax.lineTo(cx, y);
      }
      ax.stroke();
      x += step;
    }

    // Horizontal cracks
    for (let i = 0; i < 7; i++) {
      const y = Math.random() * H;
      ax.strokeStyle = 'rgba(3,2,1,0.82)';
      ax.lineWidth = 1;
      ax.beginPath();
      ax.moveTo(0, y);
      for (let x = 0; x < W; x += 12) {
        ax.lineTo(x, y + (Math.random() - 0.5) * 5);
      }
      ax.stroke();
    }

    // Lichen/moss patches on bark (tiny bright spots)
    for (let i = 0; i < 10; i++) {
      const px = Math.random() * W, py = Math.random() * H;
      const r = 4 + Math.random() * 14;
      ax.fillStyle = 'rgba(14,20,9,0.55)';
      ax.beginPath(); ax.arc(px, py, r, 0, Math.PI * 2); ax.fill();
    }

    const map = repeatTex(colorTex(ac), 1, 3);

    // Normal map — fibers give horizontal ridges
    const [nc, nx] = canvas(W, H);
    nx.fillStyle = '#8080ff';
    nx.fillRect(0, 0, W, H);

    for (let x = 0; x < W; x += 4 + Math.floor(Math.random() * 6)) {
      const intensity = 10 + Math.floor(Math.random() * 22);
      nx.strokeStyle = `rgba(${128 + intensity},128,255,0.38)`;
      nx.lineWidth = 2;
      nx.beginPath(); nx.moveTo(x, 0); nx.lineTo(x, H); nx.stroke();
    }

    const normalMap = repeatTex(colorTex(nc, false), 1, 3);

    _cache.bark = { map, normalMap };
    return _cache.bark;
  }

  // ─── Infected Ground (Crystal Cavern) ──────────────────────────────────────

  static infectedGround() {
    if (_cache.infectedGround) return _cache.infectedGround;
    const SIZE = 512;

    // Albedo — near-black stone with glowing teal crack veins
    const [ac, ax] = canvas(SIZE, SIZE);
    ax.fillStyle = '#020404';
    ax.fillRect(0, 0, SIZE, SIZE);

    // Stone texture variation
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * SIZE, y = Math.random() * SIZE;
      const r = 15 + Math.random() * 45;
      const g = ax.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(12,10,14,0.45)');
      g.addColorStop(1, 'rgba(12,10,14,0)');
      ax.fillStyle = g;
      ax.beginPath(); ax.arc(x, y, r, 0, Math.PI * 2); ax.fill();
    }

    // Glowing teal infection cracks
    for (let i = 0; i < 28; i++) {
      let cx = Math.random() * SIZE, cy = Math.random() * SIZE;
      const v = 140 + Math.floor(Math.random() * 80);
      ax.strokeStyle = `rgba(0,${v},${Math.floor(v * 0.65)},0.72)`;
      ax.lineWidth = 0.8 + Math.random() * 2.2;
      ax.beginPath(); ax.moveTo(cx, cy);
      for (let s = 0; s < 5; s++) {
        cx += (Math.random() - 0.5) * 70;
        cy += (Math.random() - 0.5) * 70;
        ax.lineTo(cx, cy);
      }
      ax.stroke();
    }

    // Infection glow pools
    for (let i = 0; i < 18; i++) {
      const x = Math.random() * SIZE, y = Math.random() * SIZE;
      const r = 3 + Math.random() * 10;
      const g = ax.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(0,200,140,0.55)');
      g.addColorStop(1, 'rgba(0,200,140,0)');
      ax.fillStyle = g; ax.beginPath(); ax.arc(x, y, r, 0, Math.PI * 2); ax.fill();
    }

    const map = repeatTex(colorTex(ac), 10, 10);

    // Emissive map — cracks glow teal
    const [ec, ex] = canvas(SIZE, SIZE);
    ex.fillStyle = '#000000';
    ex.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 28; i++) {
      let cx = Math.random() * SIZE, cy = Math.random() * SIZE;
      ex.strokeStyle = 'rgba(0,210,150,0.7)';
      ex.lineWidth = 0.8 + Math.random() * 2;
      ex.beginPath(); ex.moveTo(cx, cy);
      for (let s = 0; s < 5; s++) {
        cx += (Math.random() - 0.5) * 70;
        cy += (Math.random() - 0.5) * 70;
        ex.lineTo(cx, cy);
      }
      ex.stroke();
    }
    const emissiveMap = repeatTex(colorTex(ec, false), 10, 10);

    // Normal map — cracked stone
    const [nc, nx] = canvas(SIZE, SIZE);
    nx.fillStyle = '#8080ff';
    nx.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * SIZE, y = Math.random() * SIZE;
      const r = 10 + Math.random() * 35;
      const g = nx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0,   'rgba(110,140,255,0.55)');
      g.addColorStop(0.5, 'rgba(128,128,255,0.15)');
      g.addColorStop(1,   'rgba(128,128,255,0)');
      nx.fillStyle = g; nx.beginPath(); nx.arc(x, y, r, 0, Math.PI * 2); nx.fill();
    }
    const normalMap = repeatTex(colorTex(nc, false), 10, 10);

    // Roughness map — mostly rough stone
    const [rc, rx] = canvas(SIZE, SIZE);
    rx.fillStyle = '#dddddd';
    rx.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 18; i++) {
      const x = Math.random() * SIZE, y = Math.random() * SIZE;
      const r = 5 + Math.random() * 20;
      rx.fillStyle = 'rgba(40,40,40,0.5)';
      rx.beginPath(); rx.arc(x, y, r, 0, Math.PI * 2); rx.fill();
    }
    const roughnessMap = repeatTex(colorTex(rc, false), 10, 10);

    _cache.infectedGround = { map, emissiveMap, normalMap, roughnessMap };
    return _cache.infectedGround;
  }

  // ─── Rusted Metal (Corrupt's Citadel floor) ──────────────────────────────

  static rustedMetal() {
    if (_cache.rustedMetal) return _cache.rustedMetal;
    const SIZE = 512;
    const PLATE = 80; // metal plate tile size in pixels

    // Albedo — dark gunmetal with rust patches and rivet grid
    const [ac, ax] = canvas(SIZE, SIZE);
    ax.fillStyle = '#0c0908';
    ax.fillRect(0, 0, SIZE, SIZE);

    // Plate seam grid (slightly lighter lines)
    ax.strokeStyle = 'rgba(28,20,15,0.9)';
    ax.lineWidth = 2;
    for (let x = 0; x < SIZE; x += PLATE) {
      ax.beginPath(); ax.moveTo(x, 0); ax.lineTo(x, SIZE); ax.stroke();
    }
    for (let y = 0; y < SIZE; y += PLATE) {
      ax.beginPath(); ax.moveTo(0, y); ax.lineTo(SIZE, y); ax.stroke();
    }

    // Rust stains (orange-brown patches)
    for (let i = 0; i < 38; i++) {
      const x = Math.random() * SIZE, y = Math.random() * SIZE;
      const r = 4 + Math.random() * 22;
      const rr = 58 + Math.floor(Math.random() * 28), gr = 18 + Math.floor(Math.random() * 12);
      const g = ax.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${rr},${gr},4,0.48)`);
      g.addColorStop(1, `rgba(${rr},${gr},4,0)`);
      ax.fillStyle = g;
      ax.beginPath(); ax.arc(x, y, r, 0, Math.PI * 2); ax.fill();
    }

    // Grime — dark blotches
    for (let i = 0; i < 24; i++) {
      const x = Math.random() * SIZE, y = Math.random() * SIZE;
      const r = 8 + Math.random() * 28;
      ax.fillStyle = 'rgba(0,0,0,0.32)';
      ax.beginPath(); ax.arc(x, y, r, 0, Math.PI * 2); ax.fill();
    }

    // Rivets at plate intersections
    for (let px = PLATE / 2; px < SIZE; px += PLATE) {
      for (let py = PLATE / 2; py < SIZE; py += PLATE) {
        ax.fillStyle = 'rgba(32,24,18,0.9)';
        ax.beginPath(); ax.arc(px, py, 3.5, 0, Math.PI * 2); ax.fill();
        ax.fillStyle = 'rgba(48,38,28,0.7)';
        ax.beginPath(); ax.arc(px - 0.8, py - 0.8, 1.5, 0, Math.PI * 2); ax.fill();
      }
    }

    const map = repeatTex(colorTex(ac), 10, 10);

    // Emissive map — heat seams glow faint red
    const [ec, ex] = canvas(SIZE, SIZE);
    ex.fillStyle = '#000000';
    ex.fillRect(0, 0, SIZE, SIZE);
    ex.strokeStyle = 'rgba(180,18,0,0.28)';
    ex.lineWidth = 3;
    for (let x = 0; x < SIZE; x += PLATE) {
      ex.beginPath(); ex.moveTo(x, 0); ex.lineTo(x, SIZE); ex.stroke();
    }
    for (let y = 0; y < SIZE; y += PLATE) {
      ex.beginPath(); ex.moveTo(0, y); ex.lineTo(SIZE, y); ex.stroke();
    }
    const emissiveMap = repeatTex(colorTex(ec, false), 10, 10);

    // Normal map — plate edges raised
    const [nc, nx] = canvas(SIZE, SIZE);
    nx.fillStyle = '#8080ff';
    nx.fillRect(0, 0, SIZE, SIZE);
    nx.strokeStyle = 'rgba(148,128,255,0.48)';
    nx.lineWidth = 2;
    for (let x = 0; x < SIZE; x += PLATE) {
      nx.beginPath(); nx.moveTo(x, 0); nx.lineTo(x, SIZE); nx.stroke();
    }
    for (let y = 0; y < SIZE; y += PLATE) {
      nx.beginPath(); nx.moveTo(0, y); nx.lineTo(SIZE, y); nx.stroke();
    }
    const normalMap = repeatTex(colorTex(nc, false), 10, 10);

    // Roughness — mostly rough, a few shinier plate centres
    const [rc, rx] = canvas(SIZE, SIZE);
    rx.fillStyle = '#bbbbbb';
    rx.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 18; i++) {
      const x = Math.random() * SIZE, y = Math.random() * SIZE;
      const r = 10 + Math.random() * 24;
      rx.fillStyle = 'rgba(65,65,65,0.42)';
      rx.beginPath(); rx.arc(x, y, r, 0, Math.PI * 2); rx.fill();
    }
    const roughnessMap = repeatTex(colorTex(rc, false), 10, 10);

    _cache.rustedMetal = { map, emissiveMap, normalMap, roughnessMap };
    return _cache.rustedMetal;
  }

  // ─── Alien Leaves ─────────────────────────────────────────────────────────

  static alienLeaves() {
    if (_cache.leaves) return _cache.leaves;
    const SIZE = 256;
    const cx = SIZE / 2, cy = SIZE / 2;

    const [ac, ax] = canvas(SIZE, SIZE);
    ax.fillStyle = '#ffffff'; // white → material color shows through
    ax.fillRect(0, 0, SIZE, SIZE);

    // Cell borders — random Voronoi-like pattern
    const pts = Array.from({ length: 14 }, () => [
      Math.random() * SIZE,
      Math.random() * SIZE,
    ]);

    ax.strokeStyle = 'rgba(0,0,0,0.32)';
    ax.lineWidth = 2.5;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[j][0] - pts[i][0];
        const dy = pts[j][1] - pts[i][1];
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < SIZE * 0.55) {
          const mx = (pts[i][0] + pts[j][0]) / 2;
          const my = (pts[i][1] + pts[j][1]) / 2;
          ax.beginPath();
          ax.arc(mx, my, d * 0.32, 0, Math.PI * 2);
          ax.stroke();
        }
      }
    }

    // Glowing veins radiating from centre
    ax.strokeStyle = 'rgba(255,255,255,0.55)';
    ax.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ax.beginPath();
      ax.moveTo(cx, cy);
      ax.quadraticCurveTo(
        cx + Math.cos(angle + 0.4) * SIZE * 0.25,
        cy + Math.sin(angle + 0.4) * SIZE * 0.25,
        cx + Math.cos(angle) * SIZE * 0.46,
        cy + Math.sin(angle) * SIZE * 0.46
      );
      ax.stroke();
    }

    // Edge darkness (leaves fade at edge)
    const fadeG = ax.createRadialGradient(cx, cy, SIZE * 0.25, cx, cy, SIZE * 0.52);
    fadeG.addColorStop(0, 'rgba(255,255,255,0)');
    fadeG.addColorStop(1, 'rgba(0,0,0,0.45)');
    ax.fillStyle = fadeG;
    ax.beginPath(); ax.arc(cx, cy, SIZE * 0.52, 0, Math.PI * 2); ax.fill();

    const map = colorTex(ac);

    _cache.leaves = { map };
    return _cache.leaves;
  }
}
