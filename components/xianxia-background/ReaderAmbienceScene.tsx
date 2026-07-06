"use client";

import { AdditiveBlending } from "three";
import { FallingPetals } from "./FallingPetals";
import { MovingLayer } from "./MovingLayer";
import { SpiritParticles } from "./SpiritParticles";
import { WindCurrentLines } from "./WindCurrentLines";
import { WindLayer } from "./WindLayer";
import type { SceneQualityTier } from "./sceneConfig";
import { sharedLayers } from "./sceneConfig";

type ReaderAmbienceSceneProps = {
  qualityTier: SceneQualityTier;
};

/** Foreground xianxia accents for the reader — no full world / post-processing. */
export function ReaderAmbienceScene({ qualityTier }: ReaderAmbienceSceneProps) {
  const isFull = qualityTier === "full";
  const isMid = qualityTier === "mid";
  const pngMul = 0.85;

  return (
    <>
      <SpiritParticles count={isFull ? 88 : isMid ? 52 : 40} />
      <FallingPetals count={isFull ? 44 : 26} />
      {isFull && <WindCurrentLines />}
      <MovingLayer
        src={sharedLayers.clouds.fogWisp}
        position={[0.5, 0.45, -2.4]}
        scale={[2.6, 2.6, 1]}
        opacity={0.13 * pngMul}
        speedX={0.012}
        speedY={0.008}
        drift={0.02}
        blendMode={AdditiveBlending}
      />
      <MovingLayer
        src={sharedLayers.clouds.mistBand}
        position={[-1.2, -0.8, -2.0]}
        scale={[3.2, 1.2, 1]}
        opacity={0.12 * pngMul}
        speedX={-0.008}
        drift={0.015}
        blendMode={AdditiveBlending}
      />
      <WindLayer
        src={sharedLayers.foreground.pine}
        position={[-5.2, -1.4, -0.35]}
        scale={[2.4, 2.4, 1]}
        opacity={0.58}
        alphaTest={0.05}
        swayAmp={0.024}
        swaySpeed={0.28}
        phase={0.2}
      />
      <WindLayer
        src={sharedLayers.foreground.bamboo}
        position={[5.0, -1.2, -0.28]}
        scale={[2.2, 2.2, 1]}
        opacity={0.54}
        alphaTest={0.05}
        swayAmp={0.034}
        swaySpeed={0.38}
        phase={1.4}
      />
      {isFull && (
        <WindLayer
          src={sharedLayers.foreground.reeds}
          position={[-2.8, -2.0, -0.15]}
          scale={[1.8, 1.8, 1]}
          opacity={0.55}
          alphaTest={0.06}
          swayAmp={0.042}
          swaySpeed={0.45}
          phase={2.6}
        />
      )}
    </>
  );
}
