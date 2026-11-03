import * as THREE from 'three';

/**
 * Procedural Assets for Cosmic Core Defender XR
 * 100% Procedural 3-12 Part Composite Three.js Models conforming to the threejs skill.
 */

// Procedural radial glow texture for contact shadows & particle sprites
export function createGlowTexture(colorHex: string = '#00f0ff'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, colorHex);
  gradient.addColorStop(0.3, colorHex + 'aa');
  gradient.addColorStop(0.7, colorHex + '33');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createHexGridTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#050914';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 2;
  const r = 24;
  const a = (2 * Math.PI) / 6;

  for (let y = -20; y < 280; y += r * 1.5) {
    for (let x = -20; x < 280; x += Math.sqrt(3) * r) {
      const offsetX = (Math.floor(y / (r * 1.5)) % 2) * (Math.sqrt(3) * r * 0.5);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const px = x + offsetX + r * Math.cos(a * i);
        const py = y + r * Math.sin(a * i);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export interface CoreObject {
  group: THREE.Group;
  innerCrystal: THREE.Mesh;
  gyroRing1: THREE.Mesh;
  gyroRing2: THREE.Mesh;
  shieldMesh: THREE.Mesh;
  pylons: THREE.Group;
  update: (time: number, shieldActive: boolean) => void;
  flashDamage: () => void;
}

/**
 * Hero Subject: 8-Part Composite Procedural Quantum Power Core
 */
export function createQuantumPowerCore(): CoreObject {
  const group = new THREE.Group();
  group.name = 'QuantumPowerCore';

  // 1. Inner crystal core (Primary silhouette)
  const crystalGeo = new THREE.OctahedronGeometry(0.24, 0);
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00c8e0,
    emissiveIntensity: 1.2,
    roughness: 0.1,
    metalness: 0.9,
    wireframe: false,
  });
  const innerCrystal = new THREE.Mesh(crystalGeo, crystalMat);
  innerCrystal.position.y = 0.55;
  innerCrystal.castShadow = true;
  group.add(innerCrystal);

  // 2. Crystal wireframe containment lattice
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    transparent: true,
    opacity: 0.65,
  });
  const wireframeLattice = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 1), wireMat);
  wireframeLattice.position.copy(innerCrystal.position);
  group.add(wireframeLattice);

  // 3. Inner Gyroscope Ring (Secondary detail)
  const ring1Geo = new THREE.TorusGeometry(0.42, 0.024, 16, 64);
  const ring1Mat = new THREE.MeshStandardMaterial({
    color: 0x223344,
    roughness: 0.2,
    metalness: 0.95,
  });
  const gyroRing1 = new THREE.Mesh(ring1Geo, ring1Mat);
  gyroRing1.position.copy(innerCrystal.position);
  group.add(gyroRing1);

  // 4. Outer Gyroscope Ring with emitter nodes (Secondary detail)
  const ring2Geo = new THREE.TorusGeometry(0.52, 0.02, 16, 64);
  const ring2Mat = new THREE.MeshStandardMaterial({
    color: 0x552277,
    roughness: 0.3,
    metalness: 0.85,
  });
  const gyroRing2 = new THREE.Mesh(ring2Geo, ring2Mat);
  gyroRing2.position.copy(innerCrystal.position);
  group.add(gyroRing2);

  // Add 4 nodes to ring2
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const nodeGeo = new THREE.SphereGeometry(0.035, 12, 12);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0xffb020,
      emissive: 0xff8800,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });
    const node = new THREE.Mesh(nodeGeo, nodeMat);
    node.position.set(Math.cos(angle) * 0.52, Math.sin(angle) * 0.52, 0);
    gyroRing2.add(node);
  }

  // 5. 4 Conductive Flux Pylons (Structure)
  const pylons = new THREE.Group();
  const pylonMat = new THREE.MeshStandardMaterial({
    color: 0x111c2a,
    roughness: 0.45,
    metalness: 0.7,
  });
  const coilMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x0088cc,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.9,
  });

  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const pylonCol = new THREE.Group();
    const colMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.85, 16), pylonMat);
    colMesh.position.y = 0.425;
    colMesh.castShadow = true;
    pylonCol.add(colMesh);

    // Coil accents
    for (let c = 0; c < 3; c++) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.012, 8, 24), coilMat);
      coil.rotation.x = Math.PI / 2;
      coil.position.y = 0.25 + c * 0.2;
      pylonCol.add(coil);
    }

    const dist = 0.65;
    pylonCol.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
    pylons.add(pylonCol);
  }
  group.add(pylons);

  // 6. Ground Pedestal Platform (Bottom-Center Pivot)
  const pedestalGeo = new THREE.CylinderGeometry(0.78, 0.9, 0.12, 32);
  const pedestalMat = new THREE.MeshStandardMaterial({
    color: 0x182436,
    roughness: 0.6,
    metalness: 0.6,
  });
  const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
  pedestal.position.y = 0.06;
  pedestal.receiveShadow = true;
  group.add(pedestal);

  // 7. Soft Contact Shadow Disc directly underneath
  const shadowGeo = new THREE.PlaneGeometry(2.4, 2.4);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: createGlowTexture('#000000'),
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.002;
  group.add(contactShadow);

  // 8. Holographic Energy Shield Bubble
  const shieldGeo = new THREE.SphereGeometry(0.95, 32, 24);
  const shieldMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00a0dd,
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.25,
    wireframe: true,
    depthWrite: false,
  });
  const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
  shieldMesh.position.y = 0.55;
  group.add(shieldMesh);

  let damageFlashTimer = 0;

  return {
    group,
    innerCrystal,
    gyroRing1,
    gyroRing2,
    shieldMesh,
    pylons,
    update(time: number, shieldActive: boolean) {
      innerCrystal.rotation.y = time * 1.2;
      innerCrystal.rotation.x = Math.sin(time * 0.8) * 0.3;
      wireframeLattice.rotation.y = -time * 0.9;

      gyroRing1.rotation.x = time * 0.8;
      gyroRing1.rotation.y = time * 0.5;

      gyroRing2.rotation.y = -time * 1.1;
      gyroRing2.rotation.z = Math.cos(time * 0.6) * 0.6;

      // Crystal vertical breathing
      innerCrystal.position.y = 0.55 + Math.sin(time * 2.5) * 0.03;
      wireframeLattice.position.y = innerCrystal.position.y;

      // Shield visual state
      if (damageFlashTimer > 0) {
        damageFlashTimer -= 0.016;
        crystalMat.color.setHex(0xff2244);
        crystalMat.emissive.setHex(0xff0022);
      } else {
        crystalMat.color.setHex(shieldActive ? 0x00f0ff : 0xffb020);
        crystalMat.emissive.setHex(shieldActive ? 0x00c8e0 : 0xaa5500);
      }

      shieldMesh.visible = shieldActive;
      if (shieldActive) {
        shieldMesh.rotation.y = time * 0.4;
        shieldMat.opacity = 0.25 + Math.sin(time * 4) * 0.1;
      }
    },
    flashDamage() {
      damageFlashTimer = 0.25;
    },
  };
}

