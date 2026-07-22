"use client";

import { useMemo, useState } from "react";
import { EffectComposer, Bloom, Vignette, GodRays } from "@react-three/postprocessing";
import { Sky } from "@react-three/drei";
import { BlendFunction, KernelSize } from "postprocessing";
import { AdditiveBlending, MathUtils, Mesh, Vector3 } from "three";
import { ImageLayer } from "./ImageLayer";
import { MovingLayer } from "./MovingLayer";
import { FlyingCranes } from "./FlyingCranes";
import { WildAnimals } from "./WildAnimals";
import { FlyingButterflies } from "./FlyingButterflies";
import { FlyingCarrot } from "./FlyingCarrot";
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
import { CraneDanceOrbit } from "./CraneDanceOrbit";
import { FallingWeather } from "./FallingWeather";
import { Fireflies } from "./Fireflies";
import { usePoeticWeather } from "@/hooks/usePoeticWeather";
import { weatherParticleCount } from "@/lib/xianxia-weather";
import {
  pngCloudOpacityMul,
  scenePresets,
  sharedLayers,
  type SceneQualityTier,
  type TimeOfDay,
} from "./sceneConfig";

type XianxiaSceneProps = {
  timeOfDay: TimeOfDay;
  qualityTier?: SceneQualityTier;
};

type ScenePostEffectsProps = {
  showGodRays: boolean;
  sunMesh: Mesh | null;
  bloom: number;
  isMid: boolean;
};

