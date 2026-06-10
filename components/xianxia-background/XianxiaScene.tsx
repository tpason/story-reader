"use client";

import { useMemo, useState } from "react";
import { EffectComposer, Bloom, Vignette, Noise, GodRays } from "@react-three/postprocessing";
import { Sky } from "@react-three/drei";
import { BlendFunction, KernelSize } from "postprocessing";
import { AdditiveBlending, MathUtils, Mesh, Vector3 } from "three";
import { ImageLayer } from "./ImageLayer";
import { MovingLayer } from "./MovingLayer";
import { FlyingCranes } from "./FlyingCranes";
import { WildAnimals } from "./WildAnimals";
import { SpiritParticles } from "./SpiritParticles";
import { CameraBreath } from "./CameraBreath";
import { WindLayer } from "./WindLayer";
import { DriftingCloudBank } from "./DriftingCloudBank";
import { MistPlumes } from "./MistPlumes";
import { WindCurrentLines } from "./WindCurrentLines";
import { CloudShadow } from "./CloudShadow";
import { WaterPlane } from "./WaterPlane";
import { SunMoon } from "./SunMoon";
import { FloatingClouds } from "./FloatingClouds";
import { NightSky } from "./NightSky";
import { MoonlightBeam } from "./MoonlightBeam";
import { LingQiOrbs } from "./LingQiOrbs";
import { FormationRing } from "./FormationRing";
import { WaterSparkles } from "./WaterSparkles";
import { scenePresets, sharedLayers, TimeOfDay } from "./sceneConfig";

// ─── Coverage formula ─────────────────────────────────────────────────────
// Camera z=5, fov=45°. Half-height at depth z: h(z) = (5-z)*tan(22.5°)
// 2:1 PNG plane=[2,1]×scale=[s,s] → world 2s×s. Full-width: 2s ≥ 2*h*1.778
// Need s ≥ h*1.778. Add ±0.22 margin for camera drift (CameraBreath ±0.18).
//
//  z=-10: h=6.21 → s≥12.1 → use 13   (background, full sky)
//  z=-7:  h=4.97 → s≥ 9.7 → use 10   (far mountains)
//  z=-5:  h=4.14 → s≥ 8.1 → use  9   (mid mountains)
//  z=-4.5:h=3.93 → s≥ 7.7 → use  8   (valley mist, full width)
//  z=-2.3:h=3.02 → s≥ 5.9 → use  6   (near mountains)

type XianxiaSceneProps = {
  timeOfDay: TimeOfDay;
  compact?: boolean;
};

