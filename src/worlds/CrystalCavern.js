import * as THREE from 'three';
import { TextureFactory } from '../utils/TextureFactory.js';

/**
 * CrystalCavern — World 1, Level 2
 * An underground infected cavern deep beneath the Garden Edge.
 * Bioluminescent crystal spires replace mushrooms; infected root arches span the
 * paths; a cave ceiling sits at y=14 with hanging stalactites. The teal crack
 * veins on the ground and denser acid pools make this level harder than Level 1.
 */
export class CrystalCavern {
  constructor(scene) {
    this.scene = scene;
    this.size = 56;
    this.colliders   = [];
    this.hazardPools = [];
    this._pulsingMaterials = [];
    this._pulsingLights    = [];
    this._sporePoints = null;
    this._sporeData   = null;
    this._lastElapsed = 0;
    this.group = new THREE.Group();
  }

  build() {
    this._gt = TextureFactory.infectedGround();

    this._buildGround();
    this._buildCaveCeiling();
    this._buildCaveWalls();
    this._buildCrystals();
    this._buildRootArches();
    this._buildHazardPools();
    this._buildGroundMist();
    this._buildDrips();
    this.scene.add(this.group);
  }

  dispose() {
    this.scene.remove(this.group);
  }

  update(elapsed) {
    const dt = elapsed - this._lastElapsed;
    this._lastElapsed = elapsed;

    for (const p of this._pulsingMaterials) {
      p.material.emissiveIntensity = p.base + Math.sin(elapsed * p.freq + p.phase) * p.amp;
    }
    for (const p of this._pulsingLights) {
      p.light.intensity = p.base + Math.sin(elapsed * p.freq + p.phase) * p.amp;
    }

    // Drip particles fall and wrap
    if (this._sporePoints && this._sporeData) {
      const pos = this._sporePoints.geometry.attributes.position;
      for (let i = 0; i < this._sporeData.length; i++) {
        const d = this._sporeData[i];
        pos.setY(i, pos.getY(i) - d.speed * dt);
        if (pos.getY(i) < 0.05) {
          pos.setX(i, (Math.random() - 0.5) * 44);
          pos.setY(i, 10 + Math.random() * 3);
          pos.setZ(i, (Math.random() - 0.5) * 44);
        }
      }
      pos.needsUpdate = true;
    }
  }

  // ─── Ground ────────────────────────────────────────────────────────────────

