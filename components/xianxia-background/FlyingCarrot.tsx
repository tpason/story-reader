"use client";

/**
 * Decorative “Flying Carrot” — lean port of Noel Delgado’s CodePen
 * https://codepen.io/noeldelgado/pen/PxwKPW (Codevember 2018)
 * Inspired by Jonathan Dahl / Karim Maaloul style.
 *
 * No GSAP: sine bob via useFrame. No floor/clouds/OrbitControls.
 * Modern Three.js BoxGeometry (no CubeGeometry / .vertices morph).
 */

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from "three";

const SCALE = 0.014;
const BOUNDARY_X = 6.8;

const COLORS = {
  orange: 0xb7513c,
  green: 0x379351,
  brown: 0x5c2c22,
  pink: 0xb1325e,
  gray: 0x666666,
  rabbit: 0xaaaaaa,
} as const;

function makeMat(hex: number) {
  return new MeshStandardMaterial({
    color: hex,
    flatShading: true,
    roughness: 0.72,
    metalness: 0.04,
  });
}

type FlyingCarrotProps = {
  y?: number;
  z?: number;
};

type CarrotParts = {
  model: Group;
  leafs: Group;
  earL: Object3D;
  earR: Object3D;
  eyeL: Mesh;
  eyeR: Mesh;
  mats: Record<string, MeshStandardMaterial>;
  geos: Array<BoxGeometry | CylinderGeometry>;
};

function buildCarrot(): CarrotParts {
  const mats = {
    orange: makeMat(COLORS.orange),
    green: makeMat(COLORS.green),
    brown: makeMat(COLORS.brown),
    pink: makeMat(COLORS.pink),
    gray: makeMat(COLORS.gray),
    rabbit: makeMat(COLORS.rabbit),
  };
  const geos: Array<BoxGeometry | CylinderGeometry> = [];
  const track = <T extends BoxGeometry | CylinderGeometry>(g: T) => {
    geos.push(g);
    return g;
  };

  const model = new Group();

  const bodyGeo = track(new CylinderGeometry(5, 2, 25, 8));
  model.add(new Mesh(bodyGeo, mats.orange));

  const wings = new Group();
  const wingGeo = track(new BoxGeometry(7, 7, 0.5));
  const wingR = new Mesh(wingGeo, mats.brown);
  wingR.position.set(6, 2, 1);
  const wingL = wingR.clone();
  wingL.position.x = -6;
  wingL.rotation.y = Math.PI;
  wings.add(wingR, wingL);
  model.add(wings);

  const leafs = new Group();
  const leafGeo = track(new CylinderGeometry(1.5, 1, 5, 4));
  const leafA = new Mesh(leafGeo, mats.green);
  leafA.position.y = 16;
  const leafB = leafA.clone();
  leafB.position.set(-1.75, 15, 0);
  leafB.rotation.z = 0.4;
  const leafC = leafB.clone();
  leafC.position.x = 1.75;
  leafC.rotation.z = -0.4;
  leafs.add(leafA, leafB, leafC);
  model.add(leafs);

  const pilotRoot = new Group();
  pilotRoot.rotation.x = 1.5;
  pilotRoot.position.set(0, 7, 5);

  const torso = new Mesh(track(new BoxGeometry(5, 5, 5)), mats.rabbit);
  torso.position.set(0, 1, 4);

  const seat = new Mesh(track(new BoxGeometry(6, 1, 6)), mats.brown);
  seat.position.set(0, -2.5, 0);
  seat.rotation.set(0.25, 0, 0);
  torso.add(seat);

  const earL = new Object3D();
  earL.position.set(0, 2.5, 0);
  earL.rotation.x = -Math.PI / 2.25;

  const earR = new Object3D();
  earR.position.set(0, 2.5, 0);
  earR.rotation.x = -Math.PI / 3;

  const earGeo = track(new BoxGeometry(2, 6, 0.5));
  const ear = new Mesh(earGeo, mats.rabbit);
  ear.position.set(-1.5, 2.5, 0);
  const earInside = new Mesh(earGeo, mats.pink);
  earInside.scale.set(0.5, 0.7, 0.5);
  earInside.position.set(0, 0, 0.25);
  ear.add(earInside);
  earL.add(ear);

  const ear2 = ear.clone();
  ear2.position.x = 1.5;
  earR.add(ear2);
  torso.add(earL, earR);

  const eyeGeo = track(new BoxGeometry(0.5, 1, 0.5));
  const eyeL = new Mesh(eyeGeo, mats.gray);
  eyeL.position.set(1, 0.5, 2.5);
  const eyeR = eyeL.clone();
  eyeR.position.x = -1;
  torso.add(eyeL, eyeR);

  const nose = new Mesh(track(new BoxGeometry(0.5, 0.5, 0.5)), mats.pink);
  nose.position.set(0, -0.5, 2.5);
  torso.add(nose);

  const mouth = new Mesh(track(new BoxGeometry(0.25, 0.25, 0.5)), mats.gray);
  mouth.position.set(0, -1.5, 2.5);
  torso.add(mouth);

  pilotRoot.add(torso);
  model.add(pilotRoot);

  // CodePen base orientation
  model.rotateOnAxis(new Vector3(1, 0, 0), -Math.PI / 2);
  model.rotateOnAxis(new Vector3(0, 0, 1), Math.PI / 2);
  model.scale.setScalar(SCALE);

  return { model, leafs, earL, earR, eyeL, eyeR, mats, geos };
}

export function FlyingCarrot({ y = 0.95, z = -1.5 }: FlyingCarrotProps) {
  const outerRef = useRef<Group>(null);
  const xRef = useRef(-4.5);
  const dirRef = useRef<1 | -1>(1);

  const parts = useMemo(() => buildCarrot(), []);

  useEffect(() => {
    return () => {
      parts.geos.forEach((g) => g.dispose());
      Object.values(parts.mats).forEach((m) => m.dispose());
    };
  }, [parts]);

  useFrame((state, delta) => {
    const outer = outerRef.current;
    if (!outer) return;
    const t = state.clock.elapsedTime;

    xRef.current += dirRef.current * 0.55 * delta;
    if (xRef.current > BOUNDARY_X) dirRef.current = -1;
    if (xRef.current < -BOUNDARY_X) dirRef.current = 1;

    outer.position.x = xRef.current;
    outer.position.y = y + Math.sin(t * 1.05) * 0.07;
    outer.position.z = z + Math.sin(t * 0.4) * 0.04;
    // Yaw so the carrot flies nose-first
    outer.rotation.y = dirRef.current < 0 ? Math.PI : 0;
    outer.rotation.z = Math.sin(t * 1.05) * 0.06;

    parts.leafs.rotation.y = t * 18;
    parts.earL.rotation.x = -Math.PI / 2.25 + Math.sin(t * 12) * 0.12;
    parts.earR.rotation.x = -Math.PI / 3 + Math.sin(t * 12 + 1.2) * 0.12;

    const blinkCycle = t % 8.5;
    const blink =
      blinkCycle > 5 && blinkCycle < 5.35
        ? 0.1 + 0.9 * Math.abs(Math.cos(((blinkCycle - 5) / 0.35) * Math.PI))
        : 1;
    parts.eyeL.scale.y = blink;
    parts.eyeR.scale.y = blink;
  });

  return (
    <group ref={outerRef} renderOrder={13}>
      <primitive object={parts.model} />
    </group>
  );
}