/**
 * 6-Part Composite Procedural Scout Interceptor Drone
 */
export function createScoutDrone(): THREE.Group {
  const drone = new THREE.Group();
  drone.name = 'ScoutDrone';

  // 1. Primary fuselage
  const hullGeo = new THREE.ConeGeometry(0.12, 0.45, 6);
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0xd02535,
    roughness: 0.3,
    metalness: 0.8,
  });
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.rotation.x = Math.PI / 2;
  hull.castShadow = true;
  drone.add(hull);

  // 2. Cockpit visor / Optic Sensor
  const opticGeo = new THREE.SphereGeometry(0.06, 16, 16);
  const opticMat = new THREE.MeshStandardMaterial({
    color: 0x00ffff,
    emissive: 0x00f0ff,
    emissiveIntensity: 1.5,
    roughness: 0.1,
  });
  const optic = new THREE.Mesh(opticGeo, opticMat);
  optic.position.set(0, 0.05, 0.1);
  drone.add(optic);

  // 3. Swept port wing
  const wingGeo = new THREE.BoxGeometry(0.35, 0.02, 0.16);
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0x1f2430,
    roughness: 0.6,
    metalness: 0.7,
  });
  const portWing = new THREE.Mesh(wingGeo, wingMat);
  portWing.position.set(-0.22, 0, -0.05);
  portWing.rotation.z = -0.15;
  portWing.rotation.y = 0.2;
  portWing.castShadow = true;
  drone.add(portWing);

  // 4. Swept starboard wing
  const starWing = new THREE.Mesh(wingGeo, wingMat);
  starWing.position.set(0.22, 0, -0.05);
  starWing.rotation.z = 0.15;
  starWing.rotation.y = -0.2;
  starWing.castShadow = true;
  drone.add(starWing);

  // 5. Wing-tip plasma cannon nozzles
  const cannonGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.14, 8);
  const cannonMat = new THREE.MeshStandardMaterial({
    color: 0x334455,
    metalness: 0.9,
    roughness: 0.2,
  });
  const leftCannon = new THREE.Mesh(cannonGeo, cannonMat);
  leftCannon.rotation.x = Math.PI / 2;
  leftCannon.position.set(-0.38, -0.02, 0.02);
  const rightCannon = leftCannon.clone();
  rightCannon.position.set(0.38, -0.02, 0.02);
  drone.add(leftCannon, rightCannon);

  // 6. Rear thruster with glowing exhaust plume
  const thrusterGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.08, 12);
  const thrusterMat = new THREE.MeshStandardMaterial({
    color: 0x151820,
    metalness: 0.8,
  });
  const thruster = new THREE.Mesh(thrusterGeo, thrusterMat);
  thruster.rotation.x = Math.PI / 2;
  thruster.position.set(0, 0, -0.22);
  drone.add(thruster);

  const plumeGeo = new THREE.ConeGeometry(0.035, 0.2, 8);
  const plumeMat = new THREE.MeshBasicMaterial({
    color: 0xff6600,
    transparent: true,
    opacity: 0.85,
  });
  const plume = new THREE.Mesh(plumeGeo, plumeMat);
  plume.rotation.x = -Math.PI / 2;
  plume.position.set(0, 0, -0.32);
  drone.add(plume);

  return drone;
}