  _buildGround() {
    const gt = this._gt;
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: gt.map,
      normalMap: gt.normalMap,
      normalScale: new THREE.Vector2(1.8, 1.8),
      roughnessMap: gt.roughnessMap,
      emissiveMap: gt.emissiveMap,
      emissive: new THREE.Color(0x00ffaa),
      emissiveIntensity: 0.35,
      roughness: 0.95,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(this.size, this.size), mat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);
  }

  // ─── Cave ceiling ──────────────────────────────────────────────────────────

  _buildCaveCeiling() {
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x0a0808,
      roughness: 1.0,
      metalness: 0.0,
    });

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(70, 70, 6, 6), rockMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 14, 0);
    this.group.add(ceiling);

    // Stalactites hanging from ceiling
    const stalaPositions = [
      [0, 0], [8, -6], [-9, 5], [4, 14], [-12, -10],
      [18, 8], [-18, -4], [-6, 18], [6, -18], [14, -12],
      [20, -8], [-20, 4], [10, 20], [-10, -20], [0, -14],
      [16, 0], [-16, 0], [2, -8], [-4, 12], [12, 10],
      [-14, -2], [22, 14], [-22, -14],
    ];
    for (const [sx, sz] of stalaPositions) {
      const h = 1.4 + Math.random() * 3.2;
      const r = 0.1 + Math.random() * 0.28;
      const stala = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), rockMat);
      stala.rotation.z = Math.PI; // point down
      stala.position.set(sx, 14 - h / 2, sz);
      this.group.add(stala);
    }
  }

  // ─── Cave walls ────────────────────────────────────────────────────────────

  _buildCaveWalls() {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x060508,
      roughness: 1.0,
      metalness: 0.0,
      side: THREE.BackSide,
    });
    const walls = new THREE.Mesh(
      new THREE.CylinderGeometry(34, 36, 18, 28, 1, true),
      mat
    );
    walls.position.set(0, 8, 0);
    this.group.add(walls);
  }

  // ─── Crystal spires ────────────────────────────────────────────────────────

  _buildCrystals() {
    const largeDefs = [
      { x: 14,  z: 8,   h: 6.5, r: 0.55, color: 0x004444, emissive: 0x00ffcc },
      { x: -13, z: 10,  h: 5.5, r: 0.50, color: 0x002255, emissive: 0x0088ff },
      { x: 17,  z: -9,  h: 7.0, r: 0.60, color: 0x003322, emissive: 0x00ff88 },
      { x: -16, z: -13, h: 5.5, r: 0.48, color: 0x004444, emissive: 0x00ffcc },
      { x: 6,   z: 18,  h: 6.0, r: 0.52, color: 0x002244, emissive: 0x0099ff },
      { x: -20, z: 4,   h: 7.5, r: 0.65, color: 0x003322, emissive: 0x00ff88 },
      { x: 12,  z: -19, h: 5.5, r: 0.50, color: 0x004444, emissive: 0x00ffcc },
      { x: -7,  z: -21, h: 6.0, r: 0.55, color: 0x002255, emissive: 0x0077ee },
    ];
    for (const c of largeDefs) {
      this._addCrystal(c.x, c.z, c.h, c.r, c.color, c.emissive, true);
    }

    const medDefs = [
      { x: 8,   z: 12, h: 3.8, r: 0.32, color: 0x003333, emissive: 0x00ddbb },
      { x: -7,  z: 14, h: 3.2, r: 0.28, color: 0x002233, emissive: 0x0088cc },
      { x: 19,  z: 2,  h: 4.0, r: 0.35, color: 0x002233, emissive: 0x0099ee },
      { x: 9,   z:-11, h: 3.5, r: 0.30, color: 0x003333, emissive: 0x00ccaa },
      { x:-10,  z: -7, h: 3.8, r: 0.32, color: 0x003344, emissive: 0x0088ff },
      { x:-19,  z: -4, h: 3.2, r: 0.28, color: 0x003322, emissive: 0x00ff88 },
      { x: 21,  z:-14, h: 3.5, r: 0.30, color: 0x004444, emissive: 0x00ffcc },
      { x:-11,  z: 19, h: 3.8, r: 0.32, color: 0x002233, emissive: 0x0099ff },
      { x: 4,   z:-15, h: 4.0, r: 0.35, color: 0x003333, emissive: 0x00ddbb },
      { x: -4,  z: 7,  h: 3.0, r: 0.26, color: 0x003344, emissive: 0x0088ee },
      { x: 11,  z: 4,  h: 3.5, r: 0.30, color: 0x004444, emissive: 0x00ffcc },
      { x:-17,  z: 16, h: 3.8, r: 0.32, color: 0x003322, emissive: 0x00ee88 },
    ];
    for (const c of medDefs) {
      this._addCrystal(c.x, c.z, c.h, c.r, c.color, c.emissive, false);
    }

    // Small crystal clusters
    const clusterCentres = [
      [9, 7], [-8, 5], [5, -7], [-5, -5],
      [15, 0], [-15, 0], [0, 15], [0, -15],
      [13, 15], [-13, -11], [17, -11], [-19, 9],
    ];
    const spal = [
      { color: 0x004444, emissive: 0x00ffcc },
      { color: 0x002255, emissive: 0x0088ff },
      { color: 0x003322, emissive: 0x00ee88 },
    ];
    for (const [cx, cz] of clusterCentres) {
      const n = 2 + (Math.abs(Math.round(cx + cz)) % 3);
      for (let i = 0; i < n; i++) {
        const ox = (i % 2 === 0 ? 1 : -1) * (0.5 + i * 0.4);
        const oz = (i < 2 ? 1 : -1) * (0.3 + i * 0.35);
        const c = spal[i % 3];
        this._addCrystal(cx + ox, cz + oz, 1.0 + i * 0.3, 0.14 + i * 0.03, c.color, c.emissive, false);
      }
    }

    // Boundary ring
    const bCount = 26;
    for (let i = 0; i < bCount; i++) {
      const angle = (i / bCount) * Math.PI * 2;
      const r = 22 + ((i % 3) - 1) * 1.5;
      const bx = Math.cos(angle) * r, bz = Math.sin(angle) * r;
      const c = spal[i % 3];
      this._addCrystal(bx, bz, 3.5 + (i % 3) * 1.2, 0.36 + (i % 2) * 0.12, c.color, c.emissive, false);
    }
  }

  // ─── Root arches ───────────────────────────────────────────────────────────

  _buildRootArches() {
    const archDefs = [
      { x: 5,   z: 10,  aw: 5.0, ah: 3.5 },
      { x: -6,  z: 8,   aw: 4.5, ah: 3.0 },
      { x: 11,  z: -4,  aw: 5.5, ah: 4.0 },
      { x: -10, z: -5,  aw: 4.5, ah: 3.2 },
      { x: 19,  z: 12,  aw: 5.0, ah: 3.5 },
      { x: -17, z: 14,  aw: 5.5, ah: 4.0 },
      { x: 15,  z: -15, aw: 4.5, ah: 3.0 },
      { x: -15, z: -17, aw: 5.0, ah: 3.5 },
      { x: 23,  z: -3,  aw: 5.5, ah: 4.2 },
      { x: -23, z: -1,  aw: 5.0, ah: 3.8 },
    ];
    for (const a of archDefs) {
      this._addRootArch(a.x, a.z, a.ah, a.aw);
    }
  }

  // ─── Hazard pools ──────────────────────────────────────────────────────────

  _buildHazardPools() {
    const positions = [
      [15, 15], [-14, -17], [21, -3], [-19, 7], [3, -20], [-3, 21],
    ];
    for (const [px, pz] of positions) {
      this._addAcidPool(px, pz);
    }
  }

  // ─── Ground mist ──────────────────────────────────────────────────────────

  _buildGroundMist() {
    const mat = new THREE.MeshBasicMaterial({
      color: 0x003322,
      transparent: true,
      opacity: 0.09,
      depthWrite: false,
    });
    const positions = [
      [0, 0], [9, -4], [-8, 5], [5, 13], [-11, -9],
      [17, 7], [-17, -3], [-5, 17], [5, -17], [13, -11],
    ];
    for (const [mx, mz] of positions) {
      const r = 3.5 + Math.abs((mx + mz) % 4);
      const m = new THREE.Mesh(new THREE.CircleGeometry(r, 20), mat.clone());
      m.rotation.x = -Math.PI / 2;
      m.position.set(mx, 0.04, mz);
      this.group.add(m);
    }
  }

  // ─── Drip particles (fall from ceiling) ────────────────────────────────────

  _buildDrips() {
    const COUNT = 180;
    const positions = new Float32Array(COUNT * 3);
    const colors    = new Float32Array(COUNT * 3);
    this._sporeData  = [];

    const palette = [
      new THREE.Color(0x00ffaa),
      new THREE.Color(0x00ccff),
      new THREE.Color(0x44ffcc),
    ];

    for (let i = 0; i < COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 44;
      positions[i * 3 + 1] = Math.random() * 13;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 44;

      const c = palette[i % 3];
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      this._sporeData.push({ speed: 0.4 + Math.random() * 1.2 });
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

    this._sporePoints = new THREE.Points(geom, new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    this.group.add(this._sporePoints);
  }

  // ─── Crystal helper ────────────────────────────────────────────────────────

  _addCrystal(x, z, height, baseR, color, emissive, withLight) {
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: 1.4,
      roughness: 0.12,
      metalness: 0.85,
      transparent: true,
      opacity: 0.88,
    });

    // Central spike
    const spike = new THREE.Mesh(new THREE.ConeGeometry(baseR, height, 6), mat);
    spike.position.set(x, height / 2, z);
    spike.castShadow = true;
    this.group.add(spike);

    // 3 smaller satellite crystals
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const len = height * 0.42;
      const sat = new THREE.Mesh(new THREE.ConeGeometry(baseR * 0.32, len, 5), mat);
      sat.position.set(
        x + Math.cos(angle) * baseR * 0.9,
        len * 0.42,
        z + Math.sin(angle) * baseR * 0.9
      );
      sat.rotation.z = (Math.random() - 0.5) * 0.65;
      sat.rotation.x = (Math.random() - 0.5) * 0.3;
      this.group.add(sat);
    }

    if (withLight) {
      const light = new THREE.PointLight(emissive, 2.2, baseR * 11);
      light.position.set(x, height, z);
      this.group.add(light);
      const freq  = 1.3 + (Math.abs(x * z) % 10) * 0.1;
      const phase = Math.abs(x + z) % (Math.PI * 2);
      this._pulsingLights.push({ light, base: 2.2, freq, phase, amp: 0.6 });
    }

    const freq  = 1.1 + (Math.abs(x + z) % 10) * 0.08;
    const phase = Math.abs(x * z) % (Math.PI * 2);
    this._pulsingMaterials.push({ material: mat, base: 1.4, freq, phase, amp: 0.4 });

    this.colliders.push({ x, z, radius: Math.max(baseR * 1.1, 0.4) });
  }

  // ─── Root arch helper ──────────────────────────────────────────────────────

  _addRootArch(x, z, archH, archW) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1a0d2e,
      emissive: 0x330066,
      emissiveIntensity: 0.28,
      roughness: 0.92,
      metalness: 0.0,
    });

    const pts = [
      new THREE.Vector3(-archW / 2,  0.2,  0.1),
      new THREE.Vector3(-archW * 0.3, archH * 0.65, -0.25),
      new THREE.Vector3(0,            archH,          0.2),
      new THREE.Vector3(archW * 0.3,  archH * 0.65, -0.25),
      new THREE.Vector3(archW / 2,   0.2,  0.1),
    ];
    const curve  = new THREE.CatmullRomCurve3(pts);
    const tubeR  = 0.07 + archW * 0.018;
    const tube   = new THREE.Mesh(new THREE.TubeGeometry(curve, 14, tubeR, 7, false), mat);

    const rotY = Math.atan2(x, z) + Math.PI / 5;
    tube.rotation.y = rotY;
    tube.position.set(x, 0, z);
    this.group.add(tube);

    this.colliders.push({ x, z, radius: 0.35 });
  }

  // ─── Acid pool helper ─────────────────────────────────────────────────────

  _addAcidPool(x, z) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x001100,
      emissive: 0x00dd44,
      emissiveIntensity: 1.1,
      roughness: 0.1,
      metalness: 0.0,
      transparent: true,
      opacity: 0.88,
    });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(2.5, 32), mat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(x, 0.02, z);
    this.group.add(pool);

    // Bubble markers
    const bmat = new THREE.MeshStandardMaterial({
      color: 0x00ff55, emissive: 0x00ff55, emissiveIntensity: 2.5,
      transparent: true, opacity: 0.7,
    });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), bmat);
      b.position.set(x + Math.cos(a) * 1.0, 0.1 + i * 0.08, z + Math.sin(a) * 1.0);
      this.group.add(b);
    }

    const light = new THREE.PointLight(0x00ff55, 1.4, 9);
    light.position.set(x, 0.5, z);
    this.group.add(light);

    const freq  = 2.8 + (Math.abs(x + z) % 5) * 0.2;
    const phase = Math.abs(x * z) % (Math.PI * 2);
    this._pulsingLights.push({ light, base: 1.4, freq, phase, amp: 0.5 });
    this._pulsingMaterials.push({ material: mat, base: 1.1, freq, phase, amp: 0.35 });

    this.hazardPools.push({ x, z, radius: 2.5 });
  }
}
