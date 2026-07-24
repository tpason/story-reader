"use client";

import {
  CloudLightning,
  CloudRain,
  Flame,
  Flower2,
  LoaderCircle,
  Sparkles,
  Stamp,
  Swords,
  UsersRound,
  Wind,
  Zap
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchReadingProgress } from "@/lib/api-client";
import { getCultivationLevelFromXp, effectiveCultivationLevel, XP_PER_CHAPTER } from "@/lib/cultivation";
import type { StoredReaderUser } from "@/lib/identity";
import { SKILL_ELEMENT_LABEL, SKILL_PANEL_COPY } from "@/lib/skill-copy";
import { visibleSkillsForAdmin, type ReaderSkill } from "@/lib/skills";

function SkillIcon({ skill }: { skill: ReaderSkill }) {
  if (skill.id === "lotus_domain") return <Flower2 size={15} />;
  if (skill.id === "thien_dia_an") return <Stamp size={15} />;
  if (skill.id === "celestial_rain") return <CloudLightning size={15} />;
  if (skill.icon === "rain") return <CloudRain size={15} />;
  if (skill.icon === "soldiers") return <UsersRound size={15} />;
  if (skill.icon === "sword") return <Swords size={15} />;
  if (skill.icon === "thunder") return <Zap size={15} />;
  if (skill.icon === "shield") return <Stamp size={15} />;
  if (skill.icon === "sparkles") return <Sparkles size={15} />;
  if (skill.icon === "flame") return <Flame size={15} />;
  return <Wind size={15} />;
}