/**
 * 7-Part Composite Heavy Armored Swarmer Cruiser
 */
export function createHeavySwarmer(): THREE.Group {
  const swarmer = new THREE.Group();
  swarmer.name = 'HeavySwarmer';

  // 1. Faceted titanium hull (Dodecahedron)
  const hullGeo = new THREE.DodecahedronGeometry(0.28, 0);
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x4a186a,
    roughness: 0.25,
    metalness: 0.85,
  });
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.castShadow = true;
  swarmer.add(hull);

  // 2. Central purple plasma core
  const coreGeo = new THREE.IcosahedronGeometry(0.14, 1);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xe024c3,
    emissive: 0x9010aa,
    emissiveIntensity: 1.8,
    roughness: 0.1,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  swarmer.add(core);

  // 3-6. 4 Orbiting Armor Shield Plates
  const plateGeo = new THREE.BoxGeometry(0.18, 0.18, 0.03);
  const plateMat = new THREE.MeshStandardMaterial({
    color: 0x181026,
    roughness: 0.4,
    metalness: 0.9,
  });
  const shieldsGroup = new THREE.Group();
  shieldsGroup.name = 'ArmorPlates';
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.set(Math.cos(angle) * 0.38, Math.sin(angle) * 0.38, 0);
    plate.rotation.z = angle;
    shieldsGroup.add(plate);
  }
  swarmer.add(shieldsGroup);

  // 7. Twin heavy forward cannons
  const barrelGeo = new THREE.CylinderGeometry(0.03, 0.035, 0.3, 10);
  const barrelMat = new THREE.MeshStandardMaterial({
    color: 0x303038,
    roughness: 0.3,
    metalness: 0.95,
  });
  const barrelL = new THREE.Mesh(barrelGeo, barrelMat);
  barrelL.rotation.x = Math.PI / 2;
  barrelL.position.set(-0.16, 0, 0.2);
  const barrelR = barrelL.clone();
  barrelR.position.set(0.16, 0, 0.2);
  swarmer.add(barrelL, barrelR);

  return swarmer;
}

/**
 * 10-Part Composite Procedural Boss Dreadnought: "The Void Titan"
 */
