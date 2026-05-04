import * as THREE from 'three';
import { TextureFactory } from '../utils/TextureFactory.js';

export class GardenEdge {
  constructor(scene) {
    this.scene = scene;
    this.size = 60;
    this.colliders  = [];
    this.hazardPools = [];
    this._pulsingMaterials = [];
    this._pulsingLights = [];
    this._sporePoints   = null;
    this._sporeData     = null;
    this._lastElapsed   = 0;
    this.group = new THREE.Group();
  }

  build() {
    // Generate PBR textures once (cached module-level, safe to call repeatedly)
    this._groundTex = TextureFactory.mossyGround();
    this._capTex    = TextureFactory.mushroomCap();
    this._stemTex   = TextureFactory.mushroomStem();
    this._barkTex   = TextureFactory.treeBark();
    this._leafTex   = TextureFactory.alienLeaves();

    this._buildGround();
    this._buildSky();
    this._buildInterior();
    this._buildBoundary();
    this._buildGroundMist();
    this._buildSpores();
    this.scene.add(this.group);
  }

  dispose() {
    this.scene.remove(this.group);
  }

  update(elapsed) {
    const dt = elapsed - this._lastElapsed;
    this._lastElapsed = elapsed;

    for (const p of this._pulsingMaterials) {
      p.material.emissiveIntensity = p.baseIntensity + Math.sin(elapsed * p.frequency + p.phase) * 0.35;
    }
    for (const p of this._pulsingLights) {
      p.light.intensity = p.baseIntensity + Math.sin(elapsed * p.frequency + p.phase) * 0.5;
    }

    // Drift spores upward and wrap
    if (this._sporePoints && this._sporeData) {
      const pos = this._sporePoints.geometry.attributes.position;
      for (let i = 0; i < this._sporeData.length; i++) {
        const s = this._sporeData[i];
        s.vy = Math.min(s.vy + dt * 0.04, 0.3 + s.drift);
        s.vx  = Math.sin(elapsed * s.wobble + s.phase) * 0.08;
        s.vz  = Math.cos(elapsed * s.wobble + s.phase * 1.3) * 0.08;
        pos.setX(i, pos.getX(i) + s.vx * dt);
        pos.setY(i, pos.getY(i) + s.vy * dt);
        pos.setZ(i, pos.getZ(i) + s.vz * dt);
        // Wrap when above 10 units; reset near ground
        if (pos.getY(i) > 10) {
          const ax = (Math.random() - 0.5) * 48;
          const az = (Math.random() - 0.5) * 48;
          pos.setX(i, ax);
          pos.setY(i, 0.05 + Math.random() * 0.5);
          pos.setZ(i, az);
          s.vy = 0.02 + Math.random() * 0.08;
        }
      }
      pos.needsUpdate = true;
    }
  }

  // ─── Ground ────────────────────────────────────────────────────────────────

