import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as xb from 'xrblocks';

import { soundManager } from './audio/SoundSynthesizer.js';
import { createSpaceshipCockpit, type CockpitController } from './models/CockpitModel.js';
import { ParticleFXPool } from './models/ProceduralAssets.js';
import { TerrainManager, type BiomeType } from './game/TerrainManager.js';
import { SpatialUIManager } from './ui/SpatialUI.js';
import { FlightTrailSystem } from './effects/FlightTrailSystem.js';

// Pre-allocated math helpers to ensure zero GC in the render loop
const _tempVec3A = new THREE.Vector3();
const _tempVec3B = new THREE.Vector3();

interface LaserBolt {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  lifetime: number;
}

enum FlightGameState {
  TITLE = 'TITLE',
  FLYING = 'FLYING',
  CRASHED = 'CRASHED',
}

class SpaceshipFlightGame extends xb.Script {
  private gameState: FlightGameState = FlightGameState.TITLE;

  // 3D Cockpit & Flight Controls
  private cockpit!: CockpitController;
  private terrainManager!: TerrainManager;
  private particlePool!: ParticleFXPool;
  private spatialUI!: SpatialUIManager;
  private flightTrails!: FlightTrailSystem;

  // Flight Dynamics & Steering
  private pitch = 0; // -1 to +1
  private roll = 0;  // -1 to +1
  private targetPitch = 0;
  private targetRoll = 0;
  private throttle = 0.35; // 0 to 1
  private currentSpeed = 65; // km/h scaled to m/s
  private baseSpeed = 65;
  private maxBoostSpeed = 140;

  // Ship Status
  private shield = 100;
  private boost = 100;
  private isBoosting = false;
  private distanceTraveled = 0;
  private score = 0;
  private ringsCollected = 0;
  private cameraShake = 0;

  // Weapons & Projectiles
  private laserProjectiles: LaserBolt[] = [];
  private fireCooldown = 0;

