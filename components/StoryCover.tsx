import Image from "next/image";

export function StoryCover({ src, title }: { src: string | null; title: string }) {
  return (
    <div className="cover">
      <Image
        src={src || "/default-story-cover.svg"}
        alt={title ? `${title} cover` : "Story cover"}
        width={152}
        height={228}
        sizes="152px"
      />
    </div>
  );
}
