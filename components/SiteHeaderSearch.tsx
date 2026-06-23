"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { SearchSuggest } from "@/components/SearchSuggest";

function SiteHeaderSearchField() {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const defaultValue = pathname === "/" ? searchParams.get("q") ?? undefined : undefined;

  return <SearchSuggest variant="header" defaultValue={defaultValue} />;
}

export function SiteHeaderSearch() {
  return (
    <Suspense
      fallback={
        <div className="header-search-wrap header-search-wrap-fallback" aria-hidden="true">
          <input className="header-search-input" placeholder="Tìm trong Thiên Thư..." disabled />
        </div>
      }
    >
      <SiteHeaderSearchField />
    </Suspense>
  );
}