  // Laser Bolt Material
  private laserMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  private laserGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.2, 8);

  // Key tracking for smooth controls
  private keys: Record<string, boolean> = {};

  // DOM Elements
  private domOverlay = {
    topBar: document.getElementById('top-bar'),
    bottomDock: document.getElementById('bottom-dock'),
    controlHints: document.getElementById('control-hints'),
    coreHpBar: document.getElementById('core-hp-bar'),
    coreHpText: document.getElementById('core-hp-text'),
    scoreText: document.getElementById('score-text'),
    waveNum: document.getElementById('wave-num'),
    comboText: document.getElementById('combo-display'),
    empBar: document.getElementById('emp-meter-bar'),
    empStatusText: document.getElementById('emp-status-text'),
    btnFire: document.getElementById('btn-fire') as HTMLButtonElement | null,
    btnEmp: document.getElementById('btn-emp') as HTMLButtonElement | null,
    btnShield: document.getElementById('btn-shield') as HTMLButtonElement | null,
    btnWeapon: document.getElementById('btn-weapon') as HTMLButtonElement | null,
    weaponModeText: document.getElementById('weapon-mode-text'),
    btnHelp: document.getElementById('btn-help') as HTMLButtonElement | null,
    easyGuideModal: document.getElementById('easy-guide-modal'),
    btnStartGame: document.getElementById('btn-start-game') as HTMLButtonElement | null,
    btnSound: document.getElementById('btn-sound') as HTMLButtonElement | null,
    soundIcon: document.getElementById('sound-icon'),
    announcement: document.getElementById('announcement-banner'),
    announcementTitle: document.getElementById('announcement-title'),
    announcementSubtitle: document.getElementById('announcement-subtitle'),
  };

  init() {
    this.setupLightingAndEnvironment();
    this.setupCockpitAndTerrains();
    this.setupSpatialUI();
    this.setupInputEvents();

    this.showTitleScreen();
  }

  private setupLightingAndEnvironment() {
    // Warm Key Directional Light
    const sunLight = new THREE.DirectionalLight(0xfff0dd, 2.5);
    sunLight.position.set(20, 45, -30);
    sunLight.castShadow = true;
    this.add(sunLight);

    // Cool Sky & Ground Hemisphere Fill
    const hemiLight = new THREE.HemisphereLight(0x70bbff, 0x221133, 1.8);
    this.add(hemiLight);

    // Procedural RoomEnvironment reflections for cockpit glass & metallics
    if (xb.core.renderer) {
      try {
        const glRenderer = xb.core.renderer as unknown as THREE.WebGLRenderer;
        if (glRenderer && typeof glRenderer.render === 'function') {
          const pmrem = new THREE.PMREMGenerator(glRenderer);
          xb.core.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
          pmrem.dispose();
        }
      } catch (err) {
        console.warn('Could not setup RoomEnvironment', err);
      }
    }

    // Particle FX Pool
    this.particlePool = new ParticleFXPool(xb.core.scene, 16, 40);
  }

  private setupCockpitAndTerrains() {
    // 1. Spaceship Cockpit & Flight Yoke
    this.cockpit = createSpaceshipCockpit();
    this.add(this.cockpit.group);

    // Position cockpit so the camera is seated directly in the pilot's view
    this.cockpit.group.position.set(0, 0, 0);

    // 2. Dynamic Streaming Terrain Manager (Canyon, Cyber City, Crystal Nebula)
    this.terrainManager = new TerrainManager(xb.core.scene);

    // 3. Motion Residual Trail & Warp Speed Lines Effect System
    this.flightTrails = new FlightTrailSystem(xb.core.scene);
  }

  private setupSpatialUI() {
    this.spatialUI = new SpatialUIManager({
      onStartGame: () => this.startFlight(),
      onRestartGame: () => this.startFlight(),
      onTriggerEMP: () => this.triggerHyperBoost(),
      onTriggerShield: () => this.rechargeShield(),
    });

    this.spatialUI.titleCard.position.set(0, 0.4, -1.8);
    this.spatialUI.gameOverCard.position.set(0, 0.4, -1.8);

    this.add(this.spatialUI.titleCard);
    this.add(this.spatialUI.statusCard);
    this.add(this.spatialUI.gameOverCard);
  }

  private setupInputEvents() {
    // 2D Button events
    this.domOverlay.btnStartGame?.addEventListener('click', () => {
      this.hideGuideModal();
      this.startFlight();
    });
    this.domOverlay.btnHelp?.addEventListener('click', () => {
      this.showGuideModal();
    });
    this.domOverlay.btnFire?.addEventListener('click', () => this.fireCannons());
    this.domOverlay.btnEmp?.addEventListener('click', () => this.triggerHyperBoost());
    this.domOverlay.btnShield?.addEventListener('click', () => this.rechargeShield());
    this.domOverlay.btnWeapon?.addEventListener('click', () => this.toggleBoost());
    this.domOverlay.btnSound?.addEventListener('click', () => {
      const isMuted = soundManager.toggleMute();
      if (this.domOverlay.soundIcon) {
        this.domOverlay.soundIcon.textContent = isMuted ? '🔇' : '🔊';
      }
    });

    // Keyboard Flight Controls
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (e.code === 'Space') {
        e.preventDefault();
        if (this.gameState === FlightGameState.TITLE || this.gameState === FlightGameState.CRASHED) {
          this.startFlight();
        } else {
          this.fireCannons();
        }
      } else if (e.code === 'Digit1') {
        this.triggerHyperBoost();
      } else if (e.code === 'Digit2') {
        this.rechargeShield();
      } else if (e.code === 'Digit3' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.toggleBoost();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.isBoosting = false;
      }
    });

    // Mouse Steering Controls
    window.addEventListener('pointermove', (e) => {
      if (this.gameState !== FlightGameState.FLYING) return;
      // Normalized coordinates (-1 to +1 from screen center)
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;

      // Roll banks left/right, Pitch pulls up/down
      this.targetRoll = nx;
      this.targetPitch = ny;
    });

    window.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement)?.closest('#game-overlay button')) return;
      if (this.gameState === FlightGameState.FLYING) {
        this.fireCannons();
      }
    });
  }

  /**
   * XR Controller & Hand Selection
   */
  onSelectStart(event: xb.SelectEvent) {
    if (this.gameState === FlightGameState.FLYING) {
      this.fireCannons();
    }
  }

  public showGuideModal() {
    this.domOverlay.easyGuideModal?.classList.remove('hidden');
  }

  public hideGuideModal() {
    this.domOverlay.easyGuideModal?.classList.add('hidden');
  }

  private showTitleScreen() {
    this.gameState = FlightGameState.TITLE;
    this.spatialUI.showTitle();
    this.showGuideModal();
    this.domOverlay.topBar?.classList.add('hidden');
    this.domOverlay.bottomDock?.classList.add('hidden');
    this.domOverlay.controlHints?.classList.add('hidden');
  }

  private startFlight() {
    this.gameState = FlightGameState.FLYING;
    this.hideGuideModal();
    this.shield = 100;
    this.boost = 100;
    this.distanceTraveled = 0;
    this.score = 0;
    this.ringsCollected = 0;
    this.pitch = 0;
    this.roll = 0;
    this.targetPitch = 0;
    this.targetRoll = 0;
    this.currentSpeed = this.baseSpeed;
    this.terrainManager.reset();
    this.flightTrails.reset();

    this.spatialUI.showPlaying();
    this.domOverlay.topBar?.classList.remove('hidden');
    this.domOverlay.bottomDock?.classList.remove('hidden');
    this.domOverlay.controlHints?.classList.remove('hidden');

    this.showAnnouncement('🚀 조종간 비행 시작!', '협곡과 메가시티를 질주하며 링을 통과하세요');
    soundManager.playWaveStart();
  }

  private showAnnouncement(title: string, subtitle: string) {
    if (this.domOverlay.announcementTitle && this.domOverlay.announcementSubtitle) {
      this.domOverlay.announcementTitle.textContent = title;
      this.domOverlay.announcementSubtitle.textContent = subtitle;
    }
    this.domOverlay.announcement?.classList.remove('hidden');
    setTimeout(() => {
      this.domOverlay.announcement?.classList.add('hidden');
    }, 2800);
  }

  /**
   * Twin Plasma Cannon Fire
   */
  public fireCannons() {
    if (this.gameState !== FlightGameState.FLYING || this.fireCooldown > 0) return;
    this.fireCooldown = 0.16;

    soundManager.playLaser();
    this.cockpit.triggerMuzzleFlash('both');

    // Spawn Left & Right bolts
    const leftOrigin = _tempVec3A;
    const rightOrigin = _tempVec3B;
    this.cockpit.leftCannonMuzzle.getWorldPosition(leftOrigin);
    this.cockpit.rightCannonMuzzle.getWorldPosition(rightOrigin);

    this.spawnBolt(leftOrigin);
    this.spawnBolt(rightOrigin);

    this.particlePool.spawn(leftOrigin, 0x00f0ff, 0.4);
    this.particlePool.spawn(rightOrigin, 0x00f0ff, 0.4);
  }

  private spawnBolt(origin: THREE.Vector3) {
    const bolt = new THREE.Mesh(this.laserGeo, this.laserMat);
    bolt.rotation.x = Math.PI / 2;
    bolt.position.copy(origin);
    this.add(bolt);

    this.laserProjectiles.push({
      mesh: bolt,
      velocity: new THREE.Vector3(0, 0, -180), // Fast forward projectile
      lifetime: 1.2,
    });
  }

  public toggleBoost() {
    this.isBoosting = !this.isBoosting;
    if (this.isBoosting) soundManager.playBoost();
  }

  public triggerHyperBoost() {
    if (this.boost < 40) return;
    this.boost = Math.max(0, this.boost - 40);
    this.isBoosting = true;
    soundManager.playBoost();
    setTimeout(() => {
      this.isBoosting = false;
    }, 3200);
  }

  public rechargeShield() {
    if (this.shield >= 100) return;
    this.shield = Math.min(100, this.shield + 35);
    soundManager.playShield();
  }

  private crashShip() {
    this.gameState = FlightGameState.CRASHED;
    soundManager.playExplosion(true);
    this.cameraShake = 0.8;

    this.spatialUI.showGameOver(
      false,
      Math.round(this.distanceTraveled),
      this.ringsCollected,
      this.score
    );

    this.showAnnouncement('💥 비행선 충돌!', '조종관 조작에 유의하여 다시 비행하세요');
  }

  /**
   * Main 60fps Loop
   */
  update() {
    const rawDt = xb.getDeltaTime();
    const dt = Math.min(rawDt, 0.05);
    const time = performance.now() * 0.001;

    // 1. Process Steering Inputs (Keyboard & XR Controller)
    if (this.gameState === FlightGameState.FLYING) {
      // Keyboard steering
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.targetRoll = -0.85;
      else if (this.keys['KeyD'] || this.keys['ArrowRight']) this.targetRoll = 0.85;
      else if (!this.targetRoll) this.targetRoll = 0;

      if (this.keys['KeyW'] || this.keys['ArrowUp']) this.targetPitch = -0.7; // Nose down
      else if (this.keys['KeyS'] || this.keys['ArrowDown']) this.targetPitch = 0.7; // Nose up
      else if (!this.targetPitch) this.targetPitch = 0;

      // XR Hand / Controller Steering override
      const hands = xb.core.user?.hands || xb.user?.hands;
      const controllers = xb.core.input?.controllers || xb.user?.controllers || [];

      if (hands?.getIndexTip?.(xb.Handedness.RIGHT) || controllers.length > 0) {
        const ctrl = controllers[0] || controllers[1];
        if (ctrl) {
          // Read controller tilt
          this.targetRoll = -ctrl.rotation.z * 1.5;
          this.targetPitch = ctrl.rotation.x * 1.5;
        }
      }

      // Smooth Exponential Damping for Steering
      this.roll = THREE.MathUtils.damp(this.roll, this.targetRoll, 8.0, dt);
      this.pitch = THREE.MathUtils.damp(this.pitch, this.targetPitch, 8.0, dt);

      // Speed Dynamics & Boost
      if (this.isBoosting && this.boost > 0) {
        this.currentSpeed = THREE.MathUtils.damp(this.currentSpeed, this.maxBoostSpeed, 6.0, dt);
        this.boost = Math.max(0, this.boost - dt * 25);
      } else {
        this.currentSpeed = THREE.MathUtils.damp(this.currentSpeed, this.baseSpeed, 4.0, dt);
        this.boost = Math.min(100, this.boost + dt * 8);
      }

      this.throttle = (this.currentSpeed - this.baseSpeed) / (this.maxBoostSpeed - this.baseSpeed);
      this.distanceTraveled += this.currentSpeed * dt;
      this.score += Math.round(this.currentSpeed * dt * 0.5);

      // Sound Engine Hum
      soundManager.updateEngineHum(this.throttle);
    }

    // 2. Animate Spaceship Cockpit, Flight Yoke & Pilot Hands
    this.cockpit.updateSteering(this.pitch, this.roll, this.throttle, time);

    // Apply Bank and Pitch tilt to Cockpit to give authentic flying sensation
    this.cockpit.group.rotation.z = -this.roll * 0.35;
    this.cockpit.group.rotation.x = -this.pitch * 0.25;

    // 3. Update Motion Residual Trail (Ribbon Streamers & Warp Speed Lines)
    const leftWingPos = _tempVec3A;
    const rightWingPos = _tempVec3B;
    this.cockpit.leftCannonMuzzle.getWorldPosition(leftWingPos);
    this.cockpit.rightCannonMuzzle.getWorldPosition(rightWingPos);

    this.flightTrails.update(
      leftWingPos,
      rightWingPos,
      dt,
      this.gameState === FlightGameState.FLYING ? this.currentSpeed : 12,
      this.isBoosting
    );

    // 4. Update Dynamic Streaming Terrains & Obstacles
    const { ringsHit, obstacleHit } = this.terrainManager.update(
      dt,
      this.gameState === FlightGameState.FLYING ? this.currentSpeed : 10,
      time
    );

    // Handle Energy Ring Collection
    for (const ring of ringsHit) {
      soundManager.playRingCollect();
      this.ringsCollected++;
      this.score += 250;
      this.boost = 100; // Refill boost
      this.particlePool.spawn(ring.position, 0x00f0ff, 1.8);
      this.showAnnouncement('⚡ 부스트 링 통과!', '+250 점수 획득 & 부스트 완충!');
    }

    // Handle Obstacle Collision
    if (obstacleHit && this.gameState === FlightGameState.FLYING) {
      soundManager.playExplosion(false);
      this.shield -= 30;
      this.cameraShake = 0.45;
      this.particlePool.spawn(obstacleHit.position, 0xff2244, 2.0);

      if (this.shield <= 0) {
        this.crashShip();
      }
    }

    // 4. Update Laser Projectiles
    if (this.fireCooldown > 0) this.fireCooldown -= dt;

    for (let p = this.laserProjectiles.length - 1; p >= 0; p--) {
      const bolt = this.laserProjectiles[p];
      bolt.mesh.position.addScaledVector(bolt.velocity, dt);
      bolt.lifetime -= dt;

      // Check collision with terrain obstacles
      const { hit, obstacle } = this.terrainManager.checkLaserHits(bolt.mesh.position, 35);
      if (hit) {
        soundManager.playHit();
        this.particlePool.spawn(bolt.mesh.position, 0xffb020, 1.2);
        this.score += 100;
        bolt.mesh.removeFromParent();
        this.laserProjectiles.splice(p, 1);
        continue;
      }

      if (bolt.lifetime <= 0) {
        bolt.mesh.removeFromParent();
        this.laserProjectiles.splice(p, 1);
      }
    }

    // 5. Update Particle System & Camera Shake
    this.particlePool.update(dt);

    if (this.cameraShake > 0) {
      this.cameraShake = Math.max(0, this.cameraShake - dt * 2.5);
      const cam = xb.core.camera;
      cam.position.x = (Math.random() - 0.5) * this.cameraShake * 0.09;
      cam.position.y = (Math.random() - 0.5) * this.cameraShake * 0.09;
    }

    // 6. Update Cockpit Dashboard Screen & 2D DOM HUD
    this.cockpit.updateHUD(
      this.currentSpeed * 3.6, // km/h
      320 + this.pitch * 60,
      this.shield,
      this.boost,
      Math.round(this.distanceTraveled),
      time
    );

    this.updateDomHUD();
  }

  private updateDomHUD() {
    if (this.domOverlay.coreHpBar) {
      this.domOverlay.coreHpBar.style.width = `${Math.max(0, this.shield)}%`;
      if (this.shield < 35) this.domOverlay.coreHpBar.classList.add('danger');
      else this.domOverlay.coreHpBar.classList.remove('danger');
    }
    if (this.domOverlay.coreHpText) {
      this.domOverlay.coreHpText.textContent = `${Math.round(this.shield)}%`;
    }
    if (this.domOverlay.scoreText) {
      this.domOverlay.scoreText.textContent = Math.round(this.distanceTraveled)
        .toString()
        .padStart(4, '0');
    }
    if (this.domOverlay.waveNum) {
      const biomeKorean =
        this.terrainManager.currentBiome === 'CANYON'
          ? '화성 붉은 협곡'
          : this.terrainManager.currentBiome === 'CYBER_CITY'
            ? '사이버 메가시티'
            : '크리스탈 성운';
      this.domOverlay.waveNum.textContent = biomeKorean;
    }
    if (this.domOverlay.comboText) {
      this.domOverlay.comboText.textContent = `링 통과: ${this.ringsCollected}개`;
    }
    if (this.domOverlay.empBar) {
      this.domOverlay.empBar.style.width = `${this.boost}%`;
    }
    if (this.domOverlay.empStatusText) {
      this.domOverlay.empStatusText.textContent = `부스트: ${Math.round(this.boost)}%`;
    }
    if (this.domOverlay.weaponModeText) {
      this.domOverlay.weaponModeText.textContent = this.isBoosting ? '가속 중 🚀' : '순항 중 🛸';
    }
  }

  dispose() {
    for (const p of this.laserProjectiles) p.mesh.removeFromParent();
    this.laserProjectiles = [];
    this.terrainManager.reset();
    this.flightTrails?.reset();
  }
}

// App Initialization with XR Blocks Options
document.addEventListener('DOMContentLoaded', () => {
  const options = new xb.Options();
  options.setAppTitle('Cosmic Starfighter Flight XR');
  options.setAppDescription(
    'Step inside the spaceship cockpit, grip the flight control yoke with your hands, and fly through dynamic canyons and cyber cities.'
  );

  // Enable Hands & Controller tracking for flight stick manipulation
  options.enableHands();
  options.hands.visualization = true;
  options.hands.visualizeJoints = true;
  options.hands.visualizeMeshes = true;
  options.enableReticles();
  options.simulator.defaultMode = xb.SimulatorMode.CONTROLLER;
  options.xrButton.showEnterSimulatorButton = true;

  xb.add(new SpaceshipFlightGame());
  xb.init(options);
});
