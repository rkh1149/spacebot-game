/**
 * SpaceBot - the player character
 * Built from Three.js primitives matching the user's character spec.
 * Will be swappable for a GLB model from Meshy later via setModel().
 *
 * Spec:
 * - Horizontal oval head (wider than tall)
 * - Vertical oval body (taller than wide)
 * - Cylindrical arms with three oval fingers each
 * - Cylindrical legs with three vertical green stripes each
 * - Antenna on middle of head with green ball on top
 * - Green circle on chest center
 * - Two horizontal line eyes (green)
 * - Curved mouth
 * - Body: gray, with green accents that GLOW (emissive)
 */

import * as THREE from 'three';

export class SpaceBot {
  constructor(scene) {
    this.scene = scene;
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3();
    this.rotationY = 0;       // facing direction (around Y axis)
    this.moveSpeed = 6;
    this.jumpVelocity = 0;
    this.onGround = true;
    this.lastFireTime = -10;
    this.fireRate = 0.25;     // seconds between shots

    this.group = new THREE.Group();
    this._build();
    scene.add(this.group);
  }

  _build() {
    // Materials
    const grayMat = new THREE.MeshStandardMaterial({
      color: 0xb8bfd0,
      metalness: 0.7,
      roughness: 0.35
    });

    const darkGrayMat = new THREE.MeshStandardMaterial({
      color: 0x6a6f80,
      metalness: 0.8,
      roughness: 0.3
    });

    const greenGlowMat = new THREE.MeshStandardMaterial({
      color: 0x7fff7f,
      emissive: 0x4fff4f,
      emissiveIntensity: 1.5,
      metalness: 0.2,
      roughness: 0.4
    });

    const blackMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.5,
      roughness: 0.6
    });

    // === BODY (vertical oval) ===
    // Use a sphere scaled to be taller than wide
    const bodyGeom = new THREE.SphereGeometry(0.55, 24, 24);
    const body = new THREE.Mesh(bodyGeom, grayMat);
    body.scale.set(1, 1.4, 0.85);
    body.position.y = 1.2;
    body.castShadow = true;
    body.receiveShadow = true;
    this.group.add(body);

    // Green circle on chest center
    const chestGeom = new THREE.CircleGeometry(0.18, 24);
    const chest = new THREE.Mesh(chestGeom, greenGlowMat);
    chest.position.set(0, 1.2, 0.48);
    this.group.add(chest);

    // === HEAD (horizontal oval) ===
    const headGeom = new THREE.SphereGeometry(0.5, 24, 24);
    const head = new THREE.Mesh(headGeom, grayMat);
    head.scale.set(1.3, 0.85, 1.0);
    head.position.y = 2.15;
    head.castShadow = true;
    this.group.add(head);
    this.head = head;

    // Eyes (two horizontal green lines)
    const eyeGeom = new THREE.BoxGeometry(0.18, 0.04, 0.02);
    const leftEye = new THREE.Mesh(eyeGeom, greenGlowMat);
    leftEye.position.set(-0.18, 2.2, 0.45);
    this.group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeom, greenGlowMat);
    rightEye.position.set(0.18, 2.2, 0.45);
    this.group.add(rightEye);

    // Curved mouth (use a torus arc segment)
    const mouthGeom = new THREE.TorusGeometry(0.13, 0.02, 8, 16, Math.PI);
    const mouth = new THREE.Mesh(mouthGeom, blackMat);
    mouth.position.set(0, 2.0, 0.45);
    mouth.rotation.z = Math.PI; // flip so the smile curves up
    this.group.add(mouth);

    // === ANTENNA ===
    const antennaGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.4, 8);
    const antenna = new THREE.Mesh(antennaGeom, darkGrayMat);
    antenna.position.set(0, 2.65, 0);
    this.group.add(antenna);

    // Green ball on antenna top
    const ballGeom = new THREE.SphereGeometry(0.08, 16, 16);
    const ball = new THREE.Mesh(ballGeom, greenGlowMat);
    ball.position.set(0, 2.9, 0);
    this.group.add(ball);
    this.antennaBall = ball;

    // Glow light from antenna ball
    const ballLight = new THREE.PointLight(0x7fff7f, 0.6, 4);
    ballLight.position.set(0, 2.9, 0);
    this.group.add(ballLight);

    // === ARMS (cylinders) ===
    this.leftArm = this._buildArm(-0.7, 1.4, 0);
    this.rightArm = this._buildArm(0.7, 1.4, 0);

    // === LEGS (cylinders with green stripes) ===
    this.leftLeg = this._buildLeg(-0.25, 0.4, 0);
    this.rightLeg = this._buildLeg(0.25, 0.4, 0);

    // Apply initial position
    this.group.position.copy(this.position);
  }

  _buildArm(x, y, z) {
    const armGroup = new THREE.Group();
    const grayMat = new THREE.MeshStandardMaterial({
      color: 0xb8bfd0, metalness: 0.7, roughness: 0.35
    });
    const greenMat = new THREE.MeshStandardMaterial({
      color: 0x7fff7f, emissive: 0x4fff4f, emissiveIntensity: 1.2,
      metalness: 0.2, roughness: 0.4
    });

    // Upper arm (cylinder)
    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.1, 0.7, 12),
      grayMat
    );
    arm.position.set(0, -0.35, 0);
    arm.castShadow = true;
    armGroup.add(arm);

    // Hand (small sphere)
    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 12, 12),
      grayMat
    );
    hand.position.set(0, -0.7, 0);
    hand.castShadow = true;
    armGroup.add(hand);

    // Three oval fingers
    for (let i = 0; i < 3; i++) {
      const angle = (i - 1) * 0.5;
      const finger = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 8),
        grayMat
      );
      finger.scale.set(1, 2.2, 1);
      finger.position.set(Math.sin(angle) * 0.12, -0.85, Math.cos(angle) * 0.12);
      armGroup.add(finger);
    }

    armGroup.position.set(x, y, z);
    this.group.add(armGroup);
    return armGroup;
  }

  _buildLeg(x, y, z) {
    const legGroup = new THREE.Group();
    const grayMat = new THREE.MeshStandardMaterial({
      color: 0xb8bfd0, metalness: 0.7, roughness: 0.35
    });
    const greenMat = new THREE.MeshStandardMaterial({
      color: 0x7fff7f, emissive: 0x4fff4f, emissiveIntensity: 1.2,
      metalness: 0.2, roughness: 0.4
    });

    // Leg cylinder
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.16, 0.8, 16),
      grayMat
    );
    leg.castShadow = true;
    legGroup.add(leg);

    // Three vertical green stripes around the leg
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.7, 0.02),
        greenMat
      );
      stripe.position.set(
        Math.cos(angle) * 0.18,
        0,
        Math.sin(angle) * 0.18
      );
      stripe.lookAt(0, stripe.position.y, 0);
      legGroup.add(stripe);
    }

    // Foot
    const foot = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 12, 12),
      grayMat
    );
    foot.scale.set(1, 0.5, 1.3);
    foot.position.set(0, -0.45, 0.05);
    foot.castShadow = true;
    legGroup.add(foot);

    legGroup.position.set(x, y, z);
    this.group.add(legGroup);
    return legGroup;
  }

  update(dt, input, camera) {
    // Mouse look - rotates Space Bot's facing
    const { dx } = input.consumeMouseDelta();
    if (input.pointerLocked) {
      this.rotationY -= dx * 0.003;
    }

    // Movement input (relative to facing direction)
    const moveDir = new THREE.Vector3();
    if (input.isPressed('KeyW')) moveDir.z -= 1;
    if (input.isPressed('KeyS')) moveDir.z += 1;
    if (input.isPressed('KeyA')) moveDir.x -= 1;
    if (input.isPressed('KeyD')) moveDir.x += 1;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      // Apply rotation
      moveDir.applyEuler(new THREE.Euler(0, this.rotationY, 0));
      moveDir.multiplyScalar(this.moveSpeed * dt);
      this.position.add(moveDir);
    }

    // Jump
    if (input.isPressed('Space') && this.onGround) {
      this.jumpVelocity = 8;
      this.onGround = false;
    }

    // Gravity & ground check
    if (!this.onGround) {
      this.position.y += this.jumpVelocity * dt;
      this.jumpVelocity -= 20 * dt; // gravity
      if (this.position.y <= 0) {
        this.position.y = 0;
        this.jumpVelocity = 0;
        this.onGround = true;
      }
    }

    // Apply transform
    this.group.position.copy(this.position);
    this.group.rotation.y = this.rotationY;

    // Subtle bobbing animation when moving
    const isMoving = moveDir.lengthSq() > 0;
    if (isMoving && this.onGround) {
      const bob = Math.sin(performance.now() * 0.012) * 0.08;
      this.group.position.y = this.position.y + bob;

      // Walking animation - swing arms and legs
      const swing = Math.sin(performance.now() * 0.012) * 0.4;
      this.leftArm.rotation.x = swing;
      this.rightArm.rotation.x = -swing;
      this.leftLeg.rotation.x = -swing * 0.8;
      this.rightLeg.rotation.x = swing * 0.8;
    } else {
      // Return to rest
      this.leftArm.rotation.x *= 0.85;
      this.rightArm.rotation.x *= 0.85;
      this.leftLeg.rotation.x *= 0.85;
      this.rightLeg.rotation.x *= 0.85;
    }

    // Antenna ball pulses
    if (this.antennaBall) {
      const pulse = 1 + Math.sin(performance.now() * 0.005) * 0.1;
      this.antennaBall.scale.setScalar(pulse);
    }
  }

  canFire(elapsed) {
    return elapsed - this.lastFireTime > this.fireRate;
  }

  fire(elapsed) {
    this.lastFireTime = elapsed;

    // Create laser projectile
    const geom = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x7fff7f,
      emissive: 0x7fff7f,
      emissiveIntensity: 3
    });
    const mesh = new THREE.Mesh(geom, mat);

    // Spawn at chest height in front of Space Bot
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyEuler(new THREE.Euler(0, this.rotationY, 0));

    mesh.position.copy(this.position);
    mesh.position.y += 1.2;
    mesh.position.add(forward.clone().multiplyScalar(0.8));

    // Orient laser along travel direction
    mesh.lookAt(mesh.position.clone().add(forward));
    mesh.rotateX(Math.PI / 2);

    // Projectile object with update method
    const projectile = {
      mesh,
      velocity: forward.multiplyScalar(35),
      age: 0,
      alive: true,
      update(dt) {
        this.mesh.position.add(this.velocity.clone().multiplyScalar(dt));
        this.age += dt;
      }
    };

    return projectile;
  }
}
