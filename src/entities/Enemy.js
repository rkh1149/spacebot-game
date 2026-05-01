/**
 * Enemy - basic enemy with shiny/normal variants
 * Shiny enemies pulse with bloom and drop a battery when defeated.
 * Normal enemies damage Space Bot's laser power on contact, and can be
 * destroyed with laser fire.
 */

import * as THREE from 'three';

export class Enemy {
  constructor(scene, { shiny = false } = {}) {
    this.scene = scene;
    this.shiny = shiny;
    this.position = new THREE.Vector3();
    this.health = shiny ? 50 : 75;
    this.alive = true;
    this.moveSpeed = 2.5;
    this.detectionRange = 12;

    this.group = new THREE.Group();
    this._build();
    scene.add(this.group);
  }

  _build() {
    const baseColor = this.shiny ? 0xffaa44 : 0x8a3a3a;
    const emissive = this.shiny ? 0xff8822 : 0x000000;
    const emissiveIntensity = this.shiny ? 1.5 : 0;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: baseColor,
      emissive,
      emissiveIntensity,
      metalness: 0.5,
      roughness: 0.4
    });

    // Body - a chunky angular shape
    const body = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.6, 0),
      bodyMat
    );
    body.castShadow = true;
    this.group.add(body);
    this.body = body;

    // Two menacing red eyes
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xff2222,
      emissive: 0xff0000,
      emissiveIntensity: 2
    });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeMat);
    leftEye.position.set(-0.2, 0.15, 0.45);
    this.group.add(leftEye);

    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeMat);
    rightEye.position.set(0.2, 0.15, 0.45);
    this.group.add(rightEye);

    // Spikes for added menace
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.3, 6),
        bodyMat
      );
      spike.position.set(Math.cos(angle) * 0.5, -0.3, Math.sin(angle) * 0.5);
      spike.lookAt(0, -1, 0);
      this.group.add(spike);
    }

    // Hover effect for shiny enemies (extra glow light)
    if (this.shiny) {
      const light = new THREE.PointLight(0xffaa44, 1.5, 6);
      this.group.add(light);
      this.shinyLight = light;
    }
  }

  update(dt, elapsed, target) {
    if (!this.alive) return;

    // Hover bob
    this.group.position.y = this.position.y + 0.7 + Math.sin(elapsed * 2) * 0.15;

    // Rotate body slowly
    this.body.rotation.y += dt * 0.5;
    this.body.rotation.x += dt * 0.3;

    // Pulse shiny enemies
    if (this.shiny) {
      const pulse = 1 + Math.sin(elapsed * 4) * 0.15;
      this.body.scale.setScalar(pulse);
      if (this.shinyLight) {
        this.shinyLight.intensity = 1.5 + Math.sin(elapsed * 4) * 0.5;
      }
    }

    // Simple AI: chase player if in range
    if (target) {
      const toTarget = target.position.clone().sub(this.position);
      toTarget.y = 0;
      const dist = toTarget.length();

      if (dist < this.detectionRange && dist > 1.0) {
        toTarget.normalize();
        const move = toTarget.multiplyScalar(this.moveSpeed * dt);
        this.position.x += move.x;
        this.position.z += move.z;

        // Face the target
        this.group.rotation.y = Math.atan2(toTarget.x, toTarget.z);
      }
    }

    this.group.position.x = this.position.x;
    this.group.position.z = this.position.z;
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.die();
    } else {
      // Flash effect
      this.body.material.emissiveIntensity = 3;
      setTimeout(() => {
        if (this.body) {
          this.body.material.emissiveIntensity = this.shiny ? 1.5 : 0;
        }
      }, 100);
    }
  }

  die() {
    this.alive = false;
    this.scene.remove(this.group);
  }
}
