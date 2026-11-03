import * as THREE from 'three';
import { createGlowTexture } from '../models/ProceduralAssets.js';

/**
 * Dynamic Streaming Terrain Manager for Spaceship Flight
 * Seamlessly generates and transitions through 3 distinct biomes:
 * 1. Canyon: Rocky canyon walls, stone arches, spires
 * 2. Cyber City: High-tech skyscrapers, skybridges, neon grid structures
 * 3. Crystal Nebula: Giant floating crystal monoliths, asteroid obstacles
 */

export type BiomeType = 'CANYON' | 'CYBER_CITY' | 'CRYSTAL_NEBULA';

export interface BoostRing {
  mesh: THREE.Group;
  position: THREE.Vector3;
  radius: number;
  collected: boolean;
}

export interface TerrainObstacle {
  mesh: THREE.Group | THREE.Mesh;
  position: THREE.Vector3;
  radius: number;
  hp: number;
  isAlive: boolean;
  type: 'rock' | 'building' | 'crystal' | 'drone';
}

export class TerrainManager {
  public group = new THREE.Group();
  public currentBiome: BiomeType = 'CANYON';

  private groundTiles: THREE.Mesh[] = [];
  private canyonWalls: THREE.Mesh[] = [];
  private obstacles: TerrainObstacle[] = [];
  private boostRings: BoostRing[] = [];

  private speed = 45; // meters per second
  private biomeTimer = 0;
  private readonly BIOME_DURATION = 24.0; // Switch biome every 24 seconds

  // Materials for Biomes
  private canyonGroundMat: THREE.MeshStandardMaterial;
  private canyonWallMat: THREE.MeshStandardMaterial;
  private cityGroundMat: THREE.MeshStandardMaterial;
  private cityBuildingMat: THREE.MeshStandardMaterial;
  private crystalGroundMat: THREE.MeshStandardMaterial;
  private crystalMat: THREE.MeshStandardMaterial;

  private ringMat: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.group.name = 'TerrainManager';
    scene.add(this.group);

    // 1. Canyon Materials (Terracotta / Red rock)
    this.canyonGroundMat = new THREE.MeshStandardMaterial({
      color: 0x8b3a1e,
      roughness: 0.85,
      metalness: 0.15,
    });
    this.canyonWallMat = new THREE.MeshStandardMaterial({
      color: 0xa84a28,
      roughness: 0.8,
      metalness: 0.2,
    });

    // 2. Cyber City Materials
    this.cityGroundMat = new THREE.MeshStandardMaterial({
      color: 0x09101d,
      roughness: 0.3,
      metalness: 0.85,
    });
    this.cityBuildingMat = new THREE.MeshStandardMaterial({
      color: 0x121e33,
      roughness: 0.25,
      metalness: 0.9,
    });

    // 3. Crystal Nebula Materials
    this.crystalGroundMat = new THREE.MeshStandardMaterial({
      color: 0x1a0f2b,
      roughness: 0.7,
      metalness: 0.4,
    });
    this.crystalMat = new THREE.MeshStandardMaterial({
      color: 0xb829dd,
      emissive: 0x7711aa,
      emissiveIntensity: 0.8,
      roughness: 0.15,
      metalness: 0.7,
    });

