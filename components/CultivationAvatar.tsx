"use client";

import { cultivationAuraTier, effectiveCultivationLevel, maxCultivationProfile } from "@/lib/cultivation";
import { avatarGradient, avatarInitial } from "@/lib/identity";

type CultivationAvatarProps = {
  username: string;
  level?: number;
  realmImageKey?: string;
  size?: "sm" | "md" | "lg";
  muted?: boolean;
  isAdmin?: boolean;
  className?: string;
  title?: string;
};

export function CultivationAvatar({
  username,
  level = 1,
  realmImageKey,
  size = "md",
  muted = false,
  isAdmin = false,
  className = "",
  title
}: CultivationAvatarProps) {
  const gradient = avatarGradient(username);
  const displayLevel = effectiveCultivationLevel(level, isAdmin);
  const displayRealm = isAdmin ? maxCultivationProfile().realmImageKey : realmImageKey;
  const auraTier = muted ? "none" : cultivationAuraTier(displayLevel);
  const sizeClass = size === "sm" ? "cultivation-avatar-sm" : size === "lg" ? "cultivation-avatar-lg" : "cultivation-avatar-md";

  return (
    <span
      className={`cultivation-avatar ${sizeClass} ${muted ? "cultivation-avatar-muted" : ""} ${className}`.trim()}
      data-aura-tier={auraTier}
      data-realm={displayRealm}
      data-admin={isAdmin ? "true" : undefined}
      style={{ "--avatar-from": gradient.from, "--avatar-to": gradient.to } as React.CSSProperties}
      title={title}
    >
      <span className="cultivation-avatar-glow" aria-hidden="true" />
      <span className="cultivation-avatar-ring" aria-hidden="true" />
      <span className="cultivation-avatar-core">{muted ? "T" : avatarInitial(username)}</span>
    </span>
  );
}
