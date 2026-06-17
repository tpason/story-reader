"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const ThreeHeroCloud = dynamic(
  () => import("@/components/ThreeHeroCloud").then((m) => m.ThreeHeroCloud),
  { ssr: false }
);

export function HeroCloudClient() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.01 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={hostRef}
      style={{ position: "absolute", inset: 0, pointerEvents: "none", borderRadius: "inherit" }}
    >
      <ThreeHeroCloud paused={!visible} />
    </div>
  );
}