    // Boost Ring Material
    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
    });

    this.initTerrainTrack();
  }

  private initTerrainTrack() {
    // Generate endless forward track segments (4 segments, each 60m long)
    const segmentLength = 60;
    for (let i = 0; i < 5; i++) {
      const z = -i * segmentLength;
      this.createGroundSegment(z, segmentLength);
      this.spawnBiomeFeatures(z - segmentLength / 2, this.currentBiome);
    }
  }

  private createGroundSegment(z: number, length: number) {
    const geo = new THREE.PlaneGeometry(120, length, 12, 12);
    const mesh = new THREE.Mesh(geo, this.canyonGroundMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, -3.5, z);
    mesh.receiveShadow = true;
    this.group.add(mesh);
    this.groundTiles.push(mesh);
  }

  /**
   * Spawns scenic features & obstacles for the given biome at Z distance
   */
  private spawnBiomeFeatures(z: number, biome: BiomeType) {
    if (biome === 'CANYON') {
      // Canyon Cliffs on Left and Right
      this.createCanyonWall(-18, z, 1);
      this.createCanyonWall(18, z, -1);

      // Canyon Spires in corridor
      const x1 = (Math.random() - 0.5) * 16;
      this.createSpireObstacle(x1, z - Math.random() * 20);

      // Stone Arch overhead
      if (Math.random() < 0.4) {
        this.createStoneArch(z - 10);
      }
    } else if (biome === 'CYBER_CITY') {
      // Skyscraper towers flanking the corridor
      for (let s = -2; s <= 2; s += 4) {
        this.createSkyscraper(s * 7 + (Math.random() - 0.5) * 4, z);
      }
      // Center obstacle tower
      const x = (Math.random() - 0.5) * 14;
      this.createSkyscraper(x, z - 15, true);
    } else {
      // CRYSTAL_NEBULA: Giant floating crystal pillars & asteroids
      const x = (Math.random() - 0.5) * 16;
      this.createCrystalMonolith(x, z - Math.random() * 20);
      this.createAsteroid((Math.random() - 0.5) * 14, z - 30);
    }

    // Spawn Boost Ring along flight corridor
    const ringX = (Math.random() - 0.5) * 12;
    const ringY = -0.5 + (Math.random() - 0.5) * 4;
    this.createBoostRing(ringX, ringY, z - 25);
  }

  private createCanyonWall(x: number, z: number, side: number) {
    const wallGeo = new THREE.BoxGeometry(16, 24, 60);
    const wall = new THREE.Mesh(wallGeo, this.canyonWallMat);
    wall.position.set(x, 6, z);
    this.group.add(wall);
    this.canyonWalls.push(wall);
  }

  private createSpireObstacle(x: number, z: number) {
    const spireGroup = new THREE.Group();
    const coneGeo = new THREE.ConeGeometry(2.4, 18, 7);
    const cone = new THREE.Mesh(coneGeo, this.canyonWallMat);
    cone.position.y = 5.5;
    spireGroup.add(cone);

    spireGroup.position.set(x, -3.5, z);
    this.group.add(spireGroup);

    this.obstacles.push({
      mesh: spireGroup,
      position: spireGroup.position,
      radius: 2.2,
      hp: 35,
      isAlive: true,
      type: 'rock',
    });
  }

  private createStoneArch(z: number) {
    const archGroup = new THREE.Group();
    const curvePoints = [
      new THREE.Vector3(-14, -3.5, 0),
      new THREE.Vector3(-10, 8, 0),
      new THREE.Vector3(0, 11, 0),
      new THREE.Vector3(10, 8, 0),
      new THREE.Vector3(14, -3.5, 0),
    ];
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tubeGeo = new THREE.TubeGeometry(curve, 20, 2.2, 8, false);
    const arch = new THREE.Mesh(tubeGeo, this.canyonWallMat);
    archGroup.add(arch);
    archGroup.position.set(0, 0, z);
    this.group.add(archGroup);
  }

  private createSkyscraper(x: number, z: number, inCorridor = false) {
    const h = inCorridor ? 22 : 45;
    const w = inCorridor ? 3.5 : 8;
    const towerGeo = new THREE.BoxGeometry(w, h, w);
    const tower = new THREE.Mesh(towerGeo, this.cityBuildingMat);
    tower.position.set(x, h / 2 - 3.5, z);

    // Glowing cyber edge bands
    const bandGeo = new THREE.BoxGeometry(w + 0.1, 0.4, w + 0.1);
    const bandMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    for (let b = 1; b <= 3; b++) {
      const band = new THREE.Mesh(bandGeo, bandMat);
      band.position.y = (h / 4) * b - h / 2;
      tower.add(band);
    }

    this.group.add(tower);

    if (inCorridor) {
      this.obstacles.push({
        mesh: tower,
        position: tower.position,
        radius: 2.8,
        hp: 60,
        isAlive: true,
        type: 'building',
      });
    }
  }

  private createCrystalMonolith(x: number, z: number) {
    const monolith = new THREE.Group();
    const crystalGeo = new THREE.OctahedronGeometry(2.5, 0);
    crystalGeo.scale(1, 3.5, 1);
    const crystal = new THREE.Mesh(crystalGeo, this.crystalMat);
    crystal.position.y = 4;
    monolith.add(crystal);

    monolith.position.set(x, -3.5, z);
    this.group.add(monolith);

    this.obstacles.push({
      mesh: monolith,
      position: monolith.position,
      radius: 2.2,
      hp: 40,
      isAlive: true,
      type: 'crystal',
    });
  }

  private createAsteroid(x: number, z: number) {
    const geo = new THREE.DodecahedronGeometry(2.2, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x443355,
      roughness: 0.9,
    });
    const asteroid = new THREE.Mesh(geo, mat);
    asteroid.position.set(x, 0.5 + Math.random() * 3, z);
    this.group.add(asteroid);

    this.obstacles.push({
      mesh: asteroid,
      position: asteroid.position,
      radius: 2.2,
      hp: 30,
      isAlive: true,
      type: 'rock',
    });
  }

  private createBoostRing(x: number, y: number, z: number) {
    const ringGroup = new THREE.Group();
    const ringGeo = new THREE.TorusGeometry(2.2, 0.14, 12, 32);
    const ring = new THREE.Mesh(ringGeo, this.ringMat);
    ringGroup.add(ring);

    // Inner glow chevron
    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.0, 0.04, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })
    );
    ringGroup.add(innerRing);

    ringGroup.position.set(x, y, z);
    this.group.add(ringGroup);

    this.boostRings.push({
      mesh: ringGroup,
      position: ringGroup.position,
      radius: 2.2,
      collected: false,
    });
  }

  /**
   * Updates flight terrain stream: moves everything towards the spaceship (+Z)
   */
  public update(dt: number, shipSpeed: number, time: number): {
    ringsHit: BoostRing[];
    obstacleHit: TerrainObstacle | null;
  } {
    const zDelta = shipSpeed * dt;

    // Biome Cycle Timer
    this.biomeTimer += dt;
    if (this.biomeTimer >= this.BIOME_DURATION) {
      this.biomeTimer = 0;
      if (this.currentBiome === 'CANYON') {
        this.currentBiome = 'CYBER_CITY';
      } else if (this.currentBiome === 'CYBER_CITY') {
        this.currentBiome = 'CRYSTAL_NEBULA';
      } else {
        this.currentBiome = 'CANYON';
      }
    }

    // 1. Move Ground Tiles
    const segmentLength = 60;
    for (const tile of this.groundTiles) {
      tile.position.z += zDelta;
      if (tile.position.z > 30) {
        tile.position.z -= 5 * segmentLength;
        // Update material based on current biome
        tile.material =
          this.currentBiome === 'CANYON'
            ? this.canyonGroundMat
            : this.currentBiome === 'CYBER_CITY'
              ? this.cityGroundMat
              : this.crystalGroundMat;

        // Spawn new biome features ahead at distance
        this.spawnBiomeFeatures(tile.position.z - segmentLength / 2, this.currentBiome);
      }
    }

    // 2. Move Canyon Walls
    for (let i = this.canyonWalls.length - 1; i >= 0; i--) {
      const wall = this.canyonWalls[i];
      wall.position.z += zDelta;
      if (wall.position.z > 40) {
        wall.removeFromParent();
        this.canyonWalls.splice(i, 1);
      }
    }

    // 3. Move & Spin Boost Rings
    const ringsHit: BoostRing[] = [];
    for (let i = this.boostRings.length - 1; i >= 0; i--) {
      const ring = this.boostRings[i];
      ring.position.z += zDelta;
      ring.mesh.rotation.z += dt * 1.5;

      // Check collision with spaceship (around z = 0, cockpit position)
      if (
        !ring.collected &&
        Math.abs(ring.position.z) < 2.5 &&
        Math.hypot(ring.position.x, ring.position.y) < ring.radius + 0.8
      ) {
        ring.collected = true;
        ring.mesh.scale.set(1.8, 1.8, 1.8);
        ringsHit.push(ring);
      }

      if (ring.position.z > 25) {
        ring.mesh.removeFromParent();
        this.boostRings.splice(i, 1);
      }
    }

    // 4. Move Obstacles & Check Collisions
    let obstacleHit: TerrainObstacle | null = null;
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.position.z += zDelta;

      if (obs.type === 'crystal') {
        obs.mesh.rotation.y += dt * 0.8;
      } else if (obs.type === 'rock') {
        obs.mesh.rotation.x += dt * 0.4;
      }

      // Check collision with ship cockpit around (0, 0, 0)
      if (
        obs.isAlive &&
        Math.abs(obs.position.z) < 2.0 &&
        Math.hypot(obs.position.x, obs.position.y) < obs.radius + 0.5
      ) {
        obs.isAlive = false;
        obstacleHit = obs;
      }

      if (obs.position.z > 25) {
        obs.mesh.removeFromParent();
        this.obstacles.splice(i, 1);
      }
    }

    return { ringsHit, obstacleHit };
  }

  /**
   * Check collision of player laser projectiles against obstacles
   */
  public checkLaserHits(
    projectilePos: THREE.Vector3,
    damage: number
  ): { hit: boolean; obstacle: TerrainObstacle | null } {
    for (const obs of this.obstacles) {
      if (!obs.isAlive) continue;
      if (projectilePos.distanceTo(obs.position) < obs.radius + 0.6) {
        obs.hp -= damage;
        if (obs.hp <= 0) {
          obs.isAlive = false;
          obs.mesh.scale.set(0, 0, 0);
          obs.mesh.removeFromParent();
        }
        return { hit: true, obstacle: obs };
      }
    }
    return { hit: false, obstacle: null };
  }

  public getObstacles(): TerrainObstacle[] {
    return this.obstacles;
  }

  public reset() {
    for (const r of this.boostRings) r.mesh.removeFromParent();
    for (const o of this.obstacles) o.mesh.removeFromParent();
    for (const w of this.canyonWalls) w.removeFromParent();
    this.boostRings = [];
    this.obstacles = [];
    this.canyonWalls = [];
    this.currentBiome = 'CANYON';
    this.biomeTimer = 0;
  }
}
