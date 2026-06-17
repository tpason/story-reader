import Image from "next/image";

export function StoryCover({ src, title, priority }: { src: string | null; title: string; priority?: boolean }) {
  return (
    <div className="cover cover-shimmer">
      <Image
        src={src || "/default-story-cover.svg"}
        alt={title ? `${title} cover` : "Story cover"}
        width={152}
        height={228}
        sizes="152px"
        priority={priority}
        onLoad={(e) => {
          const img = e.currentTarget as HTMLImageElement;
          img.closest(".cover-shimmer")?.classList.remove("cover-shimmer");
        }}
      />
    </div>
  );
}