function ScenePostEffects({ showGodRays, sunMesh, bloom, isMid }: ScenePostEffectsProps) {
  // Full: native composer res + light MSAA. Mid: mild downscale only (0.55 looked crunchy).
  const composerProps = isMid
    ? { multisampling: 0 as const, resolutionScale: 0.88 }
    : { multisampling: 4 as const, resolutionScale: 1 };

  // Higher threshold + softer GodRays — homepage parchment stays readable (anti-glare).
  const bloomThreshold = 0.78;
  const bloomSmooth = 0.5;

  if (showGodRays && sunMesh) {
    return (
      <EffectComposer {...composerProps}>
        <Bloom intensity={bloom * (isMid ? 0.75 : 0.85)} luminanceThreshold={bloomThreshold} luminanceSmoothing={bloomSmooth} />
        <GodRays
          sun={sunMesh}
          blendFunction={BlendFunction.SCREEN}
          samples={isMid ? 10 : 16}
          density={0.94}
          decay={0.9}
          weight={isMid ? 0.14 : 0.2}
          exposure={isMid ? 0.28 : 0.36}
          clampMax={1}
          kernelSize={KernelSize.SMALL}
          blur
        />
        <Vignette offset={0.28} darkness={0.64} />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer {...composerProps}>
      <Bloom intensity={bloom * (isMid ? 0.7 : 0.8)} luminanceThreshold={bloomThreshold} luminanceSmoothing={bloomSmooth} />
      <Vignette offset={0.28} darkness={0.64} />
    </EffectComposer>
  );
}

export function XianxiaScene({ timeOfDay, qualityTier = "full" }: XianxiaSceneProps) {
  const preset = scenePresets[timeOfDay];
  const isPhone = qualityTier === "phone";
  const isMid = qualityTier === "mid";
  const isFull = qualityTier === "full";
  const pngMul = pngCloudOpacityMul(timeOfDay);
  const weather = usePoeticWeather(timeOfDay, !isPhone);
  const weatherTier = isFull ? "full" : "mid";

  const [sunMesh, setSunMesh] = useState<Mesh | null>(null);

  const sunPosition = useMemo((): [number, number, number] => {
    if (!preset.sky) return [0, 1, 0];
    const phi = MathUtils.degToRad(90 - preset.sky.elevation);
    const theta = MathUtils.degToRad(preset.sky.azimuth);
    const v = new Vector3().setFromSphericalCoords(1, phi, theta);
    return [v.x, v.y, v.z];
  }, [preset.sky?.elevation, preset.sky?.azimuth]); // eslint-disable-line react-hooks/exhaustive-deps

  const showGodRays = preset.godRays && !isPhone && !!sunMesh;
  const showCraneDance = isFull && (timeOfDay === "night" || timeOfDay === "dusk" || timeOfDay === "dawn");

  return (
    <>
      <CameraBreath />

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

      <ImageLayer
        src={preset.background}
        position={[0, 0, -10]}
        scale={[13, 13, 1]}
        opacity={preset.bgOpacity}
        transparent={preset.bgOpacity < 1}
        depthWrite
      />

      {preset.lightRays && (
        <ImageLayer
          src={preset.lightRays}
          position={[0.8, 1.0, -9]}
          scale={[13, 13, 1]}
          opacity={0.20 * pngMul}
          blendMode={AdditiveBlending}
        />
      )}

      <SunMoon timeOfDay={timeOfDay} position={preset.celestialPos} />

      {showCraneDance && <CraneDanceOrbit center={preset.celestialPos} />}

      {preset.godRays && !isPhone && (
        <mesh
          ref={(m) => { if (m) setSunMesh(m); }}
          position={preset.celestialPos}
        >
          <planeGeometry args={[0.55, 0.55]} />
          <meshBasicMaterial color="white" transparent opacity={0.92} depthWrite={false} />
        </mesh>
      )}

      {timeOfDay === "night" && (
        <>
          <NightSky compact={isPhone || isMid} />
          <MoonlightBeam />
          {!isPhone && <Fireflies count={isFull ? 32 : 18} />}
        </>
      )}

      <ImageLayer
        src={sharedLayers.mountains.far}
        position={[0, -4.5, -7]}
        scale={[10, 10, 1]}
        opacity={0.34}
        alphaTest={0.03}
      />

      {isFull && <FormationRing />}

      {/* Procedural cloud planes only on full — PNG MovingLayer/DriftingCloudBank
          already supply atmosphere; volumetric doubles as soft rectangles. */}
      {isFull && <FloatingClouds timeOfDay={timeOfDay} volumetric={false} />}

      {!isPhone && isFull && <CloudShadow timeOfDay={timeOfDay} />}

      <ImageLayer
        src={sharedLayers.mountains.mid}
        position={[0, -4.2, -5]}
        scale={[9, 9, 1]}
        opacity={0.62}
        alphaTest={0.03}
      />

      <DriftingCloudBank sources={sharedLayers.cloudBank} timeOfDay={timeOfDay} />

      <MovingLayer
        src={sharedLayers.clouds.lowValley}
        position={[0, -2.0, -4.5]}
        scale={[8, 8, 1]}
        opacity={0.28 * pngMul}
        speedX={0.014}
        drift={0.022}
        blendMode={AdditiveBlending}
      />

      <MovingLayer
        src={sharedLayers.clouds.lowValley}
        position={[0, -1.2, -4.0]}
        scale={[8, 8, 1]}
        opacity={0.18 * pngMul}
        speedX={-0.009}
        drift={0.028}
        blendMode={AdditiveBlending}
      />

      <LingQiOrbs />

      <WaterPlane timeOfDay={timeOfDay} compact={isPhone} />

      {timeOfDay === "night" && !isPhone && <WaterSparkles />}

      <MovingLayer
        src={sharedLayers.clouds.hero1}
        position={[-5, 0.2, -3.5]}
        scale={[3.5, 3.5, 1]}
        opacity={0.28 * pngMul}
        speedX={0.018}
        drift={0.04}
        blendMode={AdditiveBlending}
      />

      <MovingLayer
        src={sharedLayers.clouds.hero2}
        position={[5, 0.5, -3.2]}
        scale={[3.2, 3.2, 1]}
        opacity={0.22 * pngMul}
        speedX={-0.013}
        drift={0.045}
        blendMode={AdditiveBlending}
      />

      <MovingLayer
        src={sharedLayers.clouds.fogWisp}
        position={[1.0, -1.5, -2.8]}
        scale={[2.0, 2.0, 1]}
        opacity={0.22 * pngMul}
        speedX={0.022}
        speedY={0.016}
        drift={0.03}
        blendMode={AdditiveBlending}
      />

      <ImageLayer
        src={sharedLayers.mountains.near}
        position={[0, -3.5, -2.3]}
        scale={[6, 6, 1]}
        opacity={1}
        alphaTest={0.04}
      />

      <MovingLayer
        src={sharedLayers.clouds.fogWisp}
        position={[-2.0, -2.0, -2.0]}
        scale={[1.8, 1.8, 1]}
        opacity={0.20 * pngMul}
        speedX={-0.015}
        speedY={0.020}
        drift={0.025}
        blendMode={AdditiveBlending}
      />

      {!isPhone && <FlyingCranes density={isFull ? "full" : "lite"} />}
      {/* Mid+full desktop: butterflies / carrot / parrots. Phone keeps them off for heat. */}
      {!isPhone && <WildAnimals />}
      {!isPhone && timeOfDay !== "night" && <FlyingButterflies />}
      {!isPhone && timeOfDay !== "night" && <FlyingCarrot />}
      {!isPhone && weather !== "clear" && (
        <FallingWeather
          mode={weather}
          count={weatherParticleCount(weather, weatherTier)}
        />
      )}
      {!isPhone && <WindCurrentLines />}

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

      <MistPlumes timeOfDay={timeOfDay} />

      <mesh position={[0, 0, -3.0]}>
        <planeGeometry args={[20, 10]} />
        <meshBasicMaterial
          color={timeOfDay === "night" ? "#203050" : timeOfDay === "dusk" ? "#a06038" : timeOfDay === "dawn" ? "#c09048" : "#6a8898"}
          transparent
          opacity={(timeOfDay === "night" ? 0.04 : timeOfDay === "day" ? 0.035 : 0.05) * pngMul}
          depthWrite={false}
        />
      </mesh>

      <SpiritParticles count={isFull ? 120 : isMid ? 72 : 36} />

      {preset.haze && (
        <ImageLayer
          src={preset.haze}
          position={[0, 0, -0.1]}
          scale={[6, 6, 1]}
          opacity={(timeOfDay === "day" ? 0.018 : 0.03) * pngMul}
          blendMode={AdditiveBlending}
        />
      )}

      {!isPhone && (
        <ScenePostEffects
          showGodRays={!!showGodRays}
          sunMesh={sunMesh}
          bloom={preset.bloom}
          isMid={isMid}
        />
      )}
    </>
  );
}
