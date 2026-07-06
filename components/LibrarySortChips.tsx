import type { Route } from "next";
import Link from "next/link";
import { Clock3, Flame, Layers3 } from "lucide-react";

type LibrarySortChipsProps = {
  currentSort?: string;
  hrefForSort: (sort: string | undefined) => string;
};

const SORT_OPTIONS = [
  { id: "updated", label: "Mới cập nhật", icon: Clock3 },
  { id: "hot", label: "Đang hot", icon: Flame },
  { id: "chapters", label: "Nhiều chương", icon: Layers3 }
] as const;

export function LibrarySortChips({ currentSort, hrefForSort }: LibrarySortChipsProps) {
  const active = currentSort ?? "updated";

  return (
    <nav className="filters library-sort-chips" aria-label="Sắp xếp thư viện">
      {SORT_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = active === option.id;
        return (
          <Link
            key={option.id}
            className={`chip ${isActive ? "chip-active" : ""}`}
            href={hrefForSort(isActive ? undefined : option.id) as Route}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={15} aria-hidden />
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
