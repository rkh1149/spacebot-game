/**
 * Boss — world boss entity.
 * worldNum 1 → Virus (giant lumpy translucent green blob, two white eyes)
 * worldNum 2 → Grid  (wireframe cube, two cyan/magenta oval eyes)
 */
import * as THREE from 'three';

export class Boss {
  constructor(scene, worldNum) {
    this.scene    = scene;
    this.worldNum = worldNum;
    this.isBoss   = true;
    this.position = new THREE.Vector3();
    this.alive    = true;

    this.maxHealth = worldNum === 1 ? 300 : worldNum === 2 ? 450 : 600;
    this.health    = this.maxHealth;
    this.moveSpeed = worldNum === 1 ? 1.8 : worldNum === 2 ? 2.4 : 3.2;
    this.hitRadius = worldNum === 1 ? 2.2 : worldNum === 2 ? 2.6 : 2.8;

    this.group = new THREE.Group();
    this._build();
    scene.add(this.group);
  }

  _build() {
    if      (this.worldNum === 1) this._buildVirus();
    else if (this.worldNum === 2) this._buildGrid();
    else                          this._buildCorrupt();
  }

  // ─── Virus ────────────────────────────────────────────────────────────────

  _buildVirus() {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x00ff44,
      emissive: 0x00cc33,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.78,
      roughness: 0.35,
      metalness: 0.0,
    });
    this._bodyMat = mat;

    // Main body
    const body = new THREE.Mesh(new THREE.SphereGeometry(2.0, 28, 22), mat);
    body.castShadow = true;
    this.group.add(body);
    this._bodyMesh = body;

    // Lumpy surface bumps
    for (let i = 0; i < 12; i++) {
      const φ = Math.acos(1 - 2 * ((i + 0.5) / 12));
      const θ = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 1.82;
      const bump = new THREE.Mesh(
        new THREE.SphereGeometry(0.28 + (i % 3) * 0.12, 10, 8),
        mat
      );
      bump.position.set(
        r * Math.sin(φ) * Math.cos(θ),
        r * Math.cos(φ),
        r * Math.sin(φ) * Math.sin(θ)
      );
      this.group.add(bump);
    }

    // Two big white eyes with black pupils
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    for (const side of [-0.9, 0.9]) {
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.52, 16, 14), whiteMat);
      white.position.set(side, 0.35, 1.72);
      this.group.add(white);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), pupilMat);
      pupil.position.set(side, 0.35, 2.15);
      this.group.add(pupil);
    }

    const light = new THREE.PointLight(0x00ff44, 4, 18);
    this.group.add(light);
    this._bossLight = light;
  }

  // ─── Grid ─────────────────────────────────────────────────────────────────

  _buildGrid() {
    // Wireframe cage
    const wireMat = new THREE.LineBasicMaterial({ color: 0x00ffff });
    const cage = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(4.2, 4.2, 4.2)),
      wireMat
    );
    this.group.add(cage);
    this._wireMesh = cage;

    // Sub-grid lines on faces
    const subMat = new THREE.LineBasicMaterial({ color: 0x0066aa });
    for (let t of [-1.4, 0, 1.4]) {
      const pts1 = [new THREE.Vector3(t, -2.1, -2.1), new THREE.Vector3(t, 2.1, -2.1),
                    new THREE.Vector3(t, -2.1,  2.1), new THREE.Vector3(t, 2.1,  2.1)];
      const pts2 = [new THREE.Vector3(-2.1, t, -2.1), new THREE.Vector3(2.1, t, -2.1),
                    new THREE.Vector3(-2.1, t,  2.1), new THREE.Vector3(2.1, t,  2.1)];
      for (const pts of [pts1, pts2]) {
        for (let i = 0; i < pts.length; i += 2) {
          const g = new THREE.BufferGeometry().setFromPoints([pts[i], pts[i + 1]]);
          this.group.add(new THREE.Line(g, subMat));
        }
      }
    }

    // Dark core
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x001133, emissive: 0x002244, emissiveIntensity: 0.6, roughness: 0.9,
    });
    const core = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.6, 3.6), coreMat);
    this.group.add(core);
    this._bodyMesh = core;
    this._bodyMat  = coreMat;

    // Oval eyes on +Z face
    const eyeMat  = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.2 });
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 3.0 });
    for (const side of [-0.85, 0.85]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.44, 16, 12), eyeMat);
      eye.scale.set(1, 0.65, 0.38);
      eye.position.set(side, 0, 2.1);
      this.group.add(eye);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), pupilMat);
      pupil.scale.set(1, 0.65, 0.38);
      pupil.position.set(side, 0, 2.28);
      this.group.add(pupil);
    }

    const light = new THREE.PointLight(0x00ffff, 4.5, 22);
    this.group.add(light);
    this._bossLight = light;
  }

  // ─── Corrupt (World 3) — evil twin of SpaceBot ───────────────────────────

  _buildCorrupt() {
    const darkMat   = new THREE.MeshStandardMaterial({ color: 0x1a1a22, metalness: 0.92, roughness: 0.28 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x282838, metalness: 0.85, roughness: 0.35 });
    const redGlow   = () => new THREE.MeshStandardMaterial({
      color: 0xff1100, emissive: 0xcc0800, emissiveIntensity: 2.2, metalness: 0.2, roughness: 0.4
    });
    const blackMat  = new THREE.MeshStandardMaterial({ color: 0x080808, metalness: 0.5, roughness: 0.6 });

    this.group.scale.setScalar(1.4);   // 40% bigger than SpaceBot

    // Body (vertical oval — same geometry as SpaceBot)
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 24), darkMat);
    body.scale.set(1, 1.4, 0.85);
    body.position.y = 1.2;
    body.castShadow = true;
    this.group.add(body);
    this._bodyMesh = body;
    this._bodyMat  = darkMat;

    // Red chest circle
    const chest = new THREE.Mesh(new THREE.CircleGeometry(0.18, 24), redGlow());
    chest.position.set(0, 1.2, 0.47);
    this.group.add(chest);

    // Head (horizontal oval)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 24), darkMat);
    head.scale.set(1.3, 0.85, 1.0);
    head.position.y = 2.15;
    head.castShadow = true;
    this.group.add(head);

    // Red horizontal line eyes
    const eyeGeom = new THREE.BoxGeometry(0.18, 0.04, 0.02);
    for (const side of [-0.18, 0.18]) {
      const eye = new THREE.Mesh(eyeGeom, redGlow());
      eye.position.set(side, 2.2, 0.45);
      this.group.add(eye);
    }

    // Frown — torus arc NOT rotated to Math.PI, so it curves downward
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.022, 8, 16, Math.PI), blackMat);
    mouth.position.set(0, 2.0, 0.45);
    this.group.add(mouth);

    // Antenna
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 8), accentMat);
    antenna.position.set(0, 2.65, 0);
    this.group.add(antenna);

    // Red pulsing ball on antenna top
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), redGlow());
    ball.position.set(0, 2.9, 0);
    this.group.add(ball);
    this._antennaBall = ball;

    this._buildCorruptArm(-0.7, 1.4, 0);
    this._buildCorruptArm( 0.7, 1.4, 0);
    this._buildCorruptLeg(-0.25, 0.4, 0);
    this._buildCorruptLeg( 0.25, 0.4, 0);

    const light = new THREE.PointLight(0xff1100, 5.5, 22);
    this.group.add(light);
    this._bossLight = light;

    this._glitchCountdown = 1.5 + Math.random() * 1.5;
  }

  _buildCorruptArm(x, y, z) {
    const g   = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x1a1a22, metalness: 0.92, roughness: 0.28 });
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.7, 12), mat);
    arm.position.y = -0.35;
    arm.castShadow = true;
    g.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), mat);
    hand.position.y = -0.7;
    g.add(hand);
    for (let i = 0; i < 3; i++) {
      const a = (i - 1) * 0.5;
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), mat);
      f.scale.set(1, 2.2, 1);
      f.position.set(Math.sin(a) * 0.12, -0.85, Math.cos(a) * 0.12);
      g.add(f);
    }
    g.position.set(x, y, z);
    this.group.add(g);
  }

  _buildCorruptLeg(x, y, z) {
    const g      = new THREE.Group();
    const mat    = new THREE.MeshStandardMaterial({ color: 0x1a1a22, metalness: 0.92, roughness: 0.28 });
    const redMat = new THREE.MeshStandardMaterial({
      color: 0xff1100, emissive: 0xcc0800, emissiveIntensity: 1.5, metalness: 0.2, roughness: 0.4
    });
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.8, 16), mat);
    leg.castShadow = true;
    g.add(leg);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, 0.02), redMat);
      stripe.position.set(Math.cos(a) * 0.18, 0, Math.sin(a) * 0.18);
      stripe.lookAt(0, stripe.position.y, 0);
      g.add(stripe);
    }
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), mat);
    foot.scale.set(1, 0.5, 1.3);
    foot.position.set(0, -0.45, 0.05);
    foot.castShadow = true;
    g.add(foot);
    g.position.set(x, y, z);
    this.group.add(g);
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  update(dt, elapsed, target) {
    if (!this.alive) return;

    // Hover — Corrupt bobs lower and faster, looming over SpaceBot
    const hoverY  = this.worldNum === 3 ? 1.6 : 2.5;
    const hoverA  = this.worldNum === 3 ? 0.55 : 0.35;
    const hoverF  = this.worldNum === 3 ? 2.2  : 1.4;
    this.group.position.y = hoverY + Math.sin(elapsed * hoverF) * hoverA;

    // Chase player
    if (target) {
      const dx = target.position.x - this.position.x;
      const dz = target.position.z - this.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const chaseDist = this.worldNum === 3 ? 2.0 : 3.0;
      if (dist > chaseDist) {
        this.position.x += (dx / dist) * this.moveSpeed * dt;
        this.position.z += (dz / dist) * this.moveSpeed * dt;
      }
      this.group.rotation.y = Math.atan2(dx, dz);
    }

    this.group.position.x = this.position.x;
    this.group.position.z = this.position.z;

    // World-specific animation
    if (this.worldNum === 1) {
      const pulse = 1 + Math.sin(elapsed * 2.8) * 0.05;
      this._bodyMesh.scale.setScalar(pulse);
      if (this._bossLight) this._bossLight.intensity = 3.5 + Math.sin(elapsed * 3.2) * 1.2;
    } else if (this.worldNum === 2) {
      this._wireMesh.rotation.y += dt * 0.7;
      this._wireMesh.rotation.x += dt * 0.28;
      this._bodyMesh.rotation.copy(this._wireMesh.rotation);
      if (this._bossLight) this._bossLight.intensity = 4.0 + Math.sin(elapsed * 4) * 1.5;
    } else if (this.worldNum === 3) {
      // Glitch — random scale/light spasm at irregular intervals
      this._glitchCountdown -= dt;
      if (this._glitchCountdown <= 0) {
        this._glitchCountdown = 1.0 + Math.random() * 2.0;
        const gs = 1.4 + (Math.random() - 0.5) * 0.35;
        this.group.scale.set(gs * (1 + (Math.random() - 0.5) * 0.12), gs, 1.4);
        if (this._bossLight) { this._bossLight.color.setHex(0xffffff); this._bossLight.intensity = 20; }
        setTimeout(() => {
          if (!this.alive) return;
          this.group.scale.setScalar(1.4);
          if (this._bossLight) { this._bossLight.color.setHex(0xff1100); this._bossLight.intensity = 5.5; }
        }, 80);
      }
      if (this._antennaBall) {
        this._antennaBall.scale.setScalar(1 + Math.abs(Math.sin(elapsed * 9)) * 0.35);
      }
      if (this._bossLight && this._glitchCountdown > 0.15) {
        this._bossLight.intensity = 5 + Math.abs(Math.sin(elapsed * 7)) * 2.5;
      }
    }
  }

  // ─── Damage / death ───────────────────────────────────────────────────────

  takeDamage(amount) {
    this.health -= amount;
    // Flash white on hit
    if (this._bodyMat) {
      const origColor     = this._bodyMat.emissive.getHex();
      const origIntensity = this._bodyMat.emissiveIntensity;
      this._bodyMat.emissive.setHex(0xffffff);
      this._bodyMat.emissiveIntensity = 5;
      setTimeout(() => {
        if (this._bodyMat) {
          this._bodyMat.emissive.setHex(origColor);
          this._bodyMat.emissiveIntensity = origIntensity;
        }
      }, 80);
    }
    if (this.health <= 0) this.die();
  }

  die() {
    this.alive = false;
    this.scene.remove(this.group);
  }

  getHealthPercent() {
    return Math.max(0, this.health / this.maxHealth);
  }
}
