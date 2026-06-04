"use client";

import dynamic from "next/dynamic";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";

const ThreeHomeLibraryStage = dynamic(() => import("@/components/ThreeHomeLibraryStage").then((mod) => mod.ThreeHomeLibraryStage), {
  ssr: false
});

type HomeLibraryStageClientProps = {
  storyCount: number;
  categoryCount: number;
};

export function HomeLibraryStageClient({ storyCount, categoryCount }: HomeLibraryStageClientProps) {
  const enabled = useDecorativeWebglEnabled();
  if (!enabled) return null;
  return <ThreeHomeLibraryStage storyCount={storyCount} categoryCount={categoryCount} />;
}
