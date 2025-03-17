import { BallCollider, RigidBody, useRapier, vec3 } from "@react-three/rapier";
import {
  PerspectiveCamera,
  PositionalAudio,
} from "@react-three/drei";
import { useFrame, useThree, extend } from "@react-three/fiber";
import { useRef, useState, useEffect } from "react";
import * as THREE from "three";

import { Mario } from "./models/characters/Mario_kart";
import { DriftParticlesLeft } from "./Particles/drifts/DriftParticlesLeft";
import { DriftParticlesRight } from "./Particles/drifts/DriftParticlesRight";
import { PointParticle } from "./Particles/drifts/PointParticle";
import { SmokeParticles } from "./Particles/smoke/SmokeParticles";
import { useStore } from "./store";
import { Cylinder } from "@react-three/drei";
import FakeGlowMaterial from "./ShaderMaterials/FakeGlow/FakeGlowMaterial";
import { HitParticles } from "./Particles/hits/HitParticles";
import { CoinParticles } from "./Particles/coins/CoinParticles";
import { ItemParticles } from "./Particles/items/ItemParticles";
import { geometry } from "maath";
extend(geometry);

export const PlayerControllerChat = ({
  player,
  userPlayer,
  setNetworkBananas,
  setNetworkShells,
  networkBananas,
  networkShells,
}) => {
  const [isOnGround, setIsOnGround] = useState(false);
  const body = useRef();
  const kart = useRef();
  const cam = useRef();
  const initialSpeed = 0;
  const maxSpeed = 30;
  const boostSpeed = 50;
  const acceleration = 0.1;
  const decceleration = 0.2;
  const damping = -0.1;
  const MaxSteeringSpeed = 0.01;
  const [currentSteeringSpeed, setCurrentSteeringSpeed] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(initialSpeed);
  const camMaxOffset = 1;
  let steeringAngle = 0;
  const isOnFloor = useRef(false);
  const jumpForce = useRef(0);
  const jumpIsHeld = useRef(false);
  const driftDirection = useRef(0);
  const driftLeft = useRef(false);
  const driftRight = useRef(false);
  const driftForce = useRef(0);
  const mario = useRef();
  const accumulatedDriftPower = useRef(0);
  const blueTurboThreshold = 10;
  const orangeTurboThreshold = 30;
  const purpleTurboThreshold = 60;
  const [turboColor, setTurboColor] = useState(0xffffff);
  const boostDuration = useRef(0);
  const [isBoosting, setIsBoosting] = useState(false);
  let targetXPosition = 0;
  let targetZPosition = 8;
  const [steeringAngleWheels, setSteeringAngleWheels] = useState(0);
  const engineSound = useRef();
  const driftSound = useRef();
  const driftTwoSound = useRef();
  const driftOrangeSound = useRef();
  const driftPurpleSound = useRef();
  const driftBlueSound = useRef();
  const jumpSound = useRef();
  const landingSound = useRef();
  const turboSound = useRef();
  const [scale, setScale] = useState(0);
  const raycaster = new THREE.Raycaster();
  const downDirection = new THREE.Vector3(0, -1, 0);
  const [shouldLaunch, setShouldLaunch] = useState(false);
  const effectiveBoost = useRef(0);
  const text = useRef();

  const { actions, shouldSlowDown, item, bananas, coins, chatPlayerControls } = useStore();
  const slowDownDuration = useRef(1500);

  const rightWheel = useRef();
  const leftWheel = useRef();
  const isDrifting = useRef(false);

  useEffect(() => {
    if (leftWheel.current && rightWheel.current && body.current) {
      actions.setLeftWheel(leftWheel.current);
      actions.setRightWheel(rightWheel.current);
    }
  }, [body.current]);

  useFrame(({ pointer, clock }, delta) => {
    const time = clock.getElapsedTime();
    if (!body.current && !mario.current) return;
    
    engineSound.current.setVolume(currentSpeed / 300 + 0.2);
    engineSound.current.setPlaybackRate(currentSpeed / 10 + 0.1);
    jumpSound.current.setPlaybackRate(1.5);
    jumpSound.current.setVolume(0.5);
    driftSound.current.setVolume(0.2);

    driftBlueSound.current.setVolume(0.5);
    driftOrangeSound.current.setVolume(0.6);
    driftPurpleSound.current.setVolume(0.7);

    // HANDLING AND STEERING
    const kartRotation =
      kart.current.rotation.y - driftDirection.current * driftForce.current;
    const forwardDirection = new THREE.Vector3(
      -Math.sin(kartRotation),
      0,
      -Math.cos(kartRotation)
    );

    if (chatPlayerControls.escape) {
      actions.setGameStarted(false);
      actions.resetChatPlayerControls();
    }

    leftWheel.current.kartRotation = kartRotation;

    if (chatPlayerControls.left && currentSpeed > 0) {
      steeringAngle = currentSteeringSpeed;
      targetXPosition = -camMaxOffset;
    } else if (chatPlayerControls.right && currentSpeed > 0) {
      steeringAngle = -currentSteeringSpeed;
      targetXPosition = camMaxOffset;
    } else if (chatPlayerControls.right && currentSpeed < 0) {
      steeringAngle = currentSteeringSpeed;
      targetXPosition = -camMaxOffset;
    } else if (chatPlayerControls.left && currentSpeed < 0) {
      steeringAngle = -currentSteeringSpeed;
      targetXPosition = camMaxOffset;
    } else {
      steeringAngle = 0;
      targetXPosition = 0;
    }

    // ACCELERATING
    const shouldSlow = actions.getShouldSlowDown();

    if (chatPlayerControls.up && !shouldSlow) {
      if (currentSpeed < maxSpeed) {
        setCurrentSpeed(currentSpeed + acceleration);
      }
    } else if (chatPlayerControls.down) {
      if (currentSpeed > -maxSpeed / 2) {
        setCurrentSpeed(currentSpeed - acceleration);
      }
    } else {
      if (currentSpeed > 0) {
        setCurrentSpeed(currentSpeed - decceleration);
      } else if (currentSpeed < 0) {
        setCurrentSpeed(currentSpeed + decceleration);
      }
    }

    if (chatPlayerControls.jump && !jumpIsHeld.current) {
      jumpForce.current = 40;
      jumpIsHeld.current = true;
      jumpSound.current.play();
    }

    if (!chatPlayerControls.jump) {
      jumpIsHeld.current = false;
    }

    if (chatPlayerControls.shoot && item === "banana") {
      const distanceBehind = 2;
      const scaledBackwardDirection =
        forwardDirection.multiplyScalar(distanceBehind);

      const kartPosition = new THREE.Vector3(
        ...vec3(body.current.translation())
      );

      const bananaPosition = kartPosition.sub(scaledBackwardDirection);
      const newBanana = {
        id: Math.random() + "-" + +new Date(),
        position: bananaPosition,
        player: true,
      };
      setNetworkBananas([...networkBananas, newBanana]);
      actions.useItem();
    }

    if (chatPlayerControls.shoot && item === "shell") {
      const distanceBehind = -2;
      const scaledBackwardDirection =
        forwardDirection.multiplyScalar(distanceBehind);

      const kartPosition = new THREE.Vector3(
        body.current.translation().x,
        body.current.translation().y,
        body.current.translation().z
      );

      const shellPosition = kartPosition.sub(scaledBackwardDirection);
      const newShell = {
        id: Math.random() + "-" + +new Date(),
        position: shellPosition,
        player: true,
        rotation: kartRotation,
      };
      setNetworkShells([...networkShells, newShell]);
      actions.useItem();
    }

    if (chatPlayerControls.shoot && item === "mushroom") {
      setIsBoosting(true);
      effectiveBoost.current = 300;
      actions.useItem();
    }

    // Update movement
    if (body.current) {
      const movement = new THREE.Vector3();
      movement.x = -Math.sin(kartRotation) * currentSpeed;
      movement.z = -Math.cos(kartRotation) * currentSpeed;

      const currentPos = body.current.translation();
      body.current.setTranslation({
        x: currentPos.x + movement.x * delta,
        y: currentPos.y,
        z: currentPos.z + movement.z * delta,
      });

      kart.current.rotation.y += steeringAngle;
    }

    player.setState("position", body.current.translation());
    player.setState("rotation", kartRotation + mario.current.rotation.y);
    player.setState("isBoosting", isBoosting);
    player.setState("shouldLaunch", shouldLaunch);
    player.setState("turboColor", turboColor);
    player.setState("scale", scale);
    player.setState("bananas", bananas);
  });

  return (
    <>
      <group>
        <RigidBody
          type="kinematic"
          ref={body}
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          colliders={false}
          name="player"
        >
          <BallCollider args={[0.5]} />
        </RigidBody>

        <group ref={kart}>
          <Mario
            ref={mario}
            position={[0, -0.5, 0]}
            rotation={[0, Math.PI, 0]}
            scale={0.5}
          />
        </group>

        <PositionalAudio
          ref={engineSound}
          url="./sounds/engine.mp3"
          distance={5}
          loop
        />
        <PositionalAudio
          ref={driftSound}
          url="./sounds/drift.mp3"
          distance={5}
          loop
        />
        <PositionalAudio
          ref={driftTwoSound}
          url="./sounds/drift2.mp3"
          distance={5}
          loop
        />
        <PositionalAudio
          ref={driftBlueSound}
          url="./sounds/drift-blue.mp3"
          distance={5}
        />
        <PositionalAudio
          ref={driftOrangeSound}
          url="./sounds/drift-orange.mp3"
          distance={5}
        />
        <PositionalAudio
          ref={driftPurpleSound}
          url="./sounds/drift-purple.mp3"
          distance={5}
        />
        <PositionalAudio
          ref={jumpSound}
          url="./sounds/jump.mp3"
          distance={5}
        />
        <PositionalAudio
          ref={landingSound}
          url="./sounds/landing.mp3"
          distance={5}
        />
        <PositionalAudio
          ref={turboSound}
          url="./sounds/turbo.mp3"
          distance={5}
        />
      </group>
    </>
  );
}; 