export function createBossDreadnought(): THREE.Group {
  const boss = new THREE.Group();
  boss.name = 'BossDreadnought';

  // 1. Central Heavy Keel Citadel
  const keelGeo = new THREE.BoxGeometry(0.65, 0.32, 1.4);
  const keelMat = new THREE.MeshStandardMaterial({
    color: 0x1a1215,
    roughness: 0.35,
    metalness: 0.9,
  });
  const keel = new THREE.Mesh(keelGeo, keelMat);
  keel.castShadow = true;
  boss.add(keel);

  // 2. Command Spire (Upper Deck)
  const bridgeGeo = new THREE.BoxGeometry(0.35, 0.22, 0.5);
  const bridgeMat = new THREE.MeshStandardMaterial({
    color: 0x2d1a24,
    roughness: 0.25,
    metalness: 0.85,
  });
  const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
  bridge.position.set(0, 0.24, -0.2);
  boss.add(bridge);

  // 3. Command Bridge Visor Strip (Glowing ruby red)
  const visorGeo = new THREE.BoxGeometry(0.36, 0.05, 0.08);
  const visorMat = new THREE.MeshBasicMaterial({color: 0xff0044});
  const visor = new THREE.Mesh(visorGeo, visorMat);
  visor.position.set(0, 0.26, 0.06);
  boss.add(visor);

  // 4. Port Heavy Armor Wing with heat sinks
  const wingGeo = new THREE.BoxGeometry(0.55, 0.12, 0.9);
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0x361622,
    roughness: 0.5,
    metalness: 0.75,
  });
  const portWing = new THREE.Mesh(wingGeo, wingMat);
  portWing.position.set(-0.55, 0, -0.1);
  portWing.rotation.y = 0.15;
  boss.add(portWing);

  // 5. Starboard Heavy Armor Wing
  const starWing = new THREE.Mesh(wingGeo, wingMat);
  starWing.position.set(0.55, 0, -0.1);
  starWing.rotation.y = -0.15;
  boss.add(starWing);

  // 6. Ventral Mega-Cannon projector
  const cannonGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.6, 16);
  const cannonMat = new THREE.MeshStandardMaterial({
    color: 0x111116,
    metalness: 0.95,
    roughness: 0.2,
  });
  const cannon = new THREE.Mesh(cannonGeo, cannonMat);
  cannon.rotation.x = Math.PI / 2;
  cannon.position.set(0, -0.15, 0.7);
  boss.add(cannon);

  // 7. Rotating Tactical Radar Dish
  const dishGeo = new THREE.CylinderGeometry(0.14, 0.04, 0.06, 12);
  const dishMat = new THREE.MeshStandardMaterial({
    color: 0x778899,
    metalness: 0.9,
    roughness: 0.2,
  });
  const dish = new THREE.Mesh(dishGeo, dishMat);
  dish.position.set(0, 0.42, -0.3);
  dish.name = 'RadarDish';
  boss.add(dish);

  // 8. Dual Wingtip Shield Pods
  const podGeo = new THREE.SphereGeometry(0.09, 12, 12);
  const podMat = new THREE.MeshStandardMaterial({
    color: 0xff0066,
    emissive: 0xcc0044,
    emissiveIntensity: 1.5,
  });
  const podL = new THREE.Mesh(podGeo, podMat);
  podL.position.set(-0.85, 0, -0.2);
  const podR = podL.clone();
  podR.position.set(0.85, 0, -0.2);
  boss.add(podL, podR);

  // 9. Triple Super-luminal Drive Thrusters
  for (let i = -1; i <= 1; i++) {
    const engineGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.2, 12);
    const engineMat = new THREE.MeshStandardMaterial({color: 0x222228, metalness: 0.9});
    const eng = new THREE.Mesh(engineGeo, engineMat);
    eng.rotation.x = Math.PI / 2;
    eng.position.set(i * 0.22, 0, -0.75);
    boss.add(eng);

    const flameGeo = new THREE.ConeGeometry(0.07, 0.35, 8);
    const flameMat = new THREE.MeshBasicMaterial({color: 0xff0055, transparent: true, opacity: 0.8});
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(i * 0.22, 0, -0.95);
    boss.add(flame);
  }

  // 10. Dreadnought Contact Shield Bubble
  const bossShieldGeo = new THREE.SphereGeometry(1.2, 24, 16);
  const bossShieldMat = new THREE.MeshBasicMaterial({
    color: 0xff0055,
    wireframe: true,
    transparent: true,
    opacity: 0.35,
  });
  const bossShield = new THREE.Mesh(bossShieldGeo, bossShieldMat);
  bossShield.name = 'BossShield';
  boss.add(bossShield);

  return boss;
}

/**
 * Energy bolt projectile
 */
export function createLaserBolt(isPlayer = true): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8);
  const mat = new THREE.MeshBasicMaterial({
    color: isPlayer ? 0x00f0ff : 0xff3355,
  });
  const bolt = new THREE.Mesh(geo, mat);
  bolt.rotation.x = Math.PI / 2;
  return bolt;
}

/**
 * Particle Spark System Pool
 */
export interface ParticleBurst {
  mesh: THREE.Points;
  positions: Float32Array;
  velocities: Float32Array;
  colors: Float32Array;
  life: Float32Array;
  maxLife: number;
  count: number;
  active: boolean;
}

