import * as THREE from 'three';

/**
 * Procedural Spaceship Cockpit & Flight Control Stick with Pilot Hands
 * Strictly conforms to Three.js 3-12 part composite guidelines.
 */

export interface CockpitController {
  group: THREE.Group;
  yokeGroup: THREE.Group;
  yokeBase: THREE.Group;
  leftHand: THREE.Group;
  rightHand: THREE.Group;
  leftCannonMuzzle: THREE.Object3D;
  rightCannonMuzzle: THREE.Object3D;
  leftThrusterGrip: THREE.Mesh;
  dashboardScreen: THREE.Mesh;
  hudCanvas: HTMLCanvasElement;
  hudTexture: THREE.CanvasTexture;
  updateSteering: (pitch: number, roll: number, throttle: number, time: number) => void;
  updateHUD: (speed: number, altitude: number, shield: number, boost: number, score: number, time: number) => void;
  triggerMuzzleFlash: (side: 'left' | 'right' | 'both') => void;
}

export function createSpaceshipCockpit(): CockpitController {
  const group = new THREE.Group();
  group.name = 'SpaceshipCockpit';

  // 1. Cockpit Main Frame & Dashboard Console (Composite structure)
  const dashGeo = new THREE.BoxGeometry(1.6, 0.45, 0.65);
  const dashMat = new THREE.MeshStandardMaterial({
    color: 0x0f1522,
    roughness: 0.4,
    metalness: 0.85,
  });
  const dashboard = new THREE.Mesh(dashGeo, dashMat);
  dashboard.position.set(0, -0.32, -0.65);
  dashboard.rotation.x = 0.22;
  group.add(dashboard);

  // 2. Cockpit Canopy Frame Arch (Structural Ribs)
  const archPoints = [
    new THREE.Vector3(-0.95, -0.4, -0.4),
    new THREE.Vector3(-0.85, 0.55, -0.75),
    new THREE.Vector3(0, 0.72, -0.85),
    new THREE.Vector3(0.85, 0.55, -0.75),
    new THREE.Vector3(0.95, -0.4, -0.4),
  ];
  const archCurve = new THREE.CatmullRomCurve3(archPoints);
  const archGeo = new THREE.TubeGeometry(archCurve, 32, 0.035, 8, false);
  const archMat = new THREE.MeshStandardMaterial({
    color: 0x182436,
    metalness: 0.9,
    roughness: 0.25,
  });
  const canopyArch = new THREE.Mesh(archGeo, archMat);
  group.add(canopyArch);

  // Center vertical canopy strut
  const centerStrut = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.9, 8),
    archMat
  );
  centerStrut.position.set(0, 0.28, -0.8);
  centerStrut.rotation.x = 0.35;
  group.add(centerStrut);

  // 3. Left and Right Nose Plasma Cannons visible outside windshield
  const cannonMat = new THREE.MeshStandardMaterial({
    color: 0x223044,
    metalness: 0.95,
    roughness: 0.2,
  });
  const cannonGeo = new THREE.CylinderGeometry(0.045, 0.055, 0.9, 12);

  const leftCannon = new THREE.Mesh(cannonGeo, cannonMat);
  leftCannon.rotation.x = Math.PI / 2;
  leftCannon.position.set(-0.68, -0.15, -1.2);
  group.add(leftCannon);

  const rightCannon = leftCannon.clone();
  rightCannon.position.set(0.68, -0.15, -1.2);
  group.add(rightCannon);

  const leftCannonMuzzle = new THREE.Object3D();
  leftCannonMuzzle.position.set(-0.68, -0.15, -1.65);
  group.add(leftCannonMuzzle);

  const rightCannonMuzzle = new THREE.Object3D();
  rightCannonMuzzle.position.set(0.68, -0.15, -1.65);
  group.add(rightCannonMuzzle);

  // 4. Holographic Dashboard Display Screen
  const hudCanvas = document.createElement('canvas');
  hudCanvas.width = 512;
  hudCanvas.height = 256;
  const hudCtx = hudCanvas.getContext('2d')!;

  const hudTexture = new THREE.CanvasTexture(hudCanvas);
  hudTexture.colorSpace = THREE.SRGBColorSpace;

  const hudScreenMat = new THREE.MeshBasicMaterial({
    map: hudTexture,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
  });
  const dashboardScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.32), hudScreenMat);
  dashboardScreen.position.set(0, -0.08, -0.72);
  dashboardScreen.rotation.x = -0.25;
  group.add(dashboardScreen);

  // 5. Flight Control Stick & Yoke Assembly (조종관)
  const yokeBase = new THREE.Group();
  yokeBase.position.set(0, -0.36, -0.42);
  group.add(yokeBase);

  // Gimbal Ball Joint Housing
  const ballJoint = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x202838, metalness: 0.9, roughness: 0.3 })
  );
  yokeBase.add(ballJoint);

  // Movable Yoke Column & Handle
  const yokeGroup = new THREE.Group();
  yokeBase.add(yokeGroup);

  // Center vertical steering shaft
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.028, 0.28, 12),
    new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.95, roughness: 0.15 })
  );
  shaft.position.y = 0.14;
  yokeGroup.add(shaft);

  // Twin Grip Flight Yoke Handle (듀얼 조종관 핸들)
  const yokeCrossbar = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.035, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x111622, metalness: 0.8, roughness: 0.4 })
  );
  yokeCrossbar.position.set(0, 0.27, 0);
  yokeGroup.add(yokeCrossbar);

  // Left & Right Grips (인체공학적 조종관 손잡이)
  const gripGeo = new THREE.CylinderGeometry(0.02, 0.022, 0.16, 12);
  const gripMat = new THREE.MeshStandardMaterial({
    color: 0x1d283a,
    roughness: 0.7,
    metalness: 0.2,
  });

  const leftGrip = new THREE.Mesh(gripGeo, gripMat);
  leftGrip.position.set(-0.16, 0.27, 0.015);
  leftGrip.rotation.z = -0.15;
  yokeGroup.add(leftGrip);

  const rightGrip = new THREE.Mesh(gripGeo, gripMat);
  rightGrip.position.set(0.16, 0.27, 0.015);
  rightGrip.rotation.z = 0.15;
  yokeGroup.add(rightGrip);

  // Trigger buttons on grips (발사 방아쇠)
  const triggerMat = new THREE.MeshStandardMaterial({
    color: 0xff3355,
    emissive: 0x991122,
    emissiveIntensity: 0.8,
  });
  const leftTrigger = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.03, 0.02), triggerMat);
  leftTrigger.position.set(-0.16, 0.29, -0.015);
  yokeGroup.add(leftTrigger);

  const rightTrigger = leftTrigger.clone();
  rightTrigger.position.set(0.16, 0.29, -0.015);
  yokeGroup.add(rightTrigger);

  // 6. Left & Right Hands Holding the Controls (조종관을 쥐고 있는 손)
  function createGripHand(side: 'left' | 'right'): THREE.Group {
    const hand = new THREE.Group();
    hand.name = `PilotHand_${side}`;

    // Forearm sleeve
    const sleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.046, 0.18, 12),
      new THREE.MeshStandardMaterial({ color: 0x151f30, roughness: 0.6, metalness: 0.6 })
    );
    sleeve.rotation.x = Math.PI / 2.8;
    sleeve.position.set(0, -0.08, 0.08);
    hand.add(sleeve);

    // Cyber dorsal plate (손등 장갑)
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(0.065, 0.02, 0.08),
      new THREE.MeshStandardMaterial({
        color: side === 'right' ? 0x00f0ff : 0xb829dd,
        emissive: side === 'right' ? 0x004466 : 0x441166,
        emissiveIntensity: 0.6,
        metalness: 0.85,
        roughness: 0.25,
      })
    );
    plate.position.set(0, 0.01, 0.02);
    hand.add(plate);

    // Fingers curled around the grip (조종관을 감싼 손가락들)
    for (let f = -1; f <= 1; f++) {
      const finger = new THREE.Mesh(
        new THREE.TorusGeometry(0.026, 0.009, 8, 16, Math.PI * 1.3),
        new THREE.MeshStandardMaterial({ color: 0x223044, metalness: 0.8, roughness: 0.3 })
      );
      finger.position.set(f * 0.016, 0, 0);
      finger.rotation.y = Math.PI / 2;
      hand.add(finger);
    }

    // Thumb pointing up towards the trigger (방아쇠 쪽으로 뻗은 엄지손가락)
    const thumb = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.011, 0.045, 8),
      new THREE.MeshStandardMaterial({ color: 0x1f2838, metalness: 0.7 })
    );
    thumb.position.set(side === 'left' ? 0.028 : -0.028, 0.025, -0.005);
    thumb.rotation.x = -0.4;
    hand.add(thumb);

    return hand;
  }

  const leftHand = createGripHand('left');
  leftHand.position.set(-0.16, 0.27, 0.015);
  yokeGroup.add(leftHand);

  const rightHand = createGripHand('right');
  rightHand.position.set(0.16, 0.27, 0.015);
  yokeGroup.add(rightHand);

  // 7. Left Lateral Throttle Lever (가속 레버)
  const throttleBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.08, 0.24),
    new THREE.MeshStandardMaterial({ color: 0x161e2a, metalness: 0.8, roughness: 0.4 })
  );
  throttleBase.position.set(-0.48, -0.3, -0.46);
  group.add(throttleBase);

  const leftThrusterGrip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.024, 0.08, 12),
    new THREE.MeshStandardMaterial({ color: 0xffb020, emissive: 0x663300, emissiveIntensity: 0.6 })
  );
  leftThrusterGrip.rotation.z = Math.PI / 2;
  leftThrusterGrip.position.set(-0.48, -0.24, -0.46);
  group.add(leftThrusterGrip);

  return {
    group,
    yokeGroup,
    yokeBase,
    leftHand,
    rightHand,
    leftCannonMuzzle,
    rightCannonMuzzle,
    leftThrusterGrip,
    dashboardScreen,
    hudCanvas,
    hudTexture,
    updateSteering(pitch: number, roll: number, throttle: number, time: number) {
      // Yoke tilt and rotation follows steering input!
      // Roll steers left/right rotation
      yokeGroup.rotation.z = -roll * 0.45;
      // Pitch tilts column forward / back
      yokeGroup.rotation.x = -pitch * 0.35 + 0.08;

      // Subtle cockpit vibration based on speed & throttle
      dashboard.position.y = -0.32 + Math.sin(time * 30) * 0.0015 * (1 + throttle);
      leftThrusterGrip.position.z = -0.46 - throttle * 0.08;
    },
    updateHUD(speed: number, altitude: number, shield: number, boost: number, score: number, time: number) {
      hudCtx.clearRect(0, 0, 512, 256);

      // Cyber Dashboard Panel background
      hudCtx.fillStyle = 'rgba(5, 12, 26, 0.9)';
      hudCtx.fillRect(0, 0, 512, 256);

      hudCtx.strokeStyle = '#00f0ff';
      hudCtx.lineWidth = 3;
      hudCtx.strokeRect(6, 6, 500, 244);

      // Flight Speedometer (KM/H)
      hudCtx.font = 'bold 26px Orbitron, sans-serif';
      hudCtx.fillStyle = '#00f0ff';
      hudCtx.fillText(`${Math.round(speed)} KM/H`, 24, 52);

      hudCtx.font = '14px Noto Sans KR, sans-serif';
      hudCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      hudCtx.fillText('비행 순항 속도', 24, 76);

      // Altitude
      hudCtx.font = 'bold 22px Orbitron, sans-serif';
      hudCtx.fillStyle = '#ffb020';
      hudCtx.fillText(`ALT: ${Math.round(altitude)} M`, 24, 124);

      // Artificial Horizon Center Compass
      const cx = 256;
      const cy = 120;
      hudCtx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
      hudCtx.lineWidth = 2;
      hudCtx.beginPath();
      hudCtx.arc(cx, cy, 54, 0, Math.PI * 2);
      hudCtx.stroke();

      // Pitch Ladder line
      hudCtx.beginPath();
      hudCtx.moveTo(cx - 38, cy);
      hudCtx.lineTo(cx - 14, cy);
      hudCtx.moveTo(cx + 14, cy);
      hudCtx.lineTo(cx + 38, cy);
      hudCtx.stroke();

      // Shield Gauge (Right side)
      hudCtx.font = 'bold 18px Noto Sans KR, sans-serif';
      hudCtx.fillStyle = '#ffffff';
      hudCtx.fillText(`🛡️ 쉴드: ${Math.round(shield)}%`, 350, 48);

      hudCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      hudCtx.fillRect(350, 58, 140, 16);
      hudCtx.fillStyle = shield > 35 ? '#00ff88' : '#ff2244';
      hudCtx.fillRect(350, 58, (Math.max(0, shield) / 100) * 140, 16);

      // Boost Gauge
      hudCtx.fillStyle = '#ffffff';
      hudCtx.fillText(`⚡ 부스트: ${Math.round(boost)}%`, 350, 108);

      hudCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      hudCtx.fillRect(350, 118, 140, 16);
      hudCtx.fillStyle = '#00f0ff';
      hudCtx.fillRect(350, 118, (Math.max(0, boost) / 100) * 140, 16);

      // Score / Distance
      hudCtx.font = 'bold 20px Orbitron, sans-serif';
      hudCtx.fillStyle = '#ffffff';
      hudCtx.fillText(`DISTANCE: ${score} M`, 160, 225);

      hudTexture.needsUpdate = true;
    },
    triggerMuzzleFlash(side: 'left' | 'right' | 'both') {
      // Small recoil bump
      yokeGroup.position.z = 0.015;
      setTimeout(() => {
        yokeGroup.position.z = 0;
      }, 70);
    },
  };
}