  _buildGround() {
    const gt = this._groundTex;
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,          // white so albedo texture drives the colour
      map: gt.map,
      normalMap: gt.normalMap,
      normalScale: new THREE.Vector2(1.2, 1.2),
      roughnessMap: gt.roughnessMap,
      roughness: 1.0,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(this.size, this.size),
      groundMat
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);
  }

  // ─── Sky + Moons ───────────────────────────────────────────────────────────

  _buildSky() {
    const skyGeom = new THREE.SphereGeometry(250, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor:    { value: new THREE.Color(0x050010) },
        midColor:    { value: new THREE.Color(0x1a0035) },
        bottomColor: { value: new THREE.Color(0x6b0f4a) },
      },
      vertexShader: `
        varying float vY;
        void main() {
          vY = normalize(position).y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 bottomColor;
        varying float vY;
        void main() {
          float t = clamp(vY, 0.0, 1.0);
          vec3 col = mix(bottomColor, midColor, smoothstep(0.0, 0.25, t));
          col = mix(col, topColor, smoothstep(0.25, 1.0, t));
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    this.group.add(new THREE.Mesh(skyGeom, skyMat));

    // Moon 1 — large, pale blue-white, high
    const moon1 = new THREE.Mesh(
      new THREE.SphereGeometry(14, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0xdde8ff })
    );
    moon1.position.set(120, 90, -180);
    this.group.add(moon1);

    // Moon 1 halo
    const halo1 = new THREE.Mesh(
      new THREE.SphereGeometry(20, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0x8899ff, transparent: true, opacity: 0.07 })
    );
    halo1.position.copy(moon1.position);
    this.group.add(halo1);

    // Moon 2 — smaller, warm cream, lower on horizon
    const moon2 = new THREE.Mesh(
      new THREE.SphereGeometry(8, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff0cc })
    );
    moon2.position.set(-140, 45, -150);
    this.group.add(moon2);
  }

  // ─── Interior: mushrooms, trees, hazard pools ──────────────────────────────

  _buildInterior() {
    // Large mushrooms with dedicated point lights
    const largeDefs = [
      { x: 15,  z: 10,  stemH: 4.0, capR: 1.8, color: 0xcc0066, emissive: 0xff0088 },
      { x: -14, z: 12,  stemH: 3.5, capR: 1.5, color: 0x0066aa, emissive: 0x0099ee },
      { x: 18,  z: -8,  stemH: 4.5, capR: 2.0, color: 0x6600bb, emissive: 0x9900ff },
      { x: -17, z: -14, stemH: 3.5, capR: 1.6, color: 0xcc0066, emissive: 0xff0088 },
      { x: 7,   z: 20,  stemH: 4.2, capR: 1.7, color: 0x0066aa, emissive: 0x00aacc },
      { x: -22, z: 5,   stemH: 5.0, capR: 2.2, color: 0x6600bb, emissive: 0x9900ff },
      { x: 14,  z: -20, stemH: 3.5, capR: 1.5, color: 0xaa0055, emissive: 0xff0077 },
      { x: -8,  z: -22, stemH: 4.0, capR: 1.8, color: 0x6600bb, emissive: 0x8800ee },
    ];
    for (const m of largeDefs) {
      this._addMushroom(m.x, m.z, m.stemH, m.capR, m.color, m.emissive, true);
    }

    // Medium mushrooms
    const medDefs = [
      { x: 8,   z: 14,  stemH: 2.5, capR: 1.0, color: 0xff44aa, emissive: 0xff2288 },
      { x: -6,  z: 16,  stemH: 2.0, capR: 0.9, color: 0x00ffcc, emissive: 0x00ddaa },
      { x: 20,  z: 4,   stemH: 2.8, capR: 1.1, color: 0xff44aa, emissive: 0xff2266 },
      { x: 10,  z: -12, stemH: 2.2, capR: 0.9, color: 0x00ffcc, emissive: 0x00bbaa },
      { x: -10, z: -8,  stemH: 2.5, capR: 1.0, color: 0xff44aa, emissive: 0xff2288 },
      { x: -20, z: -5,  stemH: 2.0, capR: 0.9, color: 0x00ffcc, emissive: 0x00ddaa },
      { x: 22,  z: -16, stemH: 2.5, capR: 1.0, color: 0xaa44ff, emissive: 0x8822dd },
      { x: -12, z: 20,  stemH: 2.2, capR: 0.9, color: 0xaa44ff, emissive: 0x8822dd },
      { x: 4,   z: -16, stemH: 2.8, capR: 1.1, color: 0xff44aa, emissive: 0xff2266 },
      { x: -4,  z: 8,   stemH: 2.0, capR: 0.8, color: 0x00ffcc, emissive: 0x00ddaa },
      { x: 12,  z: 6,   stemH: 2.2, capR: 0.9, color: 0xaa44ff, emissive: 0x8822dd },
      { x: -18, z: 18,  stemH: 2.5, capR: 1.0, color: 0xff44aa, emissive: 0xff2288 },
    ];
    for (const m of medDefs) {
      this._addMushroom(m.x, m.z, m.stemH, m.capR, m.color, m.emissive, false);
    }

    // Small mushroom clusters — grouped in loose rings
    const clusterDefs = [
      [10, 8], [-8, 6], [6, -8], [-6, -6],
      [16, 2], [-16, 2], [2, 16], [2, -16],
      [14, 16], [-14, -12], [18, -12], [-20, 10],
    ];
    const smallPalette = [
      { color: 0xff00cc, emissive: 0xee0099 },
      { color: 0x00ffaa, emissive: 0x00cc88 },
      { color: 0xaa00ff, emissive: 0x8800cc },
    ];
    for (const [cx, cz] of clusterDefs) {
      const count = 2 + (Math.abs(Math.round(cx * cz)) % 3);
      for (let i = 0; i < count; i++) {
        const ox = (i % 2 === 0 ? 1 : -1) * (0.5 + i * 0.4);
        const oz = (i < 2 ? 1 : -1) * (0.3 + i * 0.35);
        const c = smallPalette[i % smallPalette.length];
        const stemH = 0.6 + i * 0.2;
        const capR  = 0.38 + i * 0.05;
        this._addMushroom(cx + ox, cz + oz, stemH, capR, c.color, c.emissive, false);
      }
    }

    // Alien trees
    const treeDefs = [
      { x: 4,   z: 12,  h: 5.5, ci: 0 },
      { x: -5,  z: 10,  h: 4.5, ci: 1 },
      { x: 12,  z: -5,  h: 6.0, ci: 2 },
      { x: -11, z: -6,  h: 5.0, ci: 0 },
      { x: 20,  z: 14,  h: 5.5, ci: 1 },
      { x: -18, z: 16,  h: 6.0, ci: 2 },
      { x: 16,  z: -16, h: 5.0, ci: 0 },
      { x: -16, z: -18, h: 4.5, ci: 1 },
      { x: 24,  z: -4,  h: 5.5, ci: 2 },
      { x: -24, z: -2,  h: 5.0, ci: 0 },
      { x: 2,   z: -20, h: 6.0, ci: 1 },
      { x: 0,   z: 24,  h: 5.5, ci: 2 },
    ];
    const leafPalette = [
      { color: 0x00ff88, emissive: 0x00cc66 },
      { color: 0x44ffcc, emissive: 0x22ddaa },
      { color: 0x88ff44, emissive: 0x55cc22 },
    ];
    for (const t of treeDefs) {
      const lc = leafPalette[t.ci];
      this._addTree(t.x, t.z, t.h, lc.color, lc.emissive);
    }

    // Hazard pools (visual only — damage logic is a later feature)
    for (const [px, pz] of [[16, 16], [-15, -18], [22, -4], [-20, 8]]) {
      this._addHazardPool(px, pz);
    }
  }

  // ─── Boundary ring of mushrooms + trees ────────────────────────────────────

  _buildBoundary() {
    const count = 28;
    const leafPalette = [
      { color: 0x00ff88, emissive: 0x00cc66 },
      { color: 0x44ffcc, emissive: 0x22ddaa },
      { color: 0x88ff44, emissive: 0x55cc22 },
    ];
    const mushroomPalette = [
      { color: 0xcc0066, emissive: 0xff0088 },
      { color: 0x6600bb, emissive: 0x9900ff },
      { color: 0x0066aa, emissive: 0x0099ee },
    ];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = 25 + ((i % 3) - 1) * 1.5;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const colorIdx = Math.abs(Math.round(x / 3 + z / 2)) % 3;

      if (i % 3 === 0) {
        const mc = mushroomPalette[colorIdx];
        this._addMushroom(x, z, 4 + (i % 2), 1.5 + (i % 2) * 0.3, mc.color, mc.emissive, false);
      } else {
        const lc = leafPalette[colorIdx];
        this._addTree(x, z, 5 + (i % 3), lc.color, lc.emissive);
      }
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  _addMushroom(x, z, stemH, capR, capColor, emissiveColor, withLight) {
    const st = this._stemTex;
    const stemMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: st.map,
      roughness: 0.88,
      metalness: 0.03,
    });
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(capR * 0.18, capR * 0.28, stemH, 10),
      stemMat
    );
    stem.position.set(x, stemH / 2, z);
    stem.castShadow = true;
    this.group.add(stem);

    const ct = this._capTex;
    const capMat = new THREE.MeshStandardMaterial({
      color: capColor,
      map: ct.map,
      emissive: emissiveColor,
      emissiveMap: ct.emissiveMap,
      emissiveIntensity: 1.2,
      normalMap: ct.normalMap,
      normalScale: new THREE.Vector2(0.9, 0.9),
      roughness: 0.55,
      metalness: 0.0,
    });
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(capR, 16, 12),
      capMat
    );
    cap.scale.y = 0.38;
    cap.position.set(x, stemH + capR * 0.25, z);
    cap.castShadow = true;
    this.group.add(cap);

    if (withLight) {
      const light = new THREE.PointLight(emissiveColor, 1.8, capR * 7);
      light.position.set(x, stemH - 0.5, z);
      this.group.add(light);
      // Use position-derived values for deterministic variety
      const freq = 1.2 + (Math.abs(x * z) % 10) * 0.1;
      const phase = Math.abs(x + z) % (Math.PI * 2);
      this._pulsingLights.push({ light, baseIntensity: 1.8, frequency: freq, phase });
    }

    const freq = 1.0 + (Math.abs(x + z) % 10) * 0.08;
    const phase = Math.abs(x * z) % (Math.PI * 2);
    this._pulsingMaterials.push({ material: capMat, baseIntensity: 1.2, frequency: freq, phase });

    this.colliders.push({ x, z, radius: Math.max(capR * 0.7, 0.4) });
  }

  _addTree(x, z, height, leafColor, leafEmissive) {
    const bt = this._barkTex;
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: bt.map,
      normalMap: bt.normalMap,
      normalScale: new THREE.Vector2(2.2, 2.2),
      roughness: 0.95,
      metalness: 0.0,
    });

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.28, height, 8),
      trunkMat
    );
    trunk.position.set(x, height / 2, z);
    trunk.castShadow = true;
    this.group.add(trunk);

    // Angled branch — lean direction based on x sign for variety
    const branchLen = height * 0.4;
    const lean = x >= 0 ? 1 : -1;
    const branch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.12, branchLen, 6),
      trunkMat
    );
    branch.rotation.z = lean * Math.PI * 0.22;
    branch.position.set(x + lean * branchLen * 0.18, height * 0.72, z);
    this.group.add(branch);

    const lt = this._leafTex;
    const leafMat = new THREE.MeshStandardMaterial({
      color: leafColor,
      map: lt.map,
      emissive: leafEmissive,
      emissiveIntensity: 0.9,
      roughness: 0.78,
    });

    // Main top cluster
    const topLeaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 0), leafMat);
    topLeaves.position.set(x, height + 0.6, z);
    topLeaves.castShadow = true;
    this.group.add(topLeaves);

    // Smaller cluster on branch tip
    const branchLeaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), leafMat);
    branchLeaves.position.set(
      x + lean * branchLen * 0.38,
      height * 0.72 + branchLen * 0.18,
      z
    );
    this.group.add(branchLeaves);

    const freq = 0.7 + (Math.abs(x + z) % 10) * 0.06;
    const phase = Math.abs(x * z) % (Math.PI * 2);
    this._pulsingMaterials.push({ material: leafMat, baseIntensity: 0.9, frequency: freq, phase });

    this.colliders.push({ x, z, radius: 0.45 });
  }

  _addHazardPool(x, z) {
    const poolMat = new THREE.MeshStandardMaterial({
      color: 0x002200,
      emissive: 0x00bb33,
      emissiveIntensity: 0.9,
      roughness: 0.15,
      metalness: 0.0,
      transparent: true,
      opacity: 0.85,
    });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(x, 0.02, z);
    this.group.add(pool);

    // Static bubble markers
    const bubbleMat = new THREE.MeshStandardMaterial({
      color: 0x00ff44, emissive: 0x00ff44, emissiveIntensity: 2,
      transparent: true, opacity: 0.7,
    });
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), bubbleMat);
      bubble.position.set(x + Math.cos(angle) * 0.9, 0.1 + i * 0.1, z + Math.sin(angle) * 0.9);
      this.group.add(bubble);
    }

    const light = new THREE.PointLight(0x00ff44, 1.2, 8);
    light.position.set(x, 0.5, z);
    this.group.add(light);

    const freq = 2.5 + (Math.abs(x + z) % 5) * 0.2;
    const phase = Math.abs(x * z) % (Math.PI * 2);
    this._pulsingLights.push({ light, baseIntensity: 1.2, frequency: freq, phase });
    this._pulsingMaterials.push({ material: poolMat, baseIntensity: 0.9, frequency: freq, phase });

    // Register for Game.js hazard damage checks
    this.hazardPools.push({ x, z, radius: 2.2 });
  }

  // ─── Ground mist patches ────────────────────────────────────────────────────

  _buildGroundMist() {
    const mistMat = new THREE.MeshBasicMaterial({
      color: 0x9933cc,
      transparent: true,
      opacity: 0.07,
      depthWrite: false,
    });
    const mistPositions = [
      [0, 0], [8, -5], [-9, 4], [4, 14], [-12, -10],
      [18, 8], [-18, -4], [-6, 18], [6, -18], [14, -12],
    ];
    for (const [mx, mz] of mistPositions) {
      const r = 3 + Math.abs((mx + mz) % 4);
      const mist = new THREE.Mesh(new THREE.CircleGeometry(r, 24), mistMat.clone());
      mist.rotation.x = -Math.PI / 2;
      mist.position.set(mx, 0.05, mz);
      this.group.add(mist);
    }
  }

  // ─── Floating bioluminescent spores ─────────────────────────────────────────

  _buildSpores() {
    const COUNT = 220;
    const positions = new Float32Array(COUNT * 3);
    const colors    = new Float32Array(COUNT * 3);
    this._sporeData  = [];

    const palette = [
      new THREE.Color(0x00ffaa),
      new THREE.Color(0xcc44ff),
      new THREE.Color(0xff44cc),
      new THREE.Color(0x44ffcc),
    ];

    for (let i = 0; i < COUNT; i++) {
      const x = (Math.random() - 0.5) * 48;
      const y = Math.random() * 9;
      const z = (Math.random() - 0.5) * 48;
      positions[i * 3]     = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const c = palette[i % palette.length];
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      this._sporeData.push({
        vy:     0.02 + Math.random() * 0.08,
        vx: 0, vz: 0,
        drift:  Math.random() * 0.12,
        wobble: 0.4 + Math.random() * 0.8,
        phase:  Math.random() * Math.PI * 2,
      });
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this._sporePoints = new THREE.Points(geom, mat);
    this.group.add(this._sporePoints);
  }
}
