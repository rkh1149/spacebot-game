import * as THREE from 'three';
import { TextureFactory } from '../utils/TextureFactory.js';

/**
 * CorruptCitadel — World 3
 * Final world. Dark industrial fortress on a dying planet.
 * Broken machinery, red circuit seams, electrical hazards, stormy crimson sky,
 * falling embers, and lightning flashes overhead.
 */
export class CorruptCitadel {
  constructor(scene) {
    this.scene = scene;
    this.size = 56;
    this.colliders   = [];
    this.hazardPools = [];
    this._pulsingMaterials   = [];
    this._pulsingLights      = [];
    this._emberPoints = null;
    this._emberData   = null;
    this._lastElapsed = 0;
    this._lightningCountdown = 3 + Math.random() * 5;
    this._lightningLight = null;
    this.group = new THREE.Group();
  }

  build() {
    this._gt = TextureFactory.rustedMetal();
    this._buildGround();
    this._buildSky();
    this._buildMachinery();
    this._buildCircuitPanels();
    this._buildHazardPuddles();
    this._buildEmbers();
    this._buildBoundary();
    this._buildLightning();
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
      p.light.intensity = p.base + Math.abs(Math.sin(elapsed * p.freq + p.phase)) * p.amp;
    }

    // Embers drift downward and respawn at origin height
    if (this._emberPoints && this._emberData) {
      const pos = this._emberPoints.geometry.attributes.position;
      for (let i = 0; i < this._emberData.length; i++) {
        const d = this._emberData[i];
        d.y -= d.speed * dt;
        d.x += Math.sin(elapsed * 1.4 + d.phase) * 0.007;
        if (d.y < 0.05) {
          d.y  = d.originY;
          d.x  = d.originX + (Math.random() - 0.5) * 2;
        }
        pos.setXYZ(i, d.x, d.y, d.z);
      }
      pos.needsUpdate = true;
    }

