import { ChevronRight } from "lucide-react";
import Link from "next/link";

type StoryDetailBreadcrumbProps = {
  storyTitle: string;
};

export function StoryDetailBreadcrumb({ storyTitle }: StoryDetailBreadcrumbProps) {
  return (
    <nav className="story-detail-breadcrumb" aria-label="Breadcrumb">
      <Link href="/">Thư viện</Link>
      <ChevronRight size={14} aria-hidden="true" />
      <span aria-current="page">{storyTitle}</span>
    </nav>
  );
}
