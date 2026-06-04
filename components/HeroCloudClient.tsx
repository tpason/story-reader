"use client";

import dynamic from "next/dynamic";

const ThreeHeroCloud = dynamic(
  () => import("@/components/ThreeHeroCloud").then((m) => m.ThreeHeroCloud),
  { ssr: false }
);

export function HeroCloudClient() {
  return <ThreeHeroCloud />;
}