export class ParticleFXPool {
  private bursts: ParticleBurst[] = [];
  private group = new THREE.Group();

  constructor(scene: THREE.Scene, poolSize = 12, particlesPerBurst = 40) {
    this.group.name = 'ParticleFXPool';
    scene.add(this.group);

    const texture = createGlowTexture('#ffffff');

    for (let b = 0; b < poolSize; b++) {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(particlesPerBurst * 3);
      const vel = new Float32Array(particlesPerBurst * 3);
      const col = new Float32Array(particlesPerBurst * 3);
      const life = new Float32Array(particlesPerBurst);

      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

      const mat = new THREE.PointsMaterial({
        size: 0.09,
        map: texture,
        transparent: true,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const mesh = new THREE.Points(geo, mat);
      mesh.frustumCulled = false;
      mesh.visible = false;
      this.group.add(mesh);

      this.bursts.push({
        mesh,
        positions: pos,
        velocities: vel,
        colors: col,
        life,
        maxLife: 0.6,
        count: particlesPerBurst,
        active: false,
      });
    }
  }

  public spawn(origin: THREE.Vector3, colorHex: number = 0x00f0ff, speedScale = 1.0) {
    const burst = this.bursts.find((b) => !b.active) || this.bursts[0];
    burst.active = true;
    burst.mesh.visible = true;

    const baseColor = new THREE.Color(colorHex);

    for (let i = 0; i < burst.count; i++) {
      const i3 = i * 3;
      burst.positions[i3] = origin.x;
      burst.positions[i3 + 1] = origin.y;
      burst.positions[i3 + 2] = origin.z;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const speed = (Math.random() * 2.2 + 0.8) * speedScale;

      burst.velocities[i3] = Math.sin(phi) * Math.cos(theta) * speed;
      burst.velocities[i3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      burst.velocities[i3 + 2] = Math.cos(phi) * speed;

      burst.colors[i3] = baseColor.r;
      burst.colors[i3 + 1] = baseColor.g;
      burst.colors[i3 + 2] = baseColor.b;

      burst.life[i] = 1.0;
    }

    burst.mesh.geometry.attributes.position.needsUpdate = true;
    burst.mesh.geometry.attributes.color.needsUpdate = true;
  }

  public update(dt: number) {
    for (const b of this.bursts) {
      if (!b.active) continue;
      let allDead = true;

      for (let i = 0; i < b.count; i++) {
        const i3 = i * 3;
        if (b.life[i] > 0) {
          allDead = false;
          b.life[i] -= dt * 1.8;

          b.positions[i3] += b.velocities[i3] * dt;
          b.positions[i3 + 1] += b.velocities[i3 + 1] * dt;
          b.positions[i3 + 2] += b.velocities[i3 + 2] * dt;

          // Drag
          b.velocities[i3] *= 0.94;
          b.velocities[i3 + 1] *= 0.94;
          b.velocities[i3 + 2] *= 0.94;
        }
      }

      b.mesh.geometry.attributes.position.needsUpdate = true;

      if (allDead) {
        b.active = false;
        b.mesh.visible = false;
      }
    }
  }
}

/**
 * Procedural Space Starfield dust
 */
export function createCosmicStarfield(count = 350): THREE.Points {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const col1 = new THREE.Color(0x00f0ff);
  const col2 = new THREE.Color(0xb829dd);
  const col3 = new THREE.Color(0xffffff);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = Math.random() * 25 + 4;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);

    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) + 1.2;
    positions[i3 + 2] = r * Math.cos(phi);

    const pick = Math.random();
    const c = pick < 0.4 ? col1 : pick < 0.7 ? col2 : col3;
    colors[i3] = c.r;
    colors[i3 + 1] = c.g;
    colors[i3 + 2] = c.b;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.08,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  return new THREE.Points(geo, mat);
}

/**
 * 6-Part Composite Cyber Gauntlet for Hand Tracking / Controller Mount
 */
export interface CyberGauntlet {
  group: THREE.Group;
  muzzlePoint: THREE.Object3D;
  energyRing?: THREE.Mesh;
  emitterDish?: THREE.Mesh;
  side: 'left' | 'right';
  update: (time: number) => void;
}

export function createCyberGauntlet(side: 'left' | 'right'): CyberGauntlet {
  const group = new THREE.Group();
  group.name = `CyberGauntlet_${side}`;

  // 1. Forearm armor sleeve
  const sleeveGeo = new THREE.CylinderGeometry(0.045, 0.055, 0.16, 16);
  const sleeveMat = new THREE.MeshStandardMaterial({
    color: 0x141a26,
    roughness: 0.35,
    metalness: 0.9,
  });
  const sleeve = new THREE.Mesh(sleeveGeo, sleeveMat);
  sleeve.rotation.x = Math.PI / 2;
  sleeve.position.set(0, 0, 0.06);
  group.add(sleeve);

  // 2. Armor plating shell (beveled dorsal cover)
  const plateGeo = new THREE.BoxGeometry(0.075, 0.02, 0.15);
  const plateMat = new THREE.MeshStandardMaterial({
    color: side === 'right' ? 0x00f0ff : 0xb829dd,
    emissive: side === 'right' ? 0x004466 : 0x441166,
    emissiveIntensity: 0.4,
    roughness: 0.25,
    metalness: 0.8,
  });
  const plate = new THREE.Mesh(plateGeo, plateMat);
  plate.position.set(0, 0.045, 0.06);
  group.add(plate);

  // 3. Knuckle energy conduits
  const conduitMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00c8e0,
    emissiveIntensity: 1.2,
    roughness: 0.1,
  });
  for (let k = -2; k <= 2; k++) {
    const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.05, 8), conduitMat);
    conduit.rotation.x = Math.PI / 2;
    conduit.position.set(k * 0.014, 0.04, -0.01);
    group.add(conduit);
  }

  // 4. Muzzle / Finger Tip Emitter Point
  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, 0.02, -0.12);
  group.add(muzzlePoint);

  let energyRing: THREE.Mesh | undefined;
  let emitterDish: THREE.Mesh | undefined;

  if (side === 'right') {
    // Blaster Barrel & Focusing Ring for Right Hand
    const barrelGeo = new THREE.CylinderGeometry(0.014, 0.018, 0.08, 12);
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x222a36,
      metalness: 0.95,
      roughness: 0.2,
    });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.06);
    group.add(barrel);

    const ringGeo = new THREE.TorusGeometry(0.028, 0.004, 12, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.85,
    });
    energyRing = new THREE.Mesh(ringGeo, ringMat);
    energyRing.position.copy(muzzlePoint.position);
    group.add(energyRing);
  } else {
    // Holographic Emitter Projector Dish for Left Hand
    const dishGeo = new THREE.CylinderGeometry(0.032, 0.02, 0.015, 16);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0x334466,
      metalness: 0.85,
      roughness: 0.3,
    });
    emitterDish = new THREE.Mesh(dishGeo, dishMat);
    emitterDish.position.set(0, 0.06, 0.04);
    group.add(emitterDish);

    const haloGeo = new THREE.RingGeometry(0.024, 0.035, 16);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xb829dd,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(0, 0.07, 0.04);
    group.add(halo);
  }

  return {
    group,
    muzzlePoint,
    energyRing,
    emitterDish,
    side,
    update(time: number) {
      if (energyRing) {
        energyRing.rotation.z = time * 4.0;
        const s = 1.0 + Math.sin(time * 8.0) * 0.15;
        energyRing.scale.set(s, s, s);
      }
    },
  };
}

