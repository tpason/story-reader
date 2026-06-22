"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { isMobile, prefersReducedMotion } from "@/lib/browser";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";
import { desktopSkillIntensity, isSkillWebglActive, shouldRenderCssLayer, SKILL_POLICY } from "@/lib/skill-visual";
import { formatSkillCastLabel, SKILL_PANEL_COPY } from "@/lib/skill-copy";

const ThreeSkillEffectCanvas = dynamic(() => import("@/components/ThreeSkillEffectCanvas").then((mod) => mod.ThreeSkillEffectCanvas), {
  ssr: false
});

export type SkillCastEvent = {
  id: string;
  skillId: string;
  skillName: string;
  icon: string;
  storyId: string;
  chapterId: string;
  targetScope: "chapter" | "story";
  durationMs: number;
  intensity: number;
  createdAt: string;
  caster: {
    id: string;
    username: string;
    level: number;
    realm: string;
    realmStage: number;
    realmImageKey: string;
  };
};

type EffectState = SkillCastEvent & {
  mobileOptimized: boolean;
  startedAt: number;
  reduceMotion: boolean;
};

const MAX_VISIBLE_SKILL_EFFECTS = SKILL_POLICY.desktop.maxVisibleEffects;
const MOBILE_MAX_VISIBLE_SKILL_EFFECTS = SKILL_POLICY.mobile.maxVisibleEffects;
const MOBILE_SKILL_DURATION_CAP_MS = SKILL_POLICY.mobile.durationCapMs;
const DESKTOP_SKILL_POLL_MS = 4200;
const MOBILE_SKILL_POLL_MS = 30000;
const HIDDEN_SKILL_POLL_MS = 60000;

function isMobileSkillDevice() {
  return isMobile || (typeof window !== "undefined" && window.matchMedia("(max-width: 839px)").matches);
}

function isMobileSkillPollingEnabled() {
  try {
    return window.localStorage.getItem("reader:mobile-skill-poll") !== "off";
  } catch {
    return true;
  }
}

