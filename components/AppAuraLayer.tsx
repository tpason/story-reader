"use client";

/**
 * Thermal 2026-07-24: AppAura was mobile-only full-viewport blur/mist layers.
 * World CSS backdrop (`XianxiaCssBackdrop`) already paints sky on ≤839px;
 * desktop never used AppAura (world WebGL/CSS owns atmosphere).
 * Kept as a named mount point from layout so call sites stay stable.
 */
export function AppAuraLayer() {
  return null;
}