export function XianxiaScene({ timeOfDay, compact = false }: XianxiaSceneProps) {
  const preset = scenePresets[timeOfDay];

  // GodRays: callback ref so state updates when mesh mounts
  const [sunMesh, setSunMesh] = useState<Mesh | null>(null);

  // sunPosition for <Sky> — derived from elevation/azimuth
  const sunPosition = useMemo((): [number, number, number] => {
    if (!preset.sky) return [0, 1, 0];
    const phi = MathUtils.degToRad(90 - preset.sky.elevation);
    const theta = MathUtils.degToRad(preset.sky.azimuth);
    const v = new Vector3().setFromSphericalCoords(1, phi, theta);
    return [v.x, v.y, v.z];
  }, [preset.sky?.elevation, preset.sky?.azimuth]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <CameraBreath />

      {/* ── Procedural sky (dawn/day/dusk) — renders at Z=-infinity ──────── */}
      {preset.sky && (
        <Sky
          distance={4500000}
          sunPosition={sunPosition}
          turbidity={preset.sky.turbidity}
          rayleigh={preset.sky.rayleigh}
          mieCoefficient={preset.sky.mieCoefficient}
          mieDirectionalG={preset.sky.mieDirectionalG}
        />
      )}

      {/* ── z=-10: Background painting — opacity lowered when Sky is active  */}
      <ImageLayer
        src={preset.background}
        position={[0, 0, -10]}
        scale={[13, 13, 1]}
        opacity={preset.bgOpacity}
        transparent={preset.bgOpacity < 1}
        depthWrite
      />

      {/* ── z=-9: Light rays ── additive, directional golden light ───────── */}
      {preset.lightRays && (
        <ImageLayer
          src={preset.lightRays}
          position={[0.8, 1.0, -9]}
          scale={[13, 13, 1]}
          opacity={0.20}
          blendMode={AdditiveBlending}
        />
      )}

      {/* ── z=-8.5–8.6: Procedural sun / moon ───────────────────────────── */}
      <SunMoon timeOfDay={timeOfDay} position={preset.celestialPos} />

      {/* ── z=-8.6: GodRays source — invisible anchor at celestial position */}
      {preset.godRays && !compact && (
        <mesh
          ref={(m) => { if (m) setSunMesh(m); }}
          position={preset.celestialPos}
        >
          <planeGeometry args={[0.55, 0.55]} />
          <meshBasicMaterial color="white" transparent opacity={0.92} depthWrite={false} />
        </mesh>
      )}

      {/* ── Night: procedural star field + moonlight rays ────────────────── */}
      {timeOfDay === "night" && (
        <>
          <NightSky />
          <MoonlightBeam />
        </>
      )}

      {/* ── z=-7: Far mountains ── very faint, misty horizon ─────────────── */}
      <ImageLayer
        src={sharedLayers.mountains.far}
        position={[0, -4.5, -7]}
        scale={[10, 10, 1]}
        opacity={0.34}
        alphaTest={0.03}
      />

      {/* ── z=-6.5: Formation ring — 陣法, hidden behind mountains ─────────── */}
      {!compact && <FormationRing />}

      {/* ── z=-7.8 → -4.2: Procedural fluffy clouds (time-of-day tinted) ─── */}
      <FloatingClouds timeOfDay={timeOfDay} />

      {/* ── z=-6/-5.5: Cloud shadows drifting across mountains ───────────── */}
      {!compact && <CloudShadow />}

      {/* ── z=-5: Mid mountains ── s=9 → width 18 > vis 16.2 ✓ ──────────── */}
      <ImageLayer
        src={sharedLayers.mountains.mid}
        position={[0, -4.2, -5]}
        scale={[9, 9, 1]}
        opacity={0.62}
        alphaTest={0.03}
      />

      {/* ── Layered clouds ── slow parallax drift without bright washout ─── */}
      <DriftingCloudBank sources={sharedLayers.cloudBank} />

      {/* ── z=-4.5: Valley mist A ── s=8 → width 16 > vis 15.4 ✓ full cover */}
      <MovingLayer
        src={sharedLayers.clouds.lowValley}
        position={[0, -2.0, -4.5]}
        scale={[8, 8, 1]}
        opacity={0.28}
        speedX={0.014}
        drift={0.022}
        blendMode={AdditiveBlending}
      />

      {/* ── z=-4.0: Valley mist B ── opposite direction, full cover ─────── */}
      <MovingLayer
        src={sharedLayers.clouds.lowValley}
        position={[0, -1.2, -4.0]}
        scale={[8, 8, 1]}
        opacity={0.18}
        speedX={-0.009}
        drift={0.028}
        blendMode={AdditiveBlending}
      />

      {/* ── z=-4.8 → -3.3: Linh khí orbs — immortal energy pools ───────── */}
      <LingQiOrbs />

      {/* ── z=-3.5: Thiên trì / water reflection at mountain base ────────── */}
      <WaterPlane timeOfDay={timeOfDay} compact={compact} />

      {/* ── Water sparkles — moonlight dancing on lake surface (night only) ─ */}
      {timeOfDay === "night" && !compact && <WaterSparkles />}

      {/* ── z=-3.5: Hero cloud ── left-edge accent, additive ─────────────── */}
      <MovingLayer
        src={sharedLayers.clouds.hero1}
        position={[-5, 0.2, -3.5]}
        scale={[3.5, 3.5, 1]}
        opacity={0.28}
        speedX={0.018}
        drift={0.04}
        blendMode={AdditiveBlending}
      />

      {/* ── z=-3.2: Hero cloud ── right-edge accent, additive ────────────── */}
      <MovingLayer
        src={sharedLayers.clouds.hero2}
        position={[5, 0.5, -3.2]}
        scale={[3.2, 3.2, 1]}
        opacity={0.22}
        speedX={-0.013}
        drift={0.045}
        blendMode={AdditiveBlending}
      />

      {/* ── z=-2.8: Fog wisp rising ── wind-blown upward ─────────────────── */}
      <MovingLayer
        src={sharedLayers.clouds.fogWisp}
        position={[1.0, -1.5, -2.8]}
        scale={[2.0, 2.0, 1]}
        opacity={0.22}
        speedX={0.022}
        speedY={0.016}
        drift={0.03}
        blendMode={AdditiveBlending}
      />

      {/* ── z=-2.3: Near mountains ── solid base layer ───────────────────── */}
      <ImageLayer
        src={sharedLayers.mountains.near}
        position={[0, -3.5, -2.3]}
        scale={[6, 6, 1]}
        opacity={1}
        alphaTest={0.04}
      />

      {/* ── z=-2.0: Fog wisp 2 ── left side rising ───────────────────────── */}
      <MovingLayer
        src={sharedLayers.clouds.fogWisp}
        position={[-2.0, -2.0, -2.0]}
        scale={[1.8, 1.8, 1]}
        opacity={0.20}
        speedX={-0.015}
        speedY={0.020}
        drift={0.025}
        blendMode={AdditiveBlending}
      />

      {/* ── z=-3.1: Crane flock + loner ────────────────────────────────── */}
      <FlyingCranes />

      {/* ── z=-4.0/-2.6/-6.2: Cò · Vẹt · Thiên mã ─────────────────────── */}
      <WildAnimals />

      {/* ── Wind currents ── faint strokes that imply airflow ────────────── */}
      <WindCurrentLines />

      {/* ── z=-0.5: Foreground pine — wind-blown sway ────────────────────── */}
      <WindLayer
        src={sharedLayers.foreground.pine}
        position={[-4.8, -1.2, -0.5]}
        scale={[2.8, 2.8, 1]}
        opacity={0.80}
        alphaTest={0.05}
        swayAmp={0.032}
        swaySpeed={0.35}
        driftAmpX={0.08}
        driftAmpY={0.018}
        phase={0}
      />

      {/* ── z=-0.6: Foreground bamboo — slightly faster sway ─────────────── */}
      <WindLayer
        src={sharedLayers.foreground.bamboo}
        position={[4.5, -1.0, -0.6]}
        scale={[2.5, 2.5, 1]}
        opacity={0.72}
        alphaTest={0.05}
        swayAmp={0.028}
        swaySpeed={0.44}
        driftAmpX={0.07}
        driftAmpY={0.014}
        phase={2.1}
      />

      {/* ── Low smoke plumes ── soft rising mist around the foreground ───── */}
      <MistPlumes />

      {/* ── Spirit particles ── immortal energy drifting upward ──────────── */}
      <SpiritParticles />

      {/* ── z=-0.1: Atmospheric haze tint ────────────────────────────────── */}
      {preset.haze && (
        <ImageLayer
          src={preset.haze}
          position={[0, 0, -0.1]}
          scale={[6, 6, 1]}
          opacity={0.035}
          blendMode={AdditiveBlending}
        />
      )}

      {/* ── Post-processing — base pass (no GodRays) ─────────────────────── */}
      {(!preset.godRays || compact || !sunMesh) && (
        <EffectComposer>
          <Bloom intensity={preset.bloom} luminanceThreshold={0.62} luminanceSmoothing={0.42} />
          <Noise blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.028} />
          <Vignette offset={0.24} darkness={0.62} />
        </EffectComposer>
      )}

      {/* ── Post-processing — with GodRays (dawn/dusk, desktop only) ─────── */}
      {preset.godRays && !compact && sunMesh && (
        <EffectComposer>
          <Bloom intensity={preset.bloom} luminanceThreshold={0.62} luminanceSmoothing={0.42} />
          <GodRays
            sun={sunMesh as any}
            blendFunction={BlendFunction.SCREEN}
            samples={30}
            density={0.96}
            decay={0.91}
            weight={0.28}
            exposure={0.55}
            clampMax={1}
            kernelSize={KernelSize.SMALL}
            blur
          />
          <Noise blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.028} />
          <Vignette offset={0.24} darkness={0.62} />
        </EffectComposer>
      )}
    </>
  );
}