export function SkillEffectLayer({ storyId, chapterId }: { storyId: string; chapterId: string }) {
  const [effects, setEffects] = useState<EffectState[]>([]);
  const latestSeenRef = useRef(new Date().toISOString());
  const seenIdsRef = useRef(new Set<string>());
  const cleanupTimersRef = useRef(new Set<number>());

  function play(event: SkillCastEvent) {
    const reduceMotion = prefersReducedMotion();
    const mobileOptimized = isMobileSkillDevice();
    if (seenIdsRef.current.has(event.id)) return;
    seenIdsRef.current.add(event.id);
    const durationMs = mobileOptimized ? Math.min(event.durationMs, MOBILE_SKILL_DURATION_CAP_MS) : event.durationMs;
    const visibleLimit = mobileOptimized ? MOBILE_MAX_VISIBLE_SKILL_EFFECTS : MAX_VISIBLE_SKILL_EFFECTS;
    setEffects((current) => [...current.slice(-(visibleLimit - 1)), { ...event, durationMs, mobileOptimized, startedAt: Date.now(), reduceMotion }]);
    const timer = window.setTimeout(() => {
      cleanupTimersRef.current.delete(timer);
      setEffects((current) => current.filter((item) => item.id !== event.id));
    }, Math.min(10000, Math.max(2200, durationMs + 400)));
    cleanupTimersRef.current.add(timer);
  }

  useEffect(() => {
    function onLocalCast(event: Event) {
      const custom = event as CustomEvent<SkillCastEvent>;
      if (custom.detail) play(custom.detail);
    }

    window.addEventListener("reader-skill-cast", onLocalCast);
    return () => window.removeEventListener("reader-skill-cast", onLocalCast);
  }, []);

  useEffect(() => {
    const cleanupTimers = cleanupTimersRef.current;
    return () => {
      cleanupTimers.forEach((timer) => window.clearTimeout(timer));
      cleanupTimers.clear();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const compactQuery = window.matchMedia("(max-width: 839px)");
    let timer: number | null = null;

    if ((compactQuery.matches || isMobileSkillDevice()) && !isMobileSkillPollingEnabled()) {
      return () => {
        cancelled = true;
      };
    }

    async function poll() {
      if (document.visibilityState === "hidden") return;

      const params = new URLSearchParams({
        storyId,
        chapterId,
        after: latestSeenRef.current
      });

      const response = await fetch(`/api/skills/casts?${params.toString()}`).catch(() => null);
      if (!response?.ok || cancelled) return;
      const data = (await response.json().catch(() => ({}))) as { items?: SkillCastEvent[]; serverTime?: string };
      (data.items ?? []).forEach((item) => play(item));
      if (data.serverTime) latestSeenRef.current = data.serverTime;
    }

    function scheduleNextPoll() {
      if (cancelled) return;
      const delay = document.visibilityState === "hidden" ? HIDDEN_SKILL_POLL_MS : compactQuery.matches ? MOBILE_SKILL_POLL_MS : DESKTOP_SKILL_POLL_MS;
      timer = window.setTimeout(async () => {
        await poll();
        scheduleNextPoll();
      }, delay);
    }

    if (compactQuery.matches || isMobileSkillDevice()) {
      scheduleNextPoll();
    } else {
      void poll().finally(scheduleNextPoll);
    }
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [storyId, chapterId]);

  if (effects.length === 0) return null;

  return (
    <div className="skill-effect-layer" aria-hidden="true">
      {effects.map((effect) => (
        <SkillEffect key={effect.id} effect={effect} />
      ))}
    </div>
  );
}

function SkillEffect({ effect }: { effect: EffectState }) {
  const decorativeWebgl = useDecorativeWebglEnabled();
  const skillWebgl = isSkillWebglActive(effect.mobileOptimized, effect.reduceMotion, decorativeWebgl);
  const sid = effect.skillId;

  const show = (layer: Parameters<typeof shouldRenderCssLayer>[1]) =>
    shouldRenderCssLayer(sid, layer, effect.mobileOptimized, skillWebgl);

  return (
    <div
      className={`skill-effect skill-effect-${sid} ${effect.mobileOptimized ? "skill-effect-mobile" : ""} ${skillWebgl ? "skill-effect-webgl skill-effect-desktop-epic" : ""}`}
      data-reduce-motion={effect.reduceMotion ? "true" : undefined}
      style={{ "--skill-duration": `${effect.durationMs}ms` } as React.CSSProperties}
    >
      <SkillBackdrop skillId={sid} />
      {skillWebgl ? (
        <ThreeSkillEffectCanvas
          skillId={sid}
          durationMs={effect.durationMs}
          intensity={desktopSkillIntensity(effect.intensity)}
        />
      ) : null}
      {effect.mobileOptimized ? <MobileEnergyRings skillId={sid} /> : <MysticSeal skillId={sid} />}
      <div className={`skill-cast-label skill-cast-label-${sid}`}>
        <span className="skill-cast-label-orb" />
        <span className="skill-cast-label-stack">
          <span className="skill-cast-label-kicker">{SKILL_PANEL_COPY.castKicker}</span>
          <span className="skill-cast-label-text">
            {formatSkillCastLabel({
              skillName: effect.skillName,
              username: effect.caster.username,
              realm: effect.caster.realm
            })}
          </span>
        </span>
      </div>
      {show("particles") ? <ParticleField skillId={sid} compact={effect.mobileOptimized} /> : null}
      {show("wind") ? <WindBlade compact={effect.mobileOptimized} /> : null}
      {show("rain") ? <Rain intense={sid === "celestial_rain"} compact={effect.mobileOptimized} /> : null}
      {show("creatures") && sid === "bean_soldiers" ? <BeanSoldiers compact={effect.mobileOptimized} /> : null}
      {show("creatures") && sid === "sword_flight" ? <SwordFlight compact={effect.mobileOptimized} /> : null}
      {show("thunder") ? <Thunder compact={effect.mobileOptimized} /> : null}
      {show("creatures") && sid === "hoa_long" ? <FireDragon compact={effect.mobileOptimized} /> : null}
      {show("creatures") && sid === "van_kiem" ? <SwordRain compact={effect.mobileOptimized} /> : null}
      {show("petals") ? <PetalCascade compact={effect.mobileOptimized} /> : null}
      {show("seal") ? <DivineSeal compact={effect.mobileOptimized} /> : null}
      {show("meteors") ? <StarfallMeteors compact={effect.mobileOptimized} /> : null}
      {show("lotus") ? <LotusBlossoms compact={effect.mobileOptimized} /> : null}
    </div>
  );
}

function SkillBackdrop({ skillId }: { skillId: string }) {
  return (
    <div className={`skill-backdrop skill-backdrop-${skillId}`}>
      <span />
      <span />
    </div>
  );
}

function MysticSeal({ skillId }: { skillId: string }) {
  return (
    <div className={`mystic-seal mystic-seal-${skillId}`}>
      <span className="mystic-seal-ring mystic-seal-ring-outer" />
      <span className="mystic-seal-ring mystic-seal-ring-middle" />
      <span className="mystic-seal-ring mystic-seal-ring-inner" />
      {Array.from({ length: 12 }).map((_, index) => (
        <i
          key={index}
          style={
            {
              "--seal-index": index,
              "--seal-angle": `${index * 30}deg`
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function ParticleField({ skillId, compact = false }: { skillId: string; compact?: boolean }) {
  const count = compact ? 10 : 28;
  return (
    <div className={`skill-particles skill-particles-${skillId} ${compact ? "skill-particles--compact" : ""}`}>
      {Array.from({ length: count }).map((_, index) => (
        <span
          key={index}
          style={
            {
              "--particle-left": `${(index * 37) % 100}%`,
              "--particle-top": `${12 + ((index * 19) % 76)}%`,
              "--particle-delay": `${index * 82}ms`,
              "--particle-size": `${3 + (index % 4)}px`,
              "--particle-drift": `${index % 2 === 0 ? 1 : -1}`
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function WindBlade({ compact = false }: { compact?: boolean }) {
  const slashCount = compact ? 5 : 9;
  const petalCount = compact ? 8 : 18;
  return (
    <div className={`wind-blade ${compact ? "wind-blade--compact" : ""}`}>
      {Array.from({ length: slashCount }).map((_, index) => (
        <span
          key={index}
          style={
            {
              "--skill-top": `${18 + index * 7}%`,
              "--skill-delay": `${index * 130}ms`
            } as React.CSSProperties
          }
        />
      ))}
      <div className="petal-storm">
        {Array.from({ length: petalCount }).map((_, index) => (
          <i
            key={index}
            style={
              {
                "--petal-top": `${10 + ((index * 11) % 78)}%`,
                "--petal-delay": `${index * 120}ms`,
                "--petal-scale": `${0.72 + (index % 4) * 0.12}`
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}

function Rain({ intense = false, compact = false }: { intense?: boolean; compact?: boolean }) {
  const rippleCount = compact ? 4 : 7;
  return (
    <div className={`${intense ? "rain-field rain-field-intense" : "rain-field"} ${compact ? "rain-field--compact" : ""}`}>
      <div className="rain-curtain" />
      <div className="lotus-ripples">
        {Array.from({ length: rippleCount }).map((_, index) => (
          <span
            key={index}
            style={
              {
                "--ripple-delay": `${index * 360}ms`,
                "--ripple-left": `${10 + index * 13}%`,
                "--ripple-bottom": `${(index % 3) * 22}px`
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}

function BeanSoldiers({ compact = false }: { compact?: boolean }) {
  const count = compact ? 4 : 9;
  return (
    <div className={`bean-soldiers ${compact ? "bean-soldiers--compact" : ""}`}>
      {!compact ? <div className="soldier-banner" /> : null}
      {Array.from({ length: count }).map((_, index) => (
        <span
          className="bean-soldier"
          key={index}
          style={
            {
              "--skill-delay": `${index * 250}ms`,
              "--soldier-lane": `${index % 3}`
            } as React.CSSProperties
          }
        >
          <BeanSoldierIcon index={index} />
        </span>
      ))}
    </div>
  );
}

function BeanSoldierIcon({ index }: { index: number }) {
  const armorGradientId = `bean-armor-${index}`;
  const bannerGradientId = `bean-banner-${index}`;
  return (
    <svg className="bean-soldier-svg" viewBox="0 0 64 76" role="presentation" focusable="false">
      <defs>
        <linearGradient id={armorGradientId} x1="14" x2="46" y1="20" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff7ad" />
          <stop offset="0.48" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#7c2d12" />
        </linearGradient>
        <linearGradient id={bannerGradientId} x1="36" x2="60" y1="5" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fef3c7" />
          <stop offset="0.46" stopColor="#f0d06a" />
          <stop offset="1" stopColor="#c8962e" />
        </linearGradient>
      </defs>
      <path className="bean-soldier-shadow" d="M8 68c8-6 36-6 48 0-10 5-38 5-48 0Z" />
      <path className="bean-soldier-spear" d="M44 12v48" />
      <path className="bean-soldier-flag" d="M44 10c8-6 13 2 18-4v24c-6 5-11-3-18 3Z" fill={`url(#${bannerGradientId})`} />
      <path className="bean-soldier-bean" d="M18 30c0-13 10-22 22-18 10 3 13 13 8 23 8 6 8 20-2 27-11 8-29 3-34-8-4-9 0-19 6-24Z" fill={`url(#${armorGradientId})`} />
      <path className="bean-soldier-helmet" d="M16 32c7-14 28-18 38-2-8-3-28-3-38 2Z" />
      <path className="bean-soldier-face" d="M24 35c7 5 18 5 25 0 0 12-4 20-12 21-8-1-12-9-13-21Z" />
      <path className="bean-soldier-eye" d="M29 42h4M40 42h4" />
      <path className="bean-soldier-blade" d="M49 14 44 3l-5 11Z" />
      <path className="bean-soldier-arm" d="M16 48 5 55M48 47l11 8" />
    </svg>
  );
}

function SwordFlight({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`sword-flight ${compact ? "sword-flight--compact" : ""}`}>
      <span className="sword-core" />
      <span className="sword-aura sword-aura-one" />
      <span className="sword-aura sword-aura-two" />
      <span className="sword-afterimage sword-afterimage-one" />
      <span className="sword-afterimage sword-afterimage-two" />
    </div>
  );
}

function Thunder({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`thunder-flash ${compact ? "thunder-flash--compact" : ""}`}>
      <span className="thunder-bolt thunder-bolt-main" />
      {compact ? null : (
        <>
          <span className="thunder-bolt thunder-bolt-left" />
          <span className="thunder-bolt thunder-bolt-right" />
        </>
      )}
    </div>
  );
}

function FireDragon({ compact = false }: { compact?: boolean }) {
  const tongueCount = compact ? 4 : 6;
  const emberCount = compact ? 0 : 14;
  return (
    <div className={`fire-dragon ${compact ? "fire-dragon--compact" : ""}`}>
      {Array.from({ length: tongueCount }).map((_, index) => (
        <span
          key={index}
          className="fire-tongue"
          style={
            {
              "--tongue-top": `${30 + index * 8}%`,
              "--tongue-delay": `${index * 115}ms`,
              "--tongue-scale": `${0.78 + (index % 3) * 0.16}`
            } as React.CSSProperties
          }
        />
      ))}
      {emberCount > 0 ? (
      <div className="fire-embers">
        {Array.from({ length: emberCount }).map((_, index) => (
          <i
            key={index}
            style={
              {
                "--ember-left": `${(index * 31 + 8) % 92}%`,
                "--ember-delay": `${index * 155}ms`,
                "--ember-size": `${2 + (index % 3) * 1.5}px`,
                "--ember-side": `${index % 2 === 0 ? 1 : -1}`
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      ) : null}
    </div>
  );
}

function SwordRain({ compact = false }: { compact?: boolean }) {
  const count = compact ? 7 : 14;
  return (
    <div className={`sword-rain ${compact ? "sword-rain--compact" : ""}`}>
      {Array.from({ length: count }).map((_, index) => (
        <span
          key={index}
          className="sword-drop"
          style={
            {
              "--sword-left": `${(index * 19 + 4) % 94}%`,
              "--sword-delay": `${index * 165}ms`,
              "--sword-tilt": `${-6 + (index % 5) * 3}deg`
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function PetalCascade({ compact = false }: { compact?: boolean }) {
  const count = compact ? 12 : 22;
  return (
    <div className={`petal-cascade ${compact ? "petal-cascade--compact" : ""}`}>
      {Array.from({ length: count }).map((_, index) => (
        <span
          key={index}
          className="petal"
          style={
            {
              "--petal-left": `${(index * 23 + 3) % 97}%`,
              "--petal-delay": `${index * 195}ms`,
              "--petal-rot": `${(index * 37) % 360}deg`,
              "--petal-size": `${8 + (index % 4) * 3}px`,
              "--petal-drift": `${index % 2 === 0 ? 1 : -1}`
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function DivineSeal({ compact = false }: { compact?: boolean }) {
  const ringCount = compact ? 2 : 4;
  const runeCount = compact ? 4 : 8;
  return (
    <div className={`divine-seal-overlay ${compact ? "divine-seal-overlay--compact" : ""}`}>
      {ringCount >= 1 ? <span className="divine-ring divine-ring-1" /> : null}
      {ringCount >= 2 ? <span className="divine-ring divine-ring-2" /> : null}
      {ringCount >= 3 ? <span className="divine-ring divine-ring-3" /> : null}
      {ringCount >= 4 ? <span className="divine-ring divine-ring-4" /> : null}
      <div className="divine-runes">
        {Array.from({ length: runeCount }).map((_, index) => (
          <i key={index} style={{ "--rune-n": index } as React.CSSProperties} />
        ))}
      </div>
    </div>
  );
}

function MobileEnergyRings({ skillId }: { skillId: string }) {
  return (
    <div className={`mobile-energy-rings mobile-energy-rings-${skillId}`} aria-hidden="true">
      <span className="mobile-energy-ring mobile-energy-ring-1" />
      <span className="mobile-energy-ring mobile-energy-ring-2" />
      <span className="mobile-energy-ring mobile-energy-ring-3" />
    </div>
  );
}

function StarfallMeteors({ compact = false }: { compact?: boolean }) {
  const count = compact ? 5 : 9;
  return (
    <div className={`starfall-meteors ${compact ? "starfall-meteors--compact" : ""}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <span
          key={index}
          className="starfall-meteor"
          style={
            {
              "--meteor-left": `${(index * 23 + 6) % 92}%`,
              "--meteor-delay": `${index * 180}ms`,
              "--meteor-tilt": `${-18 + (index % 4) * 8}deg`
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function LotusBlossoms({ compact = false }: { compact?: boolean }) {
  const count = compact ? 4 : 7;
  return (
    <div className={`lotus-blossoms ${compact ? "lotus-blossoms--compact" : ""}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <span
          key={index}
          className="lotus-blossom"
          style={
            {
              "--lotus-left": `${14 + ((index * 19) % 72)}%`,
              "--lotus-top": `${22 + ((index * 13) % 58)}%`,
              "--lotus-delay": `${index * 220}ms`,
              "--lotus-scale": `${0.72 + (index % 3) * 0.18}`
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