function formatCooldown(seconds: number) {
  if (seconds <= 0) return "";
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m${String(seconds % 60).padStart(2, "0")}`;
}

function playSkillSound(skillId: string) {
  if (typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const gain = context.createGain();
  gain.connect(context.destination);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.045, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.58);

  const frequencies: Record<string, number[]> = {
    wind_blade: [480, 760, 1040],
    summon_rain: [260, 380, 520],
    bean_soldiers: [180, 240, 330],
    sword_flight: [620, 980, 1320],
    lotus_domain: [220, 440, 660],
    celestial_rain: [196, 392, 784, 1176],
    heaven_thunder: [92, 138, 280],
    starfall: [520, 880, 1480],
    hoa_long: [88, 148, 244, 380],
    van_kiem: [740, 1060, 1540],
    dao_hoa_tan: [330, 528, 792],
    thien_dia_an: [55, 110, 220, 880]
  };

  (frequencies[skillId] ?? [420, 640]).forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    oscillator.type = skillId === "heaven_thunder" || skillId === "starfall" || skillId === "hoa_long" || skillId === "van_kiem" ? "sawtooth" : "sine";
    oscillator.frequency.setValueAtTime(frequency, context.currentTime + index * 0.035);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(60, frequency * 0.62), context.currentTime + 0.5);
    filter.type = "lowpass";
    filter.frequency.value = skillId === "wind_blade" || skillId === "starfall" || skillId === "celestial_rain" || skillId === "van_kiem" ? 1800 : skillId === "thien_dia_an" ? 900 : 1200;
    oscillator.connect(filter);
    filter.connect(gain);
    oscillator.start(context.currentTime + index * 0.035);
    oscillator.stop(context.currentTime + 0.62);
  });

  window.setTimeout(() => context.close().catch(() => undefined), 760);
}

function skillButtonSubtitle(skill: ReaderSkill, locked: boolean, cooldown: number, isAdmin: boolean) {
  if (cooldown > 0) return `${formatCooldown(cooldown)} ${SKILL_PANEL_COPY.cooldownSuffix}`;
  if (locked) return `Cần Lv.${skill.minLevel}`;
  if (skill.adminOnly) return `Thiên pháp · ${skill.name}`;
  const element = SKILL_ELEMENT_LABEL[skill.id];
  return element ? `${element} · ${skill.name}` : skill.name;
}

export function SkillCaster({
  chapterId,
  user,
  onCast
}: {
  chapterId: string;
  user: StoredReaderUser | null;
  onCast?: (event: unknown) => void;
}) {
  const [level, setLevel] = useState(1);
  const [levelHydrated, setLevelHydrated] = useState(false);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [castingSkillId, setCastingSkillId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasActiveCooldown = Object.values(cooldowns).some((value) => value > 0);
  const loadedKeyRef = useRef<string | null>(null);
  const inFlightKeyRef = useRef<string | null>(null);
  const chapterIdRef = useRef(chapterId);
  chapterIdRef.current = chapterId;

  useEffect(() => {
    if (!hasActiveCooldown) return;

    const timer = window.setInterval(() => {
      setCooldowns((current) => {
        const next = Object.fromEntries(Object.entries(current).map(([key, value]) => [key, Math.max(0, value - 1)]));
        return next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [hasActiveCooldown]);

  const loadNetworkState = useCallback(() => {
    if (!user) return;
    const key = `${user.id}:${chapterId}`;
    if (loadedKeyRef.current === key || inFlightKeyRef.current === key) return;
    inFlightKeyRef.current = key;
    const requestedChapterId = chapterId;

    const progressRequest = fetchReadingProgress()
      .then((items) => {
        if (chapterIdRef.current !== requestedChapterId) return;
        const totalChapters = items.reduce((sum, item) => sum + Math.max(0, Number(item.maxReadChapterNumber) || 0), 0);
        setLevel(getCultivationLevelFromXp(totalChapters * XP_PER_CHAPTER));
        setLevelHydrated(true);
      })
      .catch(() => {
        if (chapterIdRef.current === requestedChapterId) {
          setLevel(1);
          setLevelHydrated(true);
        }
      });

    const cooldownRequest = fetch(`/api/skills/casts?chapterId=${encodeURIComponent(chapterId)}`)
      .then((response) => response.json() as Promise<{ cooldowns?: Record<string, number> }>)
      .then((data) => {
        if (chapterIdRef.current !== requestedChapterId) return;
        setCooldowns(data.cooldowns ?? {});
      })
      .catch(() => undefined);

    void Promise.all([progressRequest, cooldownRequest]).finally(() => {
      if (inFlightKeyRef.current === key) inFlightKeyRef.current = null;
      if (chapterIdRef.current === requestedChapterId) loadedKeyRef.current = key;
    });
  }, [chapterId, user]);

  // Fetch immediately on mount — do NOT kick off setState from pointerdown (kills the
  // subsequent click on mobile when the button remounts/disables mid-gesture).
  useEffect(() => {
    if (!user) {
      setLevel(1);
      setLevelHydrated(false);
      setCooldowns({});
      loadedKeyRef.current = null;
      inFlightKeyRef.current = null;
      return;
    }

    loadedKeyRef.current = null;
    inFlightKeyRef.current = null;
    setLevelHydrated(false);
    loadNetworkState();
  }, [chapterId, loadNetworkState, user]);

  const isAdmin = Boolean(user?.isAdmin);
  const visibleSkills = useMemo(() => visibleSkillsForAdmin(isAdmin), [isAdmin]);
  const displayLevel = effectiveCultivationLevel(level, isAdmin);

  async function cast(skill: ReaderSkill) {
    // Until level hydrates, let the server enforce minLevel (avoids false client lock at Lv.1).
    if (!user || (!isAdmin && levelHydrated && level < skill.minLevel) || cooldowns[skill.id] > 0 || castingSkillId) {
      return;
    }

    setCastingSkillId(skill.id);
    setError(null);
    const response = await fetch("/api/skills/casts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skillId: skill.id, chapterId })
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      item?: unknown;
      cooldownSeconds?: number;
      cooldownRemainingSeconds?: number;
    };

    if (!response.ok) {
      setError(data.error ?? SKILL_PANEL_COPY.castError);
      if (data.cooldownRemainingSeconds) {
        setCooldowns((current) => ({ ...current, [skill.id]: data.cooldownRemainingSeconds ?? 0 }));
      }
      setCastingSkillId(null);
      return;
    }

    setCooldowns((current) => ({ ...current, [skill.id]: data.cooldownSeconds ?? skill.cooldownSeconds }));
    playSkillSound(skill.id);
    if (data.item) onCast?.(data.item);
    setCastingSkillId(null);
  }

  return (
    <div className="skill-caster" aria-label={SKILL_PANEL_COPY.title}>
      <div className="skill-caster-heading">
        <span className="skill-caster-title">
          <Sparkles size={14} aria-hidden="true" />
          {SKILL_PANEL_COPY.title}
        </span>
        <span className="skill-caster-meta">
          <span className={`role-badge role-badge-${isAdmin ? "admin" : user ? "user" : "guest"}`}>
            {isAdmin ? "Thiên đạo" : user ? "Đạo hữu" : "Tán tu"}
          </span>
          <small>{user ? `Tu vi Lv.${displayLevel}` : SKILL_PANEL_COPY.subtitleGuest}</small>
        </span>
      </div>
      <div className="skill-row">
        {visibleSkills.map((skill) => {
          const cooldown = cooldowns[skill.id] ?? 0;
          // Don't mark locked at default Lv.1 before progress hydrates — server still enforces.
          const locked = !user || (!isAdmin && levelHydrated && level < skill.minLevel);
          const disabled = locked || cooldown > 0 || Boolean(castingSkillId);
          const element = SKILL_ELEMENT_LABEL[skill.id];
          return (
            <button
              className={`skill-button skill-button-${skill.id}`}
              data-admin={skill.adminOnly ? "true" : undefined}
              data-element={element}
              data-locked={locked ? "true" : undefined}
              data-cooling={cooldown > 0 ? "true" : undefined}
              type="button"
              key={skill.id}
              disabled={disabled}
              title={locked ? `Cần Lv.${skill.minLevel}: ${skill.description}` : skill.description}
              onClick={() => cast(skill)}
            >
              <span className="skill-button-aura" />
              <span className="skill-button-glow" />
              <span className="skill-button-icon">
                {castingSkillId === skill.id ? <LoaderCircle size={15} className="spin" /> : <SkillIcon skill={skill} />}
              </span>
              <span className="skill-button-copy">
                <strong>{skill.shortName}</strong>
                <small>{skillButtonSubtitle(skill, locked, cooldown, isAdmin)}</small>
              </span>
              {element && !locked && cooldown <= 0 ? (
                <span className="skill-button-element" aria-hidden="true">
                  {element}
                </span>
              ) : null}
              <span className="skill-button-sparks" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </button>
          );
        })}
      </div>
      {error ? <p className="skill-error">{error}</p> : null}
    </div>
  );
}