/**
 * 3D Holographic Wrist HUD attached to the Left Hand
 */
export interface WristHUD {
  group: THREE.Group;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  mesh: THREE.Mesh;
  empButtonMesh: THREE.Mesh;
  shieldButtonMesh: THREE.Mesh;
  weaponButtonMesh: THREE.Mesh;
  update: (
    coreHp: number,
    empPct: number,
    shieldCooldown: number,
    enemies: THREE.Vector3[],
    time: number
  ) => void;
  setWeaponMode?: (mode: string) => void;
}

export function createHolographicWristHUD(): WristHUD {
  const group = new THREE.Group();
  group.name = 'HolographicWristHUD';

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d')!;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const hudMat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const hudPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.135), hudMat);
  hudPlane.rotation.x = -Math.PI / 4; // Tilted toward user gaze
  hudPlane.position.set(0, 0.12, 0.02);
  group.add(hudPlane);

  // 3 Physical 3D Touchable Button Meshes on the hologram frame
  const btnGeo = new THREE.BoxGeometry(0.045, 0.016, 0.008);
  const btnMatEmp = new THREE.MeshStandardMaterial({
    color: 0xb829dd,
    emissive: 0x8811bb,
    emissiveIntensity: 0.6,
    roughness: 0.3,
  });
  const btnMatShield = new THREE.MeshStandardMaterial({
    color: 0x00ff88,
    emissive: 0x00aa55,
    emissiveIntensity: 0.6,
    roughness: 0.3,
  });
  const btnMatWeapon = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x0088cc,
    emissiveIntensity: 0.6,
    roughness: 0.3,
  });

  const empButtonMesh = new THREE.Mesh(btnGeo, btnMatEmp);
  empButtonMesh.name = 'WristBtn_EMP';
  empButtonMesh.position.set(-0.055, -0.045, 0.004);
  hudPlane.add(empButtonMesh);

  const shieldButtonMesh = new THREE.Mesh(btnGeo, btnMatShield);
  shieldButtonMesh.name = 'WristBtn_Shield';
  shieldButtonMesh.position.set(0, -0.045, 0.004);
  hudPlane.add(shieldButtonMesh);

  const weaponButtonMesh = new THREE.Mesh(btnGeo, btnMatWeapon);
  weaponButtonMesh.name = 'WristBtn_Weapon';
  weaponButtonMesh.position.set(0.055, -0.045, 0.004);
  hudPlane.add(weaponButtonMesh);

  let currentWeaponMode = 'SINGLE';

  return {
    group,
    canvas,
    context: ctx,
    texture,
    mesh: hudPlane,
    empButtonMesh,
    shieldButtonMesh,
    weaponButtonMesh,
    update(coreHp, empPct, shieldCooldown, enemies, time) {
      ctx.clearRect(0, 0, 512, 384);

      // Background Cyber Card Frame
      ctx.fillStyle = 'rgba(6, 12, 28, 0.92)';
      ctx.fillRect(10, 10, 492, 364);

      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.strokeRect(10, 10, 492, 364);

      // Top Header
      ctx.font = 'bold 22px Noto Sans KR, Orbitron, sans-serif';
      ctx.fillStyle = '#00f0ff';
      ctx.fillText('손목 전술 레이더 HUD', 26, 46);

      // Core Integrity Bar
      ctx.font = '16px Noto Sans KR, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`🛡️ 코어 체력: ${Math.round(coreHp)}%`, 26, 76);

      ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
      ctx.fillRect(26, 84, 240, 16);
      const hpColor = coreHp > 40 ? '#00ff88' : '#ff2244';
      ctx.fillStyle = hpColor;
      ctx.fillRect(26, 84, (Math.max(0, coreHp) / 100) * 240, 16);

      // Mini 360 Radar (Right side)
      const radarCenterX = 380;
      const radarCenterY = 135;
      const radarRadius = 60;

      ctx.beginPath();
      ctx.arc(radarCenterX, radarCenterY, radarRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 30, 60, 0.6)';
      ctx.fill();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Radar Range Rings & Crosshair
      ctx.beginPath();
      ctx.arc(radarCenterX, radarCenterY, radarRadius * 0.5, 0, Math.PI * 2);
      ctx.moveTo(radarCenterX - radarRadius, radarCenterY);
      ctx.lineTo(radarCenterX + radarRadius, radarCenterY);
      ctx.moveTo(radarCenterX, radarCenterY - radarRadius);
      ctx.lineTo(radarCenterX, radarCenterY + radarRadius);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
      ctx.stroke();

      // Radar sweep line
      const sweepAngle = (time * 3.0) % (Math.PI * 2);
      ctx.beginPath();
      ctx.moveTo(radarCenterX, radarCenterY);
      ctx.lineTo(
        radarCenterX + Math.cos(sweepAngle) * radarRadius,
        radarCenterY + Math.sin(sweepAngle) * radarRadius
      );
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Center Core Dot
      ctx.beginPath();
      ctx.arc(radarCenterX, radarCenterY, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#00f0ff';
      ctx.fill();

      // Enemy dots on radar
      for (const e of enemies) {
        // Map world x,z to radar (scale 8m -> radarRadius)
        const rx = radarCenterX + (e.x / 9) * radarRadius;
        const ry = radarCenterY + (e.z / 9) * radarRadius;
        if (Math.hypot(rx - radarCenterX, ry - radarCenterY) <= radarRadius) {
          ctx.beginPath();
          ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#ff2244';
          ctx.fill();
        }
      }

      // 3 Action Buttons Info
      // 1. EMP
      ctx.fillStyle = empPct >= 100 ? '#b829dd' : '#663377';
      ctx.fillRect(26, 275, 140, 65);
      ctx.strokeStyle = '#e066ff';
      ctx.strokeRect(26, 275, 140, 65);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Noto Sans KR, sans-serif';
      ctx.fillText('[1] 폭탄', 48, 305);
      ctx.font = '13px Noto Sans KR, sans-serif';
      ctx.fillText(empPct >= 100 ? '준비완료' : `${Math.round(empPct)}%`, 50, 328);

      // 2. SHIELD
      const shieldReady = shieldCooldown <= 0;
      ctx.fillStyle = shieldReady ? '#00aa55' : '#114422';
      ctx.fillRect(186, 275, 140, 65);
      ctx.strokeStyle = '#00ff88';
      ctx.strokeRect(186, 275, 140, 65);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Noto Sans KR, sans-serif';
      ctx.fillText('[2] 방패', 210, 305);
      ctx.font = '13px Noto Sans KR, sans-serif';
      ctx.fillText(shieldReady ? '준비완료' : `${Math.ceil(shieldCooldown)}초`, 215, 328);

      // 3. WEAPON
      ctx.fillStyle = '#005588';
      ctx.fillRect(346, 275, 140, 65);
      ctx.strokeStyle = '#00f0ff';
      ctx.strokeRect(346, 275, 140, 65);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Noto Sans KR, sans-serif';
      ctx.fillText('[3] 무기', 372, 305);
      ctx.font = '13px Noto Sans KR, sans-serif';
      const modeKorean = currentWeaponMode === 'RAPID' ? '연사' : currentWeaponMode === 'SPREAD' ? '3발 산탄' : '정밀단발';
      ctx.fillText(modeKorean, 375, 328);

      texture.needsUpdate = true;
    },
    setWeaponMode(mode: string) {
      currentWeaponMode = mode;
    },
  };
}

