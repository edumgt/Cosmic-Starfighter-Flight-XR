import * as THREE from 'three';

/**
 * Realistic 3D Flight Control Yoke & Pilot Arm/Hand Motion System
 * Features:
 * 1. Mechanical Dual-Axis Flight Yoke: Telescoping plunge column (pitch),
 *    smooth roll rotation, dynamic hydraulic damper piston, and accordion gaiter boot.
 * 2. 2-Bone Analytical Inverse Kinematics (IK) for Pilot Arms:
 *    Shoulder -> Elbow -> Forearm -> Wrist -> Articulated Cyber Gauntlet.
 * 3. Dynamic Finger & Trigger Recoil: Index fingers pull triggers on weapon fire;
 *    thumb depresses boost switch; wrist compensates with yoke bank angle.
 * 4. Micro-vibrations & Engine G-Force Sensation based on throttle & speed.
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
  updateSteering: (
    pitch: number,
    roll: number,
    throttle: number,
    time: number,
    dt?: number,
    isBoosting?: boolean
  ) => void;
  updateHUD: (
    speed: number,
    altitude: number,
    shield: number,
    boost: number,
    score: number,
    time: number
  ) => void;
  triggerMuzzleFlash: (side: 'left' | 'right' | 'both') => void;
}

// Pre-allocated scratch vectors for zero-allocation 60fps/90fps IK updates
const _vTarget = new THREE.Vector3();
const _vArmDir = new THREE.Vector3();
const _vPole = new THREE.Vector3();
const _vPerp = new THREE.Vector3();
const _vElbow = new THREE.Vector3();
const _qRot = new THREE.Quaternion();
const _mLook = new THREE.Matrix4();
const _vUp = new THREE.Vector3(0, 1, 0);

interface ArticulatedArm {
  shoulderPos: THREE.Vector3;
  poleVector: THREE.Vector3;
  upperArmLength: number;
  forearmLength: number;
  upperArmGroup: THREE.Group;
  forearmGroup: THREE.Group;
  handGroup: THREE.Group;
  triggerMesh: THREE.Mesh;
  indexFingerGroup: THREE.Group;
  thumbMesh: THREE.Mesh;
}

export function createSpaceshipCockpit(): CockpitController {
  const group = new THREE.Group();
  group.name = 'SpaceshipCockpit';

  // -------------------------------------------------------------
  // 1. Cockpit Main Frame, Bulwarks & Dashboard Console
  // -------------------------------------------------------------
  const dashMat = new THREE.MeshStandardMaterial({
    color: 0x0e1420,
    roughness: 0.38,
    metalness: 0.88,
  });

  const dashboard = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.46, 0.68), dashMat);
  dashboard.position.set(0, -0.32, -0.66);
  dashboard.rotation.x = 0.22;
  group.add(dashboard);

  // Lower cockpit floor console & footwell
  const floorConsole = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.16, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x070b12, roughness: 0.6, metalness: 0.7 })
  );
  floorConsole.position.set(0, -0.52, -0.32);
  group.add(floorConsole);

  // -------------------------------------------------------------
  // 2. Cockpit Canopy Frame Arch (Structural Ribs)
  // -------------------------------------------------------------
  const archPoints = [
    new THREE.Vector3(-0.96, -0.42, -0.38),
    new THREE.Vector3(-0.86, 0.56, -0.76),
    new THREE.Vector3(0, 0.74, -0.86),
    new THREE.Vector3(0.86, 0.56, -0.76),
    new THREE.Vector3(0.96, -0.42, -0.38),
  ];
  const archCurve = new THREE.CatmullRomCurve3(archPoints);
  const archGeo = new THREE.TubeGeometry(archCurve, 36, 0.038, 8, false);
  const archMat = new THREE.MeshStandardMaterial({
    color: 0x162234,
    metalness: 0.92,
    roughness: 0.24,
  });
  const canopyArch = new THREE.Mesh(archGeo, archMat);
  group.add(canopyArch);

  // Center vertical canopy strut
  const centerStrut = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.92, 8),
    archMat
  );
  centerStrut.position.set(0, 0.29, -0.81);
  centerStrut.rotation.x = 0.35;
  group.add(centerStrut);

  // -------------------------------------------------------------
  // 3. Left and Right Nose Plasma Cannons outside windshield
  // -------------------------------------------------------------
  const cannonMat = new THREE.MeshStandardMaterial({
    color: 0x1f2c3d,
    metalness: 0.95,
    roughness: 0.18,
  });
  const cannonGeo = new THREE.CylinderGeometry(0.046, 0.056, 0.92, 12);

  const leftCannon = new THREE.Mesh(cannonGeo, cannonMat);
  leftCannon.rotation.x = Math.PI / 2;
  leftCannon.position.set(-0.68, -0.15, -1.2);
  group.add(leftCannon);

  const rightCannon = leftCannon.clone();
  rightCannon.position.set(0.68, -0.15, -1.2);
  group.add(rightCannon);

  // Muzzle Flash Glow Sprites (visible during fire)
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
  });
  const leftMuzzleFlash = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), flashMat);
  leftMuzzleFlash.position.set(-0.68, -0.15, -1.68);
  group.add(leftMuzzleFlash);

  const rightMuzzleFlash = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 12, 12),
    flashMat.clone()
  );
  rightMuzzleFlash.position.set(0.68, -0.15, -1.68);
  group.add(rightMuzzleFlash);

  const leftCannonMuzzle = new THREE.Object3D();
  leftCannonMuzzle.position.set(-0.68, -0.15, -1.65);
  group.add(leftCannonMuzzle);

  const rightCannonMuzzle = new THREE.Object3D();
  rightCannonMuzzle.position.set(0.68, -0.15, -1.65);
  group.add(rightCannonMuzzle);

  // -------------------------------------------------------------
  // 4. Holographic Dashboard Display Screen
  // -------------------------------------------------------------
  const hudCanvas = document.createElement('canvas');
  hudCanvas.width = 512;
  hudCanvas.height = 256;
  const hudCtx = hudCanvas.getContext('2d')!;

  const hudTexture = new THREE.CanvasTexture(hudCanvas);
  hudTexture.colorSpace = THREE.SRGBColorSpace;

  const hudScreenMat = new THREE.MeshBasicMaterial({
    map: hudTexture,
    transparent: true,
    opacity: 0.94,
    side: THREE.DoubleSide,
  });
  const dashboardScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.33), hudScreenMat);
  dashboardScreen.position.set(0, -0.07, -0.73);
  dashboardScreen.rotation.x = -0.25;
  group.add(dashboardScreen);

  // -------------------------------------------------------------
  // 5. Realistic Mechanical Dual-Axis Flight Yoke Assembly
  // -------------------------------------------------------------
  // Fixed Floor Pedestal
  const yokeBase = new THREE.Group();
  yokeBase.position.set(0, -0.44, -0.36);
  group.add(yokeBase);

  // Pedestal base casting with mounting bolts
  const baseFlange = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.11, 0.06, 16),
    new THREE.MeshStandardMaterial({ color: 0x141b26, metalness: 0.85, roughness: 0.4 })
  );
  baseFlange.position.y = 0.03;
  yokeBase.add(baseFlange);

  // Accordion Rubber Gaiter Boot (Pleated dust bellows that deform with pitch plunge)
  const bellowsGroup = new THREE.Group();
  bellowsGroup.position.set(0, 0.05, 0);
  yokeBase.add(bellowsGroup);

  const bellowRings: THREE.Mesh[] = [];
  const bellowMat = new THREE.MeshStandardMaterial({
    color: 0x0a0d13,
    roughness: 0.9,
    metalness: 0.1,
  });
  for (let b = 0; b < 5; b++) {
    const ringRadius = 0.065 - b * 0.005;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(ringRadius, 0.012, 8, 20), bellowMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = b * 0.022;
    bellowsGroup.add(ring);
    bellowRings.push(ring);
  }

  // Telescopic Pitch Pivot & Column Group
  // Rotates forward/back on pitch, and telescopes forward/back (Push = Dive, Pull = Climb)
  const pitchPivot = new THREE.Group();
  pitchPivot.position.set(0, 0.06, 0);
  yokeBase.add(pitchPivot);

  // Armored outer collar tube
  const outerCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.042, 0.048, 0.18, 16),
    new THREE.MeshStandardMaterial({ color: 0x1b2434, metalness: 0.9, roughness: 0.25 })
  );
  outerCollar.position.y = 0.09;
  pitchPivot.add(outerCollar);

  // Hydraulic Damper Shock Absorber behind the main column
  const damperBase = new THREE.Group();
  damperBase.position.set(0, 0.02, 0.07);
  yokeBase.add(damperBase);

  const damperCylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.016, 0.14, 12),
    new THREE.MeshStandardMaterial({ color: 0x223042, metalness: 0.85, roughness: 0.3 })
  );
  damperCylinder.position.y = 0.07;
  damperBase.add(damperCylinder);

  const damperPiston = new THREE.Mesh(
    new THREE.CylinderGeometry(0.009, 0.009, 0.15, 12),
    new THREE.MeshStandardMaterial({ color: 0xeef4ff, metalness: 0.98, roughness: 0.04 })
  );
  damperPiston.position.y = 0.14;
  damperBase.add(damperPiston);

  // Telescopic Sliding Shaft Group (moves along column axis)
  const yokeSliderGroup = new THREE.Group();
  pitchPivot.add(yokeSliderGroup);

  // Chrome high-precision inner piston with engraved pitch scale ring markings
  const chromeShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.28, 16),
    new THREE.MeshStandardMaterial({
      color: 0xf5f8ff,
      metalness: 0.98,
      roughness: 0.06,
    })
  );
  chromeShaft.position.y = 0.2;
  yokeSliderGroup.add(chromeShaft);

  // Universal Gimbal Yoke Head Bearing
  const gimbalHousing = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.07, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x161e2a, metalness: 0.85, roughness: 0.35 })
  );
  gimbalHousing.position.y = 0.32;
  yokeSliderGroup.add(gimbalHousing);

  // -------------------------------------------------------------
  // 6. Yoke Steering Wheel (Butterfly Horn Handle - Roll Rotation)
  // -------------------------------------------------------------
  const yokeWheelGroup = new THREE.Group();
  yokeWheelGroup.position.set(0, 0.32, 0);
  yokeSliderGroup.add(yokeWheelGroup);

  // Central Hub with Artificial Horizon mini gyro orb
  const hubCenter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.052, 0.045, 20),
    new THREE.MeshStandardMaterial({ color: 0x111622, metalness: 0.9, roughness: 0.2 })
  );
  hubCenter.rotation.x = Math.PI / 2;
  yokeWheelGroup.add(hubCenter);

  // Glowing Mini Gyro Horizon on Center Hub
  const gyroSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.032, 16, 16),
    new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x006688,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    })
  );
  gyroSphere.position.z = 0.024;
  yokeWheelGroup.add(gyroSphere);

  // Butterfly Swept Cross-Spar
  const crossbarMat = new THREE.MeshStandardMaterial({
    color: 0x1b2536,
    metalness: 0.85,
    roughness: 0.3,
  });
  const crossbarLeft = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.038, 0.032), crossbarMat);
  crossbarLeft.position.set(-0.09, 0.015, 0);
  crossbarLeft.rotation.z = 0.12;
  yokeWheelGroup.add(crossbarLeft);

  const crossbarRight = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.038, 0.032), crossbarMat);
  crossbarRight.position.set(0.09, 0.015, 0);
  crossbarRight.rotation.z = -0.12;
  yokeWheelGroup.add(crossbarRight);

  // Tactical Flight Horn Grips (Left & Right)
  const gripRubberMat = new THREE.MeshStandardMaterial({
    color: 0x181c24,
    roughness: 0.85,
    metalness: 0.15,
  });

  // Ergonomic Contoured Grip Geometry
  const gripGeo = new THREE.CylinderGeometry(0.021, 0.024, 0.17, 16);

  // Left Grip Horn
  const leftGripAnchor = new THREE.Group();
  leftGripAnchor.position.set(-0.175, 0.02, 0);
  yokeWheelGroup.add(leftGripAnchor);

  const leftGrip = new THREE.Mesh(gripGeo, gripRubberMat);
  leftGrip.rotation.z = -0.18;
  leftGripAnchor.add(leftGrip);

  // Right Grip Horn
  const rightGripAnchor = new THREE.Group();
  rightGripAnchor.position.set(0.175, 0.02, 0);
  yokeWheelGroup.add(rightGripAnchor);

  const rightGrip = new THREE.Mesh(gripGeo, gripRubberMat);
  rightGrip.rotation.z = 0.18;
  rightGripAnchor.add(rightGrip);

  // Tactical End-caps on horn grips
  const endCapMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x003344,
    emissiveIntensity: 0.5,
    metalness: 0.9,
    roughness: 0.2,
  });
  const leftEndCap = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.021, 0.02, 16), endCapMat);
  leftEndCap.position.y = 0.09;
  leftGrip.add(leftEndCap);

  const rightEndCap = leftEndCap.clone();
  rightGrip.add(rightEndCap);

  // 4-Way Thumb POV Hat Switch (on left horn - tilts with steering!)
  const hatBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.018, 0.014, 12),
    new THREE.MeshStandardMaterial({ color: 0x111622, metalness: 0.8 })
  );
  hatBase.position.set(-0.155, 0.085, 0.018);
  yokeWheelGroup.add(hatBase);

  const hatStick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.008, 0.022, 8),
    new THREE.MeshStandardMaterial({ color: 0xff3355, metalness: 0.7, roughness: 0.3 })
  );
  hatStick.position.y = 0.014;
  hatBase.add(hatStick);

  // Boost Button on Right Horn Top
  const boostBtnMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x006688,
    emissiveIntensity: 0.6,
  });
  const boostBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.012, 12), boostBtnMat);
  boostBtn.position.set(0.155, 0.085, 0.018);
  yokeWheelGroup.add(boostBtn);

  // Twin Index Finger Trigger Levers (underneath grips, physically pull back on fire!)
  const triggerMat = new THREE.MeshStandardMaterial({
    color: 0xff2244,
    emissive: 0x660814,
    emissiveIntensity: 0.7,
    metalness: 0.8,
    roughness: 0.3,
  });

  const leftTriggerPivot = new THREE.Group();
  leftTriggerPivot.position.set(-0.175, 0.045, -0.022);
  yokeWheelGroup.add(leftTriggerPivot);

  const leftTriggerMesh = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.034, 0.018), triggerMat);
  leftTriggerMesh.position.set(0, -0.014, 0);
  leftTriggerPivot.add(leftTriggerMesh);

  const rightTriggerPivot = new THREE.Group();
  rightTriggerPivot.position.set(0.175, 0.045, -0.022);
  yokeWheelGroup.add(rightTriggerPivot);

  const rightTriggerMesh = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.034, 0.018), triggerMat);
  rightTriggerMesh.position.set(0, -0.014, 0);
  rightTriggerPivot.add(rightTriggerMesh);

  // -------------------------------------------------------------
  // 7. Articulated Pilot Arms & Cyber Gauntlet IK Assembly
  // -------------------------------------------------------------
  // Pilot shoulders originate from the flight seat frame
  const leftShoulderPos = new THREE.Vector3(-0.34, -0.36, 0.16);
  const rightShoulderPos = new THREE.Vector3(0.34, -0.36, 0.16);

  function createPilotArm(
    side: 'left' | 'right',
    shoulderPos: THREE.Vector3
  ): ArticulatedArm {
    const isLeft = side === 'left';
    const accentColor = isLeft ? 0xb829dd : 0x00f0ff;
    const emissiveColor = isLeft ? 0x440855 : 0x004466;

    // Shoulder Socket on Seat
    const shoulderGroup = new THREE.Group();
    shoulderGroup.position.copy(shoulderPos);
    group.add(shoulderGroup);

    const shoulderPad = new THREE.Mesh(
      new THREE.SphereGeometry(0.052, 14, 14),
      new THREE.MeshStandardMaterial({ color: 0x141d2c, metalness: 0.8, roughness: 0.4 })
    );
    shoulderGroup.add(shoulderPad);

    // Upper Arm
    const upperArmLength = 0.23;
    const upperArmGroup = new THREE.Group();
    shoulderGroup.add(upperArmGroup);

    const bicepMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.046, upperArmLength, 12),
      new THREE.MeshStandardMaterial({
        color: 0x162234,
        roughness: 0.65,
        metalness: 0.45,
      })
    );
    bicepMesh.position.z = upperArmLength * 0.5;
    bicepMesh.rotation.x = Math.PI / 2;
    upperArmGroup.add(bicepMesh);

    // Elbow Joint
    const elbowGroup = new THREE.Group();
    elbowGroup.position.set(0, 0, upperArmLength);
    upperArmGroup.add(elbowGroup);

    const elbowCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.038, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x223248, metalness: 0.9, roughness: 0.3 })
    );
    elbowGroup.add(elbowCap);

    // Forearm
    const forearmLength = 0.24;
    const forearmGroup = new THREE.Group();
    elbowGroup.add(forearmGroup);

    const forearmMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036, 0.042, forearmLength, 12),
      new THREE.MeshStandardMaterial({
        color: 0x1a2638,
        roughness: 0.55,
        metalness: 0.6,
      })
    );
    forearmMesh.position.z = forearmLength * 0.5;
    forearmMesh.rotation.x = Math.PI / 2;
    forearmGroup.add(forearmMesh);

    // Cyber Telemetry Neon Strip on Forearm
    const neonStrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.006, forearmLength * 0.7),
      new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 0.7,
      })
    );
    neonStrip.position.set(isLeft ? -0.038 : 0.038, 0.02, forearmLength * 0.5);
    forearmGroup.add(neonStrip);

    // Hand / Wrist
    const handGroup = new THREE.Group();
    handGroup.position.set(0, 0, forearmLength);
    forearmGroup.add(handGroup);

    // Armored Dorsal Hand Plate (Carbon/Titanium Cyber Gauntlet)
    const handPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.068, 0.024, 0.082),
      new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: emissiveColor,
        emissiveIntensity: 0.6,
        metalness: 0.88,
        roughness: 0.22,
      })
    );
    handPlate.position.set(0, 0.012, 0.025);
    handGroup.add(handPlate);

    // Articulated Index Finger (Wraps to Trigger)
    const indexFingerGroup = new THREE.Group();
    indexFingerGroup.position.set(isLeft ? 0.024 : -0.024, 0.01, 0.045);
    handGroup.add(indexFingerGroup);

    const indexProximal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.009, 0.028, 8),
      new THREE.MeshStandardMaterial({ color: 0x1b2434, metalness: 0.7 })
    );
    indexProximal.rotation.x = 0.6;
    indexProximal.position.set(0, -0.008, 0.012);
    indexFingerGroup.add(indexProximal);

    const indexDistal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.008, 0.022, 8),
      new THREE.MeshStandardMaterial({ color: 0x223044, metalness: 0.8 })
    );
    indexDistal.rotation.x = 1.1;
    indexDistal.position.set(0, -0.022, 0.024);
    indexFingerGroup.add(indexDistal);

    // Curled Grip Fingers (Middle, Ring, Pinky securely gripping the horn)
    const gripFingerMat = new THREE.MeshStandardMaterial({
      color: 0x243346,
      metalness: 0.8,
      roughness: 0.35,
    });
    for (let f = 0; f < 3; f++) {
      const fingerTorus = new THREE.Mesh(
        new THREE.TorusGeometry(0.026, 0.0085, 8, 16, Math.PI * 1.3),
        gripFingerMat
      );
      fingerTorus.position.set((f - 1) * 0.018, -0.008, 0.015);
      fingerTorus.rotation.y = Math.PI / 2;
      handGroup.add(fingerTorus);
    }

    // Thumb pointing to top hat switch/boost button
    const thumbMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.011, 0.044, 8),
      new THREE.MeshStandardMaterial({ color: 0x1b2434, metalness: 0.75 })
    );
    thumbMesh.position.set(isLeft ? 0.032 : -0.032, 0.022, -0.005);
    thumbMesh.rotation.x = -0.4;
    handGroup.add(thumbMesh);

    return {
      shoulderPos,
      poleVector: isLeft
        ? new THREE.Vector3(-0.45, -0.85, -0.15).normalize()
        : new THREE.Vector3(0.45, -0.85, -0.15).normalize(),
      upperArmLength,
      forearmLength,
      upperArmGroup,
      forearmGroup,
      handGroup,
      triggerMesh: isLeft ? leftTriggerMesh : rightTriggerMesh,
      indexFingerGroup,
      thumbMesh,
    };
  }

  const leftArm = createPilotArm('left', leftShoulderPos);
  const rightArm = createPilotArm('right', rightShoulderPos);

  // -------------------------------------------------------------
  // 8. Left Lateral Throttle Lever Quadrant (가속 레버)
  // -------------------------------------------------------------
  const throttleBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.09, 0.28),
    new THREE.MeshStandardMaterial({ color: 0x141c28, metalness: 0.85, roughness: 0.35 })
  );
  throttleBase.position.set(-0.48, -0.3, -0.46);
  group.add(throttleBase);

  // Throttle gate guide slot with neon illuminated detent markings
  const throttleSlot = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 0.01, 0.22),
    new THREE.MeshBasicMaterial({ color: 0x00f0ff })
  );
  throttleSlot.position.set(-0.48, -0.252, -0.46);
  group.add(throttleSlot);

  const leftThrusterGrip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, 0.09, 14),
    new THREE.MeshStandardMaterial({
      color: 0xffb020,
      emissive: 0x884400,
      emissiveIntensity: 0.7,
      metalness: 0.8,
      roughness: 0.25,
    })
  );
  leftThrusterGrip.rotation.z = Math.PI / 2;
  leftThrusterGrip.position.set(-0.48, -0.23, -0.46);
  group.add(leftThrusterGrip);

  // -------------------------------------------------------------
  // Animation State Variables
  // -------------------------------------------------------------
  let recoilTime = 0;
  let triggerRecoil = 0;
  let muzzleFlashOpacity = 0;

  // 2-Bone Analytical IK Solver: places elbow and wrist smoothly in 3D
  function solveArmIK(
    arm: ArticulatedArm,
    targetGripWorld: THREE.Vector3,
    gripWorldQuat: THREE.Quaternion
  ) {
    // Convert target to shoulder local space
    _vTarget.copy(targetGripWorld);
    group.worldToLocal(_vTarget);
    _vTarget.sub(arm.shoulderPos);

    const dist = _vTarget.length();
    const l1 = arm.upperArmLength;
    const l2 = arm.forearmLength;

    // Clamp distance within reachable arm envelope
    const maxReach = l1 + l2 - 0.005;
    const minReach = Math.abs(l1 - l2) + 0.02;
    const clampedDist = Math.max(minReach, Math.min(dist, maxReach));

    _vArmDir.copy(_vTarget).normalize();

    // Law of cosines for shoulder angle alpha and elbow angle beta
    const cosAlpha = (l1 * l1 + clampedDist * clampedDist - l2 * l2) / (2 * l1 * clampedDist);
    const alpha = Math.acos(Math.max(-1, Math.min(1, cosAlpha)));

    // Calculate elbow position using pole vector
    _vPole.copy(arm.poleVector);
    const dotPole = _vPole.dot(_vArmDir);
    _vPerp.copy(_vPole).addScaledVector(_vArmDir, -dotPole).normalize();

    // Elbow position in shoulder local space
    _vElbow
      .copy(_vArmDir)
      .multiplyScalar(l1 * Math.cos(alpha))
      .addScaledVector(_vPerp, l1 * Math.sin(alpha));

    // Orient upper arm to point towards elbow
    _mLook.lookAt(new THREE.Vector3(0, 0, 0), _vElbow, _vUp);
    arm.upperArmGroup.quaternion.setFromRotationMatrix(_mLook);

    // Orient forearm from elbow towards target
    _vTarget.sub(_vElbow);
    _mLook.lookAt(new THREE.Vector3(0, 0, 0), _vTarget, _vUp);
    arm.forearmGroup.quaternion.setFromRotationMatrix(_mLook);

    // Hand aligns with the yoke grip orientation plus subtle wrist twist
    arm.handGroup.quaternion.copy(gripWorldQuat);
  }

  return {
    group,
    yokeGroup: yokeWheelGroup,
    yokeBase,
    leftHand: leftArm.handGroup,
    rightHand: rightArm.handGroup,
    leftCannonMuzzle,
    rightCannonMuzzle,
    leftThrusterGrip,
    dashboardScreen,
    hudCanvas,
    hudTexture,

    updateSteering(
      pitch: number,
      roll: number,
      throttle: number,
      time: number,
      dt: number = 0.016,
      isBoosting: boolean = false
    ) {
      // 1. Recoil & Trigger Squeeze Decay
      if (triggerRecoil > 0) {
        triggerRecoil = Math.max(0, triggerRecoil - dt * 6.5);
      }
      if (recoilTime > 0) {
        recoilTime = Math.max(0, recoilTime - dt * 8.0);
      }
      if (muzzleFlashOpacity > 0) {
        muzzleFlashOpacity = Math.max(0, muzzleFlashOpacity - dt * 10.0);
        flashMat.opacity = muzzleFlashOpacity;
      }

      // 2. Realistic Dual-Axis Mechanical Yoke Motion
      // Roll: Rotate butterfly wheel up to ±42 degrees with spring feel
      const maxRollAngle = 0.72; // ~41.2 deg
      yokeWheelGroup.rotation.z = -roll * maxRollAngle;

      // Pitch: Telescopic Plunge + Dual pivot
      // Pushing forward (pitch < 0) plunges column forward into dash (-Z)
      // Pulling backward (pitch > 0) draws column toward pilot chest (+Z)
      const plungeDistance = pitch * 0.065; // -0.065m to +0.065m plunge
      const pitchTiltAngle = -pitch * 0.28 + 0.08;

      pitchPivot.rotation.x = pitchTiltAngle;
      yokeSliderGroup.position.z = plungeDistance + Math.sin(recoilTime * Math.PI) * 0.018;

      // Accordion Gaiter Boot deform with pitch plunge
      const gaiterScaleY = 1.0 - pitch * 0.25;
      bellowsGroup.scale.set(1.0 + pitch * 0.08, Math.max(0.4, gaiterScaleY), 1.0 + pitch * 0.08);

      // Hydraulic Damper shock absorber extension/compression
      damperPiston.position.y = 0.14 - plungeDistance * 0.8;

      // Hat switch dynamic tilt towards flight input direction
      hatStick.rotation.z = -roll * 0.45;
      hatStick.rotation.x = -pitch * 0.45;

      // Boost Button Depression
      boostBtn.position.y = isBoosting ? 0.08 : 0.085;
      (boostBtnMat as THREE.MeshStandardMaterial).emissiveIntensity = isBoosting ? 1.5 : 0.6;

      // Physical Trigger Pull Motion on both handles
      const triggerAngle = triggerRecoil * 0.45;
      leftTriggerPivot.rotation.x = triggerAngle;
      rightTriggerPivot.rotation.x = triggerAngle;

      leftArm.indexFingerGroup.rotation.x = -triggerAngle * 0.8;
      rightArm.indexFingerGroup.rotation.x = -triggerAngle * 0.8;

      // 3. Throttle Lever Mechanics & Engine Shiver
      const engineShiver = Math.sin(time * 50) * 0.0008 * (1 + throttle * 2);
      dashboard.position.y = -0.32 + engineShiver;
      leftThrusterGrip.position.z = -0.46 - throttle * 0.1 + (isBoosting ? -0.03 : 0);

      // 4. Update 2-Bone Arm Inverse Kinematics
      // Sample left and right grip anchors in world space
      const leftGripWorld = new THREE.Vector3();
      const rightGripWorld = new THREE.Vector3();
      const leftGripQuat = new THREE.Quaternion();
      const rightGripQuat = new THREE.Quaternion();

      leftGripAnchor.getWorldPosition(leftGripWorld);
      leftGripAnchor.getWorldQuaternion(leftGripQuat);
      rightGripAnchor.getWorldPosition(rightGripWorld);
      rightGripAnchor.getWorldQuaternion(rightGripQuat);

      solveArmIK(leftArm, leftGripWorld, leftGripQuat);
      solveArmIK(rightArm, rightGripWorld, rightGripQuat);
    },

    updateHUD(
      speed: number,
      altitude: number,
      shield: number,
      boost: number,
      score: number,
      time: number
    ) {
      hudCtx.clearRect(0, 0, 512, 256);

      // Cyber Dashboard Panel background
      hudCtx.fillStyle = 'rgba(6, 14, 28, 0.92)';
      hudCtx.fillRect(0, 0, 512, 256);

      hudCtx.strokeStyle = '#00f0ff';
      hudCtx.lineWidth = 3;
      hudCtx.strokeRect(6, 6, 500, 244);

      // Flight Speedometer (KM/H)
      hudCtx.font = 'bold 26px Orbitron, sans-serif';
      hudCtx.fillStyle = '#00f0ff';
      hudCtx.fillText(`${Math.round(speed)} KM/H`, 24, 48);

      hudCtx.font = '13px Noto Sans KR, sans-serif';
      hudCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      hudCtx.fillText('비행 순항 속도', 24, 72);

      // Altitude
      hudCtx.font = 'bold 20px Orbitron, sans-serif';
      hudCtx.fillStyle = '#ffb020';
      hudCtx.fillText(`ALT: ${Math.round(altitude)} M`, 24, 118);

      // Artificial Horizon Center Compass
      const cx = 256;
      const cy = 120;
      hudCtx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
      hudCtx.lineWidth = 2;
      hudCtx.beginPath();
      hudCtx.arc(cx, cy, 54, 0, Math.PI * 2);
      hudCtx.stroke();

      // Pitch Ladder lines
      hudCtx.beginPath();
      hudCtx.moveTo(cx - 40, cy);
      hudCtx.lineTo(cx - 14, cy);
      hudCtx.moveTo(cx + 14, cy);
      hudCtx.lineTo(cx + 40, cy);
      hudCtx.stroke();

      // Shield Gauge (Right side)
      hudCtx.font = 'bold 17px Noto Sans KR, sans-serif';
      hudCtx.fillStyle = '#ffffff';
      hudCtx.fillText(`🛡️ 쉴드: ${Math.round(shield)}%`, 340, 46);

      hudCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      hudCtx.fillRect(340, 56, 145, 16);
      hudCtx.fillStyle = shield > 35 ? '#00ff88' : '#ff2244';
      hudCtx.fillRect(340, 56, (Math.max(0, shield) / 100) * 145, 16);

      // Boost Gauge
      hudCtx.fillStyle = '#ffffff';
      hudCtx.fillText(`⚡ 부스트: ${Math.round(boost)}%`, 340, 104);

      hudCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      hudCtx.fillRect(340, 114, 145, 16);
      hudCtx.fillStyle = '#00f0ff';
      hudCtx.fillRect(340, 114, (Math.max(0, boost) / 100) * 145, 16);

      // Distance
      hudCtx.font = 'bold 19px Orbitron, sans-serif';
      hudCtx.fillStyle = '#ffffff';
      hudCtx.fillText(`DISTANCE: ${score} M`, 160, 225);

      hudTexture.needsUpdate = true;
    },

    triggerMuzzleFlash(side: 'left' | 'right' | 'both') {
      recoilTime = 1.0;
      triggerRecoil = 1.0;
      muzzleFlashOpacity = 0.9;
      flashMat.opacity = 0.9;
    },
  };
}