    // Lightning flash
    if (this._lightningLight) {
      this._lightningCountdown -= dt;
      if (this._lightningCountdown <= 0) {
        this._lightningCountdown = 4 + Math.random() * 7;
        this._lightningLight.intensity = 14;
        setTimeout(() => { if (this._lightningLight) this._lightningLight.intensity = 0; }, 110);
      }
    }
  }

  // ─── Ground ────────────────────────────────────────────────────────────────

  _buildGround() {
    const gt = this._gt;
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map:          gt.map,
      normalMap:    gt.normalMap,
      normalScale:  new THREE.Vector2(1.5, 1.5),
      roughnessMap: gt.roughnessMap,
      roughness: 1.0,
      metalness: 0.6,
      emissiveMap:  gt.emissiveMap,
      emissive:     new THREE.Color(0xff1100),
      emissiveIntensity: 0.18,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(this.size, this.size), mat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);
  }

  // ─── Sky + dying red star ──────────────────────────────────────────────────

  _buildSky() {
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor:    { value: new THREE.Color(0x020000) },
        midColor:    { value: new THREE.Color(0x170300) },
        bottomColor: { value: new THREE.Color(0x3a0800) },
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
    this.group.add(new THREE.Mesh(new THREE.SphereGeometry(250, 32, 16), skyMat));

    // Heavy low storm clouds
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0x070202, roughness: 1, metalness: 0 });
    for (let i = 0; i < 16; i++) {
      const cloud = new THREE.Mesh(
        new THREE.SphereGeometry(8 + Math.random() * 16, 8, 4),
        cloudMat
      );
      cloud.scale.y = 0.10;
      cloud.position.set(
        (Math.random() - 0.5) * 280,
        38 + Math.random() * 26,
        (Math.random() - 0.5) * 280
      );
      this.group.add(cloud);
    }

    // Dying red star on horizon
    const star = new THREE.Mesh(
      new THREE.SphereGeometry(11, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xff2200 })
    );
    star.position.set(90, 62, -165);
    this.group.add(star);

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(21, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xff1100, transparent: true, opacity: 0.05 })
    );
    halo.position.copy(star.position);
    this.group.add(halo);
  }

  // ─── Machinery: towers, beams, broken pipes ────────────────────────────────

  _buildMachinery() {
    const rustMat    = new THREE.MeshStandardMaterial({ color: 0x3a1a08, roughness: 0.94, metalness: 0.45 });
    const darkMat    = new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 0.65, metalness: 0.85 });
    const redBandMat = new THREE.MeshStandardMaterial({
      color: 0xff2200, emissive: 0xff1100, emissiveIntensity: 1.6, roughness: 0.5
    });

    // Rusted towers
    const towers = [
      { x: -18, z: -12, h: 9.0, r: 1.3, tilt:  0.07 },
      { x:  20, z:  15, h: 11.0, r: 1.0, tilt: -0.04 },
      { x:  -8, z:  20, h: 7.0, r: 1.5, tilt:  0.09 },
      { x:  17, z:  -9, h: 9.5, r: 1.1, tilt: -0.05 },
      { x: -22, z:   9, h: 8.0, r: 1.2, tilt:  0.04 },
      { x:  22, z:  -5, h: 6.5, r: 0.9, tilt:  0.06 },
      { x:   4, z: -22, h: 8.5, r: 1.0, tilt: -0.03 },
    ];

    for (const t of towers) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(t.r * 0.75, t.r, t.h, 10), rustMat);
      tower.position.set(t.x, t.h / 2, t.z);
      tower.rotation.z = t.tilt;
      tower.castShadow = true;
      this.group.add(tower);
      this.colliders.push({ x: t.x, z: t.z, radius: t.r + 0.5 });

      // Red warning band ring
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(t.r * 0.85, 0.1, 6, 18), redBandMat.clone()
      );
      band.position.set(t.x, t.h * 0.62, t.z);
      band.rotation.x = Math.PI / 2;
      this.group.add(band);
      this._pulsingMaterials.push({
        material: band.material,
        base: 1.6, freq: 1.4 + Math.random(), phase: Math.random() * Math.PI * 2, amp: 0.9,
      });

      // Jagged broken cap
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(t.r * 0.4, t.r * 0.75, 0.5, 8), darkMat
      );
      cap.position.set(t.x + Math.sin(t.tilt) * t.h * 0.5, t.h + 0.2, t.z);
      this.group.add(cap);

      // Red glow at base
      const light = new THREE.PointLight(0xff2200, 0.5, 8);
      light.position.set(t.x, 1.0, t.z);
      this.group.add(light);
      this._pulsingLights.push({
        light, base: 0.3, freq: 1.1 + Math.random(), phase: Math.random() * Math.PI * 2, amp: 0.4,
      });
    }

    // Broken I-beams at varying heights
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x1c1208, roughness: 0.9, metalness: 0.72 });
    const beams = [
      { x:  4, z: -10, ry: 0.4,  len: 7, h: 2.0 },
      { x: -9, z:   6, ry: -0.7, len: 5, h: 2.6 },
      { x: 12, z:   9, ry:  1.2, len: 6, h: 1.9 },
      { x: -4, z: -16, ry:  0.1, len: 8, h: 3.1 },
    ];
    for (const b of beams) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(b.len, 0.45, 0.45), beamMat);
      beam.position.set(b.x, b.h, b.z);
      beam.rotation.y = b.ry;
      beam.rotation.z = (Math.random() - 0.5) * 0.35;
      beam.castShadow = true;
      this.group.add(beam);
    }

    // Broken pipes with fire vents
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x20202e, roughness: 0.8, metalness: 0.75 });
    const fireMat = new THREE.MeshStandardMaterial({
      color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.2,
      transparent: true, opacity: 0.55,
    });
    const pipes = [
      { x:  15, z:  17, ry: 0.6 },
      { x: -16, z: -19, ry: 1.3 },
      { x: -21, z:  17, ry: -0.2 },
      { x:  19, z: -21, ry: 1.0 },
    ];
    for (const p of pipes) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 5.5, 10), pipeMat);
      pipe.position.set(p.x, 1.0, p.z);
      pipe.rotation.z = Math.PI / 2;
      pipe.rotation.y = p.ry;
      pipe.castShadow = true;
      this.group.add(pipe);

      const endX = p.x + Math.cos(p.ry) * 2.6;
      const endZ = p.z + Math.sin(p.ry) * 2.6;
      const fire = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 8), fireMat.clone());
      fire.position.set(endX, 1.6, endZ);
      this.group.add(fire);
      this._pulsingMaterials.push({
        material: fire.material, base: 1.0, freq: 4 + Math.random() * 2, phase: Math.random() * Math.PI * 2, amp: 0.6,
      });

      const fLight = new THREE.PointLight(0xff2200, 1.0, 5);
      fLight.position.set(endX, 2.0, endZ);
      this.group.add(fLight);
      this._pulsingLights.push({
        light: fLight, base: 0.6, freq: 4 + Math.random() * 2, phase: Math.random() * Math.PI * 2, amp: 0.6,
      });
    }
  }

  // ─── Circuit floor panels ───────────────────────────────────────────────────

  _buildCircuitPanels() {
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x0c0c14, roughness: 0.55, metalness: 0.92 });
    const traceMat = new THREE.LineBasicMaterial({ color: 0xff3300 });

    const panels = [
      { x:  0, z:  0  },
      { x:  9, z: -7  },
      { x: -9, z:  7  },
      { x:  7, z: 13  },
      { x: -7, z: -12 },
    ];

    for (const p of panels) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(5, 0.1, 5), panelMat);
      panel.position.set(p.x, 0.05, p.z);
      panel.receiveShadow = true;
      this.group.add(panel);

      // Right-angle circuit trace walk on panel surface
      let cx = p.x, cz = p.z;
      const pts = [new THREE.Vector3(cx, 0.08, cz)];
      for (let s = 0; s < 12; s++) {
        const dir  = Math.floor(Math.random() * 4);
        const step = 0.5 + Math.random() * 1.0;
        const nx = cx + (dir === 0 ? step : dir === 1 ? -step : 0);
        const nz = cz + (dir === 2 ? step : dir === 3 ? -step : 0);
        cx = Math.max(p.x - 2.2, Math.min(p.x + 2.2, nx));
        cz = Math.max(p.z - 2.2, Math.min(p.z + 2.2, nz));
        pts.push(new THREE.Vector3(cx, 0.08, cz));
      }
      this.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), traceMat));

      const light = new THREE.PointLight(0xff2200, 0.9, 7);
      light.position.set(p.x, 1.2, p.z);
      this.group.add(light);
      this._pulsingLights.push({
        light, base: 0.5, freq: 1.0 + Math.random(), phase: Math.random() * Math.PI * 2, amp: 0.5,
      });
    }
  }

  // ─── Electrical hazard puddles ──────────────────────────────────────────────

  _buildHazardPuddles() {
    const puddles = [
      { x: -11, z:  13, r: 2.0 },
      { x:  13, z: -15, r: 1.8 },
      { x: -15, z:  -7, r: 2.2 },
      { x:   8, z:  -3, r: 1.6 },
      { x:  -4, z:  -6, r: 1.5 },
      { x:  10, z:  -9, r: 1.7 },
    ];

    for (const p of puddles) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.3,
        transparent: true, opacity: 0.5, roughness: 0.3,
      });
      const mesh = new THREE.Mesh(new THREE.CircleGeometry(p.r, 22), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(p.x, 0.02, p.z);
      this.group.add(mesh);
      this._pulsingMaterials.push({
        material: mat, base: 1.3, freq: 1.8 + Math.random(), phase: Math.random() * Math.PI * 2, amp: 0.7,
      });

      const light = new THREE.PointLight(0xff2200, 0.7, p.r * 3.5);
      light.position.set(p.x, 0.3, p.z);
      this.group.add(light);
      this._pulsingLights.push({
        light, base: 0.4, freq: 1.8 + Math.random(), phase: Math.random() * Math.PI * 2, amp: 0.4,
      });

      this.hazardPools.push({ x: p.x, z: p.z, radius: p.r });
    }
  }

  // ─── Falling ember particles ────────────────────────────────────────────────

  _buildEmbers() {
    const COUNT = 200;
    const positions = new Float32Array(COUNT * 3);
    const colors    = new Float32Array(COUNT * 3);
    this._emberData = [];

    const palette = [
      new THREE.Color(0xff4400),
      new THREE.Color(0xff8800),
      new THREE.Color(0xffcc00),
      new THREE.Color(0xff2200),
    ];

    for (let i = 0; i < COUNT; i++) {
      const x = (Math.random() - 0.5) * 48;
      const y = Math.random() * 10;
      const z = (Math.random() - 0.5) * 48;
      positions[i * 3]     = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const c = palette[i % palette.length];
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      this._emberData.push({
        x, y, z,
        originX: x, originY: y,
        speed: 0.4 + Math.random() * 1.0,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors,    3));

    const mat = new THREE.PointsMaterial({
      size: 0.09,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this._emberPoints = new THREE.Points(geo, mat);
    this.group.add(this._emberPoints);
  }

  // ─── Industrial boundary walls + beacons ───────────────────────────────────

  _buildBoundary() {
    const wallMat   = new THREE.MeshStandardMaterial({ color: 0x110908, roughness: 0.9, metalness: 0.55 });
    const beaconMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.8 });
    const stripMat  = new THREE.MeshStandardMaterial({ color: 0xff1100, emissive: 0xff0800, emissiveIntensity: 1.0, roughness: 0.5 });
    const half = this.size / 2;

    for (let side = 0; side < 4; side++) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(this.size + 2, 7, 1.2), wallMat);
      switch (side) {
        case 0: wall.position.set(0, 3.5, -half); break;
        case 1: wall.position.set(0, 3.5,  half); break;
        case 2: wall.position.set(-half, 3.5, 0); wall.rotation.y = Math.PI / 2; break;
        case 3: wall.position.set( half, 3.5, 0); wall.rotation.y = Math.PI / 2; break;
      }
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.group.add(wall);
    }

    // Red warning light strips along wall tops
    const wallTops = [
      { pos: new THREE.Vector3(0,  7, -half), ry: 0 },
      { pos: new THREE.Vector3(0,  7,  half), ry: 0 },
      { pos: new THREE.Vector3(-half, 7, 0),  ry: Math.PI / 2 },
      { pos: new THREE.Vector3( half, 7, 0),  ry: Math.PI / 2 },
    ];
    for (const w of wallTops) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(this.size + 2, 0.14, 0.45), stripMat.clone());
      strip.position.copy(w.pos);
      strip.rotation.y = w.ry;
      this.group.add(strip);
      this._pulsingMaterials.push({
        material: strip.material, base: 1.0, freq: 0.5, phase: Math.random() * Math.PI * 2, amp: 0.5,
      });
    }

    // Corner pillars + pulsing red beacon lights
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 9, 1.8), wallMat);
      pillar.position.set(sx * (half + 0.5), 4.5, sz * (half + 0.5));
      this.group.add(pillar);

      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), beaconMat.clone());
      beacon.position.set(sx * (half + 0.5), 9.5, sz * (half + 0.5));
      this.group.add(beacon);
      this._pulsingMaterials.push({
        material: beacon.material,
        base: 1.8, freq: 1.0 + Math.random() * 0.5, phase: Math.random() * Math.PI * 2, amp: 1.0,
      });

      const bLight = new THREE.PointLight(0xff0000, 1.0, 18);
      bLight.position.set(sx * (half + 0.5), 9.0, sz * (half + 0.5));
      this.group.add(bLight);
      this._pulsingLights.push({
        light: bLight, base: 0.5, freq: 1.0 + Math.random() * 0.5, phase: Math.random() * Math.PI * 2, amp: 0.7,
      });
    }
  }

  // ─── Overhead lightning light ──────────────────────────────────────────────

  _buildLightning() {
    this._lightningLight = new THREE.PointLight(0xffffff, 0, 200);
    this._lightningLight.position.set(0, 25, 0);
    this.group.add(this._lightningLight);
  }
}
