import * as THREE from 'three';

/**
 * Procedural Flight Trail Effect System
 * 1. Dual Wingtip Ribbon Streamers: curves and curls with roll & pitch in 3D space
 * 2. Warp Speed Lines / Streaks: dynamic speed lines stretching past the cockpit
 * 3. Residual Afterburner Ring Pulses: expanding shock rings left along flight trajectory
 */

const _tempVec3 = new THREE.Vector3();
const _tempDir = new THREE.Vector3();

export class RibbonTrail {
  public mesh: THREE.Mesh;
  private positions: Float32Array;
  private colors: Float32Array;
  private history: THREE.Vector3[] = [];
  private pointCount: number;
  private width: number;

  constructor(scene: THREE.Scene, pointCount = 60, width = 0.14, colorHex = 0x00f0ff) {
    this.pointCount = pointCount;
    this.width = width;

    // A ribbon with N points has (N - 1) * 2 triangles = (N - 1) * 6 vertices
    const vertexCount = (pointCount - 1) * 6;
    this.positions = new Float32Array(vertexCount * 3);
    this.colors = new Float32Array(vertexCount * 4); // RGBA vertex colors

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 4).setUsage(THREE.DynamicDrawUsage));

    // Custom shader material supporting per-vertex RGBA for smooth alpha fadeout
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(colorHex) },
      },
      vertexShader: `
        attribute vec4 color;
        varying vec4 vColor;
        void main() {
          vColor = color;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying vec4 vColor;
        void main() {
          gl_FragColor = vec4(mix(uColor, vColor.rgb, 0.4), vColor.a);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);

    // Initialize history points
    for (let i = 0; i < pointCount; i++) {
      this.history.push(new THREE.Vector3(0, 0, -100));
    }
  }

  public update(currentEmitterPos: THREE.Vector3, zDelta: number, isBoosting: boolean) {
    // 1. Shift all historical points backward along +Z (simulating forward flight streaming)
    for (let i = this.history.length - 1; i > 0; i--) {
      this.history[i].copy(this.history[i - 1]);
      this.history[i].z += zDelta;
    }
    this.history[0].copy(currentEmitterPos);

    // 2. Build the ribbon triangle strip
    let vIdx = 0;
    const baseColor = isBoosting ? new THREE.Color(0xff00aa) : new THREE.Color(0x00f0ff);
    const boostColor = new THREE.Color(0xffffff);

    for (let i = 0; i < this.pointCount - 1; i++) {
      const p1 = this.history[i];
      const p2 = this.history[i + 1];

      const t1 = i / (this.pointCount - 1);
      const t2 = (i + 1) / (this.pointCount - 1);

      // Taper width toward tail
      const w1 = this.width * (1.0 - t1 * 0.75) * (isBoosting ? 1.6 : 1.0);
      const w2 = this.width * (1.0 - t2 * 0.75) * (isBoosting ? 1.6 : 1.0);

      // Alpha fadeout: 0.95 at head -> 0.0 at tail
      const alpha1 = Math.max(0, (1.0 - t1 * t1) * (isBoosting ? 1.0 : 0.85));
      const alpha2 = Math.max(0, (1.0 - t2 * t2) * (isBoosting ? 1.0 : 0.85));

      // Color tint
      const c1 = t1 < 0.2 ? boostColor : baseColor;
      const c2 = t2 < 0.2 ? boostColor : baseColor;

      // Quad vertices: Left1, Right1, Left2, Right2
      // Using horizontal/up offset perpendicular to flight direction
      const xOffset1 = w1 * 0.5;
      const yOffset1 = w1 * 0.25;
      const xOffset2 = w2 * 0.5;
      const yOffset2 = w2 * 0.25;

      // Triangle 1: (p1L, p1R, p2L)
      this.setVertex(vIdx++, p1.x - xOffset1, p1.y + yOffset1, p1.z, c1, alpha1);
      this.setVertex(vIdx++, p1.x + xOffset1, p1.y - yOffset1, p1.z, c1, alpha1);
      this.setVertex(vIdx++, p2.x - xOffset2, p2.y + yOffset2, p2.z, c2, alpha2);

      // Triangle 2: (p2L, p1R, p2R)
      this.setVertex(vIdx++, p2.x - xOffset2, p2.y + yOffset2, p2.z, c2, alpha2);
      this.setVertex(vIdx++, p1.x + xOffset1, p1.y - yOffset1, p1.z, c1, alpha1);
      this.setVertex(vIdx++, p2.x + xOffset2, p2.y - yOffset2, p2.z, c2, alpha2);
    }

    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.color.needsUpdate = true;
  }

  private setVertex(idx: number, x: number, y: number, z: number, color: THREE.Color, alpha: number) {
    const i3 = idx * 3;
    const i4 = idx * 4;

    this.positions[i3] = x;
    this.positions[i3 + 1] = y;
    this.positions[i3 + 2] = z;

    this.colors[i4] = color.r;
    this.colors[i4 + 1] = color.g;
    this.colors[i4 + 2] = color.b;
    this.colors[i4 + 3] = alpha;
  }

  public reset() {
    for (let i = 0; i < this.pointCount; i++) {
      this.history[i].set(0, 0, -100);
    }
  }
}

/**
 * 3D Warp Speed-Lines / Streaks
 * Speed lines streaming towards the cockpit that stretch with velocity
 */
export class WarpSpeedLines {
  public linesMesh: THREE.LineSegments;
  private positions: Float32Array;
  private colors: Float32Array;
  private lineCount: number;
  private origins: { x: number; y: number; z: number; speedOffset: number }[] = [];

  constructor(scene: THREE.Scene, lineCount = 140) {
    this.lineCount = lineCount;
    this.positions = new Float32Array(lineCount * 2 * 3);
    this.colors = new Float32Array(lineCount * 2 * 3);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));

    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.linesMesh = new THREE.LineSegments(geo, mat);
    this.linesMesh.frustumCulled = false;
    scene.add(this.linesMesh);

    // Scatter lines in a frustum tunnel surrounding the spaceship's path
    for (let i = 0; i < lineCount; i++) {
      const radius = 1.2 + Math.random() * 8.5;
      const angle = Math.random() * Math.PI * 2;
      this.origins.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: -Math.random() * 90 - 5,
        speedOffset: 0.85 + Math.random() * 0.3,
      });
    }
  }

  public update(dt: number, shipSpeed: number, isBoosting: boolean) {
    const streamSpeed = shipSpeed * 1.5;
    // Length stretches with speed!
    const lineLength = (shipSpeed / 40) * (isBoosting ? 8.5 : 3.5);

    const colHead = isBoosting ? new THREE.Color(0xff00aa) : new THREE.Color(0x00f0ff);
    const colTail = isBoosting ? new THREE.Color(0x330055) : new THREE.Color(0x002244);

    for (let i = 0; i < this.lineCount; i++) {
      const origin = this.origins[i];
      origin.z += streamSpeed * origin.speedOffset * dt;

      // Wrap around when passing the camera (+Z)
      if (origin.z > 8) {
        origin.z -= 95;
        const radius = 1.2 + Math.random() * 8.5;
        const angle = Math.random() * Math.PI * 2;
        origin.x = Math.cos(angle) * radius;
        origin.y = Math.sin(angle) * radius;
      }

      const pIdx = i * 6;
      const cIdx = i * 6;

      // Start vertex (Head)
      this.positions[pIdx] = origin.x;
      this.positions[pIdx + 1] = origin.y;
      this.positions[pIdx + 2] = origin.z;

      // End vertex (Tail extending backward into -Z)
      this.positions[pIdx + 3] = origin.x;
      this.positions[pIdx + 4] = origin.y;
      this.positions[pIdx + 5] = origin.z - lineLength;

      // Colors
      this.colors[cIdx] = colHead.r;
      this.colors[cIdx + 1] = colHead.g;
      this.colors[cIdx + 2] = colHead.b;

      this.colors[cIdx + 3] = colTail.r;
      this.colors[cIdx + 4] = colTail.g;
      this.colors[cIdx + 5] = colTail.b;
    }

    this.linesMesh.geometry.attributes.position.needsUpdate = true;
    this.linesMesh.geometry.attributes.color.needsUpdate = true;
  }
}

/**
 * Composite Flight Trail Manager
 */
export class FlightTrailSystem {
  public leftWingTrail: RibbonTrail;
  public rightWingTrail: RibbonTrail;
  public warpSpeedLines: WarpSpeedLines;

  constructor(scene: THREE.Scene) {
    this.leftWingTrail = new RibbonTrail(scene, 55, 0.16, 0x00f0ff);
    this.rightWingTrail = new RibbonTrail(scene, 55, 0.16, 0x00f0ff);
    this.warpSpeedLines = new WarpSpeedLines(scene, 130);
  }

  public update(
    leftWingPos: THREE.Vector3,
    rightWingPos: THREE.Vector3,
    dt: number,
    shipSpeed: number,
    isBoosting: boolean
  ) {
    const zDelta = shipSpeed * dt;

    // Update Wingtip Ribbon Trails
    this.leftWingTrail.update(leftWingPos, zDelta, isBoosting);
    this.rightWingTrail.update(rightWingPos, zDelta, isBoosting);

    // Update Hyperspeed Streaks
    this.warpSpeedLines.update(dt, shipSpeed, isBoosting);
  }

  public reset() {
    this.leftWingTrail.reset();
    this.rightWingTrail.reset();
  }
}