/**
 * Precision Targeting Laser Sight & Reticle
 */
export interface TargetReticle {
  group: THREE.Group;
  laserBeam: THREE.Mesh;
  crosshair: THREE.Group;
  locked: boolean;
  setLockState: (isLocked: boolean) => void;
  updateBeam: (startPos: THREE.Vector3, endPos: THREE.Vector3) => void;
}

export function createTargetReticle(): TargetReticle {
  const group = new THREE.Group();
  group.name = 'PrecisionTargetReticle';

  // 1. Slender Laser Sight Beam
  const beamGeo = new THREE.CylinderGeometry(0.003, 0.003, 1, 8);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.65,
  });
  const laserBeam = new THREE.Mesh(beamGeo, beamMat);
  laserBeam.rotation.x = Math.PI / 2;
  group.add(laserBeam);

  // 2. Crosshair Assembly (3D Reticle at end of beam)
  const crosshair = new THREE.Group();
  crosshair.name = 'CrosshairHead';

  // Inner ring
  const ringGeo = new THREE.RingGeometry(0.035, 0.042, 24);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  crosshair.add(ring);

  // Center pip
  const pipGeo = new THREE.CircleGeometry(0.008, 12);
  const pip = new THREE.Mesh(pipGeo, ringMat);
  crosshair.add(pip);

  // 4 Target Chevrons
  for (let c = 0; c < 4; c++) {
    const angle = (c * Math.PI) / 2;
    const chevGeo = new THREE.PlaneGeometry(0.016, 0.005);
    const chev = new THREE.Mesh(chevGeo, ringMat);
    chev.position.set(Math.cos(angle) * 0.065, Math.sin(angle) * 0.065, 0);
    chev.rotation.z = angle;
    crosshair.add(chev);
  }

  group.add(crosshair);

  let locked = false;

  return {
    group,
    laserBeam,
    crosshair,
    locked,
    setLockState(isLocked: boolean) {
      if (locked === isLocked) return;
      locked = isLocked;
      const targetColor = isLocked ? 0xff2255 : 0x00f0ff;
      beamMat.color.setHex(targetColor);
      beamMat.opacity = isLocked ? 0.95 : 0.65;
      ringMat.color.setHex(targetColor);
      crosshair.scale.setScalar(isLocked ? 1.3 : 1.0);
    },
    updateBeam(startPos: THREE.Vector3, endPos: THREE.Vector3) {
      const distance = startPos.distanceTo(endPos);
      laserBeam.scale.set(1, distance, 1);
      laserBeam.position.copy(startPos).lerp(endPos, 0.5);
      laserBeam.lookAt(endPos);
      laserBeam.rotateX(Math.PI / 2);

      crosshair.position.copy(endPos);
      crosshair.lookAt(startPos);
    },
  };
}

