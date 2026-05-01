/**
 * TestArena - simple environment for the tech demo.
 * A bounded grid floor with some scattered decorations to test movement.
 * Will be replaced by full World 1 levels in the next phase.
 */

import * as THREE from 'three';

export class TestArena {
  constructor(scene) {
    this.scene = scene;
    this.size = 40;
  }

  build() {
    // Ground
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2a3050,
      metalness: 0.3,
      roughness: 0.9
    });
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(this.size, this.size),
      groundMat
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Grid pattern overlay
    const grid = new THREE.GridHelper(this.size, 20, 0x4f5a8a, 0x2f3a6a);
    grid.position.y = 0.01;
    this.scene.add(grid);

    // Boundary walls (low, for visual reference)
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x4a4a6a,
      metalness: 0.6,
      roughness: 0.4
    });

    const half = this.size / 2;
    const wallHeight = 1;
    const walls = [
      { x: 0, z: half, w: this.size, d: 0.5 },
      { x: 0, z: -half, w: this.size, d: 0.5 },
      { x: half, z: 0, w: 0.5, d: this.size },
      { x: -half, z: 0, w: 0.5, d: this.size }
    ];

    for (const w of walls) {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(w.w, wallHeight, w.d),
        wallMat
      );
      wall.position.set(w.x, wallHeight / 2, w.z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.scene.add(wall);
    }

    // Decorative pillars scattered around
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x6a5a8a,
      metalness: 0.7,
      roughness: 0.3,
      emissive: 0x2a1a4a,
      emissiveIntensity: 0.4
    });

    const pillarPositions = [
      { x: 12, z: 12 }, { x: -12, z: 12 },
      { x: 12, z: -12 }, { x: -12, z: -12 },
      { x: 0, z: 15 }, { x: 0, z: -15 }
    ];

    for (const p of pillarPositions) {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.5, 3, 12),
        pillarMat
      );
      pillar.position.set(p.x, 1.5, p.z);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      this.scene.add(pillar);
    }

    // Skybox - simple gradient sphere
    const skyGeom = new THREE.SphereGeometry(200, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: new THREE.Color(0x0a0e27) },
        bottomColor: { value: new THREE.Color(0x2a1a4a) },
        offset: { value: 100 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `
    });
    const sky = new THREE.Mesh(skyGeom, skyMat);
    this.scene.add(sky);
  }
}
