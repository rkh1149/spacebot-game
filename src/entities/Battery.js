/**
 * Battery - collectible that increments the player's battery count.
 * Floats and rotates with a satisfying glow.
 */

import * as THREE from 'three';

export class Battery {
  constructor(scene) {
    this.scene = scene;
    this.position = new THREE.Vector3();
    this.collected = false;

    this.mesh = this._build();
    scene.add(this.mesh);
  }

  _build() {
    const group = new THREE.Group();

    // Battery cylinder body
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffe066,
      emissive: 0xffaa00,
      emissiveIntensity: 1.2,
      metalness: 0.7,
      roughness: 0.25
    });

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.5, 16),
      bodyMat
    );
    body.castShadow = true;
    group.add(body);

    // Battery terminal (smaller cylinder on top)
    const terminalMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.95,
      roughness: 0.15
    });
    const terminal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16),
      terminalMat
    );
    terminal.position.y = 0.29;
    group.add(terminal);

    // Glow halo (a torus)
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffe066,
      transparent: true,
      opacity: 0.4
    });
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.4, 0.04, 8, 24),
      haloMat
    );
    halo.rotation.x = Math.PI / 2;
    group.add(halo);
    this.halo = halo;

    // Point light for ambient glow on environment
    const light = new THREE.PointLight(0xffaa00, 0.8, 4);
    group.add(light);

    return group;
  }

  update(dt, elapsed) {
    if (this.collected) return;

    // Float and rotate
    this.mesh.position.x = this.position.x;
    this.mesh.position.z = this.position.z;
    this.mesh.position.y = this.position.y + Math.sin(elapsed * 2) * 0.2;
    this.mesh.rotation.y += dt * 1.5;

    // Halo pulses
    if (this.halo) {
      this.halo.scale.setScalar(1 + Math.sin(elapsed * 3) * 0.2);
    }
  }

  collect() {
    this.collected = true;
  }
}
