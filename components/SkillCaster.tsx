"use client";

import { CloudRain, Flame, Leaf, LoaderCircle, Shield, Sparkles, Swords, UsersRound, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchReadingProgress } from "@/lib/api-client";
import { getCultivationLevelFromXp, effectiveCultivationLevel, XP_PER_CHAPTER } from "@/lib/cultivation";
import { visibleSkillsForAdmin, type ReaderSkill } from "@/lib/skills";
import type { StoredReaderUser } from "@/lib/identity";

function SkillIcon({ icon }: { icon: ReaderSkill["icon"] }) {
  if (icon === "rain") return <CloudRain size={15} />;
  if (icon === "soldiers") return <UsersRound size={15} />;
  if (icon === "sword") return <Swords size={15} />;
  if (icon === "thunder") return <Zap size={15} />;
  if (icon === "shield") return <Shield size={15} />;
  if (icon === "sparkles") return <Sparkles size={15} />;
  if (icon === "flame") return <Flame size={15} />;
  return <Leaf size={15} />;
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
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [castingSkillId, setCastingSkillId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasActiveCooldown = Object.values(cooldowns).some((value) => value > 0);

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

  useEffect(() => {
    if (!user) {
      setLevel(1);
      setCooldowns({});
      return;
    }

    const progressRequest = fetchReadingProgress()
      .then((items) => {
        const totalChapters = items.reduce((sum, item) => sum + Math.max(0, Number(item.maxReadChapterNumber) || 0), 0);
        setLevel(getCultivationLevelFromXp(totalChapters * XP_PER_CHAPTER));
      })
      .catch(() => setLevel(1));

    const cooldownRequest = fetch(`/api/skills/casts?chapterId=${encodeURIComponent(chapterId)}`)
      .then((response) => response.json() as Promise<{ cooldowns?: Record<string, number> }>)
      .then((data) => setCooldowns(data.cooldowns ?? {}))
      .catch(() => undefined);

    void progressRequest;
    void cooldownRequest;
  }, [chapterId, user]);

  const isAdmin = Boolean(user?.isAdmin);
  const visibleSkills = useMemo(() => visibleSkillsForAdmin(isAdmin), [isAdmin]);
  const displayLevel = effectiveCultivationLevel(level, isAdmin);

  async function cast(skill: ReaderSkill) {
    if (!user || (!isAdmin && level < skill.minLevel) || cooldowns[skill.id] > 0 || castingSkillId) return;

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
      setError(data.error ?? "Không thi triển được đạo pháp.");
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
    <div className="skill-caster" aria-label="Đạo pháp">
      <div className="skill-caster-heading">
        <span>Đạo pháp</span>
        <span className="skill-caster-meta">
          <span className={`role-badge role-badge-${isAdmin ? "admin" : user ? "user" : "guest"}`}>{isAdmin ? "Admin" : user ? "Đạo hữu" : "Guest"}</span>
          <small>{user ? `Lv.${displayLevel}` : "Tán tu chỉ xem"}</small>
        </span>
      </div>
      <div className="skill-row">
        {visibleSkills.map((skill) => {
          const cooldown = cooldowns[skill.id] ?? 0;
          const locked = !user || (!isAdmin && level < skill.minLevel);
          const disabled = locked || cooldown > 0 || Boolean(castingSkillId);
          return (
            <button
              className={`skill-button skill-button-${skill.id}`}
              data-admin={skill.adminOnly ? "true" : undefined}
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
                {castingSkillId === skill.id ? <LoaderCircle size={15} className="spin" /> : <SkillIcon icon={skill.icon} />}
              </span>
              <span className="skill-button-copy">
                <strong>{skill.shortName}</strong>
                <small>{cooldown > 0 ? formatCooldown(cooldown) : locked ? `Lv.${skill.minLevel}` : skill.adminOnly ? `Admin · ${skill.name}` : skill.name}</small>
              </span>
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